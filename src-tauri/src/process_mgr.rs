use std::collections::{HashMap, VecDeque};
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use crate::models::{ProjectConfig, ProjectDetection, ProjectView, StartResult};

/// 内存中每个项目保留的最大日志行数
const MAX_LOG_LINES: usize = 2000;
/// 单个项目日志文件超过该大小，在下次启动时轮转为 .log.old
const MAX_LOG_FILE_BYTES: u64 = 5 * 1024 * 1024;
/// 从日志文件尾部最多读取的字节数（避免整文件读入内存）
const TAIL_READ_BYTES: u64 = 512 * 1024;
/// 回退读取日志文件时返回的最大行数
const TAIL_LINES: usize = 1000;
const CREATE_NO_WINDOW: u32 = 0x08000000;

type LogBuffers = Arc<Mutex<HashMap<String, VecDeque<String>>>>;

/// 获取锁；即使锁已被其它线程 panic 污染也继续使用内部数据，避免整个程序连锁崩溃。
fn lk<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

pub struct RunningProcess {
    pub pid: u32,
    pub start_time: u64,
    pub child: Child,
}

/// 注意：所有字段内部都已是线程安全结构，因此 ProcessManager 本身无需再包一层 Mutex，
/// 并且所有方法都不会同时持有两把锁，从根源上避免死锁。
pub struct ProcessManager {
    pub config_file: PathBuf,
    pub log_dir: PathBuf,
    projects: Arc<Mutex<Vec<ProjectConfig>>>,
    running: Arc<Mutex<HashMap<String, RunningProcess>>>,
    log_buffers: LogBuffers,
    /// 项目最近一次自行退出的结果：true = 异常退出（非 0 退出码）
    exit_states: Arc<Mutex<HashMap<String, bool>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."));

        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

        let base_dir = if exe_dir.join("cente_projects.json").exists() {
            exe_dir
        } else if cwd.join("cente_projects.json").exists() {
            cwd
        } else {
            exe_dir
        };

        let config_file = base_dir.join("cente_projects.json");
        let log_dir = base_dir.join("log");

        if !log_dir.exists() {
            let _ = fs::create_dir_all(&log_dir);
        }

        // 如果旧的 cente_logs 存在，将其中的日志同步到 log 目录
        let old_log_dir = base_dir.join("cente_logs");
        if old_log_dir.exists() {
            if let Ok(entries) = fs::read_dir(&old_log_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(file_name) = path.file_name() {
                            let dest = log_dir.join(file_name);
                            if !dest.exists() {
                                let _ = fs::copy(&path, &dest);
                            }
                        }
                    }
                }
            }
        }

        let mut mgr = Self {
            config_file,
            log_dir,
            projects: Arc::new(Mutex::new(Vec::new())),
            running: Arc::new(Mutex::new(HashMap::new())),
            log_buffers: Arc::new(Mutex::new(HashMap::new())),
            exit_states: Arc::new(Mutex::new(HashMap::new())),
        };

        mgr.load_config();
        mgr
    }

    // ----------------------------------------------------------------------
    // 配置读写：解析失败不覆盖原文件；保存采用「临时文件 + 备份 + 原子替换」
    // ----------------------------------------------------------------------
    pub fn load_config(&mut self) {
        if !self.config_file.exists() {
            return;
        }

        let parse = |path: &Path| -> Option<Vec<ProjectConfig>> {
            let content = fs::read_to_string(path).ok()?;
            serde_json::from_str::<Vec<ProjectConfig>>(content.trim_start_matches('\u{feff}')).ok()
        };

        if let Some(list) = parse(&self.config_file) {
            *lk(&self.projects) = list;
            return;
        }

        // 主配置损坏：保留现场副本，并尝试从上一次备份恢复
        let _ = fs::copy(&self.config_file, self.config_file.with_extension("json.corrupt"));
        let backup = self.config_file.with_extension("json.bak");
        if let Some(list) = parse(&backup) {
            *lk(&self.projects) = list;
        }
    }

    pub fn save_config(&self) -> Result<(), String> {
        let list = lk(&self.projects).clone();
        let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;

        let tmp = self.config_file.with_extension("json.tmp");
        fs::write(&tmp, json).map_err(|e| format!("写入配置失败: {}", e))?;

        if self.config_file.exists() {
            let _ = fs::copy(&self.config_file, self.config_file.with_extension("json.bak"));
        }
        fs::rename(&tmp, &self.config_file).map_err(|e| format!("保存配置失败: {}", e))
    }

    // ----------------------------------------------------------------------
    // 项目视图与状态
    // ----------------------------------------------------------------------
    /// 检测已自行退出的进程：移出运行表、记录退出结果并写入日志
    fn reap_exited(&self) {
        let mut finished: Vec<(String, u32, Option<i32>)> = Vec::new();
        {
            let mut running = lk(&self.running);
            for (id, proc) in running.iter_mut() {
                if let Ok(Some(status)) = proc.child.try_wait() {
                    finished.push((id.clone(), proc.pid, status.code()));
                }
            }
            for (id, _, _) in &finished {
                running.remove(id);
            }
        }

        for (id, pid, code) in finished {
            let failed = code.map(|c| c != 0).unwrap_or(true);
            lk(&self.exit_states).insert(id.clone(), failed);
            let code_text = code.map(|c| c.to_string()).unwrap_or_else(|| "未知".to_string());
            self.append_log(
                &id,
                &format!(
                    "[{}] [{}] ====== 进程已退出 (PID: {}, 退出码: {}) ======",
                    now_str(),
                    if failed { "ERROR" } else { "INFO" },
                    pid,
                    code_text
                ),
            );
        }
    }

    pub fn get_project_views(&self) -> Vec<ProjectView> {
        self.reap_exited();

        let projects = lk(&self.projects).clone();
        let running_info: HashMap<String, (u32, u64)> = lk(&self.running)
            .iter()
            .map(|(k, v)| (k.clone(), (v.pid, v.start_time)))
            .collect();
        let exit_states = lk(&self.exit_states).clone();

        projects
            .iter()
            .map(|p| {
                let (status, pid, start_time) = if let Some((pid, st)) = running_info.get(&p.id) {
                    ("Running".to_string(), Some(*pid), Some(*st))
                } else if exit_states.get(&p.id).copied().unwrap_or(false) {
                    ("Error".to_string(), None, None)
                } else {
                    ("Stopped".to_string(), None, None)
                };

                let is_venv = if let Some(ref py) = p.python_path {
                    py.contains(".venv") || py.contains("venv")
                } else {
                    Self::check_has_venv(&p.path)
                };

                let entry_l = p.entry.to_lowercase();
                let is_script = entry_l.ends_with(".bat")
                    || entry_l.ends_with(".cmd")
                    || entry_l.ends_with(".ps1");

                ProjectView {
                    id: p.id.clone(),
                    name: p.name.clone(),
                    path: p.path.clone(),
                    python_path: p.python_path.clone(),
                    entry: p.entry.clone(),
                    args: p.args.clone(),
                    access_url: p.access_url.clone(),
                    show_in_tray: p.show_in_tray,
                    status,
                    pid,
                    is_venv,
                    is_script,
                    start_time,
                    env_vars: p.env_vars.clone(),
                    icon: p.icon.clone().or_else(|| Some("folder".to_string())),
                }
            })
            .collect()
    }

    pub fn project_path(&self, id: &str) -> Option<String> {
        lk(&self.projects).iter().find(|p| p.id == id).map(|p| p.path.clone())
    }

    pub fn open_project_url(&self, id: &str) -> Result<(), String> {
        let address = {
            let projects = lk(&self.projects);
            let project = projects.iter().find(|p| p.id == id).ok_or("项目不存在")?;
            project.access_url.clone().filter(|s| !s.trim().is_empty())
                .ok_or("尚未配置访问地址，请在项目配置中填写访问地址后再试")?
        };
        let url = crate::access::normalize_url(&address)?;
        open::that(url).map_err(|e| format!("无法打开浏览器：{e}"))
    }

    /// 轻量的状态指纹（不做磁盘探测）：用于后台监听线程判断"是否有项目状态变化"。
    /// 同时会顺带检测并回收已自行退出的进程。
    pub fn status_signature(&self) -> String {
        self.reap_exited();

        let mut parts: Vec<String> = lk(&self.running)
            .iter()
            .map(|(id, p)| format!("{}:run:{}", id, p.pid))
            .collect();
        parts.extend(
            lk(&self.exit_states)
                .iter()
                .filter(|(_, failed)| **failed)
                .map(|(id, _)| format!("{}:err", id)),
        );
        parts.sort();
        parts.join("|")
    }

    pub fn save_or_update_project(&self, mut project: ProjectConfig) -> Result<(), String> {
        project.access_url = project.access_url.as_deref()
            .filter(|value| !value.trim().is_empty())
            .map(crate::access::normalize_url).transpose()?;
        if project.id.is_empty() {
            project.id = format!("proj_{}", chrono::Local::now().timestamp_millis());
        }

        let id = project.id.clone();
        let old_log = self.get_project_log_file(&id);

        {
            let mut list = lk(&self.projects);
            if let Some(idx) = list.iter().position(|p| p.id == project.id) {
                list[idx] = project;
            } else {
                list.push(project);
            }
        }

        // 项目改名后，日志文件跟随改名，避免遗留孤儿日志
        let new_log = self.get_project_log_file(&id);
        if old_log != new_log && old_log.exists() && !new_log.exists() {
            let _ = fs::rename(&old_log, &new_log);
        }

        self.save_config()
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        self.stop_project(id)?;

        lk(&self.projects).retain(|p| p.id != id);
        lk(&self.log_buffers).remove(id);
        lk(&self.exit_states).remove(id);

        self.save_config()
    }

    // ----------------------------------------------------------------------
    // 进程生命周期
    // ----------------------------------------------------------------------
    pub fn start_project(&self, id: &str) -> StartResult {
        let fail = |msg: String| StartResult { success: false, message: msg };

        let project = match lk(&self.projects).iter().find(|p| p.id == id).cloned() {
            Some(p) => p,
            None => return fail("找不到对应项目配置".to_string()),
        };

        // 先清掉已自行退出的旧进程，避免误判为"已在运行"
        self.reap_exited();

        let project_dir = Path::new(&project.path);
        if !project_dir.exists() {
            return fail(format!("项目目录不存在: {}", project.path));
        }

        let entry = project.entry.trim();
        if entry.is_empty() {
            return fail("未配置启动脚本 / 入口文件".to_string());
        }
        let entry_lower = entry.to_lowercase();
        let is_bat = entry_lower.ends_with(".bat") || entry_lower.ends_with(".cmd");
        let is_ps1 = entry_lower.ends_with(".ps1");
        let is_exe = entry_lower.ends_with(".exe");

        let mut cmd = if is_bat {
            let mut c = Command::new("cmd.exe");
            c.arg("/c").arg(entry);
            c
        } else if is_ps1 {
            let mut c = Command::new("powershell.exe");
            c.args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", entry]);
            c
        } else if is_exe {
            // 可执行文件直接运行；相对路径按项目目录解析
            let joined = project_dir.join(entry);
            if joined.exists() {
                Command::new(joined)
            } else {
                Command::new(entry)
            }
        } else {
            let python_bin = match project.python_path.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                Some(custom) => custom.to_string(),
                None => Self::find_venv_python(&project.path).unwrap_or_else(|| "python".to_string()),
            };
            let mut c = Command::new(python_bin);
            c.arg(entry);
            c
        };

        cmd.current_dir(project_dir);
        cmd.env("PYTHONUNBUFFERED", "1");
        cmd.env("PYTHONIOENCODING", "utf-8");

        if let Some(ref env_map) = project.env_vars {
            for (k, v) in env_map {
                cmd.env(k, v);
            }
        }

        if let Some(ref args_str) = project.args {
            cmd.args(parse_args(args_str));
        }

        // 无黑框启动
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.stdin(Stdio::null());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        // 先准备好日志文件，再进入运行表的临界区（临界区内不再获取项目表锁）
        let log_file_path = self.get_project_log_file(id);
        Self::rotate_log_if_needed(&log_file_path);
        let log_writer = match OpenOptions::new().create(true).append(true).open(&log_file_path) {
            Ok(f) => Some(Arc::new(Mutex::new(f))),
            Err(_) => None,
        };

        let mut running_map = lk(&self.running);
        if running_map.contains_key(id) {
            return StartResult { success: true, message: "项目已在运行中".to_string() };
        }

        match cmd.spawn() {
            Ok(mut child) => {
                let pid = child.id();
                let start_time = chrono::Local::now().timestamp() as u64;
                lk(&self.exit_states).remove(id);

                let start_mark = format!("[{}] [INFO] ====== 项目启动 (PID: {}) ======", now_str(), pid);
                if let Some(ref w) = log_writer {
                    let _ = writeln!(lk(w), "{}", start_mark);
                }

                {
                    let mut bufs = lk(&self.log_buffers);
                    let preload = !bufs.contains_key(id);
                    let buf = bufs.entry(id.to_string()).or_insert_with(VecDeque::new);
                    if preload {
                        // 首次启动（程序刚打开）时带出文件里的历史尾部，避免界面日志突然"清零"
                        for l in read_tail(&log_file_path, 200) {
                            buf.push_back(l);
                        }
                    }
                    buf.push_back(start_mark);
                    while buf.len() > MAX_LOG_LINES {
                        buf.pop_front();
                    }
                }

                if let Some(w) = log_writer {
                    if let Some(out) = child.stdout.take() {
                        Self::spawn_reader(out, Arc::clone(&w), Arc::clone(&self.log_buffers), id.to_string());
                    }
                    if let Some(err) = child.stderr.take() {
                        Self::spawn_reader(err, w, Arc::clone(&self.log_buffers), id.to_string());
                    }
                }

                running_map.insert(id.to_string(), RunningProcess { pid, start_time, child });

                StartResult { success: true, message: format!("启动成功 (PID: {})", pid) }
            }
            Err(e) => fail(format!("启动进程失败: {}", e)),
        }
    }

    pub fn stop_project(&self, id: &str) -> Result<(), String> {
        // 先出锁再杀进程：taskkill 可能耗时，不能阻塞其它线程读取状态
        let proc = lk(&self.running).remove(id);
        lk(&self.exit_states).remove(id);

        if let Some(mut proc) = proc {
            let pid = proc.pid;

            // Windows 下 taskkill /F /T 干净终止整个进程树
            #[cfg(target_os = "windows")]
            {
                let mut kill_cmd = Command::new("taskkill");
                kill_cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
                kill_cmd.creation_flags(CREATE_NO_WINDOW);
                let _ = kill_cmd.status();
            }

            let _ = proc.child.kill();
            let _ = proc.child.wait();

            self.append_log(
                id,
                &format!("[{}] [INFO] ====== 项目已停止 (PID: {}) ======", now_str(), pid),
            );
        }
        Ok(())
    }

    pub fn stop_all(&self) {
        let ids: Vec<String> = lk(&self.running).keys().cloned().collect();
        for id in ids {
            let _ = self.stop_project(&id);
        }
    }

    pub fn restart_project(&self, id: &str) -> StartResult {
        let _ = self.stop_project(id);
        thread::sleep(std::time::Duration::from_millis(500));
        self.start_project(id)
    }

    // ----------------------------------------------------------------------
    // 日志
    // ----------------------------------------------------------------------
    pub fn get_logs(&self, id: &str) -> Vec<String> {
        {
            let bufs = lk(&self.log_buffers);
            if let Some(lines) = bufs.get(id) {
                if !lines.is_empty() {
                    return lines.iter().cloned().collect();
                }
            }
        }
        read_tail(&self.get_project_log_file(id), TAIL_LINES)
    }

    pub fn clear_logs(&self, id: &str) -> Result<(), String> {
        // 1. 清空内存中的日志缓冲
        if let Some(buf) = lk(&self.log_buffers).get_mut(id) {
            buf.clear();
        }

        // 2. 将磁盘上的独立项目日志文件截断为 0 字节
        let log_file = self.get_project_log_file(id);
        if log_file.exists() {
            fs::write(&log_file, "").map_err(|e| format!("清空日志文件失败: {}", e))?;
        }
        Ok(())
    }

    pub fn get_project_log_file(&self, id: &str) -> PathBuf {
        let list = lk(&self.projects);
        if let Some(idx) = list.iter().position(|p| p.id == id) {
            let safe_name = sanitize_file_name(&list[idx].name);
            if !safe_name.is_empty() {
                // 同名项目共用文件会串日志：后出现的项目追加 id 区分
                let duplicated = list.iter().take(idx).any(|q| sanitize_file_name(&q.name) == safe_name);
                let file_name = if duplicated {
                    format!("{}_{}.log", safe_name, id)
                } else {
                    format!("{}.log", safe_name)
                };
                return self.log_dir.join(file_name);
            }
        }
        self.log_dir.join(format!("{}.log", id))
    }

    pub fn get_log_file_path(&self, id: &str) -> PathBuf {
        self.get_project_log_file(id)
    }

    fn append_log(&self, id: &str, line: &str) {
        push_buffer(&self.log_buffers, id, line.to_string());

        let log_file = self.get_project_log_file(id);
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(log_file) {
            let _ = writeln!(f, "{}", line);
        }
    }

    fn rotate_log_if_needed(log_file: &Path) {
        if let Ok(meta) = fs::metadata(log_file) {
            if meta.len() > MAX_LOG_FILE_BYTES {
                let old = log_file.with_extension("log.old");
                let _ = fs::remove_file(&old);
                let _ = fs::rename(log_file, old);
            }
        }
    }

    /// 读取一个输出管道：按字节读行（兼容 GBK 等非 UTF-8 输出），
    /// stdout / stderr 共用同一个文件句柄，避免两个线程交错写文件。
    fn spawn_reader<R: Read + Send + 'static>(
        reader: R,
        writer: Arc<Mutex<File>>,
        buffers: LogBuffers,
        id: String,
    ) {
        thread::spawn(move || {
            let mut r = BufReader::new(reader);
            let mut raw: Vec<u8> = Vec::new();
            loop {
                raw.clear();
                match r.read_until(b'\n', &mut raw) {
                    Ok(0) | Err(_) => break,
                    Ok(_) => {}
                }
                let line = decode_line(&raw);
                let _ = writeln!(lk(&writer), "{}", line);
                push_buffer(&buffers, &id, line);
            }
        });
    }

    // ----------------------------------------------------------------------
    // 环境探测
    // ----------------------------------------------------------------------
    pub fn check_has_venv(dir_path: &str) -> bool {
        Self::find_venv_python(dir_path).is_some()
    }

    pub fn find_venv_python(dir_path: &str) -> Option<String> {
        let p = Path::new(dir_path);
        let candidates = [
            p.join(".venv").join("Scripts").join("python.exe"),
            p.join("venv").join("Scripts").join("python.exe"),
            p.join("env").join("Scripts").join("python.exe"),
            p.join(".venv").join("bin").join("python"),
            p.join("venv").join("bin").join("python"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.to_string_lossy().to_string());
            }
        }
        None
    }

    pub fn detect_python_project(dir_path: &str) -> ProjectDetection {
        let p = Path::new(dir_path);
        let suggested_name = p
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "my-python-app".to_string());

        let mut has_venv = false;
        let mut venv_name = None;
        let mut python_path = None;

        if let Some(py) = Self::find_venv_python(dir_path) {
            has_venv = true;
            venv_name = Some(if py.contains(".venv") { ".venv" } else { "venv" }.to_string());
            python_path = Some(py);
        }

        // 检测主入口文件与启动脚本优先级（优先使用已写好的 start.bat 等脚本）
        let entry_candidates = [
            "start.bat",
            "run.bat",
            "launch.bat",
            "start.cmd",
            "run.cmd",
            "start.ps1",
            "run.ps1",
            "run.py",
            "main.py",
            "app.py",
            "server.py",
            "manage.py",
            "start.py",
        ];
        let mut entry = None;
        let mut is_script = false;
        for c in &entry_candidates {
            if p.join(c).exists() {
                entry = Some(c.to_string());
                let lower = c.to_lowercase();
                if lower.ends_with(".bat") || lower.ends_with(".cmd") || lower.ends_with(".ps1") {
                    is_script = true;
                }
                break;
            }
        }

        ProjectDetection {
            suggested_name,
            has_venv,
            venv_name,
            python_path,
            entry,
            is_script,
        }
    }
}

// --------------------------------------------------------------------------
// 纯函数工具
// --------------------------------------------------------------------------
fn now_str() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

fn push_buffer(buffers: &LogBuffers, id: &str, line: String) {
    let mut bufs = lk(buffers);
    let buf = bufs.entry(id.to_string()).or_insert_with(VecDeque::new);
    buf.push_back(line);
    while buf.len() > MAX_LOG_LINES {
        buf.pop_front();
    }
}

/// 解码一行输出：优先 UTF-8，失败则按 GBK（中文 Windows 控制台默认编码）解码。
fn decode_line(raw: &[u8]) -> String {
    let mut end = raw.len();
    while end > 0 && (raw[end - 1] == b'\n' || raw[end - 1] == b'\r') {
        end -= 1;
    }
    let bytes = &raw[..end];
    match std::str::from_utf8(bytes) {
        Ok(s) => s.to_string(),
        Err(_) => {
            let (text, _, _) = encoding_rs::GBK.decode(bytes);
            text.into_owned()
        }
    }
}

/// 只读取文件尾部，返回最后 max_lines 行
fn read_tail(path: &Path, max_lines: usize) -> Vec<String> {
    let mut f = match File::open(path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };
    let len = f.metadata().map(|m| m.len()).unwrap_or(0);
    let start = len.saturating_sub(TAIL_READ_BYTES);
    if f.seek(SeekFrom::Start(start)).is_err() {
        return Vec::new();
    }
    let mut data = Vec::new();
    if f.read_to_end(&mut data).is_err() {
        return Vec::new();
    }

    let mut lines: Vec<String> = data.split(|b| *b == b'\n').map(decode_line).collect();
    if start > 0 && !lines.is_empty() {
        lines.remove(0); // 起点可能落在行中间
    }
    if lines.last().map(|l| l.is_empty()).unwrap_or(false) {
        lines.pop();
    }
    let skip = lines.len().saturating_sub(max_lines);
    lines.split_off(skip)
}

/// 生成合法的 Windows 文件名
fn sanitize_file_name(name: &str) -> String {
    let replaced: String = name
        .chars()
        .map(|c| if "\\/:*?\"<>|".contains(c) || c.is_control() { '_' } else { c })
        .collect();
    replaced.trim_matches(|c| c == ' ' || c == '.').to_string()
}

/// 解析运行参数：按空白拆分，同时支持双引号包裹带空格的参数，例如 `--cfg "C:\My Files\a.yaml"`
pub fn parse_args(input: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    let mut in_quote = false;
    let mut has_token = false;

    for ch in input.chars() {
        match ch {
            '"' => {
                in_quote = !in_quote;
                has_token = true;
            }
            c if c.is_whitespace() && !in_quote => {
                if has_token {
                    out.push(std::mem::take(&mut cur));
                    has_token = false;
                }
            }
            c => {
                cur.push(c);
                has_token = true;
            }
        }
    }
    if has_token {
        out.push(cur);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_args_splits_on_whitespace() {
        assert_eq!(parse_args("--port 8000  --reload"), vec!["--port", "8000", "--reload"]);
    }

    #[test]
    fn parse_args_keeps_quoted_values() {
        assert_eq!(
            parse_args(r#"--cfg "C:\My Files\a.yaml" -v"#),
            vec!["--cfg", r"C:\My Files\a.yaml", "-v"]
        );
    }

    #[test]
    fn parse_args_empty() {
        assert!(parse_args("   ").is_empty());
    }

    #[test]
    fn sanitize_replaces_illegal_chars() {
        assert_eq!(sanitize_file_name("a/b:c*d"), "a_b_c_d");
        assert_eq!(sanitize_file_name("  .name. "), "name");
    }

    #[test]
    fn decode_line_handles_gbk_and_utf8() {
        assert_eq!(decode_line("你好\r\n".as_bytes()), "你好");
        let (gbk, _, _) = encoding_rs::GBK.encode("你好");
        assert_eq!(decode_line(&gbk), "你好");
    }
}

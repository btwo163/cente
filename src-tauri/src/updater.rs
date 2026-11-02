use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, process::Command, sync::Mutex};
use tauri::{AppHandle, State};

#[derive(Clone, Serialize, Deserialize)]
pub struct UpdatePreferences {
    pub repository: String,
    pub auto_check: bool,
}

impl Default for UpdatePreferences {
    fn default() -> Self {
        Self { repository: "btwo163/cente".into(), auto_check: true }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Release {
    pub version: String,
    #[serde(default)]
    pub notes: Option<String>,
    pub url: Option<String>,
    pub digest: Option<String>,
    pub size: Option<u64>,
    pub draft: bool,
    pub prerelease: bool,
}

#[derive(Default)]
pub struct UpdateState(pub Mutex<Option<Release>>, pub Mutex<()>);

fn directory() -> Result<PathBuf, String> {
    std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or("无法确定程序目录".into())
}

fn repository(value: &str) -> Result<String, String> {
    let value = value.trim().trim_end_matches('/');
    let value = value.strip_prefix("https://github.com/").unwrap_or(value);
    let parts: Vec<_> = value.split('/').collect();
    if parts.len() != 2
        || parts.iter().any(|p| {
            p.is_empty()
                || *p == "."
                || *p == ".."
                || !p
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || b"-_.".contains(&c))
        })
    {
        return Err("请填写 GitHub 仓库地址，例如 https://github.com/用户名/cente".into());
    }
    Ok(value.to_string())
}

fn validate(release: &Release, repo: &str) -> Result<bool, String> {
    let version = semver::Version::parse(release.version.trim_start_matches('v'))
        .map_err(|_| "发布版本号无效，需要 v1.2.3 格式")?;
    let current = semver::Version::parse(env!("CARGO_PKG_VERSION")).map_err(|e| e.to_string())?;
    if release.draft || release.prerelease || !version.pre.is_empty() || version <= current {
        return Ok(false);
    }
    let url = tauri::Url::parse(
        release
            .url
            .as_deref()
            .ok_or("新版缺少 cente-windows-x86_64.exe 更新文件")?,
    )
    .map_err(|_| "更新地址无效")?;
    if url.scheme() != "https"
        || url.host_str() != Some("github.com")
        || !url
            .path()
            .starts_with(&format!("/{repo}/releases/download/"))
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
    {
        return Err("更新文件必须来自指定 GitHub 仓库的 Release".into());
    }
    let hash = release
        .digest
        .as_deref()
        .and_then(|s| s.strip_prefix("sha256:"))
        .ok_or("更新文件缺少 GitHub SHA256 校验值，请重新上传 Release 附件")?;
    if hash.len() != 64 || !hash.bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err("更新校验值无效".into());
    }
    if !matches!(release.size, Some(1..=104_857_600)) {
        return Err("更新文件大小无效（上限 100 MB）".into());
    }
    Ok(true)
}

fn powershell(script: &std::path::Path) -> Command {
    let mut command = Command::new("powershell.exe");
    command
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
        ])
        .arg(script);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
}

fn script_dir() -> Result<PathBuf, String> {
    let dir = directory()?.join(".cente-updates").join(format!(
        "{}-{}",
        std::process::id(),
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
    ));
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建更新目录：{e}"))?;
    Ok(dir)
}

#[tauri::command]
pub fn get_update_preferences() -> Result<(UpdatePreferences, String), String> {
    let path = directory()?.join("cente_updates.json");
    let prefs = if path.exists() {
        serde_json::from_str(&fs::read_to_string(path).map_err(|e| e.to_string())?)
            .map_err(|e| format!("更新配置损坏：{e}"))?
    } else {
        UpdatePreferences::default()
    };
    Ok((prefs, env!("CARGO_PKG_VERSION").into()))
}

#[tauri::command]
pub fn save_update_preferences(
    state: State<'_, UpdateState>,
    mut preferences: UpdatePreferences,
) -> Result<(), String> {
    let _busy = state
        .1
        .try_lock()
        .map_err(|_| "正在检查或安装更新，请稍后再保存")?;
    if !preferences.repository.trim().is_empty() {
        preferences.repository = repository(&preferences.repository)?;
    } else {
        preferences.repository.clear();
    }
    let path = directory()?.join("cente_updates.json");
    let tmp = path.with_extension("json.tmp");
    fs::write(
        &tmp,
        serde_json::to_vec_pretty(&preferences).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(tmp, path).map_err(|e| e.to_string())?;
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<Release>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use tauri::Manager;
        let state = app.state::<UpdateState>();
        let _busy = state.1.try_lock().map_err(|_| "更新操作正在进行")?;
        *state.0.lock().map_err(|e| e.to_string())? = None;
        if !cfg!(all(windows, target_arch = "x86_64")) {
            return Err("当前自动更新仅支持 Windows x64".into());
        }
        let (prefs, _) = get_update_preferences()?;
        let repo = repository(&prefs.repository)?;
        let dir = script_dir()?;
        let script = dir.join("check.ps1");
        fs::write(&script, include_str!("update-check.ps1")).map_err(|e| e.to_string())?;
        let output = powershell(&script)
            .env("CENTE_UPDATE_REPO", &repo)
            .output()
            .map_err(|e| e.to_string())?;
        let _ = fs::remove_file(&script);
        let _ = fs::remove_dir(&dir);
        if !output.status.success() {
            return Err(format!(
                "检查失败（请确认仓库公开且已有正式 Release，或检查网络）：{}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        let release: Release =
            serde_json::from_slice(&output.stdout).map_err(|e| format!("发布信息无法解析：{e}"))?;
        if !validate(&release, &repo)? {
            return Ok(None);
        }
        *state.0.lock().map_err(|e| e.to_string())? = Some(release.clone());
        Ok(Some(release))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        use tauri::Manager;
        let state = app.state::<UpdateState>();
        let _busy = state.1.try_lock().map_err(|_| "更新操作正在进行")?;
        let release = state
            .0
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
            .ok_or("请先检查更新")?;
        let dir = script_dir()?;
        let staged = dir.join("cente.exe");
        let download = dir.join("download.ps1");
        fs::write(&download, include_str!("update-download.ps1")).map_err(|e| e.to_string())?;
        let hash = release
            .digest
            .as_deref()
            .and_then(|s| s.strip_prefix("sha256:"))
            .ok_or("校验值缺失")?;
        let output = powershell(&download)
            .env("CENTE_UPDATE_URL", release.url.ok_or("下载地址缺失")?)
            .env("CENTE_UPDATE_FILE", &staged)
            .env(
                "CENTE_UPDATE_SIZE",
                release.size.ok_or("文件大小缺失")?.to_string(),
            )
            .env("CENTE_UPDATE_HASH", hash)
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(format!(
                "下载或校验失败，原程序未修改：{}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        let installer = dir.join("install.ps1");
        fs::write(&installer, include_str!("update-install.ps1")).map_err(|e| e.to_string())?;
        powershell(&installer)
            .env(
                "CENTE_UPDATE_TARGET",
                std::env::current_exe().map_err(|e| e.to_string())?,
            )
            .env("CENTE_UPDATE_FILE", &staged)
            .env("CENTE_UPDATE_HASH", hash)
            .env("CENTE_UPDATE_PID", std::process::id().to_string())
            .spawn()
            .map_err(|e| format!("无法启动更新程序：{e}"))?;
        // RunEvent::Exit stops managed processes before the helper replaces the executable.
        app.exit(0);
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restrict_repository_and_release_source() {
        assert_eq!(
            repository("https://github.com/example/cente/").unwrap(),
            "example/cente"
        );
        for bad in ["", "https://evil.test/a/b", "a/../b", "a/b?x=1", "a/.."] {
            assert!(repository(bad).is_err());
        }
        let mut release = Release { version: "v9.0.0".into(), notes: None, url: Some("https://github.com/example/cente/releases/download/v9.0.0/cente-windows-x86_64.exe".into()), digest: Some(format!("sha256:{}", "a".repeat(64))), size: Some(1024), draft: false, prerelease: false };
        assert!(validate(&release, "example/cente").unwrap());
        assert!(validate(&release, "other/cente").is_err());
        release.digest = None;
        assert!(validate(&release, "example/cente").is_err());
        release.version = "v0.0.1".into();
        assert!(!validate(&release, "example/cente").unwrap());
    }
}

// Cente 控制台控制器 - Master-Detail 双栏工作台 (Vanilla JS)

// Tauri IPC 调用封装
async function invoke(cmd, args = {}) {
  if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
    return await window.__TAURI__.core.invoke(cmd, args);
  } else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
    return await window.__TAURI_INTERNALS__.invoke(cmd, args);
  } else {
    return mockInvoke(cmd, args);
  }
}

// 浏览器独立预览模式下的 Mock 数据
function mockInvoke(cmd, args = {}) {
  if (cmd === "open_project_url") throw new Error("请在 Cente 桌面应用中打开访问地址");
  if (cmd === "get_global_settings" || cmd === "set_autostart") {
    throw new Error("浏览器预览无法读取或修改 Windows 启动项，请在 Cente 桌面应用中设置。");
  }
  if (cmd === "get_projects") {
    const now = Math.floor(Date.now() / 1000);
    return [
      { id: "p1", name: "notion", path: "E:\\code\\notion", entry: "start.bat", args: "", icon: "python", status: "Running", pid: 8924, is_script: true, is_venv: false, start_time: now - (2 * 3600 + 36 * 60) },
      { id: "p2", name: "chatgpt-web", path: "E:\\code\\chatgpt-web", entry: "run.py", args: "--port 8000", icon: "web", status: "Running", pid: 4120, is_script: false, is_venv: true, start_time: now - 3600 },
      { id: "p3", name: "data-tool", path: "D:\\projects\\data-tool", entry: "main.py", args: "", icon: "database", status: "Stopped", pid: null, is_script: false, is_venv: true },
      { id: "p4", name: "api-server", path: "E:\\code\\api-server", entry: "app.py", args: "", icon: "server", status: "Error", pid: null, is_script: false, is_venv: true },
      { id: "p5", name: "web-ui", path: "D:\\web\\web-ui", entry: "start.bat", args: "", icon: "cube", status: "Running", pid: 6512, is_script: true, is_venv: false, start_time: now - 1800 },
      { id: "p6", name: "crawler", path: "E:\\projects\\crawler", entry: "spider.py", args: "", icon: "crawler", status: "Stopped", pid: null, is_script: false, is_venv: true },
      { id: "p7", name: "blog", path: "D:\\projects\\blog", entry: "run.py", args: "", icon: "rocket", status: "Running", pid: 9022, is_script: false, is_venv: true, start_time: now - 7200 },
      { id: "p8", name: "ai-assistant", path: "E:\\code\\ai-assistant", entry: "serve.py", args: "", icon: "bot", status: "Stopped", pid: null, is_script: false, is_venv: true },
      { id: "p9", name: "file-server", path: "D:\\server\\file-server", entry: "main.py", args: "", icon: "server", status: "Running", pid: 7810, is_script: false, is_venv: true, start_time: now - 5400 },
      { id: "p10", name: "monitor", path: "E:\\tools\\monitor", entry: "agent.py", args: "", icon: "chart", status: "Error", pid: null, is_script: false, is_venv: true },
      { id: "p11", name: "notebook", path: "E:\\code\\notebook", entry: "start.bat", args: "", icon: "terminal", status: "Stopped", pid: null, is_script: true, is_venv: false },
      { id: "p12", name: "test-demo", path: "D:\\temp\\test-demo", entry: "demo.py", args: "", icon: "zap", status: "Stopped", pid: null, is_script: false, is_venv: false }
    ];
  }
  if (cmd === "get_project_logs") {
    return [
      "[2024-03-20 10:14:22] [INFO] 启动脚本: start.bat",
      "[2024-03-20 10:14:22] [INFO] 当前工作目录: E:\\code\\notion",
      "[2024-03-20 10:14:23] [INFO] 正在初始化应用...",
      "[2024-03-20 10:14:25] [INFO] 加载配置文件: config.yaml",
      "[2024-03-20 10:14:26] [INFO] 连接数据库...",
      "[2024-03-20 10:14:27] [INFO] 数据库连接成功",
      "[2024-03-20 10:14:28] [INFO] 启动 web 服务...",
      "[2024-03-20 10:14:29] [INFO] 服务启动成功, 监听端口: 8080",
      "[2024-03-20 10:14:29] [INFO] 应用已启动, 等待请求...",
      "[2024-03-20 10:20:11] [INFO] 接收到请求: GET /api/health",
      "[2024-03-20 10:20:11] [INFO] 请求处理成功 (200) - 12ms",
      "[2024-03-20 10:22:03] [WARN] 缓存使用量较高: 78%",
      "[2024-03-20 10:23:15] [INFO] 接收到请求: POST /api/notion/sync",
      "[2024-03-20 10:23:16] [INFO] 数据同步完成, 耗时: 1.2s",
      "[2024-03-20 10:25:42] [INFO] 定时任务执行: 清理临时文件",
      "[2024-03-20 10:25:42] [INFO] 清理完成, 共剔除 12 个文件",
      "[2024-03-20 10:30:01] [INFO] 接收到请求: GET /api/page/list",
      "[2024-03-20 10:30:01] [INFO] 请求处理成功 (200) - 8ms",
      "[2024-03-20 10:32:18] [INFO] 心跳检测正常",
      "[2024-03-20 10:35:27] [INFO] 运行中..."
    ];
  }
  return { success: true };
}

// ==========================================================================
// 内置项目图标库（基于现代化 Lucide 矢量图标集，适配深色控制台风格）
// ==========================================================================
const PROJECT_ICONS = {
  folder: {
    id: "folder",
    name: "通用项目",
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`
  },
  python: {
    id: "python",
    name: "Python代码",
    color: "#FACC15",
    bg: "rgba(250, 204, 21, 0.12)",
    border: "rgba(250, 204, 21, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>`
  },
  web: {
    id: "web",
    name: "Web服务",
    color: "#06B6D4",
    bg: "rgba(6, 182, 212, 0.12)",
    border: "rgba(6, 182, 212, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
  },
  server: {
    id: "server",
    name: "后端API",
    color: "#A855F7",
    bg: "rgba(168, 85, 247, 0.12)",
    border: "rgba(168, 85, 247, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`
  },
  bot: {
    id: "bot",
    name: "AI智能",
    color: "#818CF8",
    bg: "rgba(129, 140, 248, 0.12)",
    border: "rgba(129, 140, 248, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`
  },
  database: {
    id: "database",
    name: "数据库",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>`
  },
  crawler: {
    id: "crawler",
    name: "爬虫采集",
    color: "#FB923C",
    bg: "rgba(251, 146, 60, 0.12)",
    border: "rgba(251, 146, 60, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`
  },
  terminal: {
    id: "terminal",
    name: "自动化脚本",
    color: "#4ADE80",
    bg: "rgba(74, 222, 128, 0.12)",
    border: "rgba(74, 222, 128, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`
  },
  rocket: {
    id: "rocket",
    name: "核心业务",
    color: "#F43F5E",
    bg: "rgba(244, 63, 94, 0.12)",
    border: "rgba(244, 63, 94, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`
  },
  chart: {
    id: "chart",
    name: "数据监控",
    color: "#2DD4BF",
    bg: "rgba(45, 212, 191, 0.12)",
    border: "rgba(45, 212, 191, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.22 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.46 12H2"/></svg>`
  },
  cube: {
    id: "cube",
    name: "微模块",
    color: "#60A5FA",
    bg: "rgba(96, 165, 250, 0.12)",
    border: "rgba(96, 165, 250, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/></svg>`
  },
  zap: {
    id: "zap",
    name: "高性能",
    color: "#EAB308",
    bg: "rgba(234, 179, 8, 0.12)",
    border: "rgba(234, 179, 8, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`
  },
  cpu: {
    id: "cpu",
    name: "计算引擎",
    color: "#EC4899",
    bg: "rgba(236, 72, 153, 0.12)",
    border: "rgba(236, 72, 153, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`
  },
  cloud: {
    id: "cloud",
    name: "云端服务",
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`
  },
  workflow: {
    id: "workflow",
    name: "工作流",
    color: "#C084FC",
    bg: "rgba(192, 132, 252, 0.12)",
    border: "rgba(192, 132, 252, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>`
  },
  radio: {
    id: "radio",
    name: "实时通信",
    color: "#34D399",
    bg: "rgba(52, 211, 153, 0.12)",
    border: "rgba(52, 211, 153, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>`
  },
  shield: {
    id: "shield",
    name: "安全防护",
    color: "#22C55E",
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`
  },
  flame: {
    id: "flame",
    name: "热点高频",
    color: "#FF6B4A",
    bg: "rgba(255, 107, 74, 0.12)",
    border: "rgba(255, 107, 74, 0.28)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
  }
};

function getProjectIcon(iconKey) {
  return PROJECT_ICONS[iconKey] || PROJECT_ICONS["folder"];
}

function guessIcon(fileNameOrDir) {
  const s = (fileNameOrDir || "").toLowerCase();
  if (s.includes("spider") || s.includes("crawl") || s.includes("scrape")) return "crawler";
  if (s.includes("bot") || s.includes("ai") || s.includes("chat") || s.includes("agent") || s.includes("llm") || s.includes("gpt")) return "bot";
  if (s.includes("web") || s.includes("flask") || s.includes("django") || s.includes("fastapi") || s.includes("html") || s.includes("vue") || s.includes("react")) return "web";
  if (s.includes("db") || s.includes("sql") || s.includes("data") || s.includes("redis") || s.includes("mongo")) return "database";
  if (s.includes("api") || s.includes("server") || s.includes("backend") || s.includes("service")) return "server";
  if (s.includes("cloud") || s.includes("aws") || s.includes("oss")) return "cloud";
  if (s.includes("flow") || s.includes("pipeline") || s.includes("cron") || s.includes("task")) return "workflow";
  if (s.includes("monitor") || s.includes("chart") || s.includes("stat") || s.includes("metric")) return "chart";
  if (s.includes("socket") || s.includes("stream") || s.includes("radio")) return "radio";
  if (s.includes("auth") || s.includes("security") || s.includes("shield")) return "shield";
  if (s.includes("hot") || s.includes("flame") || s.includes("fire")) return "flame";
  if (s.includes("cpu") || s.includes("calc") || s.includes("train")) return "cpu";
  if (s.endsWith(".bat") || s.endsWith(".cmd") || s.endsWith(".ps1") || s.includes("tool")) return "terminal";
  if (s.endsWith(".py")) return "python";
  return "folder";
}

function renderIconPicker(containerId, hiddenInputId, selectedKey = "folder") {
  const container = document.getElementById(containerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!container || !hiddenInput) return;

  const activeKey = PROJECT_ICONS[selectedKey] ? selectedKey : "folder";
  hiddenInput.value = activeKey;

  container.innerHTML = Object.values(PROJECT_ICONS).map(icon => {
    const isActive = icon.id === activeKey;
    return `
      <div class="icon-picker-item ${isActive ? "active" : ""}" 
           data-icon-id="${icon.id}"
           onclick="selectIconPicker('${containerId}', '${hiddenInputId}', '${icon.id}')"
           title="${escapeHtml(icon.name)}">
        <div class="icon-svg-box" style="color: ${icon.color};">
          ${icon.svg}
        </div>
        <span class="icon-label">${escapeHtml(icon.name)}</span>
      </div>
    `;
  }).join("");
}

function selectIconPicker(containerId, hiddenInputId, iconId) {
  const container = document.getElementById(containerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!container || !hiddenInput) return;

  hiddenInput.value = iconId;
  container.querySelectorAll(".icon-picker-item").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-icon-id") === iconId);
  });
}

// 全局状态
let projects = [];
let selectedProjectId = null;
let currentDetailTab = "logs";
let statusPollTimer = null;
let logPollTimer = null;
let currentSearchQuery = "";
let currentSortMode = "name";
let cachedLogs = [];
let logFilterText = "";

// DOM 元素引用
const sidebarProjectListEl = document.getElementById("sidebarProjectList");
const sidebarEmptyEl = document.getElementById("sidebarEmpty");
const sidebarListCountEl = document.getElementById("sidebarListCount");
const totalProjectsCountEl = document.getElementById("totalProjectsCount");
const detailEmptyStateEl = document.getElementById("detailEmptyState");
const detailContentEl = document.getElementById("detailContent");
const searchInputEl = document.getElementById("searchInput");
const projectModalEl = document.getElementById("projectModal");
const globalMoreMenuEl = document.getElementById("globalMoreMenu");

// 初始化
window.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  refreshProjects(true);

  // 兜底轮询（5 秒）：主要靠后端 projects-changed 事件实时推送，轮询仅用于兼容与自愈
  statusPollTimer = setInterval(() => refreshProjects(false), 5000);

  // 每 1.5 秒同步当前选中项目的日志和运行时长
  logPollTimer = setInterval(() => {
    if (selectedProjectId && currentDetailTab === "logs") {
      fetchCurrentProjectLogs();
    }
    updateUptimeDisplay();
  }, 1500);

  // 监听来自系统托盘的快速日志事件
  if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
    window.__TAURI__.event.listen("open-project-logs", (e) => {
      if (e.payload) {
        selectProject(e.payload);
      }
    });

    // 后端推送：项目启动 / 停止 / 异常退出时立即刷新（含托盘操作引起的变化）
    window.__TAURI__.event.listen("projects-changed", () => {
      refreshProjects(false);
    });
  }
});

// 事件监听绑定
function setupEventListeners() {
  setupGlobalSettings();
  document.getElementById("btnAddProject").addEventListener("click", () => openAddModal());
  document.getElementById("btnStartAll").addEventListener("click", startAllProjects);
  document.getElementById("btnStopAll").addEventListener("click", stopAllProjects);
  document.getElementById("btnMinimize").addEventListener("click", () => invoke("hide_window"));
  document.getElementById("btnCloseApp").addEventListener("click", () => invoke("hide_window"));

  const btnBrowseScript = document.getElementById("btnBrowseScript");
  if (btnBrowseScript) {
    btnBrowseScript.addEventListener("click", browseScriptFile);
  }

  document.getElementById("btnBrowseDir").addEventListener("click", browseDirectory);
  document.getElementById("formPath").addEventListener("blur", handlePathBlur);

  // 搜索框过滤与 Ctrl+K 快捷键
  searchInputEl.addEventListener("input", (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    renderSidebarProjects();
  });

  window.addEventListener("keydown", (e) => {
    if (document.getElementById("globalSettingsDialog").open) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInputEl.focus();
      searchInputEl.select();
    }
  });

  // 全局菜单切换
  document.getElementById("btnGlobalMore").addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllDropdowns(["globalMoreMenu"]);
    globalMoreMenuEl.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    closeAllDropdowns();
  });
}

// 全局设置：使用原生 dialog 管理焦点、键盘导航和 Escape 关闭。
function setupGlobalSettings() {
  const dialog = document.getElementById("globalSettingsDialog");
  const toggle = document.getElementById("autostartToggle");
  const status = document.getElementById("settingsStatus");
  const reload = document.getElementById("btnReloadSettings");
  let busy = false;
  let savedValue = false;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("is-error", error);
  }

  async function syncSettings(enabled) {
    if (busy) return;
    busy = true;
    toggle.disabled = true;
    reload.disabled = true;
    const saving = typeof enabled === "boolean";
    setStatus(saving ? "正在保存设置…" : "正在读取系统启动设置…");
    try {
      const settings = saving
        ? await invoke("set_autostart", { enabled })
        : await invoke("get_global_settings");
      if (typeof settings.autostart !== "boolean") throw new Error("系统返回的设置无效，请重新读取。");
      savedValue = settings.autostart;
      toggle.checked = savedValue;
      toggle.disabled = false;
      setStatus(savedValue ? "已开启 · 登录后自动驻留托盘" : "已关闭 · 仅在手动打开时启动");
    } catch (error) {
      toggle.checked = savedValue;
      // 保存可能已经写入系统，读取失败时必须重新同步后才能继续操作。
      setStatus(`${saving ? "保存失败" : "读取失败"}：${error.message || error}`, true);
    } finally {
      busy = false;
      reload.disabled = false;
    }
  }

  document.getElementById("btnGlobalSettings").addEventListener("click", () => {
    closeAllDropdowns();
    dialog.showModal();
    syncSettings();
  });
  toggle.addEventListener("change", () => syncSettings(toggle.checked));
  reload.addEventListener("click", () => syncSettings());
  document.getElementById("btnCloseSettings").addEventListener("click", () => dialog.close());
  document.getElementById("btnSettingsDone").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => document.getElementById("btnGlobalSettings").focus());
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled)")];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
}

function closeAllDropdowns(excludeIds = []) {
  if (globalMoreMenuEl && !excludeIds.includes("globalMoreMenu")) {
    globalMoreMenuEl.classList.remove("show");
  }
  const heroMenu = document.getElementById("heroMoreDropdown");
  if (heroMenu && !excludeIds.includes("heroMoreDropdown")) {
    heroMenu.classList.remove("show");
  }
  document.querySelectorAll(".item-dropdown").forEach(d => {
    if (!excludeIds.includes(d.id)) {
      d.classList.remove("show");
    }
  });
}

let isAutoScroll = true;
function toggleAutoScroll() {
  isAutoScroll = !isAutoScroll;
  const btn = document.getElementById("btnStreamToggle");
  if (btn) {
    btn.classList.toggle("paused", !isAutoScroll);
  }
}

function toggleLogSearch() {
  const wrap = document.getElementById("termSearchWrap");
  if (wrap) {
    const isHidden = wrap.style.display === "none";
    wrap.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      document.getElementById("logFilterInput").focus();
    }
  }
}

function toggleTerminalFullscreen() {
  const term = document.getElementById("terminalContainer");
  if (term) {
    term.classList.toggle("fullscreen");
  }
}

function toggleHeroMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById("heroMoreDropdown");
  const willShow = !menu || !menu.classList.contains("show");
  closeAllDropdowns(willShow ? ["heroMoreDropdown"] : []);
  if (menu && willShow) {
    menu.classList.add("show");
  }
}

function toggleItemDropdown(e, id) {
  e.stopPropagation();
  const targetId = `itemMenu_${id}`;
  const menu = document.getElementById(targetId);
  const willShow = !menu || !menu.classList.contains("show");
  closeAllDropdowns(willShow ? [targetId] : []);
  if (menu && willShow) {
    menu.classList.add("show");
  }
}

// 刷新项目列表
async function refreshProjects(isInitial = false) {
  try {
    const list = await invoke("get_projects");
    projects = list || [];

    // 更新顶栏统计计数
    if (totalProjectsCountEl) totalProjectsCountEl.textContent = projects.length;
    if (sidebarListCountEl) sidebarListCountEl.textContent = `(${projects.length})`;

    // 如果未选定或者选定的项目已被删除，默认选定第一个项目
    if (!selectedProjectId && projects.length > 0) {
      selectedProjectId = projects[0].id;
    } else if (selectedProjectId && !projects.find(p => p.id === selectedProjectId)) {
      selectedProjectId = projects.length > 0 ? projects[0].id : null;
    }

    // 防抖与防闪烁：如果用户当前正展开操作下拉菜单，避免定时器刷新重构 DOM 导致浮窗瞬间消失
    const hasOpenDropdown = !!document.querySelector(".dropdown-menu.show");
    if (!isInitial && hasOpenDropdown) {
      return;
    }

    renderSidebarProjects();
    renderDetailPanel(isInitial);

    if (selectedProjectId && (isInitial || cachedLogs.length === 0)) {
      fetchCurrentProjectLogs();
    }
  } catch (err) {
    console.error("加载项目列表失败:", err);
  }
}

// 渲染左侧边栏项目列表
function renderSidebarProjects() {
  // 过滤
  let filtered = projects.filter(p => {
    if (!currentSearchQuery) return true;
    return p.name.toLowerCase().includes(currentSearchQuery) || p.path.toLowerCase().includes(currentSearchQuery);
  });

  // 排序
  if (currentSortMode === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSortMode === "status") {
    filtered.sort((a, b) => (b.status === "Running" ? 1 : 0) - (a.status === "Running" ? 1 : 0));
  }

  if (filtered.length === 0) {
    sidebarProjectListEl.innerHTML = "";
    sidebarEmptyEl.style.display = "block";
    return;
  }

  sidebarEmptyEl.style.display = "none";
  sidebarProjectListEl.innerHTML = filtered.map(p => {
    const isRunning = p.status === "Running";
    const isError = p.status === "Error";
    const statusText = isRunning ? "运行中" : (isError ? "异常" : "已停止");
    const statusClass = isRunning ? "running" : (isError ? "error" : "stopped");
    const isSelected = p.id === selectedProjectId;
    const iconMeta = getProjectIcon(p.icon);

    return `
      <div class="sidebar-item ${isSelected ? "active" : ""}" onclick="selectProject('${p.id}')">
        <div class="item-icon-box" style="color: ${iconMeta.color}; background: ${iconMeta.bg}; border-color: ${iconMeta.border};" title="${escapeHtml(iconMeta.name)}">
          ${iconMeta.svg}
        </div>
        <div class="item-info">
          <div class="item-name">${escapeHtml(p.name)}</div>
          <div class="item-path" title="${escapeHtml(p.path)}">${escapeHtml(p.path)}</div>
        </div>
        <div class="item-status-col">
          <span class="status-pill ${statusClass}">
            <span class="pill-dot"></span>
            ${statusText}
          </span>
        </div>
        <div class="item-right-actions" onclick="event.stopPropagation()">
          ${isRunning ? `
            <button class="item-btn btn-stop" title="停止项目" onclick="stopProject('${p.id}')">
              <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor"><rect x="4" y="4" width="16" height="16"/></svg>
              停止
            </button>
            <button class="item-btn btn-restart" title="重启项目" onclick="restartProject('${p.id}')">
              <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              重启
            </button>
          ` : `
            <button class="item-btn btn-start" title="启动项目" onclick="startProject('${p.id}')">
              <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              启动
            </button>
          `}
          <div class="dropdown-wrap">
            <button class="item-btn-more" title="更多操作" onclick="toggleItemDropdown(event, '${p.id}')">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>
            </button>
            <div class="dropdown-menu item-dropdown" id="itemMenu_${p.id}" onclick="event.stopPropagation()">
              <div class="dropdown-item" onclick="closeAllDropdowns(); openDir('${p.id}')">
                <svg class="dropdown-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                打开目录
              </div>
              <button type="button" class="dropdown-item visit-menu-item" onclick="closeAllDropdowns(); visitProject('${p.id}')">
          <svg class="dropdown-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
          立即访问
        </button>
        <div class="dropdown-item" onclick="closeAllDropdowns(); openEditModal('${p.id}')">
                <svg class="dropdown-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                编辑配置
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" style="color: #F87171;" onclick="closeAllDropdowns(); deleteProject('${p.id}')">
                <svg class="dropdown-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                删除项目
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// 选中项目
function selectProject(id) {
  selectedProjectId = id;
  renderSidebarProjects();
  renderDetailPanel(true);
  fetchCurrentProjectLogs();
}

// 渲染右侧详情面板
function renderDetailPanel(forceRefresh = false) {
  const project = projects.find(p => p.id === selectedProjectId);

  if (!project) {
    detailEmptyStateEl.style.display = "flex";
    detailContentEl.style.display = "none";
    return;
  }

  detailEmptyStateEl.style.display = "none";
  detailContentEl.style.display = "flex";

  const isRunning = project.status === "Running";
  const isError = project.status === "Error";
  const statusClass = isRunning ? "running" : (isError ? "error" : "stopped");
  const statusText = isRunning ? "运行中" : (isError ? "异常" : "已停止");

  // 1. Hero 概要信息
  document.getElementById("heroProjectName").textContent = project.name;
  document.getElementById("heroStatusText").textContent = statusText;
  const pillEl = document.getElementById("heroStatusPill");
  pillEl.className = `status-pill ${statusClass}`;
  document.getElementById("heroPathText").textContent = project.path;

  const iconMeta = getProjectIcon(project.icon);
  const heroFolderIcon = document.getElementById("heroFolderIcon");
  if (heroFolderIcon) {
    heroFolderIcon.style.color = iconMeta.color;
    heroFolderIcon.style.background = iconMeta.bg;
    heroFolderIcon.style.borderColor = iconMeta.border;
    heroFolderIcon.innerHTML = iconMeta.svg;
    heroFolderIcon.setAttribute("title", iconMeta.name);
  }

  // Hero 右侧按钮组：精确还原参考图的 [停止] [重启] [···]
  const heroActionsEl = document.getElementById("heroActions");
  heroActionsEl.innerHTML = `
    ${isRunning ? `
      <button class="btn btn-hero-stop" onclick="stopProject('${project.id}')">
        <svg class="btn-svg" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14"/></svg>
        停止
      </button>
      <button class="btn btn-hero-restart" onclick="restartProject('${project.id}')">
        <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        重启
      </button>
    ` : `
      <button class="btn btn-hero-start" onclick="startProject('${project.id}')">
        <svg class="btn-svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        启动
      </button>
    `}
    <div class="dropdown-wrap">
      <button class="btn btn-icon btn-hero-more" onclick="toggleHeroMenu(event)" title="更多操作">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>
      </button>
      <div class="dropdown-menu" id="heroMoreDropdown" onclick="event.stopPropagation()">
        <div class="dropdown-item" onclick="closeAllDropdowns(); openDir('${project.id}')">
          <svg class="dropdown-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          在文件管理器中打开
        </div>
        <button type="button" class="dropdown-item visit-menu-item" onclick="closeAllDropdowns(); visitProject('${project.id}')">
          <svg class="dropdown-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
          立即访问
        </button>
        <div class="dropdown-item" onclick="closeAllDropdowns(); openEditModal('${project.id}')">
          <svg class="dropdown-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          编辑项目配置
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-item" style="color: #F87171;" onclick="closeAllDropdowns(); deleteProject('${project.id}')">
          <svg class="dropdown-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          删除项目
        </div>
      </div>
    </div>
  `;

  // 2. 四张指标卡片
  document.getElementById("metricEntry").textContent = `${project.entry} ${project.args ? project.args : ""}`.trim();
  document.getElementById("metricPid").textContent = project.pid ? project.pid : "-";

  const statusDotEl = document.getElementById("metricStatusDot");
  statusDotEl.className = `status-indicator-dot ${statusClass}`;
  const statusValEl = document.getElementById("metricStatusText");
  const subStatusEl = document.getElementById("metricSubStatusText");
  if (isRunning) {
    statusValEl.textContent = "运行中";
    statusValEl.style.color = "var(--status-running)";
    if (subStatusEl) subStatusEl.textContent = "运行正常";
  } else if (isError) {
    statusValEl.textContent = "异常";
    statusValEl.style.color = "var(--status-error)";
    if (subStatusEl) subStatusEl.textContent = "进程异常退出";
  } else {
    statusValEl.textContent = "已停止";
    statusValEl.style.color = "var(--status-stopped)";
    if (subStatusEl) subStatusEl.textContent = "未启动";
  }

  updateUptimeDisplay();

  // 3. 同步内嵌配置与环境变量表单（仅在初始化切换时）
  if (forceRefresh) {
    document.getElementById("inlineName").value = project.name;
    document.getElementById("inlineEntry").value = project.entry;
    document.getElementById("inlinePath").value = project.path;
    document.getElementById("inlinePython").value = project.python_path || "";
    document.getElementById("inlineArgs").value = project.args || "";
    document.getElementById("inlineAccessUrl").value = project.access_url || "";
    document.getElementById("inlineShowInTray").checked = project.show_in_tray !== false;

    renderIconPicker("inlineIconPicker", "inlineIcon", project.icon || "folder");
    renderEnvList(project.env_vars || {});
  }
}

// 动态计算更新运行时长
function updateUptimeDisplay() {
  const project = projects.find(p => p.id === selectedProjectId);
  const uptimeEl = document.getElementById("metricUptime");
  if (!project || project.status !== "Running" || !project.start_time) {
    uptimeEl.textContent = "--";
    return;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, nowSec - project.start_time);

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (hours > 0) {
    uptimeEl.textContent = `${hours} 小时 ${minutes} 分钟`;
  } else if (minutes > 0) {
    uptimeEl.textContent = `${minutes} 分钟 ${seconds} 秒`;
  } else {
    uptimeEl.textContent = `${seconds} 秒`;
  }
}

// 切换选项卡 (logs | config | env)
function switchDetailTab(tab) {
  currentDetailTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.style.display = "none");

  if (tab === "logs") {
    document.getElementById("tabBtnLogs").classList.add("active");
    document.getElementById("panelLogs").style.display = "flex";
    document.getElementById("logsToolbar").style.display = "flex";
    fetchCurrentProjectLogs();
  } else if (tab === "config") {
    document.getElementById("tabBtnConfig").classList.add("active");
    document.getElementById("panelConfig").style.display = "block";
    document.getElementById("logsToolbar").style.display = "none";
  } else if (tab === "env") {
    document.getElementById("tabBtnEnv").classList.add("active");
    document.getElementById("panelEnv").style.display = "block";
    document.getElementById("logsToolbar").style.display = "none";
  }
}

// 获取并渲染实时日志
async function fetchCurrentProjectLogs() {
  if (!selectedProjectId) return;
  try {
    const res = await invoke("get_project_logs", { id: selectedProjectId });
    if (Array.isArray(res)) {
      cachedLogs = res;
    } else if (typeof res === "string") {
      cachedLogs = res.trim() ? res.split("\n") : [];
    } else {
      cachedLogs = [];
    }
    renderLogLines();
  } catch (err) {
    console.error("拉取日志失败:", err);
  }
}

// 渲染日志行与语法色彩
function renderLogLines() {
  const container = document.getElementById("logLinesStream");
  if (!container) return;

  let displayLines = Array.isArray(cachedLogs) ? cachedLogs : [];
  if (logFilterText) {
    displayLines = displayLines.filter(l => typeof l === "string" && l.toLowerCase().includes(logFilterText));
  }

  if (displayLines.length === 0) {
    container.innerHTML = `
      <div class="log-row">
        <span class="line-num">1</span>
        <span class="line-content" style="color: #64748B;">[系统提示] 等待日志输出...</span>
      </div>
    `;
    return;
  }

  container.innerHTML = displayLines.map((line, idx) => {
    return `
      <div class="log-row">
        <span class="line-num">${idx + 1}</span>
        <span class="line-content">${formatLogLine(line)}</span>
      </div>
    `;
  }).join("");

  // 自动滚屏
  if (isAutoScroll) {
    const body = document.getElementById("terminalBody");
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }
}

// 格式化日志行：对时间戳、[OUT]、[ERR]、[INFO]、[WARN]、[ERROR] 高亮
function formatLogLine(raw) {
  let escaped = escapeHtml(raw);

  // [OUT], [ERR], [INFO], [WARN], [ERROR]
  escaped = escaped.replace(/\[OUT\]/g, `<span class="log-tag-out">[OUT]</span>`);
  escaped = escaped.replace(/\[ERR\]/g, `<span class="log-tag-error">[ERR]</span>`);
  escaped = escaped.replace(/\[INFO\]/gi, `<span class="log-tag-info">[INFO]</span>`);
  escaped = escaped.replace(/\[WARN(?:ING)?\]/gi, `<span class="log-tag-warn">[WARN]</span>`);
  escaped = escaped.replace(/\[ERROR\]/gi, `<span class="log-tag-error">[ERROR]</span>`);

  // 时间戳 [2024-xx-xx xx:xx:xx]
  escaped = escaped.replace(/(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\])/g, `<span class="log-time">$1</span>`);

  return escaped;
}

// 过滤日志内容
function handleLogFilter(text) {
  logFilterText = text.trim().toLowerCase();
  renderLogLines();
}

// 清空当前控制台显示并清空底层独立日志文件
async function clearConsoleLog() {
  if (!selectedProjectId) return;
  try {
    await invoke("clear_project_logs", { id: selectedProjectId });
    cachedLogs = [];
    renderLogLines();
    showToast("项目日志及文件已清空！");
  } catch (err) {
    console.error("清空日志失败:", err);
    cachedLogs = [];
    renderLogLines();
  }
}

// 复制全部日志
function copyAllLogs() {
  const text = (Array.isArray(cachedLogs) ? cachedLogs : []).join("\n");
  copyText(text, "日志已全部复制到剪贴板！");
}

// 在外部记事本打开该项目独立日志文件
function openExternalLogFile() {
  if (selectedProjectId) {
    invoke("open_log_file", { id: selectedProjectId });
  }
}

// 打开全局 log 目录
function openLogsDir() {
  invoke("open_logs_dir");
}

// 复制 Hero 路径
function copyHeroPath() {
  const p = projects.find(item => item.id === selectedProjectId);
  if (p) {
    copyText(p.path, "项目根目录已复制！");
  }
}

// 排序改变
function handleSortChange(val) {
  currentSortMode = val;
  renderSidebarProjects();
}

// 通用复制与反馈
function copyText(str, msg = "已复制到剪切板！") {
  if (!str) return;
  navigator.clipboard.writeText(str).then(() => {
    showToast(msg);
  }).catch(() => {
    // 降级复制
    const ta = document.createElement("textarea");
    ta.value = str;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(msg);
  });
}

// 轻量 Toast 提示（isError 为 true 时使用红色警示样式，用于替代系统 alert 弹窗）
function showError(msg) {
  showToast(String(msg), true);
}

function showToast(msg, isError = false) {
  const existing = document.getElementById("centeToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "centeToast";
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    max-width: 420px;
    background: ${isError ? "#2A1215" : "#1E293B"};
    border: 1px solid ${isError ? "#EF4444" : "#3B82F6"};
    color: #F8FAFC;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
    word-break: break-all;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    z-index: 9999;
    animation: fadeIn 0.15s ease-out;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, isError ? 4500 : 2200);
}

// ==========================================================================
// 项目生命周期操作 (Start, Stop, Restart, Delete)
// ==========================================================================
async function startProject(id) {
  try {
    const res = await invoke("start_project", { id });
    if (res.success) {
      showToast("启动成功");
    } else {
      showError("启动失败: " + res.message);
    }
    refreshProjects();
  } catch (err) {
    showError("启动失败: " + err);
  }
}

async function stopProject(id) {
  try {
    await invoke("stop_project", { id });
    showToast("进程已停止");
    refreshProjects();
  } catch (err) {
    showError("停止失败: " + err);
  }
}

async function restartProject(id) {
  try {
    await invoke("restart_project", { id });
    showToast("正在重启...");
    refreshProjects();
  } catch (err) {
    showError("重启失败: " + err);
  }
}

async function deleteProject(id) {
  const p = projects.find(item => item.id === id);
  const name = p ? p.name : id;
  if (!confirm(`确定要从 Cente 移除项目 "${name}" 吗？（不会删除磁盘代码）`)) {
    return;
  }
  try {
    await invoke("delete_project", { id });
    showToast("项目已移除");
    if (selectedProjectId === id) {
      selectedProjectId = null;
    }
    refreshProjects();
  } catch (err) {
    showError("删除失败: " + err);
  }
}

async function openDir(id) {
  try {
    await invoke("open_project_dir", { id });
  } catch (err) {
    console.error("打开目录失败:", err);
  }
}

async function startAllProjects() {
  const stopped = projects.filter(p => p.status !== "Running");
  for (const p of stopped) {
    await invoke("start_project", { id: p.id });
  }
  showToast(`已请求启动 ${stopped.length} 个项目`);
  refreshProjects();
}

async function stopAllProjects() {
  const running = projects.filter(p => p.status === "Running");
  for (const p of running) {
    await invoke("stop_project", { id: p.id });
  }
  showToast(`已请求停止 ${running.length} 个项目`);
  refreshProjects();
}

// ==========================================================================
// 项目配置与环境变量保存
// ==========================================================================
async function saveInlineConfig() {
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) return;

  const icon = document.getElementById("inlineIcon") ? document.getElementById("inlineIcon").value : "folder";

  const updated = {
    id: project.id,
    name: document.getElementById("inlineName").value.trim(),
    path: document.getElementById("inlinePath").value.trim(),
    entry: document.getElementById("inlineEntry").value.trim(),
    python_path: document.getElementById("inlinePython").value.trim() || null,
    args: document.getElementById("inlineArgs").value.trim() || null,
    access_url: document.getElementById("inlineAccessUrl").value.trim() || null,
    show_in_tray: document.getElementById("inlineShowInTray").checked,
    env_vars: project.env_vars || null,
    icon,
  };

  try {
    await invoke("save_project", { project: updated });
    showToast("配置已更新！");
    refreshProjects();
  } catch (err) {
    showError("保存失败: " + err);
  }
}

async function browseInlineDir() {
  try {
    const selected = await invoke("select_directory");
    if (selected) {
      document.getElementById("inlinePath").value = selected;
    }
  } catch (err) {
    console.error("选择目录失败:", err);
  }
}

// 环境变量管理
function renderEnvList(envMap) {
  const container = document.getElementById("envListContainer");
  container.innerHTML = "";
  const entries = Object.entries(envMap);

  if (entries.length === 0) {
    addEnvRow("", "");
    return;
  }

  for (const [k, v] of entries) {
    addEnvRow(k, v);
  }
}

function addEnvRow(key = "", val = "") {
  const container = document.getElementById("envListContainer");
  const div = document.createElement("div");
  div.className = "env-row";
  div.innerHTML = `
    <input type="text" class="form-control env-key" placeholder="KEY (例如: PORT)" value="${escapeHtml(key)}">
    <input type="text" class="form-control env-val" placeholder="VALUE (例如: 8080)" value="${escapeHtml(val)}">
    <button type="button" class="btn btn-icon btn-xs" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);
}

async function saveEnvVars() {
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) return;

  const rows = document.querySelectorAll(".env-row");
  const envMap = {};
  rows.forEach(r => {
    const k = r.querySelector(".env-key").value.trim();
    const v = r.querySelector(".env-val").value.trim();
    if (k) {
      envMap[k] = v;
    }
  });

  const updated = {
    ...project,
    env_vars: Object.keys(envMap).length > 0 ? envMap : null,
  };

  try {
    await invoke("save_project", { project: updated });
    showToast("环境变量已保存！重启进程后生效");
    refreshProjects();
  } catch (err) {
    showError("保存环境变量失败: " + err);
  }
}

// ==========================================================================
// 模态弹窗相关 (添加/编辑项目)
// ==========================================================================
function openAddModal() {
  document.getElementById("modalTitle").textContent = "添加 Python 项目";
  document.getElementById("formProjectId").value = "";
  document.getElementById("formName").value = "";
  document.getElementById("formPath").value = "";
  document.getElementById("formPython").value = "";
  document.getElementById("formEntry").value = "";
  document.getElementById("formArgs").value = "";
  document.getElementById("formAccessUrl").value = "";
  document.getElementById("formShowInTray").checked = true;
  document.getElementById("dirDetectionHint").textContent = "";
  const scriptHint = document.getElementById("scriptSelectionHint");
  if (scriptHint) scriptHint.textContent = "";
  renderIconPicker("modalIconPicker", "formIcon", "folder");
  document.getElementById("btnSubmitProject").textContent = "保存并添加";
  projectModalEl.style.display = "flex";
}

function openEditModal(id) {
  const p = projects.find(item => item.id === id);
  if (!p) return;

  document.getElementById("modalTitle").textContent = "编辑项目配置";
  document.getElementById("formProjectId").value = p.id;
  document.getElementById("formName").value = p.name;
  document.getElementById("formPath").value = p.path;
  document.getElementById("formPython").value = p.python_path || "";
  document.getElementById("formEntry").value = p.entry;
  document.getElementById("formArgs").value = p.args || "";
  document.getElementById("formAccessUrl").value = p.access_url || "";
  document.getElementById("formShowInTray").checked = p.show_in_tray !== false;
  document.getElementById("dirDetectionHint").textContent = "";
  const scriptHint = document.getElementById("scriptSelectionHint");
  if (scriptHint) scriptHint.textContent = "";
  renderIconPicker("modalIconPicker", "formIcon", p.icon || "folder");
  document.getElementById("btnSubmitProject").textContent = "保存修改";
  projectModalEl.style.display = "flex";
}

function closeProjectModal() {
  projectModalEl.style.display = "none";
}

async function browseScriptFile() {
  try {
    const res = await invoke("select_script_file");
    if (res && res.file_path) {
      document.getElementById("formEntry").value = res.file_name;
      document.getElementById("formPath").value = res.dir_path;
      const nameInput = document.getElementById("formName");
      if (!nameInput.value.trim() && res.suggested_name) {
        nameInput.value = res.suggested_name;
      }
      const scriptHint = document.getElementById("scriptSelectionHint");
      if (scriptHint) {
        scriptHint.textContent = `✓ 已自动选择启动脚本: ${res.file_name}，目录: ${res.dir_path}`;
      }
      // 智能猜测对应项目图标
      const guessed = guessIcon(res.file_name || res.dir_path);
      selectIconPicker("modalIconPicker", "formIcon", guessed);
      triggerAutoDetect(res.dir_path);
    }
  } catch (err) {
    console.error("选择启动脚本失败:", err);
  }
}

async function browseDirectory() {
  try {
    const selected = await invoke("select_directory");
    if (selected) {
      document.getElementById("formPath").value = selected;
      const guessed = guessIcon(selected);
      selectIconPicker("modalIconPicker", "formIcon", guessed);
      triggerAutoDetect(selected);
    }
  } catch (err) {
    console.error("选择目录失败:", err);
  }
}

function handlePathBlur() {
  const path = document.getElementById("formPath").value.trim();
  if (path) {
    triggerAutoDetect(path);
  }
}

async function triggerAutoDetect(dirPath) {
  const hintEl = document.getElementById("dirDetectionHint");
  hintEl.textContent = "正在检测项目环境...";
  try {
    const detect = await invoke("detect_python_project", { dirPath });
    if (!document.getElementById("formName").value && detect.suggested_name) {
      document.getElementById("formName").value = detect.suggested_name;
    }
    if (detect.entry && !document.getElementById("formEntry").value) {
      document.getElementById("formEntry").value = detect.entry;
    }
    if (detect.python_path && !document.getElementById("formPython").value) {
      document.getElementById("formPython").value = detect.python_path;
    }

    if (detect.is_script) {
      hintEl.textContent = `✓ 已检测到启动脚本: ${detect.entry || ""}`;
    } else if (detect.has_venv) {
      hintEl.textContent = `✓ 已检测到虚拟环境: ${detect.venv_name || ".venv"}`;
    } else {
      hintEl.textContent = "未检测到独立虚拟环境，将默认使用系统全局 Python";
    }
  } catch (err) {
    hintEl.textContent = "";
  }
}

async function saveProject() {
  const id = document.getElementById("formProjectId").value.trim();
  const name = document.getElementById("formName").value.trim();
  const path = document.getElementById("formPath").value.trim();
  const entry = document.getElementById("formEntry").value.trim();
  const pythonPath = document.getElementById("formPython").value.trim();
  const args = document.getElementById("formArgs").value.trim();

  if (!name || !path || !entry) {
    showError("请填写必填项");
    return;
  }

  const existing = projects.find(p => p.id === id);
  const icon = document.getElementById("formIcon") ? document.getElementById("formIcon").value : "folder";

  const payload = {
    id: id || "",
    name,
    path,
    entry,
    python_path: pythonPath || null,
    args: args || null,
    access_url: document.getElementById("formAccessUrl").value.trim() || null,
    show_in_tray: document.getElementById("formShowInTray").checked,
    env_vars: existing ? existing.env_vars : null,
    icon,
  };

  try {
    await invoke("save_project", { project: payload });
    closeProjectModal();
    showToast("项目已保存！");
    refreshProjects();
  } catch (err) {
    showError("保存失败: " + err);
  }
}

// 辅助工具：安全防注入
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


async function visitProject(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  if (!project.access_url) {
    openEditModal(id);
    document.getElementById("formAccessUrl").focus();
    showToast("请先填写并保存项目的访问地址");
    return;
  }
  try {
    await invoke("open_project_url", { id });
  } catch (error) {
    showError("访问失败：" + error);
  }
}

// GitHub update controls. Startup checks are quiet unless a new version is found.
async function setupUpdates() {
  const repo = document.getElementById('updateRepository');
  const auto = document.getElementById('autoCheckUpdates');
  const status = document.getElementById('updateStatus');
  const notes = document.getElementById('updateNotes');
  const install = document.getElementById('installUpdate');
  const save = document.getElementById('saveUpdatePreferences');
  const check = document.getElementById('checkUpdates');
  let busy = false;
  let saved = null;
  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('is-error', error);
  }
  function lock(value) {
    busy = value;
    for (const el of [repo, auto, install, save, check]) el.disabled = value;
  }
  async function checkVersion(quiet = false) {
    if (busy || !saved) return;
    if (repo.value.trim() !== saved.repository || auto.checked !== saved.auto_check) {
      message('请先保存更新设置，再检查更新。'); return;
    }
    lock(true); install.hidden = true; notes.hidden = true;
    message('正在连接 GitHub 检查更新…');
    try {
      const release = await invoke('check_for_updates');
      if (release) {
        message(`发现新版本 ${release.version}`);
        notes.textContent = release.notes || '此版本未填写更新说明。';
        notes.hidden = false; install.hidden = false;
        if (quiet) showToast(`Cente ${release.version} 已发布，可在全局设置中更新`);
      } else message('当前已是最新正式版本。');
    } catch (e) { message(String(e.message || e), true); }
    finally { lock(false); }
  }
  save.addEventListener('click', async () => {
    if (busy) return;
    lock(true); install.hidden = true; notes.hidden = true;
    try {
      await invoke('save_update_preferences', {preferences:{repository:repo.value.trim(), auto_check:auto.checked}});
      const result = await invoke('get_update_preferences');
      saved = result[0]; repo.value = saved.repository;
      message('更新设置已保存。');
    } catch (e) { message(String(e.message || e), true); }
    finally { lock(false); }
  });
  check.addEventListener('click', () => checkVersion());
  for (const el of [repo, auto]) el.addEventListener('input', () => { install.hidden = true; notes.hidden = true; });
  install.addEventListener('click', async () => {
    if (busy || !confirm('更新将下载并校验新版，随后停止所有托管项目并重启 Cente。项目配置和日志保留，项目需要手动重新启动。现在更新吗？')) return;
    lock(true); message('正在下载并校验更新，通过后将重启 Cente…');
    try { await invoke('install_update'); }
    catch(e) { message(String(e.message || e), true); lock(false); }
  });
  try {
    const result = await invoke('get_update_preferences');
    if (!Array.isArray(result)) throw new Error('请在 Cente 桌面应用中使用程序更新。');
    saved = result[0]; repo.value = saved.repository; auto.checked = saved.auto_check;
    document.getElementById('currentAppVersion').textContent = `v${result[1]}`;
    message(saved.repository ? '点击“检查更新”获取最新正式版本。' : '请先填写 GitHub 发布仓库并保存。');
    if (saved.auto_check && saved.repository) await checkVersion(true);
  } catch(e) { message(String(e.message || e), true); }
}
window.addEventListener('DOMContentLoaded', setupUpdates);

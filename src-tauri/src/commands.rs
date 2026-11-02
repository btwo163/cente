use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use crate::models::{ProjectConfig, ProjectDetection, ProjectView, StartResult};
use crate::process_mgr::ProcessManager;
use crate::tray::update_tray_menu;

/// ProcessManager 内部已使用细粒度锁，这里不再包裹全局 Mutex，
/// 避免"一个耗时操作卡住所有命令与托盘"。
pub type AppState = Arc<ProcessManager>;

#[tauri::command]
pub fn get_projects(state: State<'_, AppState>) -> Result<Vec<ProjectView>, String> {
    Ok(state.get_project_views())
}

#[tauri::command]
pub async fn save_project(
    app: AppHandle,
    state: State<'_, AppState>,
    project: ProjectConfig,
) -> Result<(), String> {
    state.save_or_update_project(project)?;
    let _ = update_tray_menu(&app);
    Ok(())
}

#[tauri::command]
pub async fn delete_project(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    state.delete_project(&id)?;
    let _ = update_tray_menu(&app);
    Ok(())
}

#[tauri::command]
pub async fn start_project(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<StartResult, String> {
    let res = state.start_project(&id);
    let _ = update_tray_menu(&app);
    Ok(res)
}

#[tauri::command]
pub async fn stop_project(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    state.stop_project(&id)?;
    let _ = update_tray_menu(&app);
    Ok(())
}

#[tauri::command]
pub async fn restart_project(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<StartResult, String> {
    let res = state.restart_project(&id);
    let _ = update_tray_menu(&app);
    Ok(res)
}

#[tauri::command]
pub fn get_project_logs(state: State<'_, AppState>, id: String) -> Result<Vec<String>, String> {
    Ok(state.get_logs(&id))
}

#[tauri::command]
pub fn clear_project_logs(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.clear_logs(&id)
}

#[tauri::command]
pub fn open_log_file(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let path = state.get_log_file_path(&id);
    if path.exists() {
        let _ = open::that(path);
    }
    Ok(())
}

#[tauri::command]
pub fn open_project_dir(state: State<'_, AppState>, id: String) -> Result<(), String> {
    if let Some(p) = state.project_path(&id) {
        let _ = open::that(p);
    }
    Ok(())
}

#[derive(serde::Serialize)]
pub struct ScriptSelectionResult {
    pub file_path: String,
    pub dir_path: String,
    pub file_name: String,
    pub suggested_name: String,
}

#[tauri::command]
pub fn select_script_file() -> Result<Option<ScriptSelectionResult>, String> {
    let file = rfd::FileDialog::new()
        .set_title("选择启动脚本或入口文件")
        .add_filter("启动脚本与程序 (*.bat, *.cmd, *.ps1, *.py, *.exe)", &["bat", "cmd", "ps1", "py", "exe"])
        .add_filter("所有文件 (*.*)", &["*"])
        .pick_file();

    if let Some(path) = file {
        let file_path = path.to_string_lossy().to_string();
        let dir = path.parent().unwrap_or(&path).to_path_buf();
        let dir_path = dir.to_string_lossy().to_string();
        let file_name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
        let suggested_name = dir.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "my-project".to_string());

        Ok(Some(ScriptSelectionResult {
            file_path,
            dir_path,
            file_name,
            suggested_name,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn select_directory() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new()
        .set_title("选择 Python 项目目录")
        .pick_folder();

    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn detect_python_project(dir_path: String) -> Result<ProjectDetection, String> {
    Ok(ProcessManager::detect_python_project(&dir_path))
}

#[tauri::command]
pub fn hide_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    Ok(())
}

#[tauri::command]
pub async fn open_project_url(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.open_project_url(&id)
}

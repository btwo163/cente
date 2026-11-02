use std::sync::Arc;
use tauri::{Emitter, Manager};

mod commands;
mod access;
mod models;
mod process_mgr;
mod settings;
mod tray;
mod updater;

use process_mgr::ProcessManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let process_mgr = Arc::new(ProcessManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if args.iter().any(|arg| arg == "--autostart") {
                return;
            }
            // 当重复启动时，唤醒已存在的后台窗口
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.unminimize();
                let _ = main_window.set_focus();
            }
        }))
        .manage(process_mgr)
        .manage(updater::UpdateState::default())
        .setup(|app| {
            // 初始化系统托盘
            tray::create_tray(app.handle())?;

            // 拦截窗口关闭事件：点击 X 只隐藏到托盘，不真正退出进程
            if let Some(main_window) = app.get_webview_window("main") {
                let win_icon = tauri::include_image!("icons/128x128.png");
                let _ = main_window.set_icon(win_icon);
                if !std::env::args().any(|arg| arg == "--autostart") {
                    let _ = main_window.show();
                }
                let win = main_window.clone();
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            // 后台状态监听：项目启动/停止/崩溃时主动通知前端并刷新托盘，
            // 前端不必高频轮询，托盘菜单也能在进程异常退出后及时更新。
            let watcher_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last = String::new();
                loop {
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                    if let Some(state) = watcher_handle.try_state::<commands::AppState>() {
                        let sig = state.status_signature();
                        if sig != last {
                            last = sig;
                            let _ = watcher_handle.emit("projects-changed", ());
                            let _ = tray::update_tray_menu(&watcher_handle);
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            updater::get_update_preferences,
            updater::save_update_preferences,
            updater::check_for_updates,
            updater::install_update,
            settings::get_global_settings,
            settings::set_autostart,
            commands::get_projects,
            commands::save_project,
            commands::delete_project,
            commands::start_project,
            commands::stop_project,
            commands::restart_project,
            commands::get_project_logs,
            commands::clear_project_logs,
            commands::open_log_file,
            commands::open_project_dir,
            commands::open_project_url,
            commands::select_directory,
            commands::select_script_file,
            commands::detect_python_project,
            commands::hide_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Cente application")
        .run(|app_handle, event| {
            // 无论以何种方式退出，都兜底终止所有被托管的子进程，避免遗留孤儿进程占用端口
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<commands::AppState>() {
                    state.stop_all();
                }
            }
        });
}

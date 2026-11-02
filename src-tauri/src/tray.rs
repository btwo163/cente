use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

use crate::commands::AppState;

pub const TRAY_ID: &str = "cente_main_tray";

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<TrayIcon<R>, tauri::Error> {
    let menu = build_tray_menu(app)?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            handle_tray_menu_event(app, event.id().as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                toggle_main_window(app);
            }
        });

    let tray_icon = tauri::include_image!("icons/32x32.png");
    builder = builder.icon(tray_icon);

    builder.build(app)
}

pub fn update_tray_menu<R: Runtime>(app: &AppHandle<R>) -> Result<(), tauri::Error> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let menu = build_tray_menu(app)?;
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}

fn build_tray_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, tauri::Error> {
    let menu = Menu::new(app)?;

    // 1. 打开控制面板 与 实时日志
    let open_item = MenuItem::with_id(app, "open_main", "打开控制面板", true, None::<&str>)?;
    let quick_log_item = MenuItem::with_id(app, "quick_logs", "实时日志", true, None::<&str>)?;
    menu.append(&open_item)?;
    menu.append(&quick_log_item)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;

    // 2. 项目动态菜单 (<=3 个时直接平铺；>3 个时采用二级菜单)
    if let Some(state) = app.try_state::<AppState>() {
        {
            // Filter before counting so hidden projects have no titles, actions,
            // separators or effect on the flat/submenu layout.
            let projects: Vec<_> = state.get_project_views().into_iter()
                .filter(|project| project.show_in_tray).collect();
            let count = projects.len();

            if count > 0 {
                if count <= 3 {
                    // <= 3 个：平铺展示，无二级菜单
                    for p in &projects {
                        let is_running = p.status == "Running";
                        let status_text = if is_running { "运行中" } else { "已停止" };
                        
                        // 项目标题项 (点击也可直接聚焦主界面)
                        let title_item = MenuItem::with_id(
                            app,
                            format!("{}:{}", if is_running { "visit" } else { "view" }, p.id),
                            format!("{} [{}]", p.name, status_text),
                            true,
                            None::<&str>,
                        )?;
                        menu.append(&title_item)?;

                        if is_running {
                            let restart_item = MenuItem::with_id(
                                app,
                                format!("restart:{}", p.id),
                                format!("  重启 {}", p.name),
                                true,
                                None::<&str>,
                            )?;
                            let stop_item = MenuItem::with_id(
                                app,
                                format!("stop:{}", p.id),
                                format!("  停止 {}", p.name),
                                true,
                                None::<&str>,
                            )?;
                            menu.append(&restart_item)?;
                            menu.append(&stop_item)?;
                        } else {
                            let start_item = MenuItem::with_id(
                                app,
                                format!("start:{}", p.id),
                                format!("  启动 {}", p.name),
                                true,
                                None::<&str>,
                            )?;
                            menu.append(&start_item)?;
                        }

                        let log_item = MenuItem::with_id(
                            app,
                            format!("log:{}", p.id),
                            format!("  日志 {}", p.name),
                            true,
                            None::<&str>,
                        )?;
                        menu.append(&log_item)?;
                        menu.append(&PredefinedMenuItem::separator(app)?)?;
                    }
                } else {
                    // > 3 个：采用二级菜单收纳，保持菜单整洁
                    for p in &projects {
                        let is_running = p.status == "Running";
                        let status_text = if is_running { "运行中" } else { "已停止" };
                        if is_running {
                            menu.append(&MenuItem::with_id(app, format!("visit:{}", p.id),
                                format!("{} [运行中]", p.name), true, None::<&str>)?)?;
                        }
                        let submenu_title = if is_running {
                            format!("  {} · 项目操作", p.name)
                        } else { format!("{} [{}]", p.name, status_text) };
                        let sub = Submenu::new(app, &submenu_title, true)?;

                        if is_running {
                            let restart_item = MenuItem::with_id(
                                app,
                                format!("restart:{}", p.id),
                                "重启",
                                true,
                                None::<&str>,
                            )?;
                            let stop_item = MenuItem::with_id(
                                app,
                                format!("stop:{}", p.id),
                                "停止",
                                true,
                                None::<&str>,
                            )?;
                            sub.append(&restart_item)?;
                            sub.append(&stop_item)?;
                        } else {
                            let start_item = MenuItem::with_id(
                                app,
                                format!("start:{}", p.id),
                                "启动",
                                true,
                                None::<&str>,
                            )?;
                            sub.append(&start_item)?;
                        }

                        let log_item = MenuItem::with_id(
                            app,
                            format!("log:{}", p.id),
                            "实时日志",
                            true,
                            None::<&str>,
                        )?;
                        let dir_item = MenuItem::with_id(
                            app,
                            format!("dir:{}", p.id),
                            "打开目录",
                            true,
                            None::<&str>,
                        )?;
                        sub.append(&log_item)?;
                        sub.append(&dir_item)?;

                        menu.append(&sub)?;
                    }
                    menu.append(&PredefinedMenuItem::separator(app)?)?;
                }
            }
        }
    }

    // 3. 批量控制 (纯文本)
    let start_all = MenuItem::with_id(app, "start_all", "全部启动", true, None::<&str>)?;
    let stop_all = MenuItem::with_id(app, "stop_all", "全部停止", true, None::<&str>)?;
    menu.append(&start_all)?;
    menu.append(&stop_all)?;

    // 4. 退出 (纯文本)
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    let exit_item = MenuItem::with_id(app, "exit_app", "退出 Cente", true, None::<&str>)?;
    menu.append(&exit_item)?;

    Ok(menu)
}

/// 在后台线程执行耗时的进程操作，完成后刷新托盘菜单，避免阻塞托盘事件循环
fn run_in_background<R: Runtime, F>(app: &AppHandle<R>, job: F)
where
    F: FnOnce(&AppState) + Send + 'static,
{
    let app = app.clone();
    std::thread::spawn(move || {
        if let Some(state) = app.try_state::<AppState>() {
            job(state.inner());
        }
        let _ = update_tray_menu(&app);
    });
}

fn handle_tray_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    match id {
        "open_main" => {
            toggle_main_window(app);
        }
        "quick_logs" => {
            ensure_main_window_visible(app);
            if let Some(state) = app.try_state::<AppState>() {
                let views = state.get_project_views();
                let target_id = views
                    .iter()
                    .find(|v| v.status == "Running")
                    .or_else(|| views.first())
                    .map(|v| v.id.clone());
                if let Some(proj_id) = target_id {
                    let _ = app.emit("open-project-logs", proj_id);
                }
            }
        }
        "start_all" => {
            run_in_background(app, |mgr| {
                for v in mgr.get_project_views() {
                    if v.status != "Running" {
                        mgr.start_project(&v.id);
                    }
                }
            });
        }
        "stop_all" => {
            run_in_background(app, |mgr| mgr.stop_all());
        }
        "exit_app" => {
            // 安全退出：先停止所有后台子进程（RunEvent::Exit 中还会兜底再清理一次）
            if let Some(state) = app.try_state::<AppState>() {
                state.stop_all();
            }
            app.exit(0);
        }
        custom => {
            let Some((action, proj_id)) = custom.split_once(':') else {
                return;
            };
            let proj_id = proj_id.to_string();
            match action {
                "view" => ensure_main_window_visible(app),
                "visit" => run_in_background(app, move |mgr| {
                    if let Err(error) = mgr.open_project_url(&proj_id) {
                        rfd::MessageDialog::new().set_title("无法访问项目")
                            .set_description(&error).set_level(rfd::MessageLevel::Error).show();
                    }
                }),
                "start" => run_in_background(app, move |mgr| {
                    mgr.start_project(&proj_id);
                }),
                "stop" => run_in_background(app, move |mgr| {
                    let _ = mgr.stop_project(&proj_id);
                }),
                "restart" => run_in_background(app, move |mgr| {
                    mgr.restart_project(&proj_id);
                }),
                "log" => {
                    ensure_main_window_visible(app);
                    let _ = app.emit("open-project-logs", proj_id);
                }
                "dir" => {
                    if let Some(state) = app.try_state::<AppState>() {
                        if let Some(d) = state.project_path(&proj_id) {
                            let _ = open::that(d);
                        }
                    }
                }
                _ => {}
            }
        }
    }
}

pub fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
}

pub fn ensure_main_window_visible<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

// КакДела desktop: системный трей + native notifications (T-086).
//
// Поведение:
//   • close (X) → окно прячется, приложение остаётся в трее.
//   • клик по trayicon → toggle visibility.
//   • меню «Показать» — show + focus, «Выход» — app.exit(0).
//   • из JS дёргаем set_tray_badge(count) и focus_main_window().

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

const MAIN_WINDOW_LABEL: &str = "main";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            focus_main_window,
            set_tray_badge,
        ])
        .setup(|app| {
            // Глобальные хоткеи регистрируются из JS (features/voice/hotkeys.ts);
            // плагин доступен только на desktop-таргетах.
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

            let show_i = MenuItem::with_id(app, "show", "Показать", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // Иконку трея берём из default_window_icon (он же icon.ico). На
            // Windows tray-icon рендерит её 16×16, чего достаточно.
            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or("default window icon is not configured")?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("как дела")
                .menu(&menu)
                // По умолчанию click по trayicon на Windows показывает меню —
                // нам это не нужно, мы вместо этого toggle'им окно.
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Close-to-tray: перехватываем закрытие главного окна и просто
            // прячем его. Полный quit делается только через меню трея.
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("привет, {}!", name)
}

/// Вызывается из JS при клике по native-notification: показываем окно и
/// фокусируем его. Если окна нет — no-op (приложение уже закрыто).
#[tauri::command]
fn focus_main_window(app: tauri::AppHandle) {
    show_main_window(&app);
}

/// Badge с unread count поверх trayicon. В Tauri 2 нет встроенного «нарисуй
/// число поверх иконки» — самое близкое доступное на всех платформах —
/// поменять tooltip. На Windows hover на трей показывает текст, на macOS
/// `set_title` рисует букву рядом с иконкой в menu bar.
///
/// `count == 0` → возвращаем дефолтный tooltip.
#[tauri::command]
fn set_tray_badge(app: tauri::AppHandle, count: u32) {
    let Some(tray) = app.tray_by_id("main") else { return };
    let tooltip = if count == 0 {
        "как дела".to_string()
    } else if count > 99 {
        "как дела · 99+ непрочитанных".to_string()
    } else {
        format!("как дела · {} непрочитанных", count)
    };
    let _ = tray.set_tooltip(Some(&tooltip));
    // На macOS дополнительно ставим текстовый badge у menu-bar иконки;
    // на Windows `set_title` — no-op для tray (это API для menu bar).
    #[cfg(target_os = "macos")]
    {
        let title = if count == 0 {
            None
        } else if count > 99 {
            Some("99+".to_string())
        } else {
            Some(count.to_string())
        };
        let _ = tray.set_title(title.as_deref());
    }
    // Чтобы избежать unused_variables-warning на не-macOS:
    #[cfg(not(target_os = "macos"))]
    {
        let _ = count;
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else { return };
    match window.is_visible() {
        Ok(true) => {
            // is_visible не учитывает minimized: если окно «висит» в taskbar,
            // лучше показать и сфокусировать, а не спрятать.
            if window.is_minimized().unwrap_or(false) {
                let _ = window.unminimize();
                let _ = window.set_focus();
            } else if window.is_focused().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.set_focus();
            }
        }
        _ => {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
}

// КакДела: desktop — системный трей + native notifications (T-086); mobile —
// тот же webview без трея (T-100, Фаза 6). Десктопная обвязка (трей, меню,
// close-to-tray, глобальные хоткеи) изолирована под #[cfg(desktop)], чтобы
// Android-сборка линковалась без tray-icon / window API.

// Секретные чаты (T-101 крипто-ядро + T-102 локальная история) — кросс-платформенно
// (мобайл-онли по смыслу, но компилируется и на desktop ради единого cargo check).
mod commands;
mod crypto;
mod error;
mod sealed;
mod store;

#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg(desktop)]
const MAIN_WINDOW_LABEL: &str = "main";

#[cfg(desktop)]
const CALL_POPUP_LABEL: &str = "call-popup";

/// Данные текущего входящего звонка (T-087). Окно-попап (статичная страница)
/// забирает их через `get_call_popup_data` — это надёжнее, чем query-параметр
/// (никакого percent-кодирования `?`) и init-скрипта (никаких гонок инъекции).
#[derive(Default)]
struct PendingCall(std::sync::Mutex<Option<String>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(commands::CryptoState::default())
        .manage(commands::HistoryState::default())
        .manage(PendingCall::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            focus_main_window,
            set_tray_badge,
            open_call_popup,
            close_call_popup,
            get_call_popup_data,
            commands::crypto_init,
            commands::crypto_publish_keys,
            commands::crypto_topup,
            commands::crypto_process_bundle,
            commands::crypto_encrypt,
            commands::crypto_decrypt,
            commands::crypto_session_exists,
            commands::crypto_safety_number,
            commands::crypto_clear_session,
            commands::secret_history_append_outgoing,
            commands::secret_history_append_incoming,
            commands::secret_history_mark_read,
            commands::secret_history_list,
            commands::secret_history_peers,
        ])
        .setup(|app| {
            // Вся десктопная обвязка — в setup_desktop под cfg(desktop).
            #[cfg(desktop)]
            setup_desktop(app)?;
            #[cfg(not(desktop))]
            let _ = app;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ───── Desktop-only: трей, меню, close-to-tray, глобальные хоткеи ─────

#[cfg(desktop)]
fn setup_desktop(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Глобальные хоткеи (мут/деафен при свёрнутом окне) — desktop only.
    app.handle()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

    let show_i = MenuItem::with_id(app, "show", "Показать", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    // Иконку трея берём из default_window_icon (он же icon.ico). На Windows
    // tray-icon рендерит её 16×16, чего достаточно.
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("default window icon is not configured")?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip("как дела")
        .menu(&menu)
        // По умолчанию click по trayicon на Windows показывает меню — нам это не
        // нужно, мы вместо этого toggle'им окно.
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

    // Close-to-tray: перехватываем закрытие главного окна и прячем его.
    // Полный quit делается только через меню трея.
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let win_clone = window.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = win_clone.hide();
            }
        });
    }

    // Окно-попап звонка (T-087) переиспользуется: любое закрытие (Alt+F4) —
    // прячем, а не уничтожаем, иначе следующий звонок не найдёт окно.
    if let Some(popup) = app.get_webview_window(CALL_POPUP_LABEL) {
        let popup_clone = popup.clone();
        popup.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = popup_clone.hide();
            }
        });
    }

    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("привет, {}!", name)
}

/// Клик по native-notification: показать и сфокусировать окно (desktop).
/// На mobile окна-в-трее нет — no-op.
#[tauri::command]
fn focus_main_window(app: tauri::AppHandle) {
    #[cfg(desktop)]
    show_main_window(&app);
    #[cfg(not(desktop))]
    let _ = app;
}

/// Badge с unread count поверх trayicon (desktop). На mobile трея нет — no-op.
///
/// В Tauri 2 нет встроенного «нарисуй число поверх иконки» — самое близкое
/// доступное на всех desktop-платформах — поменять tooltip; на macOS также
/// ставим текстовый badge у menu-bar иконки. `count == 0` → дефолтный tooltip.
#[tauri::command]
fn set_tray_badge(app: tauri::AppHandle, count: u32) {
    #[cfg(desktop)]
    {
        let Some(tray) = app.tray_by_id("main") else { return };
        let tooltip = if count == 0 {
            "как дела".to_string()
        } else if count > 99 {
            "как дела · 99+ непрочитанных".to_string()
        } else {
            format!("как дела · {} непрочитанных", count)
        };
        let _ = tray.set_tooltip(Some(&tooltip));
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
    }
    #[cfg(not(desktop))]
    let _ = (app, count);
}

/// Входящий DM-звонок (T-087): на desktop ПОКАЗЫВАЕМ отдельное маленькое окно
/// поверх всех окон — звонок видно, даже когда КакДела свёрнут или перекрыт.
/// Окно НЕ создаём на лету (рантайм-создание второго webview на Windows виснет
/// белым) — оно заранее объявлено в tauri.conf.json (label `call-popup`,
/// visible:false) и грузит статичную public/call-popup.html. Здесь лишь кладём
/// данные в state, дёргаем страницу событием `call-popup-show` (она перечитает
/// get_call_popup_data) и показываем окно. На mobile — no-op (хватает тоста).
#[tauri::command]
fn open_call_popup(
    app: tauri::AppHandle,
    state: tauri::State<'_, PendingCall>,
    channel_id: String,
    from_name: String,
    from_avatar_url: Option<String>,
) {
    // Кладём данные звонка в app-state — попап заберёт их через get_call_popup_data.
    let json = serde_json::json!({
        "channelId": channel_id,
        "fromName": from_name,
        "fromAvatarUrl": from_avatar_url,
    })
    .to_string();
    if let Ok(mut guard) = state.0.lock() {
        *guard = Some(json);
    }
    #[cfg(desktop)]
    {
        use tauri::Emitter;
        if let Some(win) = app.get_webview_window(CALL_POPUP_LABEL) {
            // Просим (уже загруженную) страницу перечитать данные и показываем.
            let _ = win.emit("call-popup-show", ());
            let _ = win.show();
            // current_monitor знает монитор только после show — позиционируем после.
            position_call_popup(&win);
            let _ = win.set_always_on_top(true);
            let _ = win.set_focus();
        }
    }
    #[cfg(not(desktop))]
    let _ = app;
}

/// Статичная страница попапа забирает данные текущего звонка отсюда.
#[tauri::command]
fn get_call_popup_data(state: tauri::State<'_, PendingCall>) -> Option<String> {
    state.0.lock().ok().and_then(|g| g.clone())
}

/// Скрыть попап входящего звонка (после принятия/отклонения/таймаута/отмены).
/// Именно hide (не close): окно переиспользуется, не пересоздаётся.
#[tauri::command]
fn close_call_popup(app: tauri::AppHandle) {
    #[cfg(desktop)]
    {
        if let Some(win) = app.get_webview_window(CALL_POPUP_LABEL) {
            let _ = win.hide();
        }
    }
    #[cfg(not(desktop))]
    let _ = app;
}

/// Ставим попап в правый верхний угол текущего монитора с небольшим отступом.
#[cfg(desktop)]
fn position_call_popup(win: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = win.current_monitor() else {
        return;
    };
    let Ok(win_size) = win.outer_size() else {
        return;
    };
    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let margin = (16.0 * monitor.scale_factor()).round() as i32;
    let x = mon_pos.x + mon_size.width as i32 - win_size.width as i32 - margin;
    let y = mon_pos.y + margin;
    let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
}

#[cfg(desktop)]
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg(desktop)]
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

use std::sync::{Arc, Mutex, mpsc};
use std::time::Duration;

use tao::event::{Event, StartCause};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
#[cfg(target_os = "macos")]
use tao::platform::macos::{ActivationPolicy, EventLoopExtMacOS};
use tray_icon::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tray_icon::{Icon, TrayIconBuilder};

use crate::config::{self, Config};
use crate::os;
use crate::websocket::{AppStatus, TrayCommand};

pub fn run(
    status_rx: mpsc::Receiver<AppStatus>,
    tray_cmd_tx: mpsc::Sender<TrayCommand>,
    config: Arc<Mutex<Config>>,
) {
    let mut builder = EventLoopBuilder::new();
    #[allow(unused_mut)]
    let mut event_loop = builder.build();
    #[cfg(target_os = "macos")]
    event_loop.set_activation_policy(ActivationPolicy::Accessory);

    let cfg = config.lock().unwrap();
    let enabled = cfg.enabled;
    let auto_start = cfg.auto_start;
    let device_id = cfg.device_id.clone();
    let short_id = device_id[..device_id.len().min(8)].to_string();
    drop(cfg);

    let menu = Menu::new();

    let id_label = format!("Agent: {}", short_id);
    let id_item = MenuItem::new(&id_label, false, None);
    menu.append(&id_item).unwrap();
    menu.append(&PredefinedMenuItem::separator()).unwrap();

    let (enable_enabled, disable_enabled) = if enabled {
        (false, true)
    } else {
        (true, false)
    };
    let initial_tooltip = if enabled {
        format!("StreamDeck Agent ({}) - Disconnected", short_id)
    } else {
        format!("StreamDeck Agent ({}) - Disabled", short_id)
    };

    let enable_item = MenuItem::new("Enable", enable_enabled, None);
    let disable_item = MenuItem::new("Disable", disable_enabled, None);
    menu.append(&enable_item).unwrap();
    menu.append(&disable_item).unwrap();

    let enable_auto_item = MenuItem::new("Enable Auto-Start", !auto_start, None);
    let disable_auto_item = MenuItem::new("Disable Auto-Start", auto_start, None);
    menu.append(&enable_auto_item).unwrap();
    menu.append(&disable_auto_item).unwrap();

    menu.append(&PredefinedMenuItem::separator()).unwrap();

    let set_url_item = MenuItem::new("Set Server URL...", true, None);
    let set_token_item = MenuItem::new("Set Token...", true, None);
    menu.append(&set_url_item).unwrap();
    menu.append(&set_token_item).unwrap();
    menu.append(&PredefinedMenuItem::separator()).unwrap();

    let restart_item = MenuItem::new("Restart Connection", true, None);
    menu.append(&restart_item).unwrap();
    menu.append(&PredefinedMenuItem::separator()).unwrap();

    let quit_item = MenuItem::new("Quit", true, None);
    menu.append(&quit_item).unwrap();

    let icon = create_icon();

    let tray = TrayIconBuilder::new()
        .with_menu(Box::new(menu))
        .with_icon(icon)
        .with_tooltip(initial_tooltip)
        .build()
        .unwrap();

    let menu_event_rx = MenuEvent::receiver();

    let mut last_poll = std::time::Instant::now();

    let poll_interval = Duration::from_millis(200);

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::WaitUntil(
            std::time::Instant::now() + Duration::from_millis(200),
        );

        match event {
            Event::NewEvents(StartCause::Init) | Event::NewEvents(StartCause::Poll) => {
                let now = std::time::Instant::now();
                if now - last_poll < poll_interval {
                    return;
                }
                last_poll = now;

                while let Ok(menu_event) = menu_event_rx.try_recv() {
                    let id = menu_event.id;

                    if id == enable_item.id() {
                        tray_cmd_tx.send(TrayCommand::Toggle(true)).ok();
                        enable_item.set_enabled(false);
                        disable_item.set_enabled(true);
                    } else if id == disable_item.id() {
                        tray_cmd_tx.send(TrayCommand::Toggle(false)).ok();
                        enable_item.set_enabled(true);
                        disable_item.set_enabled(false);
                    } else if id == enable_auto_item.id() {
                        if os::enable_auto_start() {
                            let mut cfg = config.lock().unwrap();
                            cfg.auto_start = true;
                            config::save(&cfg);
                        }
                        enable_auto_item.set_enabled(false);
                        disable_auto_item.set_enabled(true);
                    } else if id == disable_auto_item.id() {
                        if os::disable_auto_start() {
                            let mut cfg = config.lock().unwrap();
                            cfg.auto_start = false;
                            config::save(&cfg);
                        }
                        enable_auto_item.set_enabled(true);
                        disable_auto_item.set_enabled(false);
                    } else if id == set_url_item.id() {
                        let current = config.lock().unwrap().server_url.clone();
                        if let Some(url) = tinyfiledialogs::input_box(
                            "Server URL",
                            "Enter WebSocket server URL:",
                            &current,
                        ) {
                            tray_cmd_tx.send(TrayCommand::SetUrl(url)).ok();
                        }
                    } else if id == set_token_item.id() {
                        let current = config.lock().unwrap().token.clone();
                        if let Some(t) = tinyfiledialogs::input_box(
                            "Authentication Token",
                            "Enter shared authentication token:",
                            &current,
                        ) {
                            tray_cmd_tx.send(TrayCommand::SetToken(t)).ok();
                        }
                    } else if id == restart_item.id() {
                        tray_cmd_tx.send(TrayCommand::Restart).ok();
                    } else if id == quit_item.id() {
                        tray_cmd_tx.send(TrayCommand::Quit).ok();
                        std::process::exit(0);
                    }
                }

                while let Ok(status) = status_rx.try_recv() {
                    let tooltip = match &status {
                        AppStatus::Connected => format!("StreamDeck Agent ({}) - Connected", short_id),
                        AppStatus::Reconnecting => format!("StreamDeck Agent ({}) - Reconnecting", short_id),
                        AppStatus::Disconnected => format!("StreamDeck Agent ({}) - Disconnected", short_id),
                        AppStatus::Disabled => format!("StreamDeck Agent ({}) - Disabled", short_id),
                    };
                    tray.set_tooltip(Some(&tooltip)).ok();

                    match &status {
                        AppStatus::Disabled => {
                            enable_item.set_enabled(true);
                            disable_item.set_enabled(false);
                        }
                        _ => {
                            enable_item.set_enabled(false);
                            disable_item.set_enabled(true);
                        }
                    }
                }
            }
            _ => {}
        }
    })
}

fn create_icon() -> Icon {
    let size = 32u32;
    let mut rgba = Vec::with_capacity((size * size * 4) as usize);
    let cx = size as f32 / 2.0;
    let cy = size as f32 / 2.0;
    let r = size as f32 / 2.0 - 2.0;
    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let dist = (dx * dx + dy * dy).sqrt();
            if dist <= r {
                rgba.push(0);
                rgba.push(180);
                rgba.push(60);
                rgba.push(255);
            } else {
                rgba.push(0);
                rgba.push(0);
                rgba.push(0);
                rgba.push(0);
            }
        }
    }
    Icon::from_rgba(rgba, size, size).unwrap()
}

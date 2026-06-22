use std::sync::{Arc, Mutex, mpsc};
use std::time::{Duration, Instant};

use tungstenite::Message;

use crate::command_router;
use crate::config::{self, Config};

use crate::log;

#[derive(Debug, Clone)]
pub enum TrayCommand {
    Toggle(bool),
    SetUrl(String),
    SetToken(String),
    Restart,
    Quit,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum AppStatus {
    Connected,
    Reconnecting,
    Disconnected,
    Disabled,
}

pub fn run(
    config: Arc<Mutex<Config>>,
    cmd_rx: mpsc::Receiver<TrayCommand>,
    status_tx: mpsc::Sender<AppStatus>,
) {
    let mut backoff = Duration::from_secs(1);
    let max_backoff = Duration::from_secs(30);

    loop {
        check_commands(&cmd_rx, &config);

        let (server_url, device_id, token, enabled) = {
            let cfg = config.lock().unwrap();
            (
                cfg.server_url.clone(),
                cfg.device_id.clone(),
                cfg.token.clone(),
                cfg.enabled,
            )
        };

        if !enabled {
            status_tx.send(AppStatus::Disabled).ok();
            std::thread::sleep(Duration::from_secs(1));
            continue;
        }

        log!("[streamdeck-agent] Connecting to {}", server_url);
        status_tx.send(AppStatus::Reconnecting).ok();

        match connect_to_server(&server_url, &device_id, &token, &cmd_rx, &config, &status_tx) {
            Ok(()) => {
                backoff = Duration::from_secs(1);
            }
            Err(e) => {
                log!("[streamdeck-agent] Connection failed: {}", e);
                std::thread::sleep(backoff);
                backoff = (backoff * 2).min(max_backoff);
            }
        }
    }
}

fn check_commands(
    cmd_rx: &mpsc::Receiver<TrayCommand>,
    config: &Arc<Mutex<Config>>,
) {
    while let Ok(cmd) = cmd_rx.try_recv() {
        match cmd {
            TrayCommand::Quit => std::process::exit(0),
            TrayCommand::Toggle(enabled) => {
                let mut cfg = config.lock().unwrap();
                cfg.enabled = enabled;
                config::save(&cfg);
                log!("[streamdeck-agent] Toggled: {}", enabled);
            }
            TrayCommand::SetUrl(url) => {
                let mut cfg = config.lock().unwrap();
                cfg.server_url = url;
                config::save(&cfg);
                log!("[streamdeck-agent] Server URL updated");
            }
            TrayCommand::SetToken(new_token) => {
                let mut cfg = config.lock().unwrap();
                cfg.token = new_token;
                config::save(&cfg);
                log!("[streamdeck-agent] Token updated");
            }
            TrayCommand::Restart => {
                log!("[streamdeck-agent] Connection restart requested");
            }
        }
    }
}

fn connect_to_server(
    server_url: &str,
    device_id: &str,
    token: &str,
    cmd_rx: &mpsc::Receiver<TrayCommand>,
    config: &Arc<Mutex<Config>>,
    status_tx: &mpsc::Sender<AppStatus>,
) -> Result<(), Box<dyn std::error::Error>> {
    let (mut socket, _) = tungstenite::connect(server_url)?;

    match socket.get_mut() {
        tungstenite::stream::MaybeTlsStream::Plain(tcp) => {
            tcp.set_read_timeout(Some(Duration::from_secs(15)))?;
        }
        _ => {}
    }

    log!("[streamdeck-agent] Connected");
    status_tx.send(AppStatus::Connected).ok();

    let hello = serde_json::json!({
        "type": "hello",
        "device_id": device_id,
        "token": token,
        "version": crate::VERSION,
    });
    socket.send(Message::Text(hello.to_string()))?;

    let mut last_heartbeat = Instant::now();

    loop {
        check_commands(cmd_rx, config);

        if !config.lock().unwrap().enabled {
            log!("[streamdeck-agent] Disabled, disconnecting");
            break;
        }

        match socket.read() {
            Ok(Message::Text(text)) => {
                log!("[streamdeck-agent] Command received");
                let parsed: serde_json::Value =
                    serde_json::from_str(&text).unwrap_or_default();
                let response = command_router::handle(&parsed, token);
                socket.send(Message::Text(response.to_string()))?;
            }
            Ok(Message::Ping(data)) => {
                socket.send(Message::Pong(data))?;
            }
            Ok(Message::Close(_)) => {
                log!("[streamdeck-agent] Connection closed");
                break;
            }
            Ok(Message::Pong(_)) => {
                // heartbeat response, nothing to do
            }
            Ok(_) => {
                // Binary, Frame — not used
            }
            Err(tungstenite::Error::Io(ref e))
                if e.kind() == std::io::ErrorKind::TimedOut
                    || e.kind() == std::io::ErrorKind::WouldBlock =>
            {
                if last_heartbeat.elapsed() >= Duration::from_secs(30) {
                    socket.send(Message::Ping(vec![]))?;
                    last_heartbeat = Instant::now();
                }
                // Poll for OS-level notifications and forward them
                let sys_notifs = command_router::poll_system_notifications();
                for n in &sys_notifs {
                    let msg = serde_json::json!({"type": "notification", "title": n["title"], "body": n["body"]});
                    socket.send(Message::Text(msg.to_string())).ok();
                }
            }
            Err(tungstenite::Error::ConnectionClosed) => {
                log!("[streamdeck-agent] Connection lost");
                break;
            }
            Err(tungstenite::Error::AlreadyClosed) => break,
            Err(e) => {
                log!("[streamdeck-agent] WebSocket error: {}", e);
                return Err(e.into());
            }
        }
    }

    log!("[streamdeck-agent] Disconnected");
    Ok(())
}

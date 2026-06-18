use std::sync::{Arc, Mutex, mpsc};
use std::time::Duration;

use futures_util::SinkExt;
use futures_util::StreamExt;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

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
    let cmd_rx = Mutex::new(cmd_rx);
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(run_async(config, cmd_rx, status_tx));
}

async fn run_async(
    config: Arc<Mutex<Config>>,
    cmd_rx: Mutex<mpsc::Receiver<TrayCommand>>,
    status_tx: mpsc::Sender<AppStatus>,
) {
    let mut backoff = Duration::from_secs(1);
    let max_backoff = Duration::from_secs(30);

    loop {
        check_commands(&cmd_rx, &config);

        let enabled = config.lock().unwrap().enabled;
        if !enabled {
            status_tx.send(AppStatus::Disabled).ok();
            tokio::time::sleep(Duration::from_secs(1)).await;
            continue;
        }

        let server_url = config.lock().unwrap().server_url.clone();
        let device_id = config.lock().unwrap().device_id.clone();
        let token = config.lock().unwrap().token.clone();

        log!("[streamdeck-agent] Connecting to {}", server_url);
        status_tx.send(AppStatus::Reconnecting).ok();

        match connect_async(&server_url).await {
            Ok((ws_stream, _)) => {
                log!("[streamdeck-agent] Connected");
                status_tx.send(AppStatus::Connected).ok();
                backoff = Duration::from_secs(1);

                let (mut write, mut read) = ws_stream.split();

                let hello = serde_json::json!({
                    "type": "hello",
                    "device_id": device_id,
                    "token": token,
                    "version": crate::VERSION,
                });
                write.send(Message::Text(hello.to_string())).await.ok();

                let mut heartbeat = tokio::time::interval_at(
                    tokio::time::Instant::now() + Duration::from_secs(30),
                    Duration::from_secs(30),
                );

                loop {
                    check_commands(&cmd_rx, &config);

                    if !config.lock().unwrap().enabled {
                        log!("[streamdeck-agent] Disabled, disconnecting");
                        break;
                    }

                    tokio::select! {
                        msg = read.next() => {
                            match msg {
                                Some(Ok(Message::Text(text))) => {
                                    log!("[streamdeck-agent] Command received");
                                    let parsed: serde_json::Value =
                                        serde_json::from_str(&text).unwrap_or_default();
                                    let t = config.lock().unwrap().token.clone();
                                    let response = command_router::handle(&parsed, &t);
                                    write.send(Message::Text(response.to_string())).await.ok();
                                }
                                Some(Ok(Message::Ping(data))) => {
                                    write.send(Message::Pong(data)).await.ok();
                                }
                                Some(Ok(Message::Close(_))) => {
                                    log!("[streamdeck-agent] Connection closed");
                                    break;
                                }
                                Some(Err(e)) => {
                                    log!("[streamdeck-agent] WebSocket error: {}", e);
                                    break;
                                }
                                None => {
                                    log!("[streamdeck-agent] Connection lost");
                                    break;
                                }
                                _ => {}
                            }
                        }
                        _ = heartbeat.tick() => {
                            write.send(Message::Ping(vec![])).await.ok();
                        }
                    }
                }

                write.close().await.ok();
            }
            Err(e) => {
                log!("[streamdeck-agent] Connection failed: {}", e);
                tokio::time::sleep(backoff).await;
                backoff = (backoff * 2).min(max_backoff);
            }
        }
    }
}

fn check_commands(
    cmd_rx: &Mutex<mpsc::Receiver<TrayCommand>>,
    config: &Arc<Mutex<Config>>,
) {
    let rx = cmd_rx.lock().unwrap();
    while let Ok(cmd) = rx.try_recv() {
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

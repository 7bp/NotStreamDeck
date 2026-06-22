use serde_json::{json, Value};

use crate::os;
use crate::os::OSAdapter;
use crate::log;

pub fn handle(msg: &Value, token: &str) -> Value {
    let msg_token = msg["token"].as_str().unwrap_or("");
    if msg_token != token {
        return json!({
            "id": msg["id"],
            "ok": false,
            "error": "token mismatch"
        });
    }

    let cmd_type = msg["type"].as_str().unwrap_or("");
    let id = msg["id"].clone();
    let adapter = os::CurrentOSAdapter;

    match cmd_type {
        "open_app" => {
            let name = msg["payload"]["name"].as_str().unwrap_or("");
            log!("[streamdeck-agent] open_app: {}", name);
            adapter.open_app(name);
            adapter.notify("StreamDeck Agent", &format!("Opened: {}", name));
            json!({"id": id, "ok": true, "error": null, "notification": {"title": "Opened", "body": name}})
        }
        "shell" => {
            let cmd = msg["payload"]["command"].as_str().unwrap_or("");
            log!("[streamdeck-agent] shell: {}", cmd);
            adapter.run_shell(cmd);
            adapter.notify("StreamDeck Agent", &format!("Ran: {}", cmd));
            json!({"id": id, "ok": true, "error": null, "notification": {"title": "Shell", "body": cmd}})
        }
        "hotkey" => {
            let keys: Vec<String> = msg["payload"]["keys"]
                .as_array()
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            log!("[streamdeck-agent] hotkey: {:?}", keys);
            adapter.hotkey(&keys);
            adapter.notify("StreamDeck Agent", &format!("Hotkey: {:?}", keys));
            json!({"id": id, "ok": true, "error": null, "notification": {"title": "Hotkey", "body": format!("{:?}", keys)}})
        }
        "clipboard" => {
            let text = msg["payload"]["text"].as_str().unwrap_or("");
            log!("[streamdeck-agent] clipboard: {} chars", text.len());
            adapter.set_clipboard(text);
            adapter.notify("StreamDeck Agent", "Text copied to clipboard");
            json!({"id": id, "ok": true, "error": null, "notification": {"title": "Clipboard", "body": format!("{} chars copied", text.len())}})
        }
        "volume" => {
            let level = msg["payload"]["level"].as_u64().unwrap_or(50) as u8;
            log!("[streamdeck-agent] volume: {}", level);
            adapter.set_volume(level);
            adapter.notify("StreamDeck Agent", &format!("Volume set to {}", level));
            json!({"id": id, "ok": true, "error": null, "notification": {"title": "Volume", "body": format!("Set to {}", level)}})
        }
        "lock" => {
            log!("[streamdeck-agent] lock");
            adapter.lock_screen();
            adapter.notify("StreamDeck Agent", "Screen locked");
            json!({"id": id, "ok": true, "error": null, "notification": {"title": "Lock", "body": "Screen locked"}})
        }
        "list_apps" => {
            log!("[streamdeck-agent] list_apps");
            let raw = adapter.list_apps();
            let apps: Vec<Value> = serde_json::from_str(&raw).unwrap_or_default();
            json!({"id": id, "ok": true, "error": null, "data": {"apps": apps}})
        }
        "foreground_app" => {
            log!("[streamdeck-agent] foreground_app");
            let name = adapter.foreground_app();
            json!({"id": id, "ok": true, "error": null, "data": {"name": name}})
        }
        "macro" => {
            let actions = msg["payload"]["actions"].as_array().cloned().unwrap_or_default();
            log!("[streamdeck-agent] macro: {} actions", actions.len());
            for (i, action) in actions.iter().enumerate() {
                let sub_type = action["type"].as_str().unwrap_or("");
                let sub_payload = &action["payload"];
                let sub_msg = json!({
                    "type": sub_type,
                    "payload": sub_payload,
                    "token": token,
                });
                let sub_response = execute_subcommand(&adapter, &sub_msg, sub_type);
                log!("[streamdeck-agent] macro step {}/{}: {} → ok={}", i + 1, actions.len(), sub_type, sub_response["ok"]);
            }
            adapter.notify("StreamDeck Agent", &format!("Macro: {} actions done", actions.len()));
            json!({"id": id, "ok": true, "error": null})
        }
        "media" => {
            let command = msg["payload"]["command"].as_str().unwrap_or("playpause");
            log!("[streamdeck-agent] media: {}", command);
            adapter.media_control(command);
            json!({"id": id, "ok": true, "error": null})
        }
        _ => {
            log!("[streamdeck-agent] unknown command type: {}", cmd_type);
            json!({"id": id, "ok": false, "error": "unknown command type"})
        }
    }
}

fn execute_subcommand(adapter: &os::CurrentOSAdapter, msg: &Value, cmd_type: &str) -> Value {
    match cmd_type {
        "open_app" => {
            let name = msg["payload"]["name"].as_str().unwrap_or("");
            adapter.open_app(name);
            json!({"ok": true})
        }
        "shell" => {
            let cmd = msg["payload"]["command"].as_str().unwrap_or("");
            adapter.run_shell(cmd);
            json!({"ok": true})
        }
        "hotkey" => {
            let keys: Vec<String> = msg["payload"]["keys"]
                .as_array()
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            adapter.hotkey(&keys);
            json!({"ok": true})
        }
        "clipboard" => {
            let text = msg["payload"]["text"].as_str().unwrap_or("");
            adapter.set_clipboard(text);
            json!({"ok": true})
        }
        "volume" => {
            let level = msg["payload"]["level"].as_u64().unwrap_or(50) as u8;
            adapter.set_volume(level);
            json!({"ok": true})
        }
        "lock" => {
            adapter.lock_screen();
            json!({"ok": true})
        }
        "media" => {
            let command = msg["payload"]["command"].as_str().unwrap_or("playpause");
            adapter.media_control(command);
            json!({"ok": true})
        }
        _ => json!({"ok": false, "error": "unknown sub-command type"})
    }
}

// ── Foreground app polling (called by server on a timer) ──
pub fn get_foreground_app() -> String {
    let adapter = os::CurrentOSAdapter;
    adapter.foreground_app()
}

// ── System notification mirroring ──
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread;

static NOTIF_RUNNING: AtomicBool = AtomicBool::new(false);

fn notif_queue() -> &'static Mutex<VecDeque<serde_json::Value>> {
    static Q: OnceLock<Mutex<VecDeque<serde_json::Value>>> = OnceLock::new();
    Q.get_or_init(|| {
        let mut v = VecDeque::new();
        v.reserve(50);
        Mutex::new(v)
    })
}

fn push_notif(title: &str, body: &str) {
    notif_queue().lock().unwrap().push_back(serde_json::json!({
        "title": title,
        "body": body,
    }));
}

pub fn start_notification_listener() {
    if NOTIF_RUNNING.swap(true, Ordering::Relaxed) {
        return;
    }

    thread::spawn(move || {
        #[cfg(target_os = "macos")]
        {
            use std::io::BufRead;
            // Watch usernotifictiond — the daemon that delivers actual user notifications
            if let Ok(mut child) = std::process::Command::new("log")
                .args(["stream", "--style", "json", "--predicate", "process == \"usernotifictiond\""])
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null())
                .spawn()
            {
                if let Some(stdout) = child.stdout.take() {
                    let reader = std::io::BufReader::new(stdout);
                    for line in reader.lines() {
                        let line = match line {
                            Ok(l) => l,
                            Err(_) => break,
                        };
                        if line.trim().is_empty() { continue; }
                        if let Ok(event) = serde_json::from_str::<serde_json::Value>(&line) {
                            let msg = event["eventMessage"].as_str().unwrap_or("").to_lowercase();
                            if msg.contains("deliver") || msg.contains("request") {
                                push_notif("Notification", msg);
                            }
                        }
                    }
                }
                let _ = child.wait();
            }
        }
        NOTIF_RUNNING.store(false, Ordering::Relaxed);
    });
}

pub fn poll_system_notifications() -> Vec<serde_json::Value> {
    let mut q = notif_queue().lock().unwrap();
    let mut result = Vec::new();
    while let Some(n) = q.pop_front() {
        result.push(n);
    }
    result
}

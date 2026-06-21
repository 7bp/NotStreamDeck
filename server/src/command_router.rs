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
            json!({"id": id, "ok": true, "error": null})
        }
        "shell" => {
            let cmd = msg["payload"]["command"].as_str().unwrap_or("");
            log!("[streamdeck-agent] shell: {}", cmd);
            adapter.run_shell(cmd);
            adapter.notify("StreamDeck Agent", &format!("Ran: {}", cmd));
            json!({"id": id, "ok": true, "error": null})
        }
        "hotkey" => {
            let keys: Vec<String> = msg["payload"]["keys"]
                .as_array()
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            log!("[streamdeck-agent] hotkey: {:?}", keys);
            adapter.hotkey(&keys);
            adapter.notify("StreamDeck Agent", &format!("Hotkey: {:?}", keys));
            json!({"id": id, "ok": true, "error": null})
        }
        "clipboard" => {
            let text = msg["payload"]["text"].as_str().unwrap_or("");
            log!("[streamdeck-agent] clipboard: {} chars", text.len());
            adapter.set_clipboard(text);
            adapter.notify("StreamDeck Agent", "Text copied to clipboard");
            json!({"id": id, "ok": true, "error": null})
        }
        "volume" => {
            let level = msg["payload"]["level"].as_u64().unwrap_or(50) as u8;
            log!("[streamdeck-agent] volume: {}", level);
            adapter.set_volume(level);
            adapter.notify("StreamDeck Agent", &format!("Volume set to {}", level));
            json!({"id": id, "ok": true, "error": null})
        }
        "lock" => {
            log!("[streamdeck-agent] lock");
            adapter.lock_screen();
            adapter.notify("StreamDeck Agent", "Screen locked");
            json!({"id": id, "ok": true, "error": null})
        }
        "list_apps" => {
            log!("[streamdeck-agent] list_apps");
            let raw = adapter.list_apps();
            let apps: Vec<Value> = serde_json::from_str(&raw).unwrap_or_default();
            json!({"id": id, "ok": true, "error": null, "data": {"apps": apps}})
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

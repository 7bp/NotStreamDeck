use super::OSAdapter;

pub struct MacOSAdapter;

impl OSAdapter for MacOSAdapter {
    fn open_app(&self, name: &str) {
        std::process::Command::new("open")
            .args(["-a", name])
            .spawn()
            .ok();
    }

    fn run_shell(&self, cmd: &str) {
        std::process::Command::new("/bin/sh")
            .args(["-c", cmd])
            .spawn()
            .ok();
    }

    fn hotkey(&self, keys: &[String]) {
        if keys.is_empty() {
            return;
        }

        let mut modifiers: Vec<&str> = Vec::new();
        let mut main_key = String::new();

        for k in keys {
            match k.to_lowercase().as_str() {
                "cmd" | "command" => modifiers.push("command down"),
                "ctrl" | "control" => modifiers.push("control down"),
                "alt" | "option" | "opt" => modifiers.push("option down"),
                "shift" => modifiers.push("shift down"),
                _ => main_key = k.clone(),
            }
        }

        let modifier_str = if modifiers.is_empty() {
            String::new()
        } else {
            format!(" using {{{}}}", modifiers.join(", "))
        };

        let script = format!(
            r#"tell application "System Events" to keystroke "{}"{}"#,
            main_key, modifier_str
        );

        std::process::Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .ok();
    }

    fn notify(&self, title: &str, body: &str) {
        let script = format!(
            r#"display notification "{}" with title "{}""#,
            body.replace('"', "\\\""),
            title.replace('"', "\\\"")
        );
        std::process::Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .ok();
    }

    fn set_clipboard(&self, text: &str) {
        let script = format!(
            r#"set the clipboard to "{}""#,
            text.replace('"', "\\\"").replace('\n', "\\n")
        );
        std::process::Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .ok();
    }

    fn set_volume(&self, level: u8) {
        let script = format!("set volume output volume {}", level.min(100));
        std::process::Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .ok();
    }

    fn lock_screen(&self) {
        std::process::Command::new("pmset")
            .args(["displaysleepnow"])
            .spawn()
            .ok();
    }

    fn media_control(&self, command: &str) {
        // Try nowplaying-cli first (macOS 14+)
        let np_cmd = match command {
            "playpause" => Some("togglePlayPause"),
            "next" => Some("nextTrack"),
            "prev" => Some("previousTrack"),
            _ => None,
        };
        if let Some(sub) = np_cmd {
            if std::process::Command::new("nowplaying-cli")
                .args([sub])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                return;
            }
        }

        // Fallback: key codes
        let key_code = match command {
            "playpause" => Some(16u16),
            "next" => Some(17),
            "prev" => Some(18),
            _ => None,
        };
        if let Some(code) = key_code {
            let script = format!(
                r#"tell application "System Events" to key code {}"#,
                code
            );
            std::process::Command::new("osascript")
                .args(["-e", &script])
                .spawn()
                .ok();
        }
    }

    fn nowplaying(&self) -> String {
        // Try system-wide nowplaying-cli (macOS 14+ Sonoma) — no app launch
        if let Ok(out) = std::process::Command::new("nowplaying-cli")
            .args(["get"])
            .output()
        {
            if out.status.success() {
                let raw = String::from_utf8_lossy(&out.stdout);
                let mut title = String::new();
                let mut artist = String::new();
                for line in raw.lines() {
                    let line = line.trim();
                    if let Some(t) = line.strip_prefix("title: ") {
                        title = t.trim_matches('"').to_string();
                    } else if let Some(a) = line.strip_prefix("artist: ") {
                        artist = a.trim_matches('"').to_string();
                    }
                }
                if !title.is_empty() {
                    return format!("{}\t{}", title, artist);
                }
            }
        }

        // Fallback: only query apps that are already running
        let app_running = |name: &str| -> bool {
            std::process::Command::new("pgrep")
                .args(["-i", name])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        };

        if app_running("Music") {
            if let Ok(out) = std::process::Command::new("osascript")
                .args(["-e", r#"tell application "Music" to get {name, artist} of current track"#])
                .output()
            {
                if out.status.success() {
                    let raw = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !raw.is_empty() {
                        let parts: Vec<&str> = raw.splitn(2, ", ").collect();
                        let t = parts.first().unwrap_or(&"").trim().to_string();
                        let a = parts.get(1).unwrap_or(&"").trim().to_string();
                        if !t.is_empty() { return format!("{}\t{}", t, a); }
                    }
                }
            }
        }

        if app_running("Spotify") {
            if let Ok(out) = std::process::Command::new("osascript")
                .args(["-e", r#"tell application "Spotify" to get {name, artist} of current track"#])
                .output()
            {
                if out.status.success() {
                    let raw = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !raw.is_empty() {
                        let parts: Vec<&str> = raw.splitn(2, ", ").collect();
                        let t = parts.first().unwrap_or(&"").trim().to_string();
                        let a = parts.get(1).unwrap_or(&"").trim().to_string();
                        if !t.is_empty() { return format!("{}\t{}", t, a); }
                    }
                }
            }
        }

        String::new()
    }

    fn list_apps(&self) -> String {
        use serde_json::json;
        let mut apps: Vec<serde_json::Value> = Vec::new();
        let dirs = [
            "/Applications",
            "/Applications/Utilities",
            "/System/Applications",
            "/System/Applications/Utilities",
        ];
        if let Ok(home) = std::env::var("HOME") {
            let user_apps = format!("{}/Applications", home);
            for dir in dirs.iter().chain(std::iter::once(&user_apps.as_str())) {
                if let Ok(entries) = std::fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.extension().and_then(|e| e.to_str()) == Some("app") {
                            if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                                apps.push(json!({"name": name, "path": path.to_string_lossy().to_string()}));
                            }
                        }
                    }
                }
            }
        } else {
            for dir in &dirs {
                if let Ok(entries) = std::fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.extension().and_then(|e| e.to_str()) == Some("app") {
                            if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                                apps.push(json!({"name": name, "path": path.to_string_lossy().to_string()}));
                            }
                        }
                    }
                }
            }
        }
        serde_json::to_string(&apps).unwrap_or_default()
    }

    fn network_scan(&self) -> String {
        use serde_json::json;

        let mut devices: Vec<serde_json::Value> = Vec::new();
        // Use arp -a (with DNS lookups) for real hostnames; takes ~15s once, cached thereafter
        if let Ok(out) = std::process::Command::new("arp").args(["-a"]).output() {
            let raw = String::from_utf8_lossy(&out.stdout);
            for line in raw.lines() {
                let line = line.trim();
                if line.is_empty() { continue; }
                let ip = line.split('(').nth(1).and_then(|s| s.split(')').next()).unwrap_or("").to_string();
                let mac = line.split(" at ").nth(1).and_then(|s| s.split(' ').next()).unwrap_or("").to_string();
                if ip.is_empty() { continue; }
                let raw_hostname = line.split(' ').next().unwrap_or("?").trim().trim_start_matches('?').to_string();
                let hostname = raw_hostname.split('.').next().unwrap_or(&raw_hostname).to_string();
                devices.push(json!({"ip": ip, "mac": mac, "hostname": hostname, "type": "ethernet"}));
            }
        }

        // Parallel reverse DNS for entries with no hostname
        let to_resolve: Vec<String> = devices.iter()
            .filter(|d| d["hostname"].as_str().map(|s| s.is_empty()).unwrap_or(true))
            .filter_map(|d| d["ip"].as_str().map(|s| s.to_string()))
            .collect();

        if !to_resolve.is_empty() {
            use std::collections::HashMap;
            use std::sync::{Arc, Mutex};

            let resolved = Arc::new(Mutex::new(HashMap::<String, String>::new()));
            let mut handles = vec![];
            for ip in to_resolve {
                let resolved = Arc::clone(&resolved);
                handles.push(std::thread::spawn(move || {
                    if let Ok(out) = std::process::Command::new("host")
                        .args(["-W", "2", &ip])
                        .output()
                    {
                        if out.status.success() {
                            let raw = String::from_utf8_lossy(&out.stdout);
                            if let Some(ptr) = raw.split("pointer ").nth(1) {
                                let name = ptr.trim().trim_end_matches('.').to_string();
                                let short = name.split('.').next().unwrap_or(&name).to_string();
                                if !short.is_empty() {
                                    resolved.lock().unwrap().insert(ip.to_string(), short);
                                }
                            }
                        }
                    }
                }));
            }
            for h in handles { h.join().ok(); }
            let resolved_map = resolved.lock().unwrap();
            for d in devices.iter_mut() {
                if let Some(ip) = d["ip"].as_str() {
                    if let Some(hostname) = resolved_map.get(ip) {
                        d["hostname"] = json!(hostname);
                    }
                }
            }
        }

        serde_json::to_string(&json!({"devices": devices})).unwrap_or_default()
    }
}

// ── macOS auto-start via LaunchAgent ──

pub fn enable_auto_start() -> bool {
    let exe_path = match std::env::current_exe() {
        Ok(p) => p,
        Err(_) => return false,
    };
    let home = match std::env::var("HOME") {
        Ok(h) => h,
        Err(_) => return false,
    };
    let dir = format!("{}/Library/LaunchAgents", home);
    std::fs::create_dir_all(&dir).ok();
    let plist = format!("{}/com.streamdeck.agent.plist", dir);

    let content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
<key>Label</key>
<string>com.streamdeck.agent</string>
<key>ProgramArguments</key>
<array><string>{}</string></array>
<key>RunAtLoad</key>
<true/>
<key>KeepAlive</key>
<true/>
</dict>
</plist>"#,
        exe_path.to_string_lossy().replace('"', "&quot;")
    );
    std::fs::write(&plist, content).ok();
    std::process::Command::new("launchctl")
        .args(["load", "-w", &plist])
        .status()
        .ok()
        .map(|s| s.success())
        .unwrap_or(false)
}

pub fn disable_auto_start() -> bool {
    let home = match std::env::var("HOME") {
        Ok(h) => h,
        Err(_) => return false,
    };
    let plist = format!("{}/Library/LaunchAgents/com.streamdeck.agent.plist", home);
    std::process::Command::new("launchctl")
        .args(["unload", "-w", &plist])
        .status()
        .ok();
    std::fs::remove_file(&plist).ok();
    true
}

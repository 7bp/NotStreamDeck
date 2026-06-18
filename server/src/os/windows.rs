use super::OSAdapter;

pub struct WindowsAdapter;

impl OSAdapter for WindowsAdapter {
    fn open_app(&self, name: &str) {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", name])
            .spawn()
            .ok();
    }

    fn run_shell(&self, cmd: &str) {
        std::process::Command::new("cmd")
            .args(["/C", cmd])
            .spawn()
            .ok();
    }

    fn hotkey(&self, keys: &[String]) {
        let _ = keys;
        println!("[streamdeck-agent] hotkey not implemented on Windows");
    }

    fn notify(&self, title: &str, body: &str) {
        let script = format!(
            r#"[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');
$n=New-Object System.Windows.Forms.NotifyIcon;
$n.Icon=[System.Drawing.Icon]::ExtractAssociatedIcon((Get-Process -Id $pid).MainModule.FileName);
$n.BalloonTipText='{body}';
$n.BalloonTipTitle='{title}';
$n.BalloonTipIcon='Info';
$n.Visible=$true;
$n.ShowBalloonTip(3000);
Start-Sleep 2;
$n.Dispose()"#,
            title = title.replace('\'', "''"),
            body = body.replace('\'', "''")
        );
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .spawn()
            .ok();
    }

    fn set_clipboard(&self, text: &str) {
        let script = format!(
            r#"Set-Clipboard -Value "{}""#,
            text.replace('"', "''")
        );
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .spawn()
            .ok();
    }

    fn set_volume(&self, level: u8) {
        let script = format!(
            r#"$(New-Object -ComObject WScript.Shell).SendKeys([char]173); Start-Sleep -m 50;
for($i=0;$i -lt 50;$i++){{$(New-Object -ComObject WScript.Shell).SendKeys([char]174)}}
for($i=0;$i -lt {level};$i++){{$(New-Object -ComObject WScript.Shell).SendKeys([char]176); Start-Sleep -m 10}}"#,
            level = level
        );
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .spawn()
            .ok();
    }

    fn lock_screen(&self) {
        std::process::Command::new("rundll32.exe")
            .args(["user32.dll,LockWorkStation"])
            .spawn()
            .ok();
    }

    fn nowplaying(&self) -> String {
        // Simple polling via PowerShell for media info
        let script = r#"$s=Get-CimInstance -Namespace Root/WMI -Class MSiSCSI_MediaInfo 2>$null;
if($s -and $s.Title){$s.Title + "`t" + $s.Artist}else{''}"#;
        if let Ok(out) = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NoLogo", "-Command", script])
            .output()
        {
            let raw = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !raw.is_empty() && raw != "''" {
                return raw;
            }
        }
        String::new()
    }

    fn list_apps(&self) -> String {
        // Windows stub — return desktop shortcuts or Start Menu apps
        String::new()
    }

    fn media_control(&self, command: &str) {
        let key = match command {
            "playpause" => "179",
            "next" => "176",
            "prev" => "177",
            _ => return,
        };
        // Simulate media key via PowerShell
        let script = format!(
            r#"[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');
[System.Windows.Forms.SendKeys]::SendWait({{{}}})"#,
            key
        );
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .spawn()
            .ok();
    }
}

// ── Windows auto-start via Registry ──

pub fn enable_auto_start() -> bool {
    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(_) => return false,
    };
    let exe_str = exe.to_string_lossy();
    let status = std::process::Command::new("reg")
        .args([
            "add",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "/v",
            "StreamDeck Agent",
            "/d",
            &exe_str,
            "/f",
        ])
        .status()
        .ok();
    status.map(|s| s.success()).unwrap_or(false)
}

pub fn disable_auto_start() -> bool {
    let status = std::process::Command::new("reg")
        .args([
            "delete",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "/v",
            "StreamDeck Agent",
            "/f",
        ])
        .status()
        .ok();
    status.map(|s| s.success()).unwrap_or(false)
}

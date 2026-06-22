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

    fn list_apps(&self) -> String {
        use serde_json::json;
        let script = r#"
$dirs = @(
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "${env:ProgramFiles}\WindowsApps",
    "$env:LOCALAPPDATA\Microsoft\WindowsApps"
)
$apps = @()
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Get-ChildItem "$dir\*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($_.FullName)
            $name = $shortcut.TargetPath -replace '\.exe$',''
            if ($name) {
                $apps += [PSCustomObject]@{ name = (Get-Item $_.FullName).BaseName; path = $shortcut.TargetPath }
            }
        }
    }
}
$dirs2 = @("${env:ProgramFiles}", "${env:ProgramFiles(x86)}")
foreach ($dir in $dirs2) {
    if (Test-Path $dir) {
        Get-ChildItem "$dir\*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
            $apps += [PSCustomObject]@{ name = $_.BaseName; path = $_.FullName }
        }
    }
}
$apps | Sort-Object name -Unique | ConvertTo-Json -Compress
"#;
        if let Ok(out) = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NoLogo", "-Command", script])
            .output()
        {
            let raw = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !raw.is_empty() {
                return raw;
            }
        }
        String::new()
    }

    fn foreground_app(&self) -> String {
        let script = r#"Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Foreground {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
"@
$hwnd = [Foreground]::GetForegroundWindow()
$pid = 0
[void][Foreground]::GetWindowThreadProcessId($hwnd, [ref]$pid)
try { (Get-Process -Id $pid).ProcessName } catch { '' }
"#;
        if let Ok(out) = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NoLogo", "-Command", script])
            .output()
        {
            if out.status.success() {
                return String::from_utf8_lossy(&out.stdout).trim().to_string();
            }
        }
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

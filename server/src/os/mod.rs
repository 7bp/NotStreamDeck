pub trait OSAdapter {
    fn open_app(&self, name: &str);
    fn run_shell(&self, cmd: &str);
    fn hotkey(&self, keys: &[String]);
    fn notify(&self, title: &str, body: &str);
    fn set_clipboard(&self, text: &str);
    fn set_volume(&self, level: u8);
    fn lock_screen(&self);
    fn list_apps(&self) -> String;
    fn foreground_app(&self) -> String;
    fn media_control(&self, command: &str);
}

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::WindowsAdapter as CurrentOSAdapter;

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::MacOSAdapter as CurrentOSAdapter;

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
compile_error!("Only Windows and macOS are supported");

// ── Auto-start helpers ──

#[cfg(target_os = "macos")]
pub fn enable_auto_start() -> bool { macos::enable_auto_start() }
#[cfg(target_os = "macos")]
pub fn disable_auto_start() -> bool { macos::disable_auto_start() }

#[cfg(target_os = "windows")]
pub fn enable_auto_start() -> bool { windows::enable_auto_start() }
#[cfg(target_os = "windows")]
pub fn disable_auto_start() -> bool { windows::disable_auto_start() }

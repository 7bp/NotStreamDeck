mod command_router;
mod config;
mod os;
mod tray;
mod websocket;

pub const VERSION: &str = "1.0.0";

#[macro_export]
macro_rules! log {
    ($($arg:tt)*) => {
        #[cfg(debug_assertions)]
        println!($($arg)*);
    };
}

use std::sync::{Arc, Mutex, mpsc};

fn main() {
    let config = Arc::new(Mutex::new(config::load_or_create()));

    let (tray_cmd_tx, tray_cmd_rx) = mpsc::channel();
    let (status_tx, status_rx) = mpsc::channel();

    let ws_config = Arc::clone(&config);
    std::thread::spawn(move || {
        websocket::run(ws_config, tray_cmd_rx, status_tx);
    });

    tray::run(status_rx, tray_cmd_tx, config);
}

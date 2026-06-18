use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    pub server_url: String,
    pub token: String,
    pub device_id: String,
    pub enabled: bool,
    pub auto_start: bool,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            server_url: "ws://127.0.0.1:8080".to_string(),
            token: "shared-secret".to_string(),
            device_id: uuid::Uuid::new_v4().to_string(),
            enabled: true,
            auto_start: false,
        }
    }
}

pub fn config_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("streamdeck-agent").join("config.json")
}

pub fn load_or_create() -> Config {
    let path = config_path();
    if path.exists() {
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        let config = Config::default();
        save(&config);
        config
    }
}

pub fn save(config: &Config) {
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let content = serde_json::to_string_pretty(config).unwrap();
    std::fs::write(&path, content).ok();
}

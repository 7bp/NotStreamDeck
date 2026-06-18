# NotStreamDeck

A cross-platform Stream Deck alternative: a Rust background agent that executes remote commands, and a Node.js control server with a React frontend for configuring and triggering stream-deck-style grid actions.

Copyright (c) 2026 NotStreamDeck

## Architecture

```
┌─────────────────────┐     WebSocket      ┌──────────────────────┐
│  Rust Agent         │◄──────────────────►│  Control Server      │
│  (one per machine)  │   :8080            │  Express + ws        │
│                     │                    │  :3000 (HTTP + WS)   │
│  - Receives cmds    │                    │  :8080 (agent WS)    │
│  - Executes actions │                    │                      │
│  - Reports status   │                    │  React Frontend      │
└─────────────────────┘                    │  (served as static)  │
                                           └──────────────────────┘
```

**Agent** — Rust binary, no Electron/Node runtime, one binary per OS, connects to the control server via WebSocket, authenticates with a shared token, executes commands on the host machine.

**Control Server** — Node.js Express server with dual WebSocket (agents on `:8080`, frontends on `:3000/ws`), JSON file persistence in `data.json`, serves the React frontend.

## Ports

All ports are adjustable via environment variables or `data.json`:

| Port | Default | Env Var | data.json key | Purpose |
|------|---------|---------|---------------|---------|
| HTTP | `3000` | `PORT` or `HTTP_PORT` | `http_port` | Control server (frontend + REST) |
| Agent WS | `8080` | `WS_PORT` | `ws_port` | Agent WebSocket |

**Priority**: environment variable → `data.json` → default value.

To run on different ports:

```bash
PORT=8080 WS_PORT=9090 node server.js
# HTTP on :8080, Agent WS on :9090
```

The agent connects to `ws://<server>:<ws_port>`. Configure the agent's `server_url` via the system tray menu ("Set Server URL...") or by editing `config.json`:

```json
{
  "server_url": "ws://192.168.1.50:9090",
  "token": "shared-secret",
  ...
}
```

## Features

### Key Types (12)
| Type | Description |
|------|-------------|
| `open_app` | Launch an application (dropdown of installed apps fetched from agent) |
| `shell` | Run any shell command |
| `hotkey` | Simulate keyboard shortcuts (Cmd+C, Ctrl+Alt+Del, etc.) |
| `clipboard` | Copy text to clipboard |
| `volume` | Set system volume (0–100) |
| `lock` | Lock the screen |
| `timer` | Client-side countdown (5–3600s), tap to start/pause |
| `weather` | Display weather for a location (fetches from wttr.in) |
| `macro` | Sequence of sub-actions executed in order |
| `navigate` | Frontend-only page navigation (home/next/prev/by name/by index) |
| `media` | Media playback control (play/pause, next, previous) |

### Grid & Pages
- Fixed-size rounded icons with labels, no button borders
- Background image per page
- CSS Grid layout with configurable columns/rows
- Page-level host pinning (page only shows when host is online)
- Keys grey out when target host is offline

### Host Management
- Auto-register hosts on agent connection (WebSocket hello with device_id + token)
- Host status tracking (online/offline, last seen, version)
- Version tracking — outdated agents shown with ❗ indicator
- Manual add/edit/delete hosts

### Lock Screen & Access Control
- Server-side PIN verification (`POST /api/verify-pin`) — default PIN: `000000`
- IP whitelist — non-whitelisted IPs see a lock screen
- PIN unlocks edit mode or opens full setup
- Screensaver hidden when IP-restricted

### Screensaver (11 Modes)
Digital Clock, Ambient Gradient, Weather, Icon Slideshow, Starfield, Network Pulse, Date & Quote, Photo Slideshow, Bouncing Logo, **Network Diagram**, Cycle All. Network Diagram shows live LAN devices with animated orthogonal connections, real hostnames, and traveling data packets.

### Now Playing
- Polls system-wide nowplaying-cli (macOS 14+) every 10s
- AppleScript fallback for Music.app/Spotify (guarded by pgrep — won't launch apps)
- Displayed between hosts bar and grid

### Import / Export
Export all pages and keys as a JSON file, import to restore or transfer configurations between instances.

### Agent

| Feature | macOS | Windows |
|---------|-------|---------|
| open_app | ✓ `open -a` | stub |
| shell | ✓ `sh -c` | stub |
| hotkey | ✓ `osascript` | stub |
| notify | ✓ `osascript` | stub |
| clipboard | ✓ `pbcopy` | stub |
| volume | ✓ `osascript` | stub |
| lock | ✓ `/System/Library/.../ScreenSaver.app` | stub |
| nowplaying | ✓ `nowplaying-cli` + AppleScript | stub |
| list_apps | ✓ `/Applications` scan | stub |
| network_scan | ✓ `arp -a` + parallel `host` | stub |
| media_control | ✓ `nowplaying-cli` + key codes | stub |

## Getting Started

### Prerequisites

- **macOS** (agent), or cross-compile for Windows
- **Node.js** 18+ (control server)
- **Rust** toolchain (agent build)

### 1. Build the Agent

```bash
cd server
cargo build --release
# Binary at: target/release/streamdeck-agent
```

Cross-compile for Windows:
```bash
PATH="/Users/bp/.cargo/bin:$PATH" cargo build --target x86_64-pc-windows-gnu --release
```

### 2. Install & Build the Control Server

```bash
cd control
npm install
cd client && npm install && npm run build && cd ..
# Or just: cd client && npm install && npm run build
```

### 3. Run

```bash
# Start the control server
cd control
node server.js
# Server on http://localhost:3000
# Agent WebSocket on :8080

# Start the agent (in another terminal)
cd server
./target/release/streamdeck-agent
```

The agent connects to `ws://127.0.0.1:8080` by default. Configure via system tray menu (right-click icon → Set Server URL / Set Token).

### 4. Open the UI

Open `http://localhost:3000` in a browser.

- Default PIN to enter setup: **000000**
- Settings → Access Control to restrict by IP
- Pages tab to add/edit pages and keys

## Configuration

### Agent (`~/Library/Application Support/streamdeck-agent/config.json`)
```json
{
  "server_url": "ws://127.0.0.1:8080",
  "token": "shared-secret",
  "device_id": "uuid",
  "enabled": true,
  "auto_start": false
}
```

### Control Server (`control/data.json`)
```json
{
  "token": "shared-secret",
  "ws_port": 8080,
  "http_port": 3000,
  "pin": "000000",
  "allowedIPs": [],
  "hosts": [],
  "pages": [...]
}
```

## Project Structure

```
poorsteamdeck/
├── server/                          # Rust agent
│   ├── Cargo.toml
│   ├── .cargo/config.toml           # Windows cross-compile linker
│   └── src/
│       ├── main.rs                  # Entry point, VERSION const
│       ├── config.rs                # Config load/save
│       ├── websocket.rs             # WebSocket client, auto-reconnect
│       ├── tray.rs                  # System tray menu
│       ├── command_router.rs        # Route commands to OS adapters
│       └── os/
│           ├── mod.rs               # OSAdapter trait
│           ├── macos.rs             # macOS implementations
│           └── windows.rs           # Windows stubs
│
└── control/                         # Control server (Node.js)
    ├── server.js                    # Express + dual WebSocket
    ├── store.js                     # JSON persistence
    ├── data.json                    # Runtime data
    ├── package.json
    └── client/
        ├── package.json
        ├── vite.config.js
        └── src/
            ├── App.jsx              # App root, PIN verify, state
            ├── hooks/useApi.js      # API hooks + WebSocket
            └── components/
                ├── StreamDeck.jsx   # Grid layout + hosts bar
                ├── KeyButton.jsx    # Key icon/label renderer
                ├── KeyEditor.jsx    # Per-type key editor
                ├── PageManager.jsx  # Page CRUD + add key form
                ├── SetupPanel.jsx   # Tabs: Pages/Hosts/Settings
                ├── Screensaver.jsx  # 11 screensaver modes
                └── HostManager.jsx  # Host CRUD
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Get config (token stripped) |
| PUT | `/api/config` | Update config |
| GET | `/api/version` | Server version |
| GET | `/api/hosts` | List hosts |
| POST | `/api/hosts` | Add host |
| PUT | `/api/hosts/:id` | Update host |
| DELETE | `/api/hosts/:id` | Delete host |
| GET | `/api/pages` | List pages |
| POST | `/api/pages` | Add page |
| PUT | `/api/pages/:id` | Update page |
| DELETE | `/api/pages/:id` | Delete page |
| POST | `/api/pages/export` | Export all pages (no IDs) |
| POST | `/api/pages/import` | Import pages (replaces all) |
| POST | `/api/pages/:pageId/keys` | Add key to page |
| PUT | `/api/keys/:id` | Update key |
| DELETE | `/api/keys/:id` | Delete key |
| POST | `/api/execute/:keyId` | Execute a key action on its host |
| POST | `/api/verify-pin` | Verify PIN `{ pin: "..." }` |
| POST | `/api/nowplaying/:hostId` | Get now-playing from agent |
| POST | `/api/list-apps/:hostId` | List installed apps from agent |
| POST | `/api/network-scan/:hostId` | Trigger network scan on agent |
| GET | `/api/network-data` | Cached network scan results |
| GET | `/api/myip` | Client IP address |
| POST | `/api/upload` | Upload an image file |

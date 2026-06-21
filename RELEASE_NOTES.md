## v0.1.9

- Fix: replace tokio async WebSocket with blocking tungstenite to eliminate ~5% idle CPU on Windows. The tokio runtime's I/O driver (even single-threaded) burned cycles polling for IOCP events. Blocking `socket.read()` with a 15s timeout parks the thread in the kernel's `recv()` syscall — near 0% CPU when idle.
- Removed: `tokio`, `tokio-tungstenite`, `futures-util` dependencies (replaced by bare `tungstenite`)

## v0.1.8

- Fix: switch tokio runtime to single-threaded (`current_thread`) to eliminate ~5% idle CPU usage on Windows — `Runtime::new()` spawns `num_cpus` worker threads that burn cycles even when idle
- Fix: remove nowplaying PowerShell WMI query on Windows — the `MSiSCSI_MediaInfo` class is for iSCSI storage, not media playback, so it always returned empty while spawning powershell.exe every 10s

## v0.1.7

- Fix: anchor `pgrep Music` regex with `^...$` to prevent AppleScript false-positive launches — substring match could hit a background daemon, then `tell application "Music"` would launch Music.app
- Docs: screenshot gallery in README

## v0.1.6

- Fix: move dim timer `useEffect` after `dimTimeout` declaration to fix the real TDZ root cause — `const dimTimeout` was referenced in a dependency array earlier in the same scope, triggering `Cannot access 'W' before initialization` in production builds

## v0.1.5

- Fix: move dim timer `useEffect` after `useConfig()` to prevent TDZ error (insufficient — same error persisted with different minified names)

## v0.1.4

- Fix: move `hslToRgb` before `PlasmaMode` to attempt Vite minifier TDZ workaround (not the real issue)

## v0.1.3

- Feature: screensaver timeout and dim opacity now adjustable in Settings (5-300s, 30-100%)
- Fix: frontend now re-renders immediately when keys/pages are added via WebSocket config broadcast
- Fix: pages state stays in sync with server config updates

## v0.1.2

- Feature: show device ID prefix (first 8 chars) in tray menu label and tooltip for easy agent identification
- Feature: 4 new colorful screensaver modes — Fireworks, Aurora, Rainbow, Plasma
- Change: removed Network Diagram screensaver and all ARP/network_scan agent commands
- Fix: frontend release zip now preserves `client/dist/` directory structure

## v0.1.1

- Fix: use `macos-latest` (ARM) for all agent builds — Apple Silicon runners cross-compile x86_64 natively, no need to wait for scarce Intel runners
- Fix: split frontend npm install into separate steps to prevent `npm audit` non-zero exit from aborting the build

## What's new

Initial release of NotStreamDeck — a cross-platform Stream Deck alternative.

**Agent** — Rust binary for macOS (ARM + Intel) and Windows:
- WebSocket connection to control server with auto-reconnect
- System tray with Enable/Disable/Configure/Quit
- 11 action types: open_app, shell, hotkey, clipboard, volume, lock, timer, weather, macro, media, navigate
- Now Playing detection (macOS 14+) with AppleScript fallback
- Network scanning with reverse DNS for LAN device discovery

**Control Server** — Node.js + React:
- 5×3 grid with configurable columns/rows
- Multi-page support with background images
- 11 screensaver modes including animated network diagram
- IP-based access control and PIN-protected setup
- Host management with version tracking
- Import/export all pages and keys
- Now Playing bar

## v0.1.1

- Fix: use `macos-latest` (ARM) for all agent builds — Apple Silicon runners cross-compile x86_64 natively, no need to wait for scarce Intel runners

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

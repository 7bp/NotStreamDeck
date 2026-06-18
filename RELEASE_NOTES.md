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

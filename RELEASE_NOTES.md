## v0.2.8

- Fix: macOS build error in notification mirroring (`String` vs `&str` in `push_notif` call)

## v0.2.7

- Fix: macOS build error in notification mirroring (type mismatch in `push_notif` call)

## v0.2.6

- Fix: notification clear synced across all frontends via WebSocket broadcast
- Docs: README fully updated with all new features

## v0.2.5

- Fix: notification panel closes on outside tap
- Fix: notification items left-aligned (Android/iOS style)
- Fix: crash when `appNames` is a string instead of array (defensive `Array.isArray` check)

## v0.2.4

- Fix: system notification mirroring rewritten — replaced fragile `log show` polling with a `log stream` background thread that captures NotificationCenter events in real-time via JSON output parsing

## v0.2.3

- Feature: kiosk mode exit — tap clock 7 times in 3s, enter PIN to disable
- Fix: title/footer dark gradient fades restored (z-index layering: bg → fades → content)
- UI: notification bell moved to center of title bar, panel drops down centered
- UI: notification timestamps now show relative time ("5s ago", "2m ago", etc.)
- Fix: notifications show configured host name instead of UUID prefix
- Feature: notification toast popup at top center, tap to expand, auto-dismiss 5s

## v0.2.2

- Feature: toast notification popup — new notifications appear at the top center as a pill (bell + host + title), expand on tap to show full content with dismiss, auto-dismiss after 5s

## v0.2.1

- Fix: notification timestamp now correctly included in WebSocket broadcasts (was missing, causing "Invalid Date" in panel)
- UI: notification bell moved from floating overlay into StreamDeck title bar, next to clock and gear
- Feature: **System Notification Mirroring** (macOS) — agent polls `log show` every ~15s for NotificationCenter events and forwards them to the frontend panel

## v0.2.0

- Feature: **Kiosk Mode** — toggle in Settings, hides setup button, locks to grid. Ideal for wall-mounted tablets.
- Feature: **Multi-Machine Macros** — each macro step can target a different host. Serial (sequential) and parallel execution modes supported.
- Feature: **Notification Mirror** — agent command notifications (open app, shell, volume, lock, etc.) are aggregated in a frontend panel. Bell icon in the top-right corner. Persisted server-side (last 200).
- Feature: **App-Filtered Pages** — enable globally in Settings, then assign app names to each page. When the active app on the agent machine matches, only matching pages are shown. Uses foreground app detection on both macOS and Windows.
- Feature: **Windows App Scanner** — `list_apps` now scans Start Menu + Program Files via PowerShell. Apps appear in the `open_app` dropdown and can be used for page filtering.
- Agent: `foreground_app` OSAdapter method (returns name of the frontmost window's application)

## v0.1.16

- Feature: page transition animations — slide-in with fade on prev/next navigation
- Feature: swipe left/right to navigate between pages (touch devices)
- Feature: video backgrounds — upload `.mp4`/`.webm` files as page backgrounds (auto-play, loop, muted)
- Change: upload limit increased from 10 MB to 50 MB

## v0.1.15

- Feature: PWA fullscreen — manifest `"display": "fullscreen"` (hides chrome on Android) + `requestFullscreen()` on first user interaction (covers desktop)

## v0.1.14

- Feature: PWA support — service worker with network-first strategy, offline shell with spinner and auto-retry, manifest with standalone display, PWA icons
- Change: removed heavy canvas screensaver modes (starfield, bounce, fireworks, aurora, rainbow, plasma) — 7 lightweight modes remain
- Chore: README updates (accurate feature table, binary name, nowplaying removal)

## v0.1.13

- Fix: switch Windows release build from MinGW (`x86_64-pc-windows-gnu`) to MSVC (`x86_64-pc-windows-msvc`) — MinGW-produced PE binaries trigger heuristic `Wacatac.C` false positives in Windows Defender. MSVC produces standard PE binaries that don't.
- CI: build Windows agent on `windows-latest` runner with native MSVC toolchain

## v0.1.12

- Fix: handle all `NewEvents` start causes in tray event loop — `WaitUntil` generates `ResumeTimeReached` and `SentEvent`, not `Poll`, so the menu handler was never reached and disable/quit appeared broken

## v0.1.11

- Fix: change `tao` event loop from `ControlFlow::Poll` to `ControlFlow::WaitUntil` — `Poll` keeps the main thread running continuously, consuming 75% CPU even when idle. `WaitUntil` parks the thread in the kernel until the next 200ms tick or a real menu event.

## v0.1.10

- Change: removed nowplaying/playback detection entirely — no more polling, no more AppleScript/nowplaying-cli queries, no Music app launches, no wasted CPU on any platform

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

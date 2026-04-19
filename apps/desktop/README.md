# Raquel Desktop

Electron wrapper for the Raquel web app. Targets Windows, macOS, and
Linux from the same codebase. The renderer is the production build of
`apps/web` — no fork, no separate UI.

The shell adds:

- A native window with persisted bounds across sessions.
- A system tray icon for show/hide toggling.
- Native OS notifications, exposed to the web app via a context bridge.
- Auto-update via `electron-updater` (checks every 4 hours).
- Single-instance lock (re-launching focuses the existing window).
- A native menu bar with platform-appropriate items.

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- The web app must be built when packaging a release
  (`pnpm --filter @raquel/web build`).

---

## Development

```bash
# In one terminal — start the web dev server (Vite)
pnpm --filter @raquel/web dev
# Vite serves on http://localhost:5173

# In another terminal — compile + launch Electron
cd apps/desktop
pnpm dev
```

The dev build loads `http://localhost:5173` directly so HMR from Vite
works inside the Electron window.

## Building a release

```bash
# 1. Build the web app
pnpm --filter @raquel/web build
# Output: apps/web/dist/

# 2. Build the desktop installers
cd apps/desktop
pnpm build           # current platform
# or:
pnpm build:win       # Windows NSIS installer
pnpm build:mac       # macOS DMG (x64 + arm64)
pnpm build:linux     # Linux AppImage + DEB
```

Output lands in `apps/desktop/release/`:

| Platform | Artifact                              |
|----------|---------------------------------------|
| Windows  | `Raquel Setup <ver>.exe` (NSIS)       |
| macOS    | `Raquel-<ver>.dmg`                    |
| Linux    | `Raquel-<ver>.AppImage`, `*.deb`      |

The NSIS installer creates desktop and Start Menu shortcuts and lets
the user pick an install directory.

## Auto-update

The app checks `https://updates.raquel.app` every 4 hours via
`electron-updater`. To switch to your own update server, edit the
`publish.url` field in `electron-builder.json`. The standard
electron-updater layout works — see
https://www.electron.build/auto-update for hosting details.

When an update is downloaded, the bundled web app shows the
`UpdateBanner` component (in `apps/web/src/components/UpdateBanner.tsx`)
and the user can click _Restart_ to apply it. The update installs
automatically on next quit if they don't.

## Project layout

```
apps/desktop/
\u251C\u2500\u2500 src/
\u2502   \u251C\u2500\u2500 main/
\u2502   \u2502   \u251C\u2500\u2500 index.ts          # main process: window, lifecycle, IPC
\u2502   \u2502   \u251C\u2500\u2500 preload.ts        # contextBridge — exposes window.electron
\u2502   \u2502   \u251C\u2500\u2500 menu.ts           # native application menu
\u2502   \u2502   \u251C\u2500\u2500 tray.ts           # system tray icon + show/hide toggle
\u2502   \u2502   \u251C\u2500\u2500 notifications.ts  # native OS notification helper
\u2502   \u2502   \u2514\u2500\u2500 updater.ts        # auto-updater wiring
\u2502   \u2514\u2500\u2500 renderer/index.html   # placeholder; production loads apps/web/dist
\u251C\u2500\u2500 resources/                # icons (icon.png, icon.ico, tray-icon.png)
\u2514\u2500\u2500 electron-builder.json     # packaging config (Windows / macOS / Linux)
```

## Security notes

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
  on the main BrowserWindow — the renderer is treated as untrusted code.
- Only the small surface defined in `preload.ts` is exposed to the
  page (version/platform getters, notification helper, updater hooks).
- External links open in the default browser via
  `setWindowOpenHandler` — no Electron-internal navigation to outside
  origins.

// Detect whether the web app is running inside our Electron desktop shell.
// Electron exposes `window.electron` via a context-isolated preload script
// (apps/desktop/src/main/preload.ts). When running in a normal browser
// `window.electron` is undefined.

interface ElectronBridge {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;
  showNotification: (title: string, body: string) => void;
  onUpdateAvailable: (callback: (version: string) => void) => () => void;
  onUpdateDownloaded: (callback: (version: string) => void) => () => void;
}

declare global {
  interface Window {
    electron?: ElectronBridge;
  }
}

export const isElectron: boolean =
  typeof window !== "undefined" && Boolean(window.electron);

export const electron: ElectronBridge | null =
  isElectron && window.electron ? window.electron : null;

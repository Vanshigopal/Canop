import { contextBridge, ipcRenderer } from 'electron';

// Exposed under `window.electron` in the renderer. Keep the surface
// area minimal — anything we expose here is callable from any web
// page loaded into the BrowserWindow.

contextBridge.exposeInMainWorld('electron', {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:platform'),

  showNotification: (title: string, body: string): void => {
    ipcRenderer.send('notification:show', { title, body });
  },

  onUpdateAvailable: (callback: (version: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, version: string) => callback(version);
    ipcRenderer.on('updater:available', listener);
    return () => ipcRenderer.removeListener('updater:available', listener);
  },

  onUpdateDownloaded: (callback: (version: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, version: string) => callback(version);
    ipcRenderer.on('updater:downloaded', listener);
    return () => ipcRenderer.removeListener('updater:downloaded', listener);
  },
});

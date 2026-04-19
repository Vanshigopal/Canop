import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';

const FOUR_HOURS = 4 * 60 * 60 * 1000;

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('updater:available', info.version);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('updater:downloaded', info.version);
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] Error:', err);
  });

  // Initial check, then every 4 hours
  autoUpdater
    .checkForUpdates()
    .catch((err) => console.error('[updater] Initial check failed:', err));

  setInterval(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err) => console.error('[updater] Periodic check failed:', err));
  }, FOUR_HOURS);
}

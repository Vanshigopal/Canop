import { Tray, Menu, nativeImage, app, type BrowserWindow } from 'electron';
import path from 'node:path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow): void {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('Raquel');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Raquel',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

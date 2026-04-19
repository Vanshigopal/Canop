import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  type Rectangle,
} from 'electron';
import path from 'node:path';
import Store from 'electron-store';
import { setupMenu } from './menu';
import { setupTray } from './tray';
import { setupAutoUpdater } from './updater';
import { showNativeNotification } from './notifications';

type WindowBounds = { width: number; height: number; x?: number; y?: number };
type StoreSchema = { windowBounds: WindowBounds };

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 1280, height: 800 },
  },
}) as Store<StoreSchema> & {
  get<K extends keyof StoreSchema>(key: K, defaultValue?: StoreSchema[K]): StoreSchema[K];
  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void;
};

const isDev = !app.isPackaged;

// Single-instance lock — bringing focus to the existing window when
// the user re-launches from the dock or Start menu is much friendlier
// than spawning a second copy.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const bounds = store.get('windowBounds', {
    width: 1280,
    height: 800,
  }) as Partial<Rectangle> & { width: number; height: number };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    title: 'Canop',
    icon: path.join(__dirname, '../../resources/icon.png'),
    backgroundColor: '#FAF7F2',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('[main] Failed to load dev URL:', err);
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: load the bundled web app from extraResources
    const indexPath = path.join(process.resourcesPath, 'renderer', 'index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[main] Failed to load production HTML:', err);
    });
  }

  // Wait for content before showing — prevents the white flash that
  // would otherwise happen on slower machines.
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('close', () => {
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  // External links open in the user's default browser, not inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  const win = createWindow();
  setupMenu(win);
  setupTray(win);

  if (!isDev) {
    setupAutoUpdater(win);
  }
});

// macOS convention: re-create the window when the dock icon is clicked
// and there are no other windows open.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── IPC handlers ─────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);

ipcMain.on('notification:show', (_event, payload: { title: string; body: string }) => {
  if (typeof payload?.title === 'string' && typeof payload?.body === 'string') {
    showNativeNotification(payload.title, payload.body);
  }
});

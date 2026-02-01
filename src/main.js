const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    // Get screen dimensions
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        transparent: true,        // Make window transparent
        frame: false,             // Remove window frame
        alwaysOnTop: true,        // Keep above other windows
        hasShadow: false,         // No shadow
        resizable: false,
        skipTaskbar: true,        // Don't show in taskbar
        focusable: false,         // Don't steal focus from other apps
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    // Load the HTML file
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // SMART CLICK-THROUGH: Enable click-through by default
    // Clicks will pass through to desktop unless we're over the avatar
    mainWindow.setIgnoreMouseEvents(true, { forward: true });

    // Handle dynamic click-through toggling from renderer
    ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
        if (mainWindow) {
            mainWindow.setIgnoreMouseEvents(ignore, options);
        }
    });

    // Set window level (macOS specific)
    if (process.platform === 'darwin') {
        mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        mainWindow.setAlwaysOnTop(true, 'floating', 1);
    }

    // Open DevTools in development (uncomment if needed)
    // mainWindow.webContents.openDevTools({ mode: 'detach' });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle screen size changes
    screen.on('display-metrics-changed', () => {
        if (mainWindow) {
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            mainWindow.setSize(width, height);
            mainWindow.setPosition(0, 0);
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true
    }
  });

  // Load the HTML file
  win.loadFile('index.html');

  // Optional: open DevTools for debugging
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// Quit app when all windows are closed (Windows/Linux behavior)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
  console.log('All windows closed, app quitting.');
});

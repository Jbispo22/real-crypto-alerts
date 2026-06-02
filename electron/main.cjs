const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    minWidth: 320,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    frame: false,
    resizable: true,
    maximizable: true,
    icon: path.join(__dirname, 'assets/icon.ico')
  })

  // 🔥 FORÇA TODOS OS LINKS A ABRIREM NO NAVEGADOR EXTERNO (Chrome, Edge, etc)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Intercepta cliques em links dentro do app e força abertura externa
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://localhost') || url.startsWith('file://')) {
      return
    }
    event.preventDefault()
    shell.openExternal(url)
  })

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`
  mainWindow.loadURL(startUrl)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Handlers para os botões da titlebar funcionarem
ipcMain.on('minimize-app', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('close-app', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('toggle-window-size', () => {
  if (!mainWindow) return false
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
    return false
  } else {
    mainWindow.maximize()
    return true
  }
})

ipcMain.handle('toggle-always-on-top', (event, flag) => {
  if (!mainWindow) return false
  mainWindow.setAlwaysOnTop(flag)
  return flag
})

ipcMain.handle('get-launch-at-login', () => {
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('set-launch-at-login', (event, flag) => {
  app.setLoginItemSettings({ openAtLogin: flag })
  return flag
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

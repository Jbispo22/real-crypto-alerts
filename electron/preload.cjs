const { contextBridge, ipcRenderer, shell } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  closeApp: () => ipcRenderer.send('close-app'),
  toggleAlwaysOnTop: (flag) => ipcRenderer.invoke('toggle-always-on-top', flag),
  getLaunchAtLogin: () => ipcRenderer.invoke('get-launch-at-login'),
  setLaunchAtLogin: (flag) => ipcRenderer.invoke('set-launch-at-login', flag),
  toggleWindowSize: () => ipcRenderer.invoke('toggle-window-size'),
  openExternal: (url) => shell.openExternal(url)
})

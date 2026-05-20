import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  hideWindow:       ()             => ipcRenderer.send('hide-window'),
  toggleWindow:     ()             => ipcRenderer.send('toggle-window'),
  setPanelPosition: (pos: string)  => ipcRenderer.send('set-panel-position', pos),
  pickFiles:        ()             => ipcRenderer.invoke('pick-files'),
  getFileIcon:      (path: string) => ipcRenderer.invoke('get-file-icon', path),
  openFile:         (path: string) => ipcRenderer.send('open-file', path),
  loadStore:        (key: string)  => ipcRenderer.sendSync('load-store-sync', key),
  saveStore:        (key: string, value: unknown) => ipcRenderer.send('save-store', key, value),
  setStartWithOS:   (enable: boolean) => ipcRenderer.send('set-start-with-os', enable),
})

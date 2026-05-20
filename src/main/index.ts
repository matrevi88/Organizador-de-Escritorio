import { app, shell, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, globalShortcut, dialog } from 'electron'
import { join, basename, extname } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 340,
    height: screenHeight - 40,
    x: screenWidth - 364,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function buildTrayIcon(): Electron.NativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inSquare = x >= 2 && x <= 13 && y >= 2 && y <= 13
      buf[i]     = inSquare ? 124 : 0
      buf[i + 1] = inSquare ? 106 : 0
      buf[i + 2] = inSquare ? 247 : 0
      buf[i + 3] = inSquare ? 255 : 0
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

// Toggle global: muestra si está oculto, oculta si está visible
function toggleWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function createTray(): void {
  tray = new Tray(buildTrayIcon())
  tray.setToolTip('DeskFlow  (Ctrl+Shift+D)')

  const contextMenu = Menu.buildFromTemplate([
    { label: '⊞ Mostrar DeskFlow', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { label: 'Ocultar',            click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: 'Atajo: Ctrl+Shift+D', enabled: false },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', toggleWindow)
  tray.on('double-click', toggleWindow)
}

// Persistencia en userData ──────────────────────────────────

function storePath() { return join(app.getPath('userData'), 'deskflow-store.json') }

function readStore(): Record<string, unknown> {
  try {
    const p = storePath()
    if (!existsSync(p)) return {}
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch { return {} }
}

function writeStore(data: Record<string, unknown>) {
  try { writeFileSync(storePath(), JSON.stringify(data), 'utf-8') } catch {}
}

ipcMain.on('load-store-sync', (event, key: string) => {
  event.returnValue = readStore()[key] ?? null
})

ipcMain.on('save-store', (_event, key: string, value: unknown) => {
  const store = readStore()
  store[key] = value
  writeStore(store)
})

// IPC desde el renderer ─────────────────────────────────────

// Botón — : siempre oculta
ipcMain.on('hide-window', () => mainWindow?.hide())

// Atajo global también puede venir del renderer
ipcMain.on('toggle-window', toggleWindow)

// Cambiar posición del panel
ipcMain.on('set-panel-position', (_event, pos: 'left' | 'right' | 'float') => {
  if (!mainWindow) return
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const winWidth = 340
  const winHeight = sh - 40

  // Bajar alwaysOnTop momentáneamente para que setPosition funcione en Windows
  mainWindow.setAlwaysOnTop(false)

  if (pos === 'right')      mainWindow.setPosition(sw - winWidth - 24, 20)
  else if (pos === 'left')  mainWindow.setPosition(24, 20)
  else                      mainWindow.setPosition(Math.round(sw / 2 - winWidth / 2), 20)

  mainWindow.setSize(winWidth, winHeight)
  mainWindow.setAlwaysOnTop(true)
})

// Autostart con Windows
ipcMain.on('set-start-with-os', (_event, enable: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
    name: 'DeskFlow'
  })
})

// Emoji fallback según tipo de archivo
function fallbackIcon(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  if (['.exe', '.lnk', '.app', '.dmg', '.pkg'].includes(ext)) return '🖥️'
  if (!ext) return '📁'  // carpeta (sin extensión)
  return '📄'
}

// Default path: Program Files en Windows (donde están los .exe reales), Applications en Mac
function appsDefaultPath(): string {
  if (process.platform === 'win32') {
    return process.env['ProgramFiles'] || 'C:\\Program Files'
  }
  if (process.platform === 'darwin') return '/Applications'
  return app.getPath('home')
}

// Procesar rutas seleccionadas → { path, name, iconDataUrl, icon }
async function resolvePaths(filePaths: string[]) {
  return Promise.all(filePaths.map(async (filePath) => {
    const name = basename(filePath, extname(filePath)) || basename(filePath)
    let iconDataUrl = ''
    try {
      const icon = await app.getFileIcon(filePath, { size: 'large' })
      const { width } = icon.getSize()
      if (!icon.isEmpty() && width > 0) iconDataUrl = icon.toDataURL()
    } catch { /* sin ícono */ }
    return { path: filePath, name, iconDataUrl, icon: fallbackIcon(filePath) }
  }))
}

// Selector de APPS (.exe / .lnk / .app) — sin openDirectory para que el filtro funcione
ipcMain.handle('pick-apps', async () => {
  if (!mainWindow) return []
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Agregar aplicación',
    defaultPath: appsDefaultPath(),
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Aplicaciones', extensions: isWin ? ['exe', 'lnk', 'bat', 'cmd', 'url', 'msi'] : isMac ? ['app'] : ['*'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    buttonLabel: 'Agregar'
  })
  if (result.canceled) return []
  return resolvePaths(result.filePaths)
})

// Selector de ARCHIVOS / CARPETAS — sin filtro de tipo
ipcMain.handle('pick-files', async () => {
  if (!mainWindow) return []
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Agregar archivo o carpeta',
    defaultPath: app.getPath('home'),
    properties: ['openFile', 'openDirectory', 'multiSelections'],
    buttonLabel: 'Agregar'
  })
  if (result.canceled) return []
  return resolvePaths(result.filePaths)
})

// Obtener ícono de un archivo (drag & drop desde el OS)
ipcMain.handle('get-file-icon', async (_event, filePath: string) => {
  try {
    const icon = await app.getFileIcon(filePath, { size: 'large' })
    const name = basename(filePath, extname(filePath)) || basename(filePath)
    const { width } = icon.getSize()
    return { iconDataUrl: (!icon.isEmpty() && width > 0) ? icon.toDataURL() : '', name }
  } catch {
    return { iconDataUrl: '', name: basename(filePath) }
  }
})

// Abrir archivo/carpeta/app con su programa por defecto
ipcMain.on('open-file', (_event, filePath: string) => {
  shell.openPath(filePath)
})

// ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  app.setAppUserModelId('com.sistemasymas.deskflow')

  // Aplicar autostart según configuración guardada
  const saved = readStore()
  const startWithOS = (saved.settings as { startWithOS?: boolean } | null)?.startWithOS ?? true
  app.setLoginItemSettings({ openAtLogin: startWithOS, openAsHidden: true, name: 'DeskFlow' })

  createWindow()
  createTray()

  globalShortcut.register('CommandOrControl+Shift+D', toggleWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

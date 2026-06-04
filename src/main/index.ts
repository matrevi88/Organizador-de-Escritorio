import { app, shell, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, globalShortcut, dialog } from 'electron'
import { join, basename, extname } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, copyFileSync, lstatSync, realpathSync } from 'fs'
import { execFileNoThrow } from '../utils/execFileNoThrow'
import {
  loadIndexFromDisk,
  scanWatchedFolders,
  searchIndexed,
  getIndexMeta,
  fallbackIconForPath
} from './folderIndex'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

type PanelPos = 'left' | 'right' | 'float'

function panelPositionFromStore(): PanelPos {
  const settings = readStore().settings as { panelPosition?: string } | null
  const pos = settings?.panelPosition
  if (pos === 'left' || pos === 'float') return pos
  return 'right'
}

/** Launcher compacto: 340px ancho, altura ~52% pantalla (máx. 480). */
function launcherWindowBounds(panelPos: PanelPos = 'right') {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const width = 340
  const height = Math.min(480, Math.max(380, Math.round(sh * 0.52)))
  const y = 20
  let x: number
  if (panelPos === 'right') x = sw - width - 24
  else if (panelPos === 'left') x = 24
  else x = Math.round(sw / 2 - width / 2)
  return { width, height, x, y }
}

function createWindow(): void {
  const panelPos = panelPositionFromStore()
  const bounds = launcherWindowBounds(panelPos)

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
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

  // Bajar al fondo cuando otra app toma el foco; volver al frente al recuperarlo
  mainWindow.on('blur',  () => mainWindow?.setAlwaysOnTop(false))
  mainWindow.on('focus', () => mainWindow?.setAlwaysOnTop(true))

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
      buf[i]     = inSquare ? 37 : 0
      buf[i + 1] = inSquare ? 99 : 0
      buf[i + 2] = inSquare ? 235 : 0
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

function backupDir() {
  return join(app.getPath('userData'), 'backups')
}

function autoBackup(): void {
  try {
    const src = storePath()
    if (!existsSync(src)) return

    const dir = backupDir()
    mkdirSync(dir, { recursive: true })

    const today = new Date().toISOString().slice(0, 10)
    const dest = join(dir, `deskflow-backup-${today}.json`)
    if (existsSync(dest)) return

    copyFileSync(src, dest)

    const files = readdirSync(dir)
      .filter(f => f.startsWith('deskflow-backup-') && f.endsWith('.json'))
      .sort()
    if (files.length > 7) {
      files.slice(0, files.length - 7).forEach(f => unlinkSync(join(dir, f)))
    }
  } catch { /* nunca bloquear el arranque */ }
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

// Vista Launcher vs Organizar (panel alto en modo organizar)
ipcMain.on('set-launcher-layout', (_event, launcher: boolean, panelPos: PanelPos = 'right') => {
  if (!mainWindow) return
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  mainWindow.setAlwaysOnTop(false)

  if (launcher) {
    const b = launcherWindowBounds(panelPos)
    mainWindow.setPosition(b.x, b.y)
    mainWindow.setSize(b.width, b.height)
  } else {
    const winWidth = 340
    const top = 20
    if (panelPos === 'right') mainWindow.setPosition(sw - winWidth - 24, top)
    else if (panelPos === 'left') mainWindow.setPosition(24, top)
    else mainWindow.setPosition(Math.round(sw / 2 - winWidth / 2), top)
    mainWindow.setSize(winWidth, sh - 40)
  }

  mainWindow.setAlwaysOnTop(true)
})

// Autostart con Windows/Mac (solo en app instalada)
ipcMain.on('set-start-with-os', (_event, enable: boolean) => {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: enable, openAsHidden: true, name: 'DeskFlow' })
})

// Emoji fallback según tipo de archivo
function fallbackIcon(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  if (['.exe', '.lnk', '.app', '.dmg', '.pkg'].includes(ext)) return '🖥️'
  if (!ext) return '📁'  // carpeta (sin extensión)
  return '📄'
}

// Resuelve symlinks, aliases de Finder (Mac) y accesos directos .lnk (Windows) a su ruta real.
// Retorna el path original si no se puede resolver.
async function resolveRealPath(filePath: string): Promise<string> {
  // 1. Symlink estándar (Mac / Linux / Windows con mklink)
  try {
    if (lstatSync(filePath).isSymbolicLink()) {
      return realpathSync(filePath)
    }
  } catch { /* no es symlink o no existe */ }

  // 2. Acceso directo .lnk de Windows
  if (process.platform === 'win32' && filePath.toLowerCase().endsWith('.lnk')) {
    const psCmd = `(New-Object -COM WScript.Shell).CreateShortcut([System.IO.Path]::GetFullPath('${filePath.replace(/'/g, "''")}')).TargetPath`
    const { stdout } = await execFileNoThrow('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCmd])
    if (stdout) return stdout
  }

  // 3. Alias de Finder (Mac) — distinto de symlink; requiere AppleScript
  if (process.platform === 'darwin') {
    const script = `tell application "Finder" to get POSIX path of (original item of (POSIX file "${filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}") as alias)`
    const { stdout } = await execFileNoThrow('osascript', ['-e', script])
    if (stdout) return stdout
  }

  return filePath
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
// Resuelve automáticamente symlinks, aliases de Finder y .lnk de Windows.
async function resolvePaths(filePaths: string[]) {
  return Promise.all(filePaths.map(async (filePath) => {
    const realPath = await resolveRealPath(filePath)
    const name = basename(filePath, extname(filePath)) || basename(filePath)
    let iconDataUrl = ''
    try {
      const icon = await app.getFileIcon(realPath, { size: 'large' })
      const { width } = icon.getSize()
      if (!icon.isEmpty() && width > 0) iconDataUrl = icon.toDataURL()
    } catch { /* sin ícono */ }
    return { path: realPath, name, iconDataUrl, icon: fallbackIcon(realPath) }
  }))
}

// Selector de APPS (.exe / .lnk en Windows; .app en macOS)
// En macOS los .app son bundles (directorios), por eso se agrega openDirectory
ipcMain.handle('pick-apps', async () => {
  if (!mainWindow) return []
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'

  const properties: Electron.OpenDialogOptions['properties'] = isMac
    ? ['openFile', 'openDirectory', 'multiSelections']
    : ['openFile', 'multiSelections']

  const filters: Electron.FileFilter[] = isWin
    ? [
        { name: 'Aplicaciones Windows', extensions: ['exe', 'lnk', 'bat', 'cmd', 'url', 'msi'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    : [
        { name: 'Todos los archivos', extensions: ['*'] }
      ]

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Agregar aplicación',
    defaultPath: appsDefaultPath(),
    properties,
    filters,
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

// ─── Carpetas vigiladas (índice para Launcher) ───

function watchedFoldersFromStore(): string[] {
  const settings = readStore().settings as { watchedFolders?: string[] } | null
  return Array.isArray(settings?.watchedFolders) ? settings.watchedFolders : []
}

function persistWatchedFolders(folders: string[]) {
  const store = readStore()
  const prev = (store.settings as Record<string, unknown>) ?? {}
  store.settings = { ...prev, watchedFolders: folders }
  writeStore(store)
}

ipcMain.handle('pick-watched-folder', async () => {
  if (!mainWindow) return { canceled: true, path: null as string | null }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Agregar carpeta para indexar',
    defaultPath: app.getPath('home'),
    properties: ['openDirectory'],
    buttonLabel: 'Vigilar esta carpeta'
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true, path: null }
  return { canceled: false, path: result.filePaths[0] }
})

ipcMain.handle('get-folder-index-meta', () => getIndexMeta())

ipcMain.handle('refresh-folder-index', () => {
  const folders = watchedFoldersFromStore()
  return scanWatchedFolders(folders).meta
})

ipcMain.handle('search-indexed', (_event, query: string) => {
  return searchIndexed(query).map((entry) => ({
    path: entry.path,
    name: entry.name,
    rootLabel: entry.rootLabel,
    isDirectory: entry.isDirectory,
    icon: fallbackIconForPath(entry.path, entry.isDirectory)
  }))
})

ipcMain.handle('set-watched-folders', (_event, folders: string[]) => {
  const unique = [...new Set(folders.filter((f) => typeof f === 'string' && f.length > 0))]
  persistWatchedFolders(unique)
  return scanWatchedFolders(unique).meta
})

// Exportar datos a archivo .deskflow
ipcMain.handle('export-backup', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar datos de DeskFlow',
    defaultPath: join(app.getPath('documents'), `deskflow-export-${new Date().toISOString().slice(0, 10)}.deskflow`),
    filters: [
      { name: 'DeskFlow Export', extensions: ['deskflow'] },
      { name: 'JSON', extensions: ['json'] }
    ],
    buttonLabel: 'Exportar'
  })
  if (result.canceled || !result.filePath) return { success: false, canceled: true }
  try {
    const store = readStore()
    const payload = {
      version: 1,
      exportDate: new Date().toISOString(),
      app: 'DeskFlow',
      data: { settings: store.settings ?? null, groups: store.groups ?? null }
    }
    writeFileSync(result.filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return { success: true, filePath: result.filePath }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// Importar datos desde archivo .deskflow
ipcMain.handle('import-backup', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar datos de DeskFlow',
    defaultPath: app.getPath('documents'),
    filters: [
      { name: 'DeskFlow Export', extensions: ['deskflow'] },
      { name: 'JSON', extensions: ['json'] }
    ],
    properties: ['openFile'],
    buttonLabel: 'Importar'
  })
  if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true }
  try {
    const raw = readFileSync(result.filePaths[0], 'utf-8')
    const parsed = JSON.parse(raw)
    if (
      typeof parsed !== 'object' || parsed === null ||
      parsed.app !== 'DeskFlow' ||
      typeof parsed.version !== 'number' ||
      !parsed.data
    ) {
      return { success: false, error: 'Archivo inválido o no es un export de DeskFlow.' }
    }
    const current = readStore()
    if (parsed.data.settings) current.settings = parsed.data.settings
    if (parsed.data.groups)   current.groups   = parsed.data.groups
    writeStore(current)
    mainWindow.webContents.reload()
    return { success: true }
  } catch (err) {
    return { success: false, error: `Error al leer el archivo: ${String(err)}` }
  }
})

// ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  app.setAppUserModelId('com.sistemasymas.deskflow')

  autoBackup()

  loadIndexFromDisk()
  const watched = watchedFoldersFromStore()
  if (watched.length > 0) {
    setImmediate(() => scanWatchedFolders(watched))
  }

  // Autostart solo aplica en la app instalada, nunca en desarrollo
  if (app.isPackaged) {
    const saved = readStore()
    const startWithOS = (saved.settings as { startWithOS?: boolean } | null)?.startWithOS ?? true
    app.setLoginItemSettings({ openAtLogin: startWithOS, openAsHidden: true, name: 'DeskFlow' })
  }

  createWindow()
  createTray()

  globalShortcut.register('CommandOrControl+Shift+D', toggleWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

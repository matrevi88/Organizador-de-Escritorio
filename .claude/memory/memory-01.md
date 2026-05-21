# DeskFlow — Memoria del proyecto

## Qué es
Organizador de escritorio tipo lanzador — agrupa apps, archivos y carpetas en grupos visuales con drag & drop. Vive en el tray y se muestra/oculta con `Ctrl+Shift+D`.

**Stack:** Electron 31 + React 18 + TypeScript + Tailwind 3.4 + electron-vite  
**AppId:** `com.sistemasymas.deskflow`  
**Repo:** `github.com/matrevi88/Organizador-de-Escritorio` (privado)  
**Ruta local:** `~/Documents/sistemasymas/proyectos/organizador-escritorio/`  
**Rama:** `master`

---

## Arquitectura

```
src/
├── main/index.ts          — proceso principal: IPC, store, tray, window, autostart, backup
├── preload/index.ts       — contextBridge (API segura al renderer)
└── renderer/src/
    ├── App.tsx            — root component (421 líneas)
    ├── store/useStore.ts  — estado React + persist vía IPC
    ├── types/index.ts     — Group, AppItem, Settings, Profile
    └── components/
        ├── ConfigDrawer.tsx  — panel de configuración (grupos, opciones, datos)
        ├── GroupCard.tsx     — tarjeta de grupo con drag-drop
        └── GroupModal.tsx    — modal crear/editar grupo
```

### Flujo de datos
```
Acción UI → useStore → saveStore(key, value) → ipcRenderer.send → ipcMain → writeFileSync(userData/deskflow-store.json)
```

### IPC disponible (preload/index.ts)
| método | tipo | función |
|---|---|---|
| `hideWindow` | send | ocultar ventana |
| `toggleWindow` | send | mostrar/ocultar |
| `setPanelPosition` | send | left/right/float |
| `pickApps` | invoke | dialog seleccionar .exe/.app |
| `pickFiles` | invoke | dialog seleccionar archivos |
| `getFileIcon` | invoke | icono del sistema para un path |
| `openFile` | send | abrir con programa por defecto |
| `loadStore` | sendSync | leer clave del store |
| `saveStore` | send | guardar clave en el store |
| `setStartWithOS` | send | toggle autostart (solo isPackaged) |
| `exportBackup` | invoke | dialog guardar → .deskflow |
| `importBackup` | invoke | dialog abrir → validar → reload |

---

## Persistencia

**Archivo:** `userData/deskflow-store.json`  
- Windows: `%APPDATA%\DeskFlow\deskflow-store.json`  
- Mac: `~/Library/Application Support/DeskFlow/deskflow-store.json`

**Claves guardadas:**
```json
{
  "settings": { "startWithOS", "collapseOnStart", "syncEnabled", "opacity", "panelPosition", "activeProfileId" },
  "groups": [ { "id", "name", "icon", "color", "visible", "collapsed", "apps": [{ "id", "name", "icon", "iconDataUrl", "path" }] } ]
}
```

**Backups automáticos:** `userData/backups/deskflow-backup-YYYY-MM-DD.json`  
- Se crea al arrancar la app, máximo 1 por día, se conservan los 7 más recientes  
- Función: `autoBackup()` en `main/index.ts`, llamada en `app.whenReady()` antes de `createWindow()`

**Export/Import manual:** sección "Datos y respaldo" en ConfigDrawer  
- `.deskflow` = JSON con `{ version, exportDate, app:"DeskFlow", data:{settings,groups} }`
- Import: valida `parsed.app === 'DeskFlow'` + `parsed.version` numérico → `writeStore` → `webContents.reload()`

---

## Autostart

**Regla crítica:** `app.setLoginItemSettings()` solo se llama si `app.isPackaged === true`  
**Por qué:** en dev, registraría el binario de Electron de node_modules en Login Items del OS → al reiniciar aparece un panel de error pidiendo ejecutar el servidor Vite.  
**Afecta:** `app.whenReady()` y el handler `set-start-with-os` — ambos tienen el guard `if (!app.isPackaged) return`

Default: `startWithOS: true` → se registra automáticamente en la primera ejecución del build instalado.

---

## Builds y distribución

### Comandos
```bash
npm run dev          # desarrollo (no toca Login Items)
npm run build        # compila a out/ (sin instalador)
npm run dist:mac     # DMG para Mac (arm64, sin firma)
npm run dist:win     # EXE NSIS para Windows (sin firma)
```

### GitHub Actions — `.github/workflows/build.yml`
- Se activa en: tags `v*` o manualmente (`workflow_dispatch`)
- `build-mac`: runner `macos-latest` → genera `dist/*.dmg`
- `build-win`: runner `windows-latest` → genera `dist/*.exe`
- Artifacts descargables en la UI de GitHub Actions

**Para publicar nueva versión:**
```bash
git tag v0.2.0 && git push origin v0.2.0
```

### Configuración electron-builder (package.json)
```json
"mac": { "target": "dmg", "category": "public.app-category.utilities", "identity": null },
"win": { "target": "nsis", "signingHashAlgorithms": [] }
```
`identity: null` y `signingHashAlgorithms: []` = sin firma de código (para distribución directa, no tiendas).

### App instalada en esta Mac
`/Applications/DeskFlow.app` — build 0.1.0 arm64  
Cuarentena removida con `xattr -rd com.apple.quarantine`

---

## Roadmap de distribución (futuro)

| Tienda | Estado | Qué se necesita |
|---|---|---|
| **Distribución directa** (.dmg/.exe) | ✅ Funcionando | GitHub Actions ya configurado |
| **Mac App Store** | Pendiente | Apple Developer Program ($99/año) + certificado distribución + sandbox entitlements en electron-builder |
| **Microsoft Store** | Pendiente | Cuenta Microsoft Dev ($19 único) + cambiar target Windows a `appx` en electron-builder |
| **Google Play (Android)** | Proyecto separado | Requiere app móvil distinta — Capacitor puede reutilizar el código React |
| **iOS App Store** | Proyecto separado | Igual que Google Play — app nativa separada con Capacitor o React Native |

**Nota importante:** Google Play y App Store de iOS son para apps **móviles**. Electron es solo escritorio. Si se quiere versión móvil, es un proyecto aparte (Capacitor reutilizaría el renderer React actual).

---

## Lo que NO está implementado (pero el código tiene el esqueleto)
- **Profiles** — interfaz `Profile` existe en `types/index.ts`, `activeProfileId` en settings, pero no hay reducer
- **syncEnabled** — toggle existe en ConfigDrawer pero no conectado a ningún backend
- **electron-updater** — en `dependencies` pero no integrado en `main/index.ts`
- **Validación de paths** — no verifica si el archivo sigue existiendo al cargar
- **Migraciones de store** — si cambia la estructura, datos viejos pueden fallar silenciosamente

---

## Notas de operación

- **Icono de app:** actualmente usa el ícono default de Electron (advertencia en build). Para cambiarlo: agregar `"icon": "resources/icon.icns"` en config mac y `"icon": "resources/icon.ico"` en config win, con los archivos correspondientes.
- **Tray icon:** se genera programáticamente en `buildTrayIcon()` — cuadrado morado #7c6af7.
- **Hotkey global:** `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`) — toggle mostrar/ocultar.
- **Ventana:** `alwaysOnTop: true`, baja al fondo al perder foco, sube al recuperarlo.

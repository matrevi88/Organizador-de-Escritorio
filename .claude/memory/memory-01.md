# DeskFlow — Memoria del proyecto (ARCHIVADO 2026-06-20)

> Producto retirado. Conservar como referencia técnica. Golden path: `sistemasymas/docs/patrones-app-escritorio-electron.md`

## Qué es
Organizador de escritorio tipo lanzador — agrupa apps, archivos y carpetas en grupos visuales con drag & drop. Vive en el tray y se muestra/oculta con `Ctrl+Shift+D`.

**Stack:** Electron 31 + React 18 + TypeScript + Tailwind 3.4 + electron-vite  
**AppId:** `com.sistemasymas.deskflow`  
**Repo:** `github.com/matrevi88/Organizador-de-Escritorio` (privado)  
**Ruta local:** `~/Documents/sistemasymas/proyectos/organizador-escritorio/`  
**Rama:** `master`  
**Changelog:** `CHANGELOG.md` (raíz del repo)  
**Registro fábrica:** `memory/reference/deskflow-archivo/deskflow-cambios-2026-06.md`

---

## Historial reciente (2026-06-03 → 16)

| Fecha | Qué | Git / deploy |
|-------|-----|----------------|
| 2026-06-03 | Fase A Launcher + Fase B carpetas vigiladas + tema bone/azul + contraste categorías | `453a2f8` → `origin/master` |
| 2026-06-03 | Accesos directos resueltos a ruta real (.lnk, alias Mac, symlinks) | `2b88e76` (incluido en push) |
| 2026-06-03 | Landing `/deskflow` colores azul marca | `sistemasymas-web` `b1ea6e5` → `origin/main` (Pull Plesk = solo UI web) |
| 2026-06-04 | Builds v0.1.0 (.exe + 2× .dmg) subidos al VPS por SCP | Sin commit (artefactos en `dist/`, ignorados) |
| 2026-06-04 | Instalador Windows NSIS + `release:win` + `.bat` limpieza | `5f2e373` |
| 2026-06-04 | Fix launcher: no ocultar al abrir acceso (Windows) | `7f42a3f` + `.exe` VPS 78 714 832 B |
| 2026-06-04 | Landing `/deskflow` guías visuales (web) | `sistemasymas-web` `bde7a08`, deploy VPS |
| 2026-06-16 | Fix Rosetta: build arm64 fresco compilado en Mac Apple Silicon; DMGs mac-arm64 + mac-intel actualizados en VPS. App reinstalada en `/Applications/` sin cuarentena. | Sin commit (artefactos en `dist/`, ignorados). VPS SCP. |

**Archivos nuevos principales:** `folderIndex.ts`, `LauncherView.tsx`, `OrganizeView.tsx`, `WatchedFoldersSection.tsx`, `AppIcon.tsx`, `launcherSearch.ts`, `colorContrast.ts`, `theme.ts`.

**Archivos tocados:** `App.tsx`, `ConfigDrawer.tsx`, `GroupCard.tsx`, `GroupModal.tsx`, `main/index.ts`, `preload/index.ts`, `useStore.ts`, `types/index.ts`, `index.css`, `tailwind.config.js`.

Ver lista completa en `CHANGELOG.md` sección `[0.1.0] — 2026-06-04`.

---

## Arquitectura

```
src/
├── main/
│   ├── index.ts           — IPC, store, tray, ventana, backup, carpetas vigiladas
│   └── folderIndex.ts     — escaneo e índice de carpetas vigiladas
├── preload/index.ts       — contextBridge
└── renderer/src/
    ├── App.tsx            — Launcher (default) + Organizar + overlays
    ├── theme.ts           — gradiente logo + paleta GROUP_COLORS
    ├── lib/
    │   ├── launcherSearch.ts  — búsqueda grupos + índice
    │   └── colorContrast.ts   — colores de grupo legibles en tema claro
    ├── store/useStore.ts
    ├── types/index.ts
    └── components/
        ├── LauncherView.tsx
        ├── OrganizeView.tsx   — rejilla 2×2 + búsqueda grupos/índice
        ├── ConfigDrawer.tsx
        ├── WatchedFoldersSection.tsx
        ├── GroupCard.tsx
        ├── GroupModal.tsx
        └── AppIcon.tsx
```

### UI Launcher (Fase A — 2026-06-03)
- Al abrir (`Ctrl+Shift+D`): **Launcher** compacto **340×~480px**, posición izq/der/flotante (Ajustes).
- Búsqueda: nombre, ruta, grupo; chips de filtro por grupo.
- ↑↓ + Enter abre; Esc limpia búsqueda u oculta ventana.
- **Organizar** (⊞): panel 340px, grupos, drag-drop, barra de búsqueda.
- **Ajustes** (⚙): ConfigDrawer (perfiles UI, paneles, opacidad, carpetas vigiladas, backup).
- IPC `set-launcher-layout`: tamaño launcher vs organizar.

### Tema visual (2026-06-03 — aprobado por Martha)
- **Dirección 3 + azul marca 1:** fondo claro **bone** `#FAFAF7`, texto **ink** `#0B1020`, acento **azul** `#2563EB` / deep `#1E3A8A`, coral opcional `#FB7185`.
- Variables en `index.css`; tokens Tailwind: `bone`, `ink`, `accent`, `deep`, `df-muted`, `df-surface`, `df-hover`, `df-select`, `border-df`.
- **Colores de grupo:** `colorContrast.ts` oscurece etiquetas claras (contraste ≥4.5:1 sobre bone); chips activos con fondo tintado y texto ink.
- Logo y tray: degradado / icono azul marca (no morado `#7c6af7`).
- Prototipos HTML (referencia): `prototypes/comparacion-temas.html`, `comparacion-tres-direcciones.html`.

### Carpetas vigiladas — Fase B (2026-06-03)
- **Ajustes → Carpetas vigiladas:** rutas locales o de red (unidad mapeada `Z:\...` o UNC `\\servidor\share\...`) si el SO las ve montadas y con lectura.
- Indexación: profundidad **6**, máx. **~12k** entradas; caché en `userData/deskflow-folder-index.json`.
- Regenerar: al agregar/quitar carpeta o botón **↻** (reconectar red/VPN y refrescar).
- **Launcher y Organizar:** con 1+ caracteres busca en grupos **y** en el índice (badge `📂 NombreCarpeta`, azul índice / color grupo ajustado).
- Excluye: `node_modules`, `.git`, carpetas ocultas, `dist`, `build`, etc.
- **No** hay watcher en tiempo real ni credenciales SMB guardadas en la app.
- IPC: `pick-watched-folder`, `set-watched-folders`, `refresh-folder-index`, `search-indexed`, `get-folder-index-meta`.

### Flujo de datos
```
Acción UI → useStore → saveStore → ipcMain → writeFileSync(userData/deskflow-store.json)
Índice carpetas → scanWatchedFolders() → deskflow-folder-index.json
```

### IPC disponible (preload)
| método | tipo | función |
|---|---|---|
| `hideWindow` / `toggleWindow` | send | visibilidad |
| `setPanelPosition` | send | left/right/float |
| `setLauncherLayout` | send | launcher vs organizar |
| `pickApps` / `pickFiles` | invoke | diálogos |
| `pickWatchedFolder` | invoke | carpeta a indexar |
| `setWatchedFolders` | invoke | guardar lista + reindexar |
| `refreshFolderIndex` | invoke | reescanear |
| `searchIndexed` | invoke | búsqueda en caché |
| `getFolderIndexMeta` | invoke | conteo / fecha |
| `getFileIcon` / `openFile` | invoke/send | icono y abrir path |
| `loadStore` / `saveStore` | sendSync/send | persistencia |
| `exportBackup` / `importBackup` | invoke | .deskflow |
| `setStartWithOS` | send | autostart (solo isPackaged) |

---

## Persistencia

**Store:** `userData/deskflow-store.json`

```json
{
  "settings": {
    "startWithOS", "collapseOnStart", "syncEnabled", "opacity",
    "panelPosition", "activeProfileId", "watchedFolders": []
  },
  "groups": [{ "id", "name", "icon", "color", "visible", "collapsed", "apps": [...] }]
}
```

**Índice:** `userData/deskflow-folder-index.json`  
**Backups auto:** `userData/backups/deskflow-backup-YYYY-MM-DD.json` (7 días)  
**Export manual:** `.deskflow` con `{ version, exportDate, app:"DeskFlow", data:{settings,groups} }`

---

## Autostart
Solo si `app.isPackaged === true` (evita registrar Electron de `npm run dev` en Login Items).

---

## Builds y distribución

```bash
npm run dev          # desarrollo
npm run typecheck    # tsc
npm run build        # out/
npm run dist:mac     # DMG arm64
npm run dist:win     # EXE NSIS
```

Tag `v*` → GitHub Actions (`.github/workflows/build.yml`).

**Ejecutables en VPS-1:** `https://sistemasymas.com/downloads/deskflow/`  
**Nunca** commitear `dist/` ni `.exe`/`.dmg` al git.

---

## Pendientes producto (sin cambiar hasta que Martha pida)

### SaaS / licencias (sistemasymas-web + app)
- Stripe, tablas `deskflow_licenses`, activación en Electron — ver secciones históricas abajo si se retoma.

### Web landing `/deskflow`
- Enlaces de descarga: estáticos en VPS (`.exe` con fix launcher, 2026-06-04 tarde).
- Guías visuales para clientes no técnicos: `sistemasymas-web` `DeskflowDownloads.tsx` — memoria `memory/deskflow-web-landing.md`.
- Deploy web: `memory/deskflow-cambios-2026-06.md` (Plesk o SSH VPS-1 si Martha lo pide al agente).

### Código con esqueleto sin usar
- Profiles (`activeProfileId` sin reducer completo)
- `syncEnabled` sin backend
- `electron-updater` sin integrar

---

## Roadmap tiendas (futuro)
Distribución directa ✅ | Mac/MS Store / móvil — pendiente (ver notas históricas en commits viejos).

---

## Notas de operación
- **Hotkey:** `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`)
- **Ventana:** `alwaysOnTop`, transparente, frameless; blur al perder foco
- **Tray:** icono cuadrado azul `#2563EB`, tooltip DeskFlow
- **Probar tema/UI:** `npm run dev` en Mac o Windows con build instalado

---

## Regla de distribución — ejecutables NUNCA en git (2026-05-21)
Subir builds al VPS vía SCP; `.gitignore` excluye `dist/`.

| Archivo | OS | URL |
|---|---|---|
| `DeskFlow-Setup-0.1.0-windows.exe` | Windows x64 | `https://sistemasymas.com/downloads/deskflow/DeskFlow-Setup-0.1.0-windows.exe` |
| `DeskFlow-0.1.0-mac-arm64.dmg` | Apple Silicon | `https://sistemasymas.com/downloads/deskflow/DeskFlow-0.1.0-mac-arm64.dmg` |
| `DeskFlow-0.1.0-mac-intel.dmg` | Intel | `https://sistemasymas.com/downloads/deskflow/DeskFlow-0.1.0-mac-intel.dmg` |

**Último build Windows en VPS:** 2026-06-04 (tarde) — `DeskFlow-Setup-0.1.0-windows.exe`, 78 714 832 bytes, SHA256 `9936e0bb…` (incluye fix launcher). Mac: re-firmados mismo día (fix «dañado»).

**macOS sin Apple Developer ID:** Gatekeeper puede mostrar «dañado» o bloquear. Solución usuario: clic derecho → Abrir, o `xattr -cr /Applications/DeskFlow.app`. Build: firma ad hoc en `afterPack` (`electron-builder.config.cjs`).

**Procedimiento de subida** (también en `CHANGELOG.md`):

```bash
npm run dist:mac && npm run dist:win
mkdir -p releases-upload
cp dist/DeskFlow-0.1.0-arm64.dmg releases-upload/DeskFlow-0.1.0-mac-arm64.dmg
cp dist/DeskFlow-0.1.0.dmg releases-upload/DeskFlow-0.1.0-mac-intel.dmg
cp "dist/DeskFlow Setup 0.1.0.exe" releases-upload/DeskFlow-Setup-0.1.0-windows.exe
scp -i ~/.ssh/id_ed25519_vps3_coolify releases-upload/* \
  root@74.208.25.241:/var/www/vhosts/sistemasymas.com/httpdocs/downloads/deskflow/
```

Nombres deben coincidir con `proyectos/sistemasymas-web/lib/deskflow.ts`.

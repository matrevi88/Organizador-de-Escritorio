# Changelog — DeskFlow

Formato basado en [Keep a Changelog](https://keepachangelog.com/). Versión semántica del `package.json`.

---

## [0.1.0] — 2026-06-04 (build público en VPS)

Release de distribución con UX rediseñada (sesión 2026-06-03/04). Código en GitHub `master` commit `453a2f8` (+ `2b88e76` accesos directos).

### Añadido

- **Launcher** como pantalla principal al abrir (`Ctrl+Shift+D`): búsqueda, filtros por grupo (chips), navegación ↑↓ + Enter, contador de resultados.
- **Vista Organizar** (⊞): rejilla 2×2 de grupos, drag-drop, búsqueda en grupos y en índice de carpetas vigiladas.
- **Carpetas vigiladas** (Ajustes): elegir carpetas; índice de archivos/subcarpetas (prof. 6, máx. ~12 000 entradas).
- Búsqueda combinada en Launcher: items de **grupos** + resultados del **índice** (badge `📂` + nombre de raíz).
- Soporte de rutas **de red** si el sistema operativo tiene la carpeta montada (unidad `Z:\` o UNC); botón ↻ para reindexar tras reconectar.
- `src/main/folderIndex.ts` — escaneo, persistencia `deskflow-folder-index.json`, búsqueda con scoring.
- `src/renderer/src/lib/launcherSearch.ts` — unificación de resultados grupo/índice.
- `src/renderer/src/lib/colorContrast.ts` — contraste de colores de categoría en tema claro.
- `src/renderer/src/theme.ts` — gradiente logo y paleta `GROUP_COLORS`.
- Componentes: `LauncherView`, `OrganizeView`, `WatchedFoldersSection`, `AppIcon`.
- IPC: `set-launcher-layout`, `pick-watched-folder`, `set-watched-folders`, `refresh-folder-index`, `search-indexed`, `get-folder-index-meta`.
- Setting `watchedFolders: string[]` en store.
- Prototipos HTML de referencia en `prototypes/` (no incluidos en el instalador).

### Cambiado

- **Tema visual:** fondo claro bone `#FAFAF7`, texto ink `#0B1020`, acento azul marca `#2563EB` / `#1E3A8A` (antes UI oscura con morado `#7c6af7`).
- Ventana compacta **340×~480px** en modo Launcher; misma lógica de posición (izquierda / derecha / flotante).
- Icono de **bandeja del sistema** (tray): azul `#2563EB` en lugar de morado.
- Colores por defecto de grupos demo más legibles (p. ej. Desarrollo `#0d9488`, Social `#059669`).
- `GroupModal` / paleta de creación: primer color azul `#2563eb`.
- Textos secundarios y badges de categoría con mayor contraste (`df-muted` `#475569`, `colorOnLightBg`).
- Resolución de **accesos directos** (.lnk Windows, alias Finder Mac, symlinks) al agregar items (`resolveRealPath`, commit `2b88e76`).

### Eliminado / simplificado

- Stats falsos y botón de sync del header (sync sigue en Ajustes sin backend).
- Tema oscuro morado/indigo como predeterminado en renderer.

### Distribución (2026-06-04)

Instaladores subidos a VPS-1 (estáticos, no requieren deploy Next.js):

| Archivo | URL |
|---------|-----|
| Windows | https://sistemasymas.com/downloads/deskflow/DeskFlow-Setup-0.1.0-windows.exe |
| macOS Apple Silicon | https://sistemasymas.com/downloads/deskflow/DeskFlow-0.1.0-mac-arm64.dmg |
| macOS Intel | https://sistemasymas.com/downloads/deskflow/DeskFlow-0.1.0-mac-intel.dmg |

**Subir builds nuevos:**

```bash
cd proyectos/organizador-escritorio
npm run dist:mac && npm run dist:win
# Renombrar según lib/deskflow.ts en sistemasymas-web:
cp "dist/DeskFlow-0.1.0-arm64.dmg" releases-upload/DeskFlow-0.1.0-mac-arm64.dmg
cp "dist/DeskFlow-0.1.0.dmg" releases-upload/DeskFlow-0.1.0-mac-intel.dmg
cp "dist/DeskFlow Setup 0.1.0.exe" releases-upload/DeskFlow-Setup-0.1.0-windows.exe
scp -i ~/.ssh/id_ed25519_vps3_coolify releases-upload/* \
  root@74.208.25.241:/var/www/vhosts/sistemasymas.com/httpdocs/downloads/deskflow/
```

### Web sistemasymas.com

- Repo `sistemasymas-web`, commit `b1ea6e5`: landing `/deskflow` con acento azul (antes morado).
- **Pull en Plesk** solo afecta el **diseño** de la página; las **descargas** usan los archivos estáticos de `/downloads/deskflow/` (ya actualizados por SCP).

### Git

| Repo | Rama | Commits relevantes |
|------|------|-------------------|
| `matrevi88/Organizador-de-Escritorio` | `master` | `453a2f8`, `2b88e76` |
| `matrevi88/sistemasymas-web` | `main` | `b1ea6e5` (estilo `/deskflow`) |

---

## [0.1.0] — 2026-05-21 (primera distribución)

- Builds iniciales .exe / .dmg en VPS.
- Panel lateral por grupos, ConfigDrawer, backup .deskflow, autostart, GitHub Actions.
- Memoria y regla: ejecutables nunca en git.

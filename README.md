# DeskFlow — PLANTILLA ARCHIVADA (producto retirado 2026-06-20)

> **No es producto activo.** Código de referencia para futuras apps Electron Mac + Windows.  
> Golden path: `../../docs/patrones-app-escritorio-electron.md` · Skill: `/desktop-app`

---

# DeskFlow

Organizador de escritorio (Electron) — lanzador por grupos, carpetas vigiladas, tema claro sistemasymas.

## Desarrollo

```bash
npm install
npm run dev          # Ctrl+Shift+D en la app
npm run typecheck
```

## Documentación

| Archivo | Contenido |
|---------|-----------|
| [CHANGELOG.md](./CHANGELOG.md) | Historial de versiones |
| [docs/RELEASE-WINDOWS.md](./docs/RELEASE-WINDOWS.md) | **Checklist obligatorio** antes de publicar `.exe` (instalar / actualizar / desinstalar) |
| [.claude/memory/memory-01.md](./.claude/memory/memory-01.md) | Memoria técnica (IPC, arquitectura) |

## Distribución

- Repo: `github.com/matrevi88/Organizador-de-Escritorio` — rama `master` (archivable)
- ~~Descargas: https://sistemasymas.com/deskflow~~ — retirado 2026-06-20
- Binarios históricos (opcional borrar en VPS): `/downloads/deskflow/`

```bash
npm run release:win   # build + verificación pre-subida
npm run dist:mac
```

Subida al VPS, pruebas en VM Windows y alinear `DESKFLOW_VERSION` en `sistemasymas-web`: ver **[docs/RELEASE-WINDOWS.md](./docs/RELEASE-WINDOWS.md)**.

Script de limpieza para clientes con instalación rota: `scripts/DeskFlow-Limpiar-Windows.bat` (también en el VPS).

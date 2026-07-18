# DeskFlow — Release Windows (instalador / actualización / desinstalación)

> **Plantilla archivada (2026-06-20).** Golden path genérico: `sistemasymas/docs/patrones-app-escritorio-electron.md`  
> Checklist obligatorio **antes de publicar** cada versión de app Electron en Windows.

## Causas que ya están mitigadas en el repo

| Problema del cliente | Causa técnica | Mitigación en código |
|----------------------|---------------|----------------------|
| «No se puede cerrar DeskFlow» ~30 % | `DeskFlow.exe` bloqueado (bandeja) al copiar archivos | `build/installer.nsh`: `preInit`, `customInit`, `customCheckAppRunning` + `taskkill /F /T` |
| «Fallo al desinstalar archivos antiguos : 2» | Desinstalador viejo + carpeta a medias | `customUnInstallCheck` + borrado por archivos |
| NSIS integrity check | Descarga incompleta o CRC en build Mac | `CRCCheck off` + verificar tamaño/hash al publicar |
| No aparece en Aplicaciones | Instalación **no llegó al 100 %** (sin registro) | Asistente NSIS + cierre forzado; script de limpieza |
| No desinstala desde Configuración | Desinstalación silenciosa `/S` sin cerrar app | `customUnInit` + `customRemoveFiles` |
| App no suelta el .exe al cerrar ventana | Tray mantiene proceso vivo | `isQuitting` + `before-quit` en `src/main/index.ts` |
| Dos instancias durante install | Usuario abre DeskFlow otra vez | `requestSingleInstanceLock()` |

## Antes de cada versión nueva

1. **Subir versión** en sync:
   - `package.json` → `"version"`
   - `proyectos/sistemasymas-web/lib/deskflow.ts` → `DESKFLOW_VERSION` y nombres de archivo
2. **Revisar** que `build/installer.nsh` sigue en `package.json` → `build.nsis.include`.
3. **No cambiar** `appId` (`com.sistemasymas.deskflow`) sin motivo — el GUID del desinstalador depende de él.

## Build y verificación local

```bash
cd proyectos/organizador-escritorio
npm run release:win
```

Equivale a `npm run dist:win` + `scripts/verify-windows-release.sh` (tamaño, SHA256, comprobaciones básicas).

Salida esperada:

- `dist/DeskFlow-Setup-<version>-windows.exe`
- `dist/DeskFlow-Setup-<version>-windows.exe.sha256`

Anotar el **tamaño en bytes** y actualizar la web (`WINDOWS_EXE_BYTES` y texto ~75 MB en `components/DeskflowDownloads.tsx`) si cambió.

## Subir al VPS (descargas estáticas)

```bash
VERSION=0.1.0   # la del package.json
scp -i ~/.ssh/id_ed25519_vps3_coolify \
  dist/DeskFlow-Setup-${VERSION}-windows.exe \
  dist/DeskFlow-Setup-${VERSION}-windows.exe.sha256 \
  scripts/DeskFlow-Limpiar-Windows.bat \
  root@74.208.25.241:/var/www/vhosts/sistemasymas.com/httpdocs/downloads/deskflow/
```

Comprobar en el navegador (Ctrl+F5):

- `https://sistemasymas.com/downloads/deskflow/DeskFlow-Setup-<version>-windows.exe`
- Mismo tamaño que en local (Propiedades del archivo)

## Web (landing / ayuda)

```bash
cd proyectos/sistemasymas-web
git push origin main
# Deploy: Plesk Pull en sistemasymas.com, o SSH (ver memory/deskflow-cambios-2026-06.md)
```

Documentación UX y archivos: `memory/deskflow-web-landing.md`, `docs/DESKFLOW-LANDING.md` (repo web).

## Pruebas mínimas en un PC Windows limpio (o VM)

Marcar ✅ antes de anunciar la versión:

- [ ] **Instalación nueva:** SmartScreen → Ejecutar de todas formas → asistente → 100 % → DeskFlow en **Aplicaciones instaladas**
- [ ] **Con app abierta en bandeja:** ejecutar instalador de nuevo → debe cerrar o pedir Reintentar y **completar** (actualización)
- [ ] **Desinstalar:** Configuración → Aplicaciones → DeskFlow → Desinstalar (con app cerrada o no; debe funcionar)
- [ ] **Tras fallo simulado:** ejecutar `DeskFlow-Limpiar-Windows.bat` → carpeta `%LOCALAPPDATA%\Programs\DeskFlow` eliminada → reinstalar OK

## Si un cliente ya tiene instalación rota

1. Enviar enlace al `.bat`:  
   `https://sistemasymas.com/downloads/deskflow/DeskFlow-Limpiar-Windows.bat`
2. Luego instalador nuevo desde `/deskflow`.
3. No pedir «desinstalar desde Aplicaciones» si **no aparece** DeskFlow en la lista.

## Actualizaciones futuras (misma máquina)

- El **desinstalador embebido** es el de la **última instalación completada**. Tras publicar un instalador con `installer.nsh` nuevo, el cliente debe **instalar una vez** esa versión para heredar el desinstalador arreglado.
- Siempre publicar **un solo** `DeskFlow-Setup-<version>-windows.exe` por versión (misma URL sustituye el archivo).

## Referencia de archivos

| Archivo | Rol |
|---------|-----|
| `build/installer.nsh` | Macros NSIS (cerrar app, instalar, desinstalar) |
| `electron-builder.config.cjs` | Nombre artefacto Windows + firma Mac |
| `scripts/DeskFlow-Limpiar-Windows.bat` | Limpieza manual en VPS |
| `scripts/verify-windows-release.sh` | QA pre-subida |

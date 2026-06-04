#!/usr/bin/env bash
# Verificación pre-publicación del instalador Windows de DeskFlow.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
EXE="$ROOT/dist/DeskFlow-Setup-${VERSION}-windows.exe"
MIN_BYTES=75000000

echo "DeskFlow Windows release check — v${VERSION}"
echo "────────────────────────────────────────"

if [[ ! -f "$EXE" ]]; then
  echo "ERROR: no existe $EXE"
  echo "Ejecuta: npm run dist:win"
  exit 1
fi

SIZE=$(stat -f%z "$EXE" 2>/dev/null || stat -c%s "$EXE")
echo "OK  Archivo: dist/DeskFlow-Setup-${VERSION}-windows.exe"
echo "    Tamaño: ${SIZE} bytes"

if [[ "$SIZE" -lt "$MIN_BYTES" ]]; then
  echo "ERROR: tamaño sospechosamente pequeño (¿build incompleto?)"
  exit 1
fi

HASH=$(shasum -a 256 "$EXE" | awk '{print $1}')
echo "$HASH  DeskFlow-Setup-${VERSION}-windows.exe" > "$ROOT/dist/DeskFlow-Setup-${VERSION}-windows.exe.sha256"
echo "OK  SHA256: $HASH"
echo "    Guardado: dist/DeskFlow-Setup-${VERSION}-windows.exe.sha256"

if [[ ! -f "$ROOT/build/installer.nsh" ]]; then
  echo "ERROR: falta build/installer.nsh"
  exit 1
fi
echo "OK  build/installer.nsh presente"

if ! grep -q 'customUnInit' "$ROOT/build/installer.nsh"; then
  echo "ERROR: installer.nsh sin customUnInit (desinstalación)"
  exit 1
fi
echo "OK  Macros de cierre/desinstalación en installer.nsh"

if ! grep -q '"include": "build/installer.nsh"' "$ROOT/package.json"; then
  echo "WARN package.json debe incluir build/installer.nsh en build.nsis"
fi

WEB_TS="$ROOT/../sistemasymas-web/lib/deskflow.ts"
if [[ -f "$WEB_TS" ]]; then
  WEB_VER=$(grep -E 'DESKFLOW_VERSION\s*=' "$WEB_TS" | head -1 || true)
  if [[ -n "$WEB_VER" ]] && ! echo "$WEB_VER" | grep -q "$VERSION"; then
    echo "WARN Versión distinta en sistemasymas-web/lib/deskflow.ts — alinear antes de publicar"
    echo "    $WEB_VER"
  else
    echo "OK  DESKFLOW_VERSION alineada en sistemasymas-web (si existe el repo)"
  fi
fi

echo ""
echo "Listo para subir al VPS:"
echo "  scp dist/DeskFlow-Setup-${VERSION}-windows.exe \\"
echo "      dist/DeskFlow-Setup-${VERSION}-windows.exe.sha256 \\"
echo "      scripts/DeskFlow-Limpiar-Windows.bat \\"
echo "      root@74.208.25.241:/var/www/vhosts/sistemasymas.com/httpdocs/downloads/deskflow/"
echo ""
echo "Actualiza en web el tamaño en bytes: ${SIZE}"

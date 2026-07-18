#!/bin/bash
cd "$(dirname "$0")"
git checkout HEAD -- presentaciones/ 2>/dev/null || git checkout main -- presentaciones/ 2>/dev/null
rm -rf presentaciones/libro-rondalla
rm -f presentaciones/Abrir-Presentacion-en-Navegador.command
ls -la presentaciones/

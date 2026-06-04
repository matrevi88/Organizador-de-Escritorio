@echo off
chcp 65001 >nul
title DeskFlow — limpieza manual (Windows)
echo.
echo DeskFlow — limpieza si NO aparece en Configuracion ^> Aplicaciones
echo (la instalacion no termino y Windows no registro el desinstalador)
echo.

echo [1/4] Cerrando DeskFlow...
taskkill /F /IM DeskFlow.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Borrando carpeta de instalacion...
set "DIR=%LOCALAPPDATA%\Programs\DeskFlow"
if exist "%DIR%" (
  rd /s /q "%DIR%"
  if exist "%DIR%" (
    echo    ERROR: no se pudo borrar "%DIR%"
    echo    Cierra DeskFlow en la bandeja, abre este .bat con clic derecho ^> Ejecutar como administrador.
  ) else (
    echo    OK: "%DIR%" eliminada
  )
) else (
  echo    No existe "%DIR%" — puede estar en otra ruta o ya se borro
)

echo [3/4] Quitando inicio con Windows...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v DeskFlow /f >nul 2>&1

echo [4/4] Quitando entrada en Aplicaciones (si quedo a medias)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' -ErrorAction SilentlyContinue | ForEach-Object { $p=$_.PSPath; $d=(Get-ItemProperty -Path $p -Name DisplayName -ErrorAction SilentlyContinue).DisplayName; if ($d -like '*DeskFlow*') { Remove-Item -Path $p -Recurse -Force; Write-Host ('   Registro eliminado: ' + $d) } }"

echo.
echo Listo. Si el icono de bandeja sigue, reinicia el PC.
echo Instala de nuevo solo desde: https://sistemasymas.com/deskflow
echo.
pause

; DeskFlow — NSIS (electron-builder)
; Instalación: DeskFlow.exe bloqueado en bandeja → fallo al copiar (~30 %).
; Desinstalación: Windows usa /S (silencioso) y NO llama checkAppRunning; el .exe del
; desinstalador vive en $INSTDIR → RMDir /r falla si la app sigue abierta.

!macro customHeader
  CRCCheck off
!macroend

!macro _killDeskFlowProcesses
  DetailPrint "Cerrando DeskFlow (y procesos hijos)..."
  nsExec::ExecToLog '"$SYSDIR\cmd.exe" /c taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  Sleep 1500
  nsExec::ExecToLog '"$SYSDIR\cmd.exe" /c taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  Sleep 1000
!macroend

; Cada .onInit del instalador (incl. paso UAC)
!macro preInit
  !insertmacro _killDeskFlowProcesses
!macroend

!macro customInit
  !insertmacro _killDeskFlowProcesses
!macroend

; Cada .onInit del DESINSTALADOR (Configuración → Desinstalar usa /S)
!macro customUnInit
  !insertmacro _killDeskFlowProcesses
!macroend

!macro customCheckAppRunning
  StrCpy $R5 0
  df_check_running:
    !insertmacro _killDeskFlowProcesses
    ClearErrors
    nsExec::ExecToLog '"$SYSDIR\cmd.exe" /c tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" | find /I "${APP_EXECUTABLE_FILENAME}"'
    Pop $R0
    StrCmp $R0 0 df_still_running df_not_running
  df_still_running:
    IntOp $R5 $R5 + 1
    IntCmp $R5 4 0 df_not_running df_ask_user
  df_ask_user:
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY df_check_running
    Quit
  df_not_running:
!macroend

; Tras ejecutar el desinstalador viejo en una actualización (instalador nuevo)
!macro customUnInstallCheck
  !insertmacro _killDeskFlowProcesses
  !insertmacro _deleteDeskFlowAppFiles
!macroend

; Borra la app sin depender de RMDir /r con el desinstalador aún dentro de la carpeta
!macro _deleteDeskFlowAppFiles
  Delete "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\*.html"
  Delete "$INSTDIR\*.txt"
  Delete "$INSTDIR\*.json"
  Delete "$INSTDIR\*.ico"
  ; No borrar ${UNINSTALL_FILENAME} aquí: este proceso puede ser el desinstalador
!macroend

!macro customRemoveFiles
  !insertmacro _killDeskFlowProcesses
  Sleep 2000
  !insertmacro _deleteDeskFlowAppFiles
  ; Intentar vaciar el resto (incl. desinstalador al salir)
  RMDir /r "$INSTDIR"
!macroend

!macro customUnInstall
  !insertmacro _killDeskFlowProcesses
  ; Quitar inicio con Windows (setLoginItemSettings name: DeskFlow)
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DeskFlow"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "DeskFlow"
!macroend

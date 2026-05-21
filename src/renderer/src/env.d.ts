/// <reference types="vite/client" />

interface FileIconResult {
  iconDataUrl: string
  name: string
}

interface PickedFile {
  path: string
  name: string
  iconDataUrl: string
  icon: string
}

interface BackupResult {
  success: boolean
  canceled?: boolean
  filePath?: string
  error?: string
}

interface Window {
  api: {
    hideWindow:       () => void
    toggleWindow:     () => void
    setPanelPosition: (pos: 'left' | 'right' | 'float') => void
    pickApps:         () => Promise<PickedFile[]>
    pickFiles:        () => Promise<PickedFile[]>
    getFileIcon:      (path: string) => Promise<FileIconResult>
    openFile:         (path: string) => void
    loadStore:        (key: string) => unknown
    saveStore:        (key: string, value: unknown) => void
    setStartWithOS:   (enable: boolean) => void
    exportBackup:     () => Promise<BackupResult>
    importBackup:     () => Promise<BackupResult>
  }
}

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

interface FolderIndexMeta {
  version: 1
  updatedAt: string
  entryCount: number
  folders: string[]
}

interface IndexedSearchHit {
  path: string
  name: string
  rootLabel: string
  isDirectory: boolean
  icon: string
}

interface PickWatchedFolderResult {
  canceled: boolean
  path: string | null
}

interface Window {
  api: {
    hideWindow:       () => void
    toggleWindow:     () => void
    setPanelPosition: (pos: 'left' | 'right' | 'float') => void
    setLauncherLayout: (enabled: boolean, panelPosition?: 'left' | 'right' | 'float') => void
    pickApps:         () => Promise<PickedFile[]>
    pickFiles:        () => Promise<PickedFile[]>
    getFileIcon:      (path: string) => Promise<FileIconResult>
    openFile:         (path: string) => void
    loadStore:        (key: string) => unknown
    saveStore:        (key: string, value: unknown) => void
    setStartWithOS:   (enable: boolean) => void
    exportBackup:     () => Promise<BackupResult>
    importBackup:     () => Promise<BackupResult>
    pickWatchedFolder:  () => Promise<PickWatchedFolderResult>
    getFolderIndexMeta: () => Promise<FolderIndexMeta>
    refreshFolderIndex: () => Promise<FolderIndexMeta>
    searchIndexed:      (query: string) => Promise<IndexedSearchHit[]>
    setWatchedFolders:  (folders: string[]) => Promise<FolderIndexMeta>
  }
}

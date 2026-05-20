/// <reference types="vite/client" />

interface FileIconResult {
  iconDataUrl: string
  name: string
}

interface PickedFile {
  path: string
  name: string
  iconDataUrl: string
}

interface Window {
  api: {
    hideWindow:       () => void
    toggleWindow:     () => void
    setPanelPosition: (pos: 'left' | 'right' | 'float') => void
    pickFiles:        () => Promise<PickedFile[]>
    getFileIcon:      (path: string) => Promise<FileIconResult>
    openFile:         (path: string) => void
  }
}

export interface AppItem {
  id: string
  name: string
  icon: string          // emoji (apps predefinidas)
  iconDataUrl?: string  // ícono real del sistema (archivos/carpetas)
  path?: string         // ruta en disco para abrirlo
}

export interface Group {
  id: string
  name: string
  icon: string
  color: string
  visible: boolean
  collapsed: boolean
  apps: AppItem[]
}

export interface Profile {
  id: string
  name: string
  icon: string
  groups: Group[]
}

export type PanelPosition = 'left' | 'float' | 'right'

export interface FolderIndexMeta {
  version: 1
  updatedAt: string
  entryCount: number
  folders: string[]
}

export interface IndexedSearchHit {
  path: string
  name: string
  rootLabel: string
  isDirectory: boolean
  icon: string
}

export interface Settings {
  startWithOS: boolean
  collapseOnStart: boolean
  syncEnabled: boolean
  opacity: number
  panelPosition: PanelPosition
  activeProfileId: string
  watchedFolders: string[]
}

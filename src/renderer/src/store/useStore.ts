import { useState, useCallback } from 'react'
import type { Group, AppItem, Settings, PanelPosition } from '../types'

const DEFAULT_GROUPS: Group[] = [
  {
    id: 'trabajo', name: 'Trabajo', icon: '💼', color: '#7c6af7',
    visible: true, collapsed: true,
    apps: [
      { id: 'outlook',    name: 'Outlook',    icon: '📧' },
      { id: 'teams',      name: 'Teams',      icon: '📋' },
      { id: 'excel',      name: 'Excel',      icon: '📊' },
      { id: 'word',       name: 'Word',       icon: '📝' },
      { id: 'powerpoint', name: 'PowerPoint', icon: '📈' },
      { id: 'onedrive',   name: 'OneDrive',   icon: '🗂️' },
    ]
  },
  {
    id: 'dev', name: 'Desarrollo', icon: '⚡', color: '#5eead4',
    visible: true, collapsed: true,
    apps: [
      { id: 'vscode',    name: 'VS Code',  icon: '💻' },
      { id: 'firefox',   name: 'Firefox',  icon: '🦊' },
      { id: 'github',    name: 'GitHub',   icon: '🐙' },
      { id: 'docker',    name: 'Docker',   icon: '🐳' },
      { id: 'terminal',  name: 'Terminal', icon: '⚡' },
      { id: 'postman',   name: 'Postman',  icon: '🔵' },
    ]
  },
  {
    id: 'diseno', name: 'Diseño', icon: '🎨', color: '#f472b6',
    visible: true, collapsed: true,
    apps: [
      { id: 'figma',       name: 'Figma',       icon: '🎨' },
      { id: 'photoshop',   name: 'Photoshop',   icon: '🖼️' },
      { id: 'premiere',    name: 'Premiere',    icon: '🎬' },
      { id: 'illustrator', name: 'Illustrator', icon: '✏️' },
    ]
  },
  {
    id: 'social', name: 'Social', icon: '💬', color: '#34d399',
    visible: true, collapsed: true,
    apps: [
      { id: 'whatsapp', name: 'WhatsApp', icon: '💬' },
      { id: 'discord',  name: 'Discord',  icon: '🎮' },
      { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
      { id: 'telegram', name: 'Telegram', icon: '✈️' },
    ]
  },
  {
    id: 'tools', name: 'Herramientas', icon: '🔧', color: '#fb923c',
    visible: true, collapsed: true,
    apps: [
      { id: 'settings',  name: 'Config.',    icon: '🔧' },
      { id: '1password', name: '1Password',  icon: '🗝️' },
      { id: 'everything',name: 'Everything', icon: '🔍' },
      { id: 'antivirus', name: 'Antivirus',  icon: '🛡️' },
    ]
  },
]

const DEFAULT_SETTINGS: Settings = {
  startWithOS: true,
  collapseOnStart: true,
  syncEnabled: true,
  opacity: 100,
  panelPosition: 'right',
  activeProfileId: 'personal'
}

function loadSettings(): Settings {
  try {
    const raw = window.api?.loadStore('settings')
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(raw as object) }
  } catch { return DEFAULT_SETTINGS }
}

function loadGroups(): Group[] {
  try {
    const raw = window.api?.loadStore('groups')
    if (!raw) return DEFAULT_GROUPS
    return raw as Group[]
  } catch { return DEFAULT_GROUPS }
}

function saveSettings(s: Settings) {
  try { window.api?.saveStore('settings', s) } catch {}
}

function saveGroups(g: Group[]) {
  try { window.api?.saveStore('groups', g) } catch {}
}

export function useStore() {
  const [groups, setGroups] = useState<Group[]>(loadGroups)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [search, setSearch] = useState('')

  const visibleGroups = search
    ? groups.map(g => ({
        ...g,
        apps: g.apps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
      })).filter(g => g.apps.length > 0)
    : groups

  const setGroupsPersist = useCallback((updater: (prev: Group[]) => Group[]) => {
    setGroups(prev => {
      const next = updater(prev)
      saveGroups(next)
      return next
    })
  }, [])

  const toggleCollapse = useCallback((id: string) => {
    setGroupsPersist(prev => prev.map(g => g.id === id ? { ...g, collapsed: !g.collapsed } : g))
  }, [setGroupsPersist])

  const toggleVisible = useCallback((id: string) => {
    setGroupsPersist(prev => prev.map(g => g.id === id ? { ...g, visible: !g.visible } : g))
  }, [setGroupsPersist])

  const addGroup = useCallback((group: Omit<Group, 'apps' | 'collapsed'>) => {
    setGroupsPersist(prev => [...prev, { ...group, apps: [], collapsed: false }])
  }, [setGroupsPersist])

  const updateGroup = useCallback((id: string, patch: Partial<Pick<Group, 'name' | 'icon' | 'color'>>) => {
    setGroupsPersist(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))
  }, [setGroupsPersist])

  const deleteGroup = useCallback((id: string) => {
    setGroupsPersist(prev => prev.filter(g => g.id !== id))
  }, [setGroupsPersist])

  const addAppToGroup = useCallback((groupId: string, app: Omit<AppItem, 'id'>) => {
    setGroupsPersist(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, apps: [...g.apps, { ...app, id: `app_${Date.now()}_${Math.random().toString(36).slice(2)}` }] }
        : g
    ))
  }, [setGroupsPersist])

  const removeAppFromGroup = useCallback((groupId: string, appId: string) => {
    setGroupsPersist(prev => prev.map(g =>
      g.id === groupId ? { ...g, apps: g.apps.filter(a => a.id !== appId) } : g
    ))
  }, [setGroupsPersist])

  const reorderGroups = useCallback((fromId: string, toId: string) => {
    setGroupsPersist(prev => {
      const next = [...prev]
      const fromIdx = next.findIndex(g => g.id === fromId)
      const toIdx = next.findIndex(g => g.id === toId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      return next
    })
  }, [setGroupsPersist])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
    if (patch.panelPosition) {
      const pos = patch.panelPosition as PanelPosition
      if (window.api?.setPanelPosition) {
        window.api.setPanelPosition(pos)
      } else {
        // @ts-ignore
        window.electron?.ipcRenderer?.send('set-panel-position', pos)
      }
    }
    if (patch.startWithOS !== undefined) {
      window.api?.setStartWithOS(patch.startWithOS)
    }
  }, [])

  return {
    groups,
    visibleGroups,
    settings,
    search,
    setSearch,
    toggleCollapse,
    toggleVisible,
    addGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    addAppToGroup,
    removeAppFromGroup,
    updateSettings
  }
}

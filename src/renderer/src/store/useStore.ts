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
  opacity: 75,
  panelPosition: 'right',
  activeProfileId: 'personal'
}

export function useStore() {
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [search, setSearch] = useState('')

  const visibleGroups = search
    ? groups.map(g => ({
        ...g,
        apps: g.apps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
      })).filter(g => g.apps.length > 0)
    : groups

  const toggleCollapse = useCallback((id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, collapsed: !g.collapsed } : g))
  }, [])

  const toggleVisible = useCallback((id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, visible: !g.visible } : g))
  }, [])

  const addGroup = useCallback((group: Omit<Group, 'apps' | 'collapsed'>) => {
    setGroups(prev => [...prev, { ...group, apps: [], collapsed: false }])
  }, [])

  const updateGroup = useCallback((id: string, patch: Partial<Pick<Group, 'name' | 'icon' | 'color'>>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))
  }, [])

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id))
  }, [])

  const addAppToGroup = useCallback((groupId: string, app: Omit<AppItem, 'id'>) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, apps: [...g.apps, { ...app, id: `app_${Date.now()}_${Math.random().toString(36).slice(2)}` }] }
        : g
    ))
  }, [])

  const removeAppFromGroup = useCallback((groupId: string, appId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, apps: g.apps.filter(a => a.id !== appId) } : g
    ))
  }, [])

  const reorderGroups = useCallback((fromId: string, toId: string) => {
    setGroups(prev => {
      const next = [...prev]
      const fromIdx = next.findIndex(g => g.id === fromId)
      const toIdx = next.findIndex(g => g.id === toId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      return next
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    if (patch.panelPosition) {
      const pos = patch.panelPosition as PanelPosition
      if (window.api?.setPanelPosition) {
        window.api.setPanelPosition(pos)
      } else {
        // @ts-ignore
        window.electron?.ipcRenderer?.send('set-panel-position', pos)
      }
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

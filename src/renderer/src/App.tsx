import { useState, useRef, useEffect } from 'react'
import { useStore } from './store/useStore'
import { ConfigDrawer } from './components/ConfigDrawer'
import { GroupModal } from './components/GroupModal'
import { LauncherView } from './components/LauncherView'
import { OrganizeView } from './components/OrganizeView'
import { AppIcon } from './components/AppIcon'
import type { Group, AppItem } from './types'
import { colorOnLightBg } from './lib/colorContrast'

type Screen = 'launcher' | 'organize'

function applyWindowLayout(screen: Screen, panelPosition: 'left' | 'right' | 'float') {
  if (screen === 'launcher') {
    window.api?.setLauncherLayout?.(true, panelPosition)
  } else {
    window.api?.setLauncherLayout?.(false, panelPosition)
    window.api?.setPanelPosition(panelPosition)
  }
}

export default function App() {
  const {
    groups, settings, search,
    setSearch, toggleCollapse, toggleVisible,
    addGroup, updateGroup, deleteGroup,
    reorderGroups, addAppToGroup, removeAppFromGroup, updateSettings
  } = useStore()

  const [screen, setScreen] = useState<Screen>('launcher')
  const [configOpen, setConfigOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<string | null>(null)

  useEffect(() => {
    applyWindowLayout(screen, settings.panelPosition)
  }, [screen, settings.panelPosition])

  const showToast = (msg: string) => {
    setToast(msg)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500)
  }

  const goLauncher = () => {
    setExpandedGroupId(null)
    setScreen('launcher')
  }

  const goOrganize = () => {
    setScreen('organize')
  }

  const handleSaveGroup = ({ name, icon, color }: { name: string; icon: string; color: string }) => {
    if (editingGroup) {
      updateGroup(editingGroup.id, { name, icon, color })
      showToast('Grupo actualizado ✓')
    } else {
      addGroup({ id: `grp_${Date.now()}`, name, icon, color, visible: true })
      showToast(`Grupo "${name}" creado ✓`)
    }
    setEditingGroup(null)
  }

  const handleDeleteGroup = () => {
    if (!editingGroup) return
    deleteGroup(editingGroup.id)
    setEditingGroup(null)
    setModalOpen(false)
    showToast('Grupo eliminado')
  }

  const handleToggleVisible = (id: string) => {
    toggleVisible(id)
    const g = groups.find((x) => x.id === id)
    if (g) showToast(`"${g.name}" ${g.visible ? 'oculto' : 'visible ✓'}`)
  }

  const openEditModal = (id: string) => {
    const g = groups.find((x) => x.id === id)
    if (g) {
      setEditingGroup(g)
      setModalOpen(true)
    }
  }

  const handleAddApps = async (groupId: string) => {
    const files = await window.api?.pickApps()
    if (!files?.length) return
    for (const f of files) {
      addAppToGroup(groupId, {
        name: f.name,
        icon: f.icon ?? '🖥️',
        iconDataUrl: f.iconDataUrl,
        path: f.path
      })
    }
    showToast(`${files.length} app${files.length > 1 ? 's' : ''} agregada${files.length > 1 ? 's' : ''} ✓`)
  }

  const handleAddFiles = async (groupId: string) => {
    const files = await window.api?.pickFiles()
    if (!files?.length) return
    for (const f of files) {
      addAppToGroup(groupId, {
        name: f.name,
        icon: f.icon ?? '📄',
        iconDataUrl: f.iconDataUrl,
        path: f.path
      })
    }
    showToast(`${files.length} ítem${files.length > 1 ? 's' : ''} agregado${files.length > 1 ? 's' : ''} ✓`)
  }

  const fileEmoji = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    if (['exe', 'lnk', 'app', 'dmg', 'pkg'].includes(ext)) return '🖥️'
    if (!filePath.includes('.') || filePath.endsWith('/') || filePath.endsWith('\\')) return '📁'
    return '📄'
  }

  const handleDropFiles = async (groupId: string, fileList: FileList) => {
    const files = Array.from(fileList)
    for (const file of files) {
      const filePath = (file as File & { path?: string }).path || ''
      if (!filePath) continue
      const result = await window.api?.getFileIcon(filePath)
      addAppToGroup(groupId, {
        name: result?.name || file.name,
        icon: fileEmoji(filePath),
        iconDataUrl: result?.iconDataUrl || '',
        path: filePath
      })
    }
    showToast(`${files.length} ítem${files.length > 1 ? 's' : ''} agregado${files.length > 1 ? 's' : ''} ✓`)
  }

  const handleOpenApp = (app: AppItem) => {
    if (!app.path) {
      showToast('Agrega una ruta en Organizar (selector o arrastrar)')
      return
    }
    window.api?.openFile(app.path)
  }

  const sendHide = () => {
    if (window.api?.hideWindow) {
      window.api.hideWindow()
    } else {
      // @ts-expect-error ipc fallback en dev
      window.electron?.ipcRenderer?.send('hide-window')
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col rounded-[20px] overflow-hidden"
      style={{
        background: `rgba(250, 250, 247, ${settings.opacity / 100})`,
        backdropFilter: settings.opacity < 100 ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: settings.opacity < 100 ? 'blur(20px)' : 'none',
        border: '1px solid rgba(11, 16, 32, 0.12)',
        boxShadow: '0 8px 32px rgba(11, 16, 32, 0.14)'
      }}
    >
      <div
        className={`fixed top-3 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-xl text-sm border transition-all duration-250 pointer-events-none
          ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        style={{ background: 'rgba(250,250,247,0.98)', borderColor: '#2563eb', color: '#0b1020' }}
      >
        {toast}
      </div>

      <div
        className="flex items-center justify-center h-5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none opacity-30 hover:opacity-60 transition-opacity"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        title="Arrastra para mover"
      >
        <span className="text-[11px] tracking-widest">· · · · ·</span>
      </div>

      {screen === 'launcher' ? (
        <LauncherView
          groups={groups}
          search={search}
          onSearchChange={setSearch}
          onOpenApp={(app) => {
            handleOpenApp(app)
            if (app.path) sendHide()
          }}
          onOrganize={goOrganize}
          onSettings={() => setConfigOpen(true)}
          onHide={sendHide}
          onNewGroup={() => {
            setEditingGroup(null)
            setModalOpen(true)
          }}
        />
      ) : (
        <OrganizeView
          groups={groups}
          search={search}
          onSearchChange={setSearch}
          onBack={goLauncher}
          onToggleCollapse={toggleCollapse}
          onToggleVisible={handleToggleVisible}
          onExpand={(id) => setExpandedGroupId(id)}
          onDragStart={(id) => { dragRef.current = id }}
          onDrop={(toId) => {
            if (dragRef.current && dragRef.current !== toId) {
              reorderGroups(dragRef.current, toId)
              showToast('Grupo reordenado ✓')
            }
            dragRef.current = null
          }}
          onAddApps={handleAddApps}
          onAddFiles={handleAddFiles}
          onDropFiles={handleDropFiles}
          onOpenApp={handleOpenApp}
          onRemoveApp={removeAppFromGroup}
          onNewGroup={() => {
            setEditingGroup(null)
            setModalOpen(true)
          }}
        />
      )}

      <ConfigDrawer
        open={configOpen}
        groups={groups}
        settings={settings}
        onClose={() => setConfigOpen(false)}
        onToggleVisible={handleToggleVisible}
        onReorder={reorderGroups}
        onEditGroup={openEditModal}
        onUpdateSettings={updateSettings}
        onSave={() => {
          setConfigOpen(false)
          showToast('Configuración guardada ✓')
        }}
      />

      {expandedGroupId && (() => {
        const g = groups.find((x) => x.id === expandedGroupId)
        if (!g) return null
        return (
          <GroupExpandOverlay
            group={g}
            onClose={() => setExpandedGroupId(null)}
            onOpenApp={handleOpenApp}
            onAddApps={handleAddApps}
            onAddFiles={handleAddFiles}
            onRemoveApp={removeAppFromGroup}
          />
        )
      })()}

      <GroupModal
        open={modalOpen}
        editGroup={editingGroup}
        onClose={() => {
          setModalOpen(false)
          setEditingGroup(null)
        }}
        onSave={handleSaveGroup}
        onDelete={editingGroup ? handleDeleteGroup : undefined}
      />
    </div>
  )
}

function GroupExpandOverlay({
  group,
  onClose,
  onOpenApp,
  onAddApps,
  onAddFiles,
  onRemoveApp
}: {
  group: Group
  onClose: () => void
  onOpenApp: (app: AppItem) => void
  onAddApps: (groupId: string) => void
  onAddFiles: (groupId: string) => void
  onRemoveApp: (groupId: string, appId: string) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="absolute inset-0 z-[200] flex flex-col rounded-[20px] overflow-hidden"
      style={{ background: 'rgba(250,250,247,0.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-df flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[8px] h-[8px] rounded-full" style={{ background: colorOnLightBg(group.color) }} />
          <span className="text-[13px] font-semibold text-ink uppercase tracking-[0.8px]">
            {group.icon} {group.name}
          </span>
          <span className="text-[10px] text-ink/75 bg-df-surface border border-df rounded-[8px] px-1.5 py-px font-medium">
            {group.apps.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <OverlayBtn onClick={() => onAddApps(group.id)} title="Agregar app">🖥</OverlayBtn>
          <OverlayBtn onClick={() => onAddFiles(group.id)} title="Agregar archivo">+</OverlayBtn>
          <OverlayBtn onClick={onClose} title="Cerrar">✕</OverlayBtn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {group.apps.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-df-muted text-[11px]">
            <span>Arrastra archivos o usa + / 🖥</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {group.apps.map((app) => (
              <div key={app.id} className="relative group/app">
                <button
                  type="button"
                  className="w-full flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-df-hover transition-colors"
                  onClick={() => onOpenApp(app)}
                  title={app.path ? `${app.name}\n${app.path}` : app.name}
                >
                  <AppIcon item={app} />
                  <span className="text-[10px] text-ink/80 line-clamp-2 text-center">{app.name}</span>
                </button>
                <button
                  type="button"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-[9px] opacity-0 group-hover/app:opacity-100"
                  onClick={() => onRemoveApp(group.id, app.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OverlayBtn({
  onClick,
  title,
  children
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-[13px] text-ink/70 bg-df-surface border border-df hover:bg-df-hover hover:text-ink"
    >
      {children}
    </button>
  )
}

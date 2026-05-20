import { useState, useRef, useEffect } from 'react'
import { useStore } from './store/useStore'
import { GroupCard } from './components/GroupCard'
import { ConfigDrawer } from './components/ConfigDrawer'
import { GroupModal } from './components/GroupModal'
import type { Group, AppItem } from './types'

export default function App() {
  const {
    groups, visibleGroups, settings, search,
    setSearch, toggleCollapse, toggleVisible,
    addGroup, updateGroup, deleteGroup,
    reorderGroups, addAppToGroup, removeAppFromGroup, updateSettings
  } = useStore()

  const [configOpen, setConfigOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500)
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
    const g = groups.find(x => x.id === id)
    if (g) showToast(`"${g.name}" ${g.visible ? 'oculto' : 'visible ✓'}`)
  }

  const openEditModal = (id: string) => {
    const g = groups.find(x => x.id === id)
    if (g) { setEditingGroup(g); setModalOpen(true) }
  }

  // Agregar archivos/carpetas via selector de archivos
  const handleAddFiles = async (groupId: string) => {
    const files = await window.api?.pickFiles()
    if (!files?.length) return
    for (const f of files) {
      addAppToGroup(groupId, { name: f.name, icon: '📄', iconDataUrl: f.iconDataUrl, path: f.path })
    }
    showToast(`${files.length} ítem${files.length > 1 ? 's' : ''} agregado${files.length > 1 ? 's' : ''} ✓`)
  }

  // Agregar archivos/carpetas via drag & drop desde el OS
  const handleDropFiles = async (groupId: string, fileList: FileList) => {
    const files = Array.from(fileList)
    for (const file of files) {
      const filePath = (file as File & { path?: string }).path || ''
      if (!filePath) continue
      const result = await window.api?.getFileIcon(filePath)
      addAppToGroup(groupId, {
        name: result?.name || file.name,
        icon: '📄',
        iconDataUrl: result?.iconDataUrl || '',
        path: filePath
      })
    }
    showToast(`${files.length} ítem${files.length > 1 ? 's' : ''} agregado${files.length > 1 ? 's' : ''} ✓`)
  }

  // Abrir archivo/app
  const handleOpenApp = (app: AppItem) => {
    if (app.path) window.api?.openFile(app.path)
  }

  // Ocultar ventana — intenta window.api primero, luego window.electron.ipcRenderer
  const sendHide = () => {
    if (window.api?.hideWindow) {
      window.api.hideWindow()
    } else {
      // @ts-ignore
      window.electron?.ipcRenderer?.send('hide-window')
    }
  }

  const visibleCount = groups.filter(g => g.visible).length
  const totalApps = groups.reduce((s, g) => s + g.apps.length, 0)

  return (
    <div
      className="fixed inset-0 flex flex-col rounded-[20px] overflow-hidden"
      style={{
        background: `rgba(20,18,40,${settings.opacity / 100})`,
        backdropFilter: settings.opacity < 100 ? 'blur(28px)' : 'none',
        WebkitBackdropFilter: settings.opacity < 100 ? 'blur(28px)' : 'none',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 48px rgba(0,0,0,0.5)'
      }}
    >
      {/* Toast */}
      <div
        className={`fixed top-3 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-[12px] text-sm border transition-all duration-250 pointer-events-none
          ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        style={{ background: 'rgba(18,16,36,0.98)', borderColor: '#7c6af7' }}
      >
        {toast}
      </div>

      {/* Drag handle — barra exclusiva para arrastrar la ventana */}
      <div
        className="flex items-center justify-center h-5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none opacity-30 hover:opacity-60 transition-opacity"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        title="Arrastra para mover"
      >
        <span className="text-[11px] tracking-widest">· · · · ·</span>
      </div>

      {/* Header — botones con eventos normales */}
      <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 text-[13px] font-semibold select-none">
          <div className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[11px]"
            style={{ background: 'linear-gradient(135deg, #7c6af7, #5eead4)' }}>
            ⊞
          </div>
          DeskFlow
          <span className="text-white/30 font-normal text-[11px]">v0.1</span>
        </div>
        <div className="flex gap-1.5">
          <IconBtn title="Sincronizar" onClick={() => showToast('Sincronizado ☁️')}>↻</IconBtn>
          <IconBtn title="Configurar paneles" onClick={() => setConfigOpen(v => !v)}>⚙</IconBtn>
          <IconBtn title="Minimizar  (Ctrl+Shift+D para volver)" onClick={sendHide}>—</IconBtn>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-3 pt-3 pb-1 flex-shrink-0">
        {[
          { val: String(visibleCount), lbl: 'Grupos' },
          { val: String(totalApps),    lbl: 'Apps' },
          { val: '3',                  lbl: 'Perfiles' },
        ].map(s => (
          <div key={s.lbl} className="bg-white/5 border border-white/10 rounded-[10px] py-2 text-center">
            <div className="text-[18px] font-bold" style={{
              background: 'linear-gradient(135deg, #7c6af7, #5eead4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>{s.val}</div>
            <div className="text-[9px] uppercase tracking-[0.5px] text-white/35 mt-px">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-[10px] px-3 py-2 focus-within:border-[#7c6af7] transition-colors">
          <span className="text-white/40 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar app..."
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-white placeholder:text-white/25"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/30 hover:text-white text-xs transition-colors">✕</button>
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2 grid grid-cols-2 gap-2 content-start">
        {visibleGroups.map(g => (
          <GroupCard
            key={g.id}
            group={g}
            compact
            onToggleCollapse={toggleCollapse}
            onToggleVisible={handleToggleVisible}
            onExpand={id => setExpandedGroupId(id)}
            onDragStart={id => { dragRef.current = id }}
            onDrop={toId => {
              if (dragRef.current && dragRef.current !== toId) {
                reorderGroups(dragRef.current, toId)
                showToast('Grupo reordenado ✓')
              }
              dragRef.current = null
            }}
            onAddFiles={handleAddFiles}
            onDropFiles={handleDropFiles}
            onOpenApp={handleOpenApp}
            onRemoveApp={removeAppFromGroup}
          />
        ))}

        {/* Agregar grupo */}
        <button
          onClick={() => { setEditingGroup(null); setModalOpen(true) }}
          className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[12px] text-white/35 transition-all hover:text-[#7c6af7] hover:border-[#7c6af7] hover:bg-[rgba(124,106,247,0.05)]"
          style={{ border: '1px dashed rgba(255,255,255,0.15)' }}
        >
          + Nuevo grupo
        </button>
      </div>

      {/* Config Drawer */}
      <ConfigDrawer
        open={configOpen}
        groups={groups}
        settings={settings}
        onClose={() => setConfigOpen(false)}
        onToggleVisible={id => { handleToggleVisible(id) }}
        onReorder={reorderGroups}
        onEditGroup={openEditModal}
        onUpdateSettings={updateSettings}
        onSave={() => { setConfigOpen(false); showToast('Configuración guardada ✓') }}
      />

      {/* Overlay grupo expandido */}
      {expandedGroupId && (() => {
        const g = groups.find(x => x.id === expandedGroupId)
        if (!g) return null
        return (
          <GroupExpandOverlay
            group={g}
            onClose={() => setExpandedGroupId(null)}
            onOpenApp={handleOpenApp}
            onAddFiles={handleAddFiles}
            onRemoveApp={removeAppFromGroup}
          />
        )
      })()}

      {/* Modal nuevo/editar grupo */}
      <GroupModal
        open={modalOpen}
        editGroup={editingGroup}
        onClose={() => { setModalOpen(false); setEditingGroup(null) }}
        onSave={handleSaveGroup}
        onDelete={editingGroup ? handleDeleteGroup : undefined}
      />
    </div>
  )
}

function GroupExpandOverlay({
  group, onClose, onOpenApp, onAddFiles, onRemoveApp
}: {
  group: Group
  onClose: () => void
  onOpenApp: (app: AppItem) => void
  onAddFiles: (groupId: string) => void
  onRemoveApp: (groupId: string, appId: string) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="absolute inset-0 z-[200] flex flex-col rounded-[20px] overflow-hidden"
      style={{ background: 'rgba(12,10,28,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Header del overlay */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[8px] h-[8px] rounded-full" style={{ background: group.color }} />
          <span className="text-[13px] font-semibold text-white/80 uppercase tracking-[0.8px]">
            {group.icon} {group.name}
          </span>
          <span className="text-[10px] text-white/30 bg-white/5 border border-white/10 rounded-[8px] px-1.5 py-px">
            {group.apps.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-[12px] font-bold text-white/40 bg-white/5 border border-white/10 hover:bg-[rgba(124,106,247,0.15)] hover:text-[#7c6af7] transition-all"
            onClick={() => onAddFiles(group.id)}
            title="Agregar"
          >+</button>
          <button
            className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-[13px] text-white/40 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
            onClick={onClose}
            title="Cerrar (Esc)"
          >✕</button>
        </div>
      </div>

      {/* Grid de apps */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {group.apps.length === 0 ? (
          <button
            className="w-full flex flex-col items-center gap-2 py-8 text-white/25 text-[12px] hover:text-white/40 transition-colors"
            onClick={() => onAddFiles(group.id)}
          >
            <span className="text-2xl">+</span>
            Arrastra archivos aquí o toca +
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {group.apps.map(app => (
              <div key={app.id} className="relative group/app">
                <button
                  className="w-full flex flex-col items-center gap-1 p-2 rounded-[12px] hover:bg-white/8 transition-colors"
                  onClick={() => onOpenApp(app)}
                  title={app.path ? `${app.name}\n${app.path}` : app.name}
                >
                  {app.iconDataUrl ? (
                    <img src={app.iconDataUrl} alt={app.name} className="w-11 h-11 rounded-[11px] object-contain" />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-[11px] flex items-center justify-center text-2xl shadow-md"
                      style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))' }}
                    >{app.icon}</div>
                  )}
                  <span
                    className="text-[10px] text-white/50 group-hover/app:text-white/80 transition-colors w-full text-center leading-tight"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >{app.name}</span>
                </button>
                {/* Botón quitar */}
                <button
                  className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-red-500/80 text-white text-[9px] flex items-center justify-center opacity-0 group-hover/app:opacity-100 transition-opacity hover:bg-red-500"
                  onClick={() => onRemoveApp(group.id, app.id)}
                  title="Quitar"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hint inferior */}
      <div className="px-4 py-2 flex-shrink-0 text-center">
        <span className="text-[10px] text-white/20">Doble click en otro grupo para cambiarlo · Esc para cerrar</span>
      </div>
    </div>
  )
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-[13px] text-white/40
        bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all"
    >
      {children}
    </button>
  )
}

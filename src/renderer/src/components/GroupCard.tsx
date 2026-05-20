import { useState, useEffect, useRef } from 'react'
// useRef se mantiene para ContextMenu
import type { Group, AppItem } from '../types'

function AppIcon({ item, size }: { item: AppItem; size: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  const cls = size === 'sm' ? 'w-8 h-8 text-lg' : size === 'md' ? 'w-10 h-10 text-xl' : 'w-11 h-11 text-2xl'
  if (!item.iconDataUrl || failed) {
    return (
      <div className={`${cls} rounded-[9px] flex items-center justify-center shadow-md`}
        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))' }}>
        {item.icon}
      </div>
    )
  }
  return (
    <img
      src={item.iconDataUrl}
      alt={item.name}
      className={`${cls} rounded-[9px] object-contain`}
      onError={() => setFailed(true)}
    />
  )
}

interface Props {
  group: Group
  compact?: boolean
  onToggleCollapse: (id: string) => void
  onToggleVisible:  (id: string) => void
  onExpand?:        (id: string) => void
  onDragStart:      (id: string) => void
  onDrop:           (toId: string) => void
  onAddApps:        (groupId: string) => void
  onAddFiles:       (groupId: string) => void
  onDropFiles:      (groupId: string, files: FileList) => void
  onOpenApp:        (app: AppItem) => void
  onRemoveApp:      (groupId: string, appId: string) => void
}

interface CtxMenu {
  app: AppItem
  x: number
  y: number
}

export function GroupCard({
  group, compact = false, onToggleCollapse, onToggleVisible, onExpand,
  onDragStart, onDrop, onAddApps, onAddFiles, onDropFiles, onOpenApp, onRemoveApp
}: Props) {
  const [dropOver, setDropOver] = useState(false)
  const [ctxMenu, setCtxMenu]   = useState<CtxMenu | null>(null)

  const handleFileDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.stopPropagation()
      setDropOver(true)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDropOver(false)
    if (e.dataTransfer.files.length > 0) {
      onDropFiles(group.id, e.dataTransfer.files)
    } else {
      onDrop(group.id)
    }
  }

  const openCtxMenu = (e: React.MouseEvent, app: AppItem) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ app, x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        draggable
        onDragStart={() => onDragStart(group.id)}
        onDragOver={handleFileDragOver}
        onDragLeave={() => setDropOver(false)}
        onDrop={handleFileDrop}
        className={`rounded-[14px] border overflow-hidden transition-all duration-200
          ${dropOver
            ? 'border-[#7c6af7] bg-[rgba(124,106,247,0.1)]'
            : 'border-white/10 hover:border-white/20'}`}
        style={{ background: dropOver ? undefined : 'rgba(255,255,255,0.05)' }}
      >
        {/* Header */}
        <div
          className={`flex flex-col cursor-pointer select-none hover:bg-white/5 transition-colors ${compact ? 'px-2 pt-2 pb-1.5' : 'px-3 pt-2.5 pb-1.5'}`}
          onClick={() => onToggleCollapse(group.id)}
          onDoubleClick={() => onExpand?.(group.id)}
        >
          {/* Fila 1: nombre */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: group.color }} />
            <span className={`font-semibold uppercase tracking-[0.6px] text-white/60 truncate ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
              {group.icon} {group.name}
            </span>
          </div>

          {/* Fila 2: acciones */}
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9px] text-white/40 bg-white/5 border border-white/10 rounded-[8px] px-1 py-px">
              {group.apps.length}
            </span>
            <button
              className="w-[20px] h-[20px] rounded-md flex items-center justify-center text-[12px] font-bold text-white/40 hover:bg-white/10 hover:text-[#7c6af7] transition-all"
              onClick={e => { e.stopPropagation(); onAddApps(group.id) }}
              title="Agregar app (.exe / .lnk)"
            >🖥</button>
            <button
              className="w-[20px] h-[20px] rounded-md flex items-center justify-center text-[12px] font-bold text-white/40 hover:bg-white/10 hover:text-[#7c6af7] transition-all"
              onClick={e => { e.stopPropagation(); onAddFiles(group.id) }}
              title="Agregar archivo o carpeta"
            >+</button>
            <button
              className="w-[20px] h-[20px] rounded-md flex items-center justify-center text-[10px] text-white/40 hover:bg-white/10 hover:text-white transition-all"
              onClick={e => { e.stopPropagation(); onToggleVisible(group.id) }}
              title={group.visible ? 'Ocultar grupo' : 'Mostrar grupo'}
            >{group.visible ? '👁' : '🙈'}</button>
            <span
              className="text-[9px] text-white/40 transition-transform duration-200 inline-block ml-auto"
              style={{ transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >▾</span>
          </div>
        </div>

        {/* Drop hint */}
        {dropOver && (
          <div className="mx-2 mb-2 py-3 rounded-[10px] border border-dashed border-[#7c6af7] text-center text-[11px] text-[#7c6af7]">
            Suelta para agregar al grupo
          </div>
        )}

        {/* Apps grid */}
        {!group.collapsed && group.visible && !dropOver && (
          <div className={`grid gap-1 pb-2.5 pt-0.5 ${compact ? 'grid-cols-3 px-1.5' : 'grid-cols-4 px-2.5'}`}>
            {group.apps.length === 0 ? (
              <button
                className={`${compact ? 'col-span-3' : 'col-span-4'} flex flex-col items-center gap-1 py-3 text-white/25 text-[10px] hover:text-white/40 transition-colors`}
                onClick={() => onAddFiles(group.id)}
              >
                <span className="text-lg">+</span>
                Arrastra o toca +
              </button>
            ) : (
              group.apps.map(app => (
                <button
                  key={app.id}
                  className="flex flex-col items-center gap-0.5 p-1 rounded-[8px] hover:bg-white/8 transition-colors group/app"
                  onClick={() => onOpenApp(app)}
                  onContextMenu={e => openCtxMenu(e, app)}
                  title={app.path ? `${app.name}\n${app.path}` : app.name}
                >
                  <AppIcon item={app} size={compact ? 'sm' : 'md'} />
                  <span className="text-[9px] text-white/45 group-hover/app:text-white/80 transition-colors w-full text-center leading-tight overflow-hidden"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {app.name}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Menú contextual — portal fixed, nunca se corta */}
      {ctxMenu && (
        <ContextMenu
          app={ctxMenu.app}
          x={ctxMenu.x}
          y={ctxMenu.y}
          groupId={group.id}
          onOpen={() => { onOpenApp(ctxMenu.app); setCtxMenu(null) }}
          onRemove={() => { onRemoveApp(group.id, ctxMenu.app.id); setCtxMenu(null) }}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  )
}

/* ─── Context Menu ─────────────────────────────────────────── */

interface CtxProps {
  app: AppItem
  x: number
  y: number
  groupId: string
  onOpen:   () => void
  onRemove: () => void
  onClose:  () => void
}

function ContextMenu({ app, x, y, onOpen, onRemove, onClose }: CtxProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Ajustar posición para que nunca salga de la pantalla
  const [pos, setPos] = useState({ x, y })

  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const { innerWidth: vw, innerHeight: vh } = window
    const { offsetWidth: mw, offsetHeight: mh } = el
    setPos({
      x: x + mw > vw ? Math.max(0, vw - mw - 8) : x,
      y: y + mh > vh ? Math.max(0, vh - mh - 8) : y,
    })
  }, [x, y])

  // Cerrar con Escape o click fuera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Overlay invisible para cerrar al hacer click fuera */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      <div
        ref={menuRef}
        className="fixed z-[9999] rounded-[12px] border border-white/15 overflow-hidden shadow-2xl"
        style={{
          left: pos.x,
          top: pos.y,
          background: 'rgba(18,16,36,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          minWidth: 180,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.08) inset'
        }}
      >
        {/* Info del ítem */}
        <div className="px-3 pt-2.5 pb-2 border-b border-white/8">
          <div className="flex items-center gap-2">
            <AppIcon item={app} size="sm" />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold truncate">{app.name}</div>
              {app.path && (
                <div className="text-[9px] text-white/30 truncate" style={{ maxWidth: 150 }}>{app.path}</div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="py-1">
          <MenuBtn icon="↗" label="Abrir" onClick={onOpen} />
          <MenuBtn icon="✕" label="Quitar del grupo" onClick={onRemove} danger />
        </div>
      </div>
    </>
  )
}

function MenuBtn({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors
        ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white/80 hover:bg-white/8'}`}
      onClick={onClick}
    >
      <span className="w-4 text-center flex-shrink-0 text-[11px] opacity-60">{icon}</span>
      {label}
    </button>
  )
}

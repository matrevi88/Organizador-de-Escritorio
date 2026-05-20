import { useState, useEffect, useRef } from 'react'
import type { Group, AppItem } from '../types'

interface Props {
  group: Group
  onToggleCollapse: (id: string) => void
  onToggleVisible:  (id: string) => void
  onDragStart:      (id: string) => void
  onDrop:           (toId: string) => void
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
  group, onToggleCollapse, onToggleVisible,
  onDragStart, onDrop, onAddFiles, onDropFiles, onOpenApp, onRemoveApp
}: Props) {
  const [dropOver, setDropOver]   = useState(false)
  const [ctxMenu, setCtxMenu]     = useState<CtxMenu | null>(null)

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
          className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none hover:bg-white/5 transition-colors"
          onClick={() => onToggleCollapse(group.id)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: group.color }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-white/50 truncate">
              {group.icon} {group.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <span className="text-[10px] text-white/40 bg-white/5 border border-white/10 rounded-[10px] px-1.5 py-px">
              {group.apps.length}
            </span>
            <button
              className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[13px] font-bold text-white/40 hover:bg-white/10 hover:text-[#7c6af7] transition-all"
              onClick={e => { e.stopPropagation(); onAddFiles(group.id) }}
              title="Agregar archivo, carpeta o app"
            >+</button>
            <button
              className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[11px] text-white/40 hover:bg-white/10 hover:text-white transition-all"
              onClick={e => { e.stopPropagation(); onToggleVisible(group.id) }}
              title={group.visible ? 'Ocultar grupo' : 'Mostrar grupo'}
            >{group.visible ? '👁' : '🙈'}</button>
            <span
              className="text-[10px] text-white/40 transition-transform duration-200 inline-block"
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
          <div className="grid grid-cols-4 gap-1.5 px-2.5 pb-3 pt-0.5">
            {group.apps.length === 0 ? (
              <button
                className="col-span-4 flex flex-col items-center gap-1.5 py-4 text-white/25 text-[11px] hover:text-white/40 transition-colors"
                onClick={() => onAddFiles(group.id)}
              >
                <span className="text-xl">+</span>
                Arrastra archivos aquí o toca +
              </button>
            ) : (
              group.apps.map(app => (
                <button
                  key={app.id}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-[10px] hover:bg-white/8 transition-colors group/app"
                  onClick={() => onOpenApp(app)}
                  onContextMenu={e => openCtxMenu(e, app)}
                  title={app.path ? `${app.name}\n${app.path}` : app.name}
                >
                  {app.iconDataUrl ? (
                    <img
                      src={app.iconDataUrl}
                      alt={app.name}
                      className="w-10 h-10 rounded-[11px] object-contain"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-[11px] flex items-center justify-center text-xl shadow-md"
                      style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))' }}
                    >{app.icon}</div>
                  )}
                  <span className="text-[9.5px] text-white/45 group-hover/app:text-white/80 transition-colors w-full text-center leading-tight overflow-hidden"
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
            {app.iconDataUrl
              ? <img src={app.iconDataUrl} alt="" className="w-6 h-6 rounded-[6px] object-contain flex-shrink-0" />
              : <span className="text-base flex-shrink-0">{app.icon}</span>
            }
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

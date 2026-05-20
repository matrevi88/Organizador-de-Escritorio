import { useState } from 'react'
import type { Group, Settings, PanelPosition } from '../types'

const COLORS = ['#7c6af7','#5eead4','#f472b6','#fb923c','#34d399','#60a5fa','#fbbf24','#f87171']
const PROFILES = [
  { id: 'personal', icon: '🏠', name: 'Personal' },
  { id: 'trabajo',  icon: '💼', name: 'Trabajo' },
  { id: 'gaming',   icon: '🎮', name: 'Gaming' },
]
const POSITIONS: { key: PanelPosition; icon: string; label: string }[] = [
  { key: 'left',  icon: '◧', label: 'Izquierda' },
  { key: 'float', icon: '⊟', label: 'Flotante'  },
  { key: 'right', icon: '◨', label: 'Derecha'   },
]

interface Props {
  open: boolean
  groups: Group[]
  settings: Settings
  onClose: () => void
  onToggleVisible: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
  onEditGroup: (id: string) => void
  onUpdateSettings: (patch: Partial<Settings>) => void
  onSave: () => void
}

export function ConfigDrawer({
  open, groups, settings, onClose,
  onToggleVisible, onReorder, onEditGroup,
  onUpdateSettings, onSave
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null)

  return (
    <div
      className={`fixed right-6 top-[60px] bottom-6 w-[320px] flex flex-col rounded-[20px] border z-[60]
        transition-all duration-300 overflow-hidden
        ${open ? 'translate-x-0 opacity-100' : 'translate-x-[360px] opacity-0 pointer-events-none'}`}
      style={{
        background: 'rgba(14,12,28,0.97)',
        backdropFilter: 'blur(28px)',
        borderColor: 'rgba(255,255,255,0.2)',
        boxShadow: '0 8px 60px rgba(0,0,0,0.7)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-[18px] pt-[18px] pb-3.5 border-b border-white/10 flex-shrink-0">
        <div>
          <div className="text-[15px] font-bold">⚙ Configurar paneles</div>
          <div className="text-[11px] text-white/40 mt-0.5">Escritorio principal</div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/10"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">

        {/* Perfil */}
        <SectionTitle>Perfil de escritorio</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          {PROFILES.map(p => (
            <button
              key={p.id}
              onClick={() => onUpdateSettings({ activeProfileId: p.id })}
              className={`px-3 py-1.5 rounded-full border text-xs transition-all
                ${settings.activeProfileId === p.id
                  ? 'border-[#7c6af7] text-[#7c6af7] bg-[rgba(124,106,247,0.1)]'
                  : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white'}`}
            >
              {p.icon} {p.name}
            </button>
          ))}
          <button className="px-3 py-1.5 rounded-full border border-dashed border-white/15 text-xs text-white/30 hover:border-[#7c6af7] hover:text-[#7c6af7] transition-all">
            + Nuevo
          </button>
        </div>

        {/* Paneles */}
        <SectionTitle>Paneles visibles</SectionTitle>
        <div className="flex flex-col gap-2">
          {groups.map(g => (
            <div
              key={g.id}
              draggable
              onDragStart={() => setDragId(g.id)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragId && dragId !== g.id) { onReorder(dragId, g.id); setDragId(null) } }}
              className={`flex items-center gap-2.5 rounded-[12px] border border-white/10 px-3 py-2.5 transition-all
                hover:border-white/20 hover:bg-white/5 cursor-grab
                ${!g.visible ? 'opacity-40' : ''}`}
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <span className="text-white/30 text-sm cursor-grab">⠿</span>
              <span className="text-lg flex-shrink-0">{g.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{g.name}</div>
                <div className="text-[10px] text-white/35 mt-px">
                  {g.apps.length} apps · {g.visible ? 'Visible' : 'Oculto'}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Toggle
                  checked={g.visible}
                  onChange={() => onToggleVisible(g.id)}
                />
                <button
                  onClick={() => onEditGroup(g.id)}
                  className="w-6 h-6 rounded-[7px] flex items-center justify-center text-[12px] text-white/30 hover:bg-white/10 hover:text-white transition-all"
                >
                  ✎
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Posición */}
        <SectionTitle>Posición en pantalla</SectionTitle>
        <div className="grid grid-cols-3 gap-1.5">
          {POSITIONS.map(p => (
            <button
              key={p.key}
              onClick={() => onUpdateSettings({ panelPosition: p.key })}
              className={`py-2 rounded-[10px] border text-xs text-center transition-all
                ${settings.panelPosition === p.key
                  ? 'border-[#7c6af7] text-[#7c6af7] bg-[rgba(124,106,247,0.1)]'
                  : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white'}`}
            >
              <div className="text-base mb-0.5">{p.icon}</div>
              {p.label}
            </button>
          ))}
        </div>

        {/* Opciones */}
        <SectionTitle>Opciones</SectionTitle>

        <OptionRow label="Iniciar con Windows" sub="Abrir al encender el equipo">
          <Toggle checked={settings.startWithOS} onChange={v => onUpdateSettings({ startWithOS: v })} />
        </OptionRow>

        <OptionRow label="Colapsar grupos al inicio" sub="Paneles cerrados por defecto">
          <Toggle checked={settings.collapseOnStart} onChange={v => onUpdateSettings({ collapseOnStart: v })} />
        </OptionRow>

        <OptionRow label="Sincronizar en la nube" sub="Guardar layout en tu cuenta">
          <Toggle checked={settings.syncEnabled} onChange={v => onUpdateSettings({ syncEnabled: v })} />
        </OptionRow>

        <div className="rounded-[12px] border border-white/10 px-3 py-2.5 flex flex-col gap-2.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div>
            <div className="text-[13px]">Opacidad del panel</div>
            <div className="text-[10px] text-white/35 mt-0.5">Transparencia del overlay</div>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              type="range" min={30} max={100} value={settings.opacity}
              onChange={e => onUpdateSettings({ opacity: Number(e.target.value) })}
              className="flex-1 accent-[#7c6af7]"
            />
            <span className="text-[12px] text-white/40 min-w-[32px] text-right">{settings.opacity}%</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="flex gap-2 p-3.5 border-t border-white/10 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold border border-white/10 text-white/70 hover:bg-white/5 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold bg-[#7c6af7] text-white hover:brightness-110 transition-all"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[1px] text-white/40 pt-1">
      {children}
    </div>
  )
}

function OptionRow({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-[12px] border border-white/10 px-3 py-2.5"
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div>
        <div className="text-[13px]">{label}</div>
        <div className="text-[10px] text-white/35 mt-0.5">{sub}</div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#7c6af7]' : 'bg-white/15'}`}
    >
      <span
        className="absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

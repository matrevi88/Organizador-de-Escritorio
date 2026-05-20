import { useState, useEffect } from 'react'
import type { Group } from '../types'

const COLORS = ['#7c6af7','#5eead4','#f472b6','#fb923c','#34d399','#60a5fa','#fbbf24','#f87171']

interface Props {
  open: boolean
  editGroup?: Group | null
  onClose: () => void
  onSave: (data: { name: string; icon: string; color: string }) => void
  onDelete?: () => void
}

export function GroupModal({ open, editGroup, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [color, setColor] = useState(COLORS[0])

  useEffect(() => {
    if (editGroup) {
      setName(editGroup.name)
      setIcon(editGroup.icon)
      setColor(editGroup.color)
    } else {
      setName('')
      setIcon('📦')
      setColor(COLORS[0])
    }
  }, [editGroup, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rounded-[20px] p-7 w-[380px] border"
        style={{
          background: 'rgba(18,16,36,0.98)',
          borderColor: 'rgba(255,255,255,0.2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)'
        }}>
        <h3 className="text-base font-bold mb-1">
          {editGroup ? 'Editar grupo' : 'Nuevo grupo de apps'}
        </h3>
        <p className="text-[13px] text-white/40 mb-5">
          {editGroup ? 'Modifica nombre, ícono o color' : 'Organiza tus shortcuts en una categoría'}
        </p>

        <Field label="Nombre">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ej. Marketing, Finanzas..."
            className="w-full bg-white/5 border border-white/10 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c6af7] transition-colors text-white placeholder:text-white/25"
          />
        </Field>

        <Field label="Ícono">
          <input
            value={icon}
            onChange={e => setIcon(e.target.value)}
            placeholder="Pega un emoji  🚀 💡 📦"
            className="w-full bg-white/5 border border-white/10 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c6af7] transition-colors text-white placeholder:text-white/25"
          />
        </Field>

        <Field label="Color de etiqueta">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-[8px] border-2 transition-all hover:scale-110"
                style={{
                  background: c,
                  borderColor: color === c ? '#fff' : 'transparent',
                  transform: color === c ? 'scale(1.1)' : ''
                }}
              />
            ))}
          </div>
        </Field>

        <div className="flex gap-2.5 mt-5">
          {editGroup && onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              Eliminar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (name.trim()) { onSave({ name: name.trim(), icon, color }); onClose() } }}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold bg-[#7c6af7] text-white hover:brightness-110 transition-all"
          >
            {editGroup ? 'Guardar' : 'Crear grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-3.5">
      <label className="text-xs text-white/40">{label}</label>
      {children}
    </div>
  )
}

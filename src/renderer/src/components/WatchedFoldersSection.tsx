import { useEffect, useState } from 'react'
import type { FolderIndexMeta } from '../types'

interface Props {
  folders: string[]
  onFoldersChange: (folders: string[]) => void
}

export function WatchedFoldersSection({ folders, onFoldersChange }: Props) {
  const [meta, setMeta] = useState<FolderIndexMeta | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadMeta = async () => {
    try {
      const m = (await window.api.getFolderIndexMeta()) as FolderIndexMeta
      setMeta(m)
    } catch {
      setMeta(null)
    }
  }

  useEffect(() => {
    loadMeta()
  }, [folders])

  const applyFolders = async (next: string[]) => {
    setBusy(true)
    setMsg(null)
    try {
      const m = (await window.api.setWatchedFolders(next)) as FolderIndexMeta
      onFoldersChange(next)
      setMeta(m)
      setMsg({ type: 'ok', text: `Índice actualizado: ${m.entryCount.toLocaleString()} elementos` })
    } catch {
      setMsg({ type: 'err', text: 'No se pudo indexar las carpetas.' })
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = async () => {
    const pick = await window.api.pickWatchedFolder()
    if (pick.canceled || !pick.path) return
    if (folders.includes(pick.path)) {
      setMsg({ type: 'err', text: 'Esa carpeta ya está en la lista.' })
      return
    }
    await applyFolders([...folders, pick.path])
  }

  const handleRemove = async (path: string) => {
    await applyFolders(folders.filter((f) => f !== path))
  }

  const handleRefresh = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const m = (await window.api.refreshFolderIndex()) as FolderIndexMeta
      setMeta(m)
      setMsg({ type: 'ok', text: `Reindexado: ${m.entryCount.toLocaleString()} elementos` })
    } catch {
      setMsg({ type: 'err', text: 'Error al reindexar.' })
    } finally {
      setBusy(false)
    }
  }

  const updatedLabel = meta?.updatedAt
    ? new Date(meta.updatedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

  return (
    <>
      <div className="text-[10px] font-bold uppercase tracking-[1px] text-df-muted px-0.5">
        Carpetas vigiladas
      </div>
      <p className="text-[10px] text-df-muted leading-relaxed -mt-1">
        DeskFlow indexa archivos y subcarpetas (hasta 6 niveles) para encontrarlos en el Launcher al escribir.
        No incluye node_modules, .git ni carpetas ocultas.
      </p>

      <div className="flex flex-col gap-2">
        {folders.length === 0 ? (
          <div className="text-[11px] text-df-muted px-3 py-4 rounded-xl border border-dashed border-df text-center">
            Sin carpetas vigiladas
          </div>
        ) : (
          folders.map((path) => (
            <div
              key={path}
              className="flex items-start gap-2 rounded-xl border border-df px-3 py-2 bg-df-surface"
            >
              <span className="text-lg shrink-0">📂</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate" title={path}>
                  {path.split(/[/\\]/).pop() ?? path}
                </div>
                <div className="text-[10px] text-df-muted truncate" title={path}>
                  {path}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRemove(path)}
                className="text-[11px] text-red-400/80 hover:text-red-300 shrink-0 disabled:opacity-40"
              >
                Quitar
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleAdd}
          className="flex-1 py-2 rounded-[10px] text-[12px] font-medium border border-accent/40 text-accent
            hover:bg-df-select disabled:opacity-40"
        >
          + Agregar carpeta
        </button>
        <button
          type="button"
          disabled={busy || folders.length === 0}
          onClick={handleRefresh}
          className="px-3 py-2 rounded-[10px] text-[12px] border border-df text-df-muted
            hover:bg-df-surface disabled:opacity-40"
          title="Volver a escanear"
        >
          ↻
        </button>
      </div>

      <div className="text-[10px] text-df-muted px-1">
        {meta ? (
          <>
            {meta.entryCount.toLocaleString()} elementos indexados · última vez {updatedLabel}
          </>
        ) : (
          'Estado del índice no disponible'
        )}
      </div>

      {msg ? (
        <div
          className={`text-[11px] px-3 py-2 rounded-lg ${
            msg.type === 'ok'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {msg.text}
        </div>
      ) : null}
    </>
  )
}

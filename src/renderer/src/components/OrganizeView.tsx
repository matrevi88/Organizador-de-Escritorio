import { useEffect, useState } from 'react'
import type { Group, AppItem, IndexedSearchHit } from '../types'
import { GroupCard } from './GroupCard'
import { AppIcon } from './AppIcon'
import { filterGroupsForOrganize, indexedHitsToResults, pathSubtitle, kindLabel, resultBadge } from '../lib/launcherSearch'
import { groupBadgeStyle } from '../lib/colorContrast'
import type { LauncherResult } from '../lib/launcherSearch'

interface Props {
  groups: Group[]
  search: string
  onSearchChange: (q: string) => void
  onBack: () => void
  onToggleCollapse: (id: string) => void
  onToggleVisible: (id: string) => void
  onExpand: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (toId: string) => void
  onAddApps: (groupId: string) => void
  onAddFiles: (groupId: string) => void
  onDropFiles: (groupId: string, files: FileList) => void
  onOpenApp: (app: AppItem) => void
  onRemoveApp: (groupId: string, appId: string) => void
  onNewGroup: () => void
}

export function OrganizeView({
  groups,
  search,
  onSearchChange,
  onBack,
  onToggleCollapse,
  onToggleVisible,
  onExpand,
  onDragStart,
  onDrop,
  onAddApps,
  onAddFiles,
  onDropFiles,
  onOpenApp,
  onRemoveApp,
  onNewGroup
}: Props) {
  const [indexResults, setIndexResults] = useState<LauncherResult[]>([])
  const [indexLoading, setIndexLoading] = useState(false)

  const filteredGroups = filterGroupsForOrganize(groups, search)
  const q = search.trim()

  useEffect(() => {
    if (!q) {
      setIndexResults([])
      setIndexLoading(false)
      return
    }

    let cancelled = false
    setIndexLoading(true)
    const timer = setTimeout(async () => {
      try {
        const hits = (await window.api.searchIndexed(q)) as IndexedSearchHit[]
        if (!cancelled) setIndexResults(indexedHitsToResults(hits))
      } catch {
        if (!cancelled) setIndexResults([])
      } finally {
        if (!cancelled) setIndexLoading(false)
      }
    }, 120)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-df flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] text-accent hover:text-deep font-medium shrink-0"
        >
          ← Launcher
        </button>
        <span className="text-[12px] font-semibold flex-1 text-ink">Organizar</span>
      </div>

      <div className="px-2.5 pt-2 pb-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-df-surface border border-df rounded-lg px-2.5 py-2 focus-within:border-accent transition-colors">
          <span className="text-df-muted text-xs">🔍</span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar en grupos y carpetas vigiladas…"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink placeholder:text-df-muted"
            autoComplete="off"
            spellCheck={false}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-df-muted hover:text-ink text-xs"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-2 min-h-0 flex flex-col gap-2">
        {q && filteredGroups.length === 0 && !indexLoading && indexResults.length === 0 ? (
          <p className="text-[12px] text-df-muted text-center py-6">Sin coincidencias en grupos.</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 content-start">
          {filteredGroups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              compact
              onToggleCollapse={onToggleCollapse}
              onToggleVisible={onToggleVisible}
              onExpand={onExpand}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onAddApps={onAddApps}
              onAddFiles={onAddFiles}
              onDropFiles={onDropFiles}
              onOpenApp={onOpenApp}
              onRemoveApp={onRemoveApp}
            />
          ))}
        </div>

        {!q ? (
          <button
            type="button"
            onClick={onNewGroup}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] text-df-muted border border-dashed border-df transition-all hover:text-accent hover:border-accent hover:bg-df-select"
          >
            + Nuevo grupo
          </button>
        ) : null}

        {q ? (
          <div className="border-t border-df pt-2 mt-1">
            <div className="text-[10px] uppercase tracking-wide text-df-muted mb-1.5 px-0.5">
              Carpetas vigiladas
              {indexLoading ? ' · buscando…' : ''}
            </div>
            {indexResults.length === 0 && !indexLoading ? (
              <p className="text-[11px] text-df-muted px-1">Nada en el índice para «{q}».</p>
            ) : null}
            {indexResults.map((row) => {
              const badge = resultBadge(row)
              const badgeStyle = groupBadgeStyle(badge.color)
              return (
                <button
                  key={row.app.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-lg hover:bg-df-hover"
                  onClick={() => onOpenApp(row.app)}
                >
                  <AppIcon item={row.app} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{row.app.name}</div>
                    <div className="text-[10px] text-ink/70 truncate">
                      {row.app.path ? pathSubtitle(row.app.path) : kindLabel(row.app.path)}
                    </div>
                  </div>
                  <span
                    className="text-[10px] shrink-0 px-2 py-0.5 rounded-full max-w-[84px] truncate border"
                    style={badgeStyle}
                  >
                    {badge.text}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

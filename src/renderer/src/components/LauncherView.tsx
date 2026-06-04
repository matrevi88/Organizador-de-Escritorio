import { useEffect, useRef, useState } from 'react'
import type { Group, AppItem } from '../types'
import { AppIcon } from './AppIcon'
import {
  searchLauncherItems,
  pathSubtitle,
  kindLabel,
  indexedHitsToResults,
  mergeLauncherResults,
  resultBadge
} from '../lib/launcherSearch'
import type { LauncherResult } from '../lib/launcherSearch'
import type { IndexedSearchHit } from '../types'
import { DF_LOGO_GRADIENT } from '../theme'
import { groupBadgeStyle, groupChipStyle } from '../lib/colorContrast'

interface Props {
  groups: Group[]
  search: string
  onSearchChange: (q: string) => void
  onOpenApp: (app: AppItem) => void
  onOrganize: () => void
  onSettings: () => void
  onHide: () => void
  onNewGroup: () => void
}

export function LauncherView({
  groups,
  search,
  onSearchChange,
  onOpenApp,
  onOrganize,
  onSettings,
  onHide,
  onNewGroup
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [indexResults, setIndexResults] = useState<LauncherResult[]>([])
  const [indexLoading, setIndexLoading] = useState(false)

  const filterGroups = groups.filter((g) => g.visible)
  const q = search.trim()
  const groupResults = searchLauncherItems(groups, search, filterGroupId)
  const results = mergeLauncherResults(groupResults, indexResults)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search, filterGroupId, indexResults.length])

  useEffect(() => {
    if (!q || filterGroupId) {
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
  }, [q, filterGroupId])

  const openResult = (r: LauncherResult) => {
    onOpenApp(r.app)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      openResult(results[selectedIndex])
    } else if (e.key === 'Escape') {
      if (search) {
        onSearchChange('')
      } else {
        onHide()
      }
    }
  }

  const totalItems = groups.filter((g) => g.visible).reduce((n, g) => n + g.apps.length, 0)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-df flex-shrink-0">
        <div
          className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[10px] font-bold"
          style={{ background: DF_LOGO_GRADIENT }}
        >
          ⊞
        </div>
        <span className="text-[12px] font-semibold flex-1">DeskFlow</span>
        <HeaderBtn title="Organizar grupos y archivos" onClick={onOrganize}>
          ⊞
        </HeaderBtn>
        <HeaderBtn title="Ajustes" onClick={onSettings}>
          ⚙
        </HeaderBtn>
        <HeaderBtn title="Ocultar (Ctrl+Shift+D)" onClick={onHide}>
          —
        </HeaderBtn>
      </div>

      <div className="px-2.5 pt-2 pb-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-df-surface border border-df rounded-lg px-2.5 py-2 focus-within:border-accent transition-colors">
          <span className="text-df-muted text-xs">⌘</span>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar…"
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-ink placeholder:text-df-muted"
            autoComplete="off"
            spellCheck={false}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-df-muted hover:text-ink text-xs px-1"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-2.5 pb-1.5 flex flex-wrap gap-1 max-h-[52px] overflow-y-auto flex-shrink-0">
        <FilterChip active={filterGroupId === null} onClick={() => setFilterGroupId(null)}>
          Todo
        </FilterChip>
        {filterGroups.map((g) => (
          <FilterChip
            key={g.id}
            active={filterGroupId === g.id}
            onClick={() => setFilterGroupId(filterGroupId === g.id ? null : g.id)}
            color={g.color}
          >
            {g.icon} {g.name}
          </FilterChip>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 border-t border-df">
        {indexLoading && results.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-df-muted">
            Buscando en carpetas vigiladas…
          </div>
        ) : null}

        {!indexLoading && results.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] text-df-muted">
              {totalItems === 0 && !q
                ? 'Aún no hay accesos. Organiza tu primer grupo.'
                : q
                  ? 'Sin resultados. Agrega carpetas en ⚙ Ajustes → Carpetas vigiladas.'
                  : 'Sin resultados para esa búsqueda.'}
            </p>
            {totalItems === 0 ? (
              <button
                type="button"
                onClick={onNewGroup}
                className="mt-4 text-[12px] text-accent hover:text-deep"
              >
                + Crear primer grupo
              </button>
            ) : null}
          </div>
        ) : results.length > 0 ? (
          results.map((row, index) => {
            const badge = resultBadge(row)
            const badgeStyle = groupBadgeStyle(badge.color)
            return (
            <button
              key={`${row.source}-${row.app.id}`}
              type="button"
              className={`w-full flex items-center gap-2 px-2.5 py-2 text-left border-l-[3px] transition-colors
                ${index === selectedIndex
                  ? 'bg-df-select border-l-accent'
                  : 'border-l-transparent hover:bg-df-hover'}`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => openResult(row)}
            >
              <AppIcon item={row.app} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{row.app.name}</div>
                <div className="text-[10px] text-ink/70 truncate">
                  {row.app.path ? pathSubtitle(row.app.path) : kindLabel(row.app.path)}
                </div>
              </div>
              <span
                className="text-[10px] shrink-0 px-2 py-0.5 rounded-full max-w-[92px] truncate border"
                style={badgeStyle}
                title={badge.text}
              >
                {badge.text}
              </span>
            </button>
            )
          })
        ) : null}
      </div>

      <div className="px-2.5 py-1.5 flex items-center justify-between text-[9px] text-df-muted border-t border-df flex-shrink-0 gap-2">
        <span className="shrink-0">↵ abrir · Esc</span>
        <span className="truncate text-right">
          {results.length}{indexResults.length > 0 ? ` (+${indexResults.length} índice)` : ''}
        </span>
      </div>
    </div>
  )
}

function FilterChip({
  children,
  active,
  onClick,
  color
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  color?: string
}) {
  const activeStyle = active
    ? groupChipStyle(color ?? '#2563eb')
    : undefined

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors
        ${active ? 'border' : 'border-df text-ink/75 hover:text-ink'}`}
      style={activeStyle ?? undefined}
    >
      {children}
    </button>
  )
}

function HeaderBtn({
  title,
  onClick,
  children
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-[24px] h-[24px] rounded-md flex items-center justify-center text-[12px] text-ink/70
        bg-df-surface border border-df hover:bg-df-hover hover:text-ink transition-all"
    >
      {children}
    </button>
  )
}

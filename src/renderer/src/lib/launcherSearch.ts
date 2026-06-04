import type { AppItem, Group, IndexedSearchHit } from '../types'
import { colorOnLightBg } from './colorContrast'

export type LauncherResultSource = 'group' | 'index'

export interface LauncherResult {
  app: AppItem
  group: Group | null
  source: LauncherResultSource
  indexLabel?: string
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function itemKind(path?: string): 'app' | 'folder' | 'file' {
  if (!path) return 'app'
  const base = path.split(/[/\\]/).pop() ?? ''
  if (!base.includes('.') || path.endsWith('/') || path.endsWith('\\')) return 'folder'
  const ext = base.split('.').pop()?.toLowerCase() ?? ''
  if (['exe', 'lnk', 'app', 'dmg', 'pkg'].includes(ext)) return 'app'
  return 'file'
}

export function kindLabel(path?: string): string {
  const k = itemKind(path)
  if (k === 'folder') return 'Carpeta'
  if (k === 'file') return 'Archivo'
  return 'Aplicación'
}

/** Vista Organizar: filtra grupos visibles por texto en nombre, ruta o nombre de grupo. */
export function filterGroupsForOrganize(groups: Group[], query: string): Group[] {
  const visible = groups.filter((g) => g.visible)
  const q = normalize(query.trim())
  if (!q) return visible

  return visible
    .map((g) => {
      const nameMatch = normalize(g.name).includes(q)
      const apps = g.apps.filter((a) => {
        const hay = normalize([a.name, a.path ?? ''].join(' '))
        return hay.includes(q)
      })
      if (apps.length > 0) {
        return { ...g, collapsed: false, apps }
      }
      if (nameMatch) {
        return { ...g, collapsed: false }
      }
      return { ...g, apps: [], collapsed: false }
    })
    .filter((g) => g.apps.length > 0 || normalize(g.name).includes(q))
}

export function flattenVisibleGroups(groups: Group[]): LauncherResult[] {
  const out: LauncherResult[] = []
  for (const group of groups) {
    if (!group.visible) continue
    for (const app of group.apps) {
      out.push({ app, group, source: 'group' })
    }
  }
  return out
}

export function indexedHitsToResults(hits: IndexedSearchHit[]): LauncherResult[] {
  return hits.map((hit) => ({
    source: 'index' as const,
    group: null,
    indexLabel: hit.rootLabel,
    app: {
      id: `idx_${hit.path}`,
      name: hit.name,
      icon: hit.icon,
      path: hit.path
    }
  }))
}

export function searchLauncherItems(
  groups: Group[],
  query: string,
  groupFilterId: string | null
): LauncherResult[] {
  const q = normalize(query.trim())
  let items = flattenVisibleGroups(groups)

  if (groupFilterId) {
    items = items.filter((r) => r.group?.id === groupFilterId)
  }

  if (!q) return items

  return items.filter(({ app, group }) => {
    const haystack = normalize(
      [app.name, app.path ?? '', group?.name ?? '', group?.icon ?? ''].filter(Boolean).join(' ')
    )
    return haystack.includes(q)
  })
}

export function mergeLauncherResults(
  groupResults: LauncherResult[],
  indexResults: LauncherResult[]
): LauncherResult[] {
  const paths = new Set(
    groupResults.map((r) => r.app.path).filter((p): p is string => Boolean(p))
  )
  const extra = indexResults.filter((r) => !r.app.path || !paths.has(r.app.path))
  return [...groupResults, ...extra]
}

export function pathSubtitle(path?: string): string {
  if (!path) return kindLabel(path)
  if (path.length > 56) {
    return '…' + path.slice(-54)
  }
  return path
}

export function resultBadge(result: LauncherResult): { text: string; color: string } {
  if (result.source === 'index') {
    return { text: `📂 ${result.indexLabel ?? 'Índice'}`, color: '#2563eb' }
  }
  if (result.group) {
    return {
      text: `${result.group.icon} ${result.group.name}`,
      color: colorOnLightBg(result.group.color)
    }
  }
  return { text: '', color: '#2563eb' }
}

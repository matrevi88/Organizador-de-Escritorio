import { existsSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs'
import { join, basename, dirname } from 'path'
import { app } from 'electron'

export interface IndexedEntry {
  path: string
  name: string
  rootFolder: string
  rootLabel: string
  isDirectory: boolean
}

export interface IndexMeta {
  version: 1
  updatedAt: string
  entryCount: number
  folders: string[]
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  'dist',
  'build',
  'out',
  '.next',
  '__pycache__',
  '.cache',
  'Caches',
  'Cache',
  'tmp',
  'temp',
  '.Trash',
  'vendor'
])

const MAX_DEPTH = 6
const MAX_ENTRIES = 12_000
const MAX_RESULTS = 48

let cachedEntries: IndexedEntry[] = []
let cachedMeta: IndexMeta = {
  version: 1,
  updatedAt: '',
  entryCount: 0,
  folders: []
}

function indexFilePath(): string {
  return join(app.getPath('userData'), 'deskflow-folder-index.json')
}

function normalizeQuery(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function rootLabel(folderPath: string): string {
  const base = basename(folderPath)
  return base || folderPath
}

function shouldSkipDir(name: string): boolean {
  if (name.startsWith('.')) return true
  return SKIP_DIRS.has(name)
}

function walkFolder(
  root: string,
  current: string,
  depth: number,
  entries: IndexedEntry[],
  seen: Set<string>
): void {
  if (entries.length >= MAX_ENTRIES) return
  if (depth > MAX_DEPTH) return

  let items: ReturnType<typeof readdirSync>
  try {
    items = readdirSync(current, { withFileTypes: true })
  } catch {
    return
  }

  for (const dirent of items) {
    if (entries.length >= MAX_ENTRIES) break
    const name = dirent.name
    if (dirent.isDirectory() && shouldSkipDir(name)) continue

    const fullPath = join(current, name)
    if (seen.has(fullPath)) continue
    seen.add(fullPath)

    const isDirectory = dirent.isDirectory()
    entries.push({
      path: fullPath,
      name,
      rootFolder: root,
      rootLabel: rootLabel(root),
      isDirectory
    })

    if (isDirectory) {
      walkFolder(root, fullPath, depth + 1, entries, seen)
    }
  }
}

export function scanWatchedFolders(folders: string[]): { entries: IndexedEntry[]; meta: IndexMeta } {
  const validRoots = folders.filter((f) => existsSync(f))
  if (validRoots.length === 0) {
    cachedEntries = []
    cachedMeta = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entryCount: 0,
      folders: []
    }
    try {
      writeFileSync(indexFilePath(), JSON.stringify({ meta: cachedMeta, entries: [] }), 'utf-8')
    } catch { /* noop */ }
    return { entries: [], meta: cachedMeta }
  }

  const entries: IndexedEntry[] = []
  const seen = new Set<string>()

  for (const root of validRoots) {
    try {
      const st = statSync(root)
      if (st.isDirectory()) {
        entries.push({
          path: root,
          name: basename(root) || root,
          rootFolder: root,
          rootLabel: rootLabel(root),
          isDirectory: true
        })
        seen.add(root)
        walkFolder(root, root, 0, entries, seen)
      } else {
        entries.push({
          path: root,
          name: basename(root),
          rootFolder: dirname(root),
          rootLabel: rootLabel(dirname(root)),
          isDirectory: false
        })
        seen.add(root)
      }
    } catch {
      /* carpeta inaccesible */
    }
  }

  const meta: IndexMeta = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entryCount: entries.length,
    folders: validRoots
  }

  cachedEntries = entries
  cachedMeta = meta

  try {
    writeFileSync(
      indexFilePath(),
      JSON.stringify({ meta, entries }, null, 0),
      'utf-8'
    )
  } catch {
    /* no bloquear */
  }

  return { entries, meta }
}

export function loadIndexFromDisk(): void {
  try {
    const p = indexFilePath()
    if (!existsSync(p)) return
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as {
      meta?: IndexMeta
      entries?: IndexedEntry[]
    }
    if (Array.isArray(raw.entries)) cachedEntries = raw.entries
    if (raw.meta) cachedMeta = raw.meta
  } catch {
    cachedEntries = []
  }
}

export function getIndexMeta(): IndexMeta {
  return { ...cachedMeta }
}

export function getCachedEntries(): IndexedEntry[] {
  return cachedEntries
}

export function searchIndexed(query: string, limit = MAX_RESULTS): IndexedEntry[] {
  const q = normalizeQuery(query.trim())
  if (!q || q.length < 1) return []

  const scored: { entry: IndexedEntry; score: number }[] = []

  for (const entry of cachedEntries) {
    const nameN = normalizeQuery(entry.name)
    const pathN = normalizeQuery(entry.path)
    const rootN = normalizeQuery(entry.rootLabel)

    let score = 0
    if (nameN.startsWith(q)) score += 10
    else if (nameN.includes(q)) score += 6
    if (pathN.includes(q)) score += 3
    if (rootN.includes(q)) score += 2

    if (score > 0) scored.push({ entry, score })
  }

  scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
  return scored.slice(0, limit).map((s) => s.entry)
}

export function fallbackIconForPath(filePath: string, isDirectory: boolean): string {
  if (isDirectory) return '📁'
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  if (['exe', 'lnk', 'app', 'dmg', 'pkg'].includes(ext)) return '🖥️'
  return '📄'
}

/**
 * Firma ad hoc: todos los Mach-O (profundo primero), luego bundles, luego .app
 */
const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')

function listMachO(root) {
  const files = execFileSync('find', [root, '-type', 'f'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  })
    .split('\n')
    .filter(Boolean)

  const macho = []
  for (const file of files) {
    try {
      const kind = execFileSync('file', ['-b', file], { encoding: 'utf8' })
      if (kind.includes('Mach-O')) macho.push(file)
    } catch {
      /* skip */
    }
  }
  return macho.sort((a, b) => b.split('/').length - a.split('/').length)
}

function listBundles(root) {
  const out = execFileSync(
    'find',
    [root, '(', '-name', '*.app', '-o', '-name', '*.framework', ')'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  )
    .split('\n')
    .filter((p) => p && p !== root)
  return out.sort((a, b) => b.split('/').length - a.split('/').length)
}

function signDarwinApp(appPath) {
  if (!existsSync(appPath)) return

  for (const file of listMachO(appPath)) {
    execFileSync('codesign', ['--force', '--sign', '-', file], { stdio: 'pipe' })
  }

  for (const bundle of listBundles(appPath)) {
    try {
      execFileSync('codesign', ['--force', '--sign', '-', bundle], { stdio: 'pipe' })
    } catch {
      /* algunos bundles ya firmados */
    }
  }

  execFileSync('codesign', ['--force', '--sign', '-', appPath], { stdio: 'inherit' })
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
  console.log('[sign-darwin] OK:', appPath)
}

module.exports = { signDarwinApp }

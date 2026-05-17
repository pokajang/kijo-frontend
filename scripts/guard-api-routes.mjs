import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const frontendSrc = path.join(repoRoot, 'frontend', 'src')
const frontendBuild = path.join(repoRoot, 'frontend', 'build')
const backendRoutes = path.join(repoRoot, 'backend-laravel', 'routes', 'api.php')

const ignoredFrontendPatterns = [/(^|[/\\])__tests__([/\\]|$)/, /\.test\.[cm]?[jt]sx?$/, /\.md$/]
const buildFilePattern = /\.(?:html|js|css|json|map)$/

const failures = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return [fullPath]
  })
}

function relative(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/')
}

function addLineFailures(file, lines, pattern, label) {
  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      failures.push(`${label}: ${relative(file)}:${index + 1}: ${line.trim()}`)
    }
  })
}

for (const file of walk(frontendSrc)) {
  if (ignoredFrontendPatterns.some((pattern) => pattern.test(file))) continue
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

  addLineFailures(file, lines, /\.php/, 'frontend legacy .php API path')

  addLineFailures(file, lines, /\/backend-legacy|\/backend\//, 'frontend legacy backend API base')
  addLineFailures(
    file,
    lines,
    /work\.amiosh\.com\/uploads|\/uploads\//,
    'frontend legacy upload path',
  )
}

if (fs.existsSync(frontendBuild)) {
  for (const file of walk(frontendBuild)) {
    if (!buildFilePattern.test(file)) continue
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

    addLineFailures(file, lines, /\/backend-legacy|\/backend\//, 'build legacy backend API base')
    addLineFailures(
      file,
      lines,
      /work\.amiosh\.com\/uploads|\/uploads\//,
      'build legacy upload path',
    )
    addLineFailures(
      file,
      lines,
      /[A-Za-z0-9_-]+\.php(?:\?|['"`/#]|$)/,
      'build legacy .php API path',
    )
  }
}

const backendLines = fs.readFileSync(backendRoutes, 'utf8').split(/\r?\n/)
addLineFailures(backendRoutes, backendLines, /Route::.*\.php/, 'backend legacy .php route alias')

if (failures.length > 0) {
  console.error(`Legacy API route guard failed with ${failures.length} issue(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Legacy API route guard passed.')

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDirectory, '..')
const sourceRoot = path.join(frontendRoot, 'src')
const contractFile = path.join(sourceRoot, 'scss', 'custom', '_scrollbars.scss')
const sourceExtensions = new Set(['.css', '.js', '.jsx', '.scss', '.ts', '.tsx'])
const nativeScrollbarPatterns = [
  /::-webkit-scrollbar/,
  /\bscrollbar-(?:color|width)\s*:/,
  /\bscrollbar(?:Color|Width)\s*:/,
]

const sourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(entryPath)
      return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : []
    }),
  )

  return nested.flat()
}

const violations = []
for (const file of await sourceFiles(sourceRoot)) {
  if (path.resolve(file) === contractFile) continue

  const lines = (await readFile(file, 'utf8')).split(/\r?\n/)
  lines.forEach((line, index) => {
    if (nativeScrollbarPatterns.some((pattern) => pattern.test(line))) {
      const relativePath = path.relative(frontendRoot, file).replace(/\\/g, '/')
      violations.push(`${relativePath}:${index + 1}: ${line.trim()}`)
    }
  })
}

if (violations.length > 0) {
  console.error('Scrollbar contract guard failed.')
  console.error('Keep native scrollbar styling in src/scss/custom/_scrollbars.scss.')
  console.error('Use .app-scrollbar-compact or .app-scrollbar-hidden for documented exceptions.')
  violations.forEach((violation) => console.error(`- ${violation}`))
  process.exitCode = 1
} else {
  console.log('Scrollbar contract guard passed.')
}

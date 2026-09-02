import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCE_ROOT = path.resolve('src')
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx'])
const ALLOW_MARKER = 'money-formatting-guard: allow'
const unsafeCurrencyPatterns = [/RM\s*\$\{[^}\n]*\.toFixed\(2\)/, /RM\s*\{[^}\n]*\.toFixed\(2\)/]

const sourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(entryPath)
      return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [entryPath] : []
    }),
  )

  return nested.flat()
}

const violations = []
for (const file of await sourceFiles(SOURCE_ROOT)) {
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/)
  lines.forEach((line, index) => {
    if (line.includes(ALLOW_MARKER) || lines[index - 1]?.includes(ALLOW_MARKER)) return
    if (unsafeCurrencyPatterns.some((pattern) => pattern.test(line))) {
      violations.push(`${path.relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`)
    }
  })
}

if (violations.length > 0) {
  console.error('Manual RM + toFixed(2) display formatting is not allowed.')
  console.error('Use src/utils/formatters/numberFormatters.js instead.')
  violations.forEach((violation) => console.error(`- ${violation}`))
  process.exitCode = 1
} else {
  console.log('Money display formatting guard passed.')
}

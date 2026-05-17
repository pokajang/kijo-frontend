import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const srcRoot = path.join(projectRoot, 'src')
const datatableRoot = path.join(srcRoot, 'components', 'datatable')
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx'])
const exemptPattern = /datatable-exempt:/
const ctablePattern = /<\s*CTable\b/

const hasExemption = (lines, index) => {
  if (exemptPattern.test(lines[index])) return true

  for (let offset = 1; offset <= 3; offset += 1) {
    const line = lines[index - offset]
    if (!line) return false
    const trimmed = line.trim()
    if (!trimmed) continue
    if (!trimmed.startsWith('//') && !trimmed.startsWith('{/*') && !trimmed.startsWith('/*')) {
      return false
    }
    if (exemptPattern.test(trimmed)) return true
  }

  return false
}

const walk = (directory, files = []) => {
  if (!fs.existsSync(directory)) return files

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      walk(fullPath, files)
      continue
    }

    if (extensions.has(path.extname(entry.name))) files.push(fullPath)
  }

  return files
}

const toRelative = (filePath) => path.relative(projectRoot, filePath).replaceAll(path.sep, '/')

const findings = []

for (const filePath of walk(srcRoot)) {
  if (filePath.startsWith(datatableRoot)) continue

  const source = fs.readFileSync(filePath, 'utf8')
  const lines = source.split(/\r?\n/)

  lines.forEach((line, index) => {
    if (!ctablePattern.test(line) || hasExemption(lines, index)) return

    findings.push({
      file: toRelative(filePath),
      line: index + 1,
      text: line.trim(),
    })
  })
}

if (!findings.length) {
  console.log('datatable:audit: no raw <CTable> usage found outside components/datatable.')
  process.exit(0)
}

console.log(
  `datatable:audit: found ${findings.length} raw <CTable> reference${
    findings.length === 1 ? '' : 's'
  } outside components/datatable.`,
)
console.log(
  'These are warnings for now. Migrate to DataTableRecordList, DataTableEmbeddedList, or DataTableMatrix, or add // datatable-exempt: layout table when intentional.\n',
)

for (const finding of findings) {
  console.log(`${finding.file}:${finding.line}  ${finding.text}`)
}

process.exit(0)

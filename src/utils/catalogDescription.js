const BULLET_PREFIX = /^[•‣◦⁃∙▪▫]\s*/u

export const compactCatalogDescription = (value) => {
  const lines = String(value || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(BULLET_PREFIX, '').replace(/\s+/gu, ' '))
    .filter(Boolean)

  return lines.reduce((result, line) => {
    if (!result) return line
    return `${result}${result.endsWith(':') ? ' ' : '; '}${line}`
  }, '')
}

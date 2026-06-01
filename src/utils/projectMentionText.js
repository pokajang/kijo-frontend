export const stripExactProjectMention = (value, projectName) => {
  const text = String(value || '')
  const projectLabel = String(projectName || '').trim()
  const mention = projectLabel ? `@${projectLabel}` : ''

  if (!mention) return text.trim()

  return text
    .split(mention)
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

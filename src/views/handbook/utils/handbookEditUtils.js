export const normalizeDraftText = (value) => String(value || '').trim()

export const splitSectionTitle = (title) => {
  const normalizedTitle = normalizeDraftText(title)
  const match = normalizedTitle.match(/^(\d+(?:\.\d+)*)\s+(.+)$/)

  return match ? { number: match[1], title: match[2] } : { number: null, title: normalizedTitle }
}

export const buildChangeSummary = ({ chapterTitle, titleChanged, bodyChanged, detail }) =>
  [
    titleChanged ? `Updated ${chapterTitle} section title` : null,
    bodyChanged ? `Updated ${chapterTitle} contents` : null,
  ]
    .filter(Boolean)
    .join('; ') + ` - ${normalizeDraftText(detail)}`

export const makeChangeSummaryPlaceholder = ({ titleChanged, bodyChanged }) => {
  if (titleChanged && bodyChanged) {
    return 'Summarize all title and content changes in one note'
  }

  if (titleChanged) {
    return 'Summarize what changed in the section title'
  }

  if (bodyChanged) {
    return 'Summarize what changed in the section content'
  }

  return 'Edit the section title or content before adding a change summary'
}

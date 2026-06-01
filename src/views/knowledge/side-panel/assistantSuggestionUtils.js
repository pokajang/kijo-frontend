const suggestedSearchStopwords = new Set([
  'a',
  'an',
  'and',
  'do',
  'for',
  'how',
  'i',
  'in',
  'is',
  'of',
  'on',
  'the',
  'to',
  'what',
  'where',
])

const normalizeSuggestedSearchText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const suggestedSearchTokens = (value) =>
  normalizeSuggestedSearchText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !suggestedSearchStopwords.has(token))

const articleSearchTokens = (article) =>
  suggestedSearchTokens(
    [
      article?.title,
      article?.summary,
      article?.category,
      article?.related_route,
      article?.search_text,
      Array.isArray(article?.tags) ? article.tags.join(' ') : article?.tags,
    ].join(' '),
  )

const hasDirectKnowledgeMatch = (articles, query) => {
  const queryTokens = suggestedSearchTokens(query)
  if (queryTokens.length === 0) return false

  return (Array.isArray(articles) ? articles : []).some((article) => {
    const tokens = articleSearchTokens(article)
    return queryTokens.every((queryToken) =>
      tokens.some(
        (token) =>
          token === queryToken || token.startsWith(queryToken) || queryToken.startsWith(token),
      ),
    )
  })
}

export const visibleSuggestedQueries = (queries, articles) => {
  const seen = new Set()

  return (Array.isArray(queries) ? queries : [])
    .map((query) => String(query || '').trim())
    .filter((query) => {
      if (!query || seen.has(query.toLowerCase())) return false
      seen.add(query.toLowerCase())
      return hasDirectKnowledgeMatch(articles, query)
    })
}

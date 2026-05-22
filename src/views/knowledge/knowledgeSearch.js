const normalizeSearchValue = (value = '') =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const singularizeToken = (token) => {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
  return token
}

const tokenize = (value = '') => {
  const tokens = normalizeSearchValue(value).split(' ').filter(Boolean)
  const expanded = new Set()
  tokens.forEach((token) => {
    expanded.add(token)
    expanded.add(singularizeToken(token))
  })
  return Array.from(expanded)
}

const editDistanceWithin = (left, right, maxDistance) => {
  if (Math.abs(left.length - right.length) > maxDistance) return false
  if (left === right) return true

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    let rowMin = current[0]

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      const value = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost,
      )
      current[rightIndex] = value
      rowMin = Math.min(rowMin, value)
    }

    if (rowMin > maxDistance) return false
    previous = current
  }

  return previous[right.length] <= maxDistance
}

const fuzzyTokenMatch = (queryToken, fieldTokens) => {
  if (queryToken.length < 4) return false
  const maxDistance = queryToken.length >= 8 ? 2 : 1
  return fieldTokens.some(
    (token) => token.length >= 4 && editDistanceWithin(queryToken, token, maxDistance),
  )
}

const scoreTokenInField = (queryToken, fieldText, fieldTokens, scores) => {
  if (!queryToken) return 0
  if (fieldTokens.includes(queryToken)) return scores.exact
  if (fieldText.startsWith(queryToken)) return scores.prefix
  if (fieldTokens.some((token) => token.startsWith(queryToken))) return scores.prefix
  if (fuzzyTokenMatch(queryToken, fieldTokens)) return scores.fuzzy
  return 0
}

const buildFields = (article) => {
  const tags = Array.isArray(article.tags) ? article.tags.join(' ') : article.tags
  const fields = [
    {
      key: 'title',
      text: normalizeSearchValue(article.title),
      scores: { exact: 260, prefix: 220, fuzzy: 130 },
    },
    {
      key: 'tags',
      text: normalizeSearchValue(tags),
      scores: { exact: 230, prefix: 190, fuzzy: 120 },
    },
    {
      key: 'route',
      text: normalizeSearchValue(article.related_route),
      scores: { exact: 210, prefix: 170, fuzzy: 90 },
    },
    {
      key: 'category',
      text: normalizeSearchValue(article.category),
      scores: { exact: 170, prefix: 140, fuzzy: 80 },
    },
    {
      key: 'summary',
      text: normalizeSearchValue(article.summary),
      scores: { exact: 150, prefix: 120, fuzzy: 70 },
    },
    {
      key: 'body',
      text: normalizeSearchValue(
        [article.search_text, article.body_html].filter(Boolean).join(' '),
      ),
      scores: { exact: 95, prefix: 70, fuzzy: 45 },
    },
  ]

  return fields.map((field) => ({ ...field, tokens: tokenize(field.text) }))
}

export const scoreKnowledgeArticle = (article, query) => {
  const normalizedQuery = normalizeSearchValue(query)
  if (!normalizedQuery) return 0

  const fields = buildFields(article)
  const queryTokens = tokenize(normalizedQuery)
  let score = 0

  const titleText = fields.find((field) => field.key === 'title')?.text || ''
  if (titleText === normalizedQuery) score += 1200
  if (titleText.startsWith(normalizedQuery)) score += 800

  for (const queryToken of queryTokens) {
    const bestTokenScore = Math.max(
      ...fields.map((field) =>
        scoreTokenInField(queryToken, field.text, field.tokens, field.scores),
      ),
    )
    if (bestTokenScore <= 0) return 0
    score += bestTokenScore
  }

  return score
}

export const searchKnowledgeArticles = (articles = [], query = '', { limit } = {}) => {
  if (!normalizeSearchValue(query)) {
    return typeof limit === 'number' ? articles.slice(0, limit) : articles
  }

  const ranked = articles
    .map((article) => ({ article, score: scoreKnowledgeArticle(article, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return String(left.article.title || '').localeCompare(String(right.article.title || ''))
    })
    .map((item) => item.article)

  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked
}

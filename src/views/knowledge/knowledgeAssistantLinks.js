import { getModuleSearchResults } from '../../components/search/moduleSearchIndex'

const MAX_QUERY_LENGTH = 180
const COMMON_ROUTE_QUERY_TOKENS = new Set([
  'a',
  'an',
  'and',
  'answer',
  'app',
  'can',
  'create',
  'do',
  'does',
  'explain',
  'find',
  'for',
  'from',
  'go',
  'guide',
  'how',
  'i',
  'in',
  'kijo',
  'make',
  'manage',
  'module',
  'new',
  'open',
  'page',
  'record',
  'records',
  'show',
  'start',
  'the',
  'this',
  'to',
  'use',
  'using',
  'view',
  'what',
  'where',
])

const normalizeQuery = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeRouteText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenizeRouteText = (value) => normalizeRouteText(value).split(' ').filter(Boolean)

const meaningfulQueryTokens = (value) =>
  tokenizeRouteText(value).filter(
    (token) => token.length > 2 && !COMMON_ROUTE_QUERY_TOKENS.has(token),
  )

const itemRouteText = (item) =>
  [
    item?.label,
    item?.group,
    item?.to,
    ...(item?.keywords || []),
    ...(item?.aliases || []),
    ...(item?.intentPhrases || []),
  ].join(' ')

const matchesMeaningfulQueryToken = (item, query) => {
  const queryTokens = meaningfulQueryTokens(query)
  if (queryTokens.length === 0) return true

  const itemTokens = tokenizeRouteText(itemRouteText(item))
  return queryTokens.some((queryToken) =>
    itemTokens.some(
      (itemToken) =>
        itemToken === queryToken ||
        itemToken.startsWith(queryToken) ||
        queryToken.startsWith(itemToken),
    ),
  )
}

const intentQuery = (value) =>
  normalizeQuery(value)
    .replace(/^(?:how\s+(?:do|can|should)\s+i|how\s+to|where\s+(?:do|can)\s+i)\s+/i, '')
    .replace(/\b(?:a|an|the)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[?.!]+$/g, '')
    .trim()

const shortAnswerLines = (content) =>
  String(content || '')
    .split(/\r\n|\n|\r/)
    .map((line) =>
      line
        .replace(/^\s*(?:\d+[.)]|[-*])\s+/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((line) => line.length >= 4 && line.length <= 90)
    .slice(0, 4)

const sourceQueries = (sources) =>
  (Array.isArray(sources) ? sources : []).flatMap((source) => [
    source?.title,
    source?.summary,
    source?.related_route,
  ])

const isKnowledgeTarget = (item) => String(item?.to || '').startsWith('/knowledge')

export const getAssistantRelatedPageLinks = ({
  message,
  previousUserMessage,
  currentPageName,
  roles = [],
  limit = 3,
} = {}) => {
  if (!message || message.role !== 'assistant') return []

  const seenQueries = new Set()
  const seenTargets = new Set()
  const links = []

  const addQueryResults = (query) => {
    const normalized = normalizeQuery(query).slice(0, MAX_QUERY_LENGTH)
    if (!normalized) return

    const queryKey = normalized.toLowerCase()
    if (seenQueries.has(queryKey)) return
    seenQueries.add(queryKey)

    const results = getModuleSearchResults(normalized, roles, { limit: 6 }).results
    for (const item of results) {
      const target = String(item?.to || '')
      if (
        !target ||
        isKnowledgeTarget(item) ||
        seenTargets.has(target) ||
        !matchesMeaningfulQueryToken(item, normalized)
      ) {
        continue
      }

      links.push(item)
      seenTargets.add(target)
      if (links.length >= limit) return
    }
  }

  const previousQuestion = normalizeQuery(previousUserMessage?.content)
  const previousIntent = intentQuery(previousQuestion)
  const primaryQueries = [
    previousIntent && previousIntent !== previousQuestion ? previousIntent : '',
    previousQuestion,
  ]

  primaryQueries.forEach(addQueryResults)
  if (links.length >= Math.min(2, limit)) return links.slice(0, limit)

  const secondaryQueries = [
    ...sourceQueries(message.sources),
    currentPageName,
    ...shortAnswerLines(message.content),
  ]

  for (const query of secondaryQueries) {
    addQueryResults(query)
    if (links.length >= limit) return links
  }

  return links
}

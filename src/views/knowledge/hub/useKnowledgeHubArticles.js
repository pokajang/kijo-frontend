import { useCallback, useMemo, useState } from 'react'
import { getKnowledgeArticles, getMyKnowledgeArticles } from '../knowledgeApi'
import { searchKnowledgeArticles } from '../knowledgeSearch'

const useKnowledgeHubArticles = () => {
  const [articles, setArticles] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionId, setActionId] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [tag, setTag] = useState('')
  const [status, setStatus] = useState('published')

  const loadArticles = useCallback(async ({ signal, showLoader = true } = {}) => {
    if (showLoader) {
      setLoading(true)
    }
    setError('')

    try {
      let json
      try {
        json = await getMyKnowledgeArticles({ signal })
      } catch (err) {
        if (err.name === 'AbortError') throw err
        if (![401, 403].includes(err.status)) throw err
        json = await getKnowledgeArticles({ signal })
      }
      setArticles(Array.isArray(json.data) ? json.data : [])
      setMeta(json.meta || {})
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Failed to load Knowledge Hub.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  const runAction = async (article, action) => {
    setActionId(article.id)
    setError('')
    setSuccess('')
    try {
      const json = await action(article.id)
      setSuccess(json.message || 'Article updated.')
      await loadArticles({ showLoader: false })
    } catch (err) {
      setError(err.message || 'Failed to update article.')
    } finally {
      setActionId(null)
    }
  }

  const tags = useMemo(
    () =>
      Array.from(new Set(articles.flatMap((article) => article.tags || []))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [articles],
  )

  const filteredArticles = useMemo(() => {
    const hardFiltered = articles.filter(
      (article) =>
        (!category || article.category === category) &&
        (!tag || (article.tags || []).includes(tag)) &&
        (!status || article.status === status),
    )

    return search ? searchKnowledgeArticles(hardFiltered, search) : hardFiltered
  }, [articles, category, search, status, tag])

  return {
    actionId,
    category,
    error,
    filteredArticles,
    loadArticles,
    loading,
    meta,
    runAction,
    search,
    setCategory,
    setSearch,
    setStatus,
    setTag,
    status,
    success,
    tag,
    tags,
  }
}

export default useKnowledgeHubArticles

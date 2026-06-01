import { useEffect, useState } from 'react'
import { getKnowledgeArticle } from '../knowledgeApi'

const useKnowledgeArticleDetail = (slug) => {
  const [article, setArticle] = useState(null)
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    getKnowledgeArticle({ slugOrId: slug, signal: controller.signal })
      .then((json) => {
        setArticle(json.data || null)
        setMeta(json.meta || {})
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        if (err?.notFound || err?.status === 404) {
          setArticle(null)
          setMeta({})
          return
        }
        setError(err.message || 'Failed to load article.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [slug])

  const updateArticleStatus = async (action) => {
    if (!article || actionLoading) return

    setActionLoading(true)
    setError('')
    try {
      const json = await action(article.id)
      setArticle(json.data || article)
    } catch (err) {
      setError(err.message || 'Failed to update article.')
    } finally {
      setActionLoading(false)
    }
  }

  return {
    actionLoading,
    article,
    error,
    loading,
    meta,
    updateArticleStatus,
  }
}

export default useKnowledgeArticleDetail

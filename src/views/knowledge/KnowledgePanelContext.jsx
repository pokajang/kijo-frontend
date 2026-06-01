import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { RIGHT_DRAWER_IDS, useRightDrawer } from '../../components/right-drawer/RightDrawerContext'
import { getKnowledgeArticle, getKnowledgeArticles } from './knowledgeApi'

const noop = () => {}
export const KNOWLEDGE_DRAWER_ID = RIGHT_DRAWER_IDS.knowledge

const fallbackContext = {
  isOpen: false,
  activeSlug: '',
  article: null,
  articles: [],
  search: '',
  loadingArticle: false,
  loadingArticles: false,
  error: '',
  openKnowledgeArticle: noop,
  openKnowledgeSearch: noop,
  closeKnowledgePanel: noop,
  setKnowledgeSearch: noop,
  loadKnowledgeArticle: noop,
}

const KnowledgePanelContext = createContext(fallbackContext)

export const KnowledgePanelProvider = ({ children }) => {
  const { activeDrawerId, closeRightDrawer, isRightDrawerActive, openRightDrawer } =
    useRightDrawer()
  const [activeSlug, setActiveSlug] = useState('')
  const [article, setArticle] = useState(null)
  const [articles, setArticles] = useState([])
  const [search, setSearch] = useState('')
  const [loadingArticle, setLoadingArticle] = useState(false)
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [error, setError] = useState('')
  const articleRequestRef = useRef(null)
  const isOpen = isRightDrawerActive(KNOWLEDGE_DRAWER_ID)

  const resetKnowledgePanelState = useCallback(() => {
    articleRequestRef.current?.abort()
    articleRequestRef.current = null
    setActiveSlug('')
    setArticle(null)
    setSearch('')
    setError('')
    setLoadingArticle(false)
    setLoadingArticles(false)
  }, [])

  const closeKnowledgePanel = useCallback(() => {
    resetKnowledgePanelState()
    closeRightDrawer(KNOWLEDGE_DRAWER_ID)
  }, [closeRightDrawer, resetKnowledgePanelState])

  useEffect(() => {
    if (activeDrawerId !== KNOWLEDGE_DRAWER_ID) {
      resetKnowledgePanelState()
    }
  }, [activeDrawerId, resetKnowledgePanelState])

  useEffect(() => {
    return () => {
      articleRequestRef.current?.abort()
    }
  }, [])

  const loadArticles = useCallback(async ({ signal } = {}) => {
    setLoadingArticles(true)
    try {
      const json = await getKnowledgeArticles({ signal })
      setArticles(Array.isArray(json.data) ? json.data : [])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load Knowledge articles.')
      }
    } finally {
      if (!signal?.aborted) setLoadingArticles(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || articles.length > 0) return undefined

    const controller = new AbortController()
    loadArticles({ signal: controller.signal })
    return () => controller.abort()
  }, [articles.length, isOpen, loadArticles])

  const loadKnowledgeArticle = useCallback(async (slugOrId) => {
    if (!slugOrId) return

    articleRequestRef.current?.abort()
    const controller = new AbortController()
    articleRequestRef.current = controller
    const { signal } = controller

    setLoadingArticle(true)
    setError('')
    try {
      const json = await getKnowledgeArticle({ slugOrId, signal })
      setArticle(json.data || null)
      setActiveSlug(json.data?.slug || String(slugOrId))
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load Knowledge article.')
        setArticle(null)
      }
    } finally {
      if (!signal.aborted) {
        setLoadingArticle(false)
        if (articleRequestRef.current === controller) articleRequestRef.current = null
      }
    }
  }, [])

  const openKnowledgeArticle = useCallback(
    (slugOrId) => {
      if (!slugOrId) return
      openRightDrawer(KNOWLEDGE_DRAWER_ID)
      setSearch('')
      setActiveSlug(String(slugOrId))
      loadKnowledgeArticle(slugOrId)
    },
    [loadKnowledgeArticle, openRightDrawer],
  )

  const openKnowledgeSearch = useCallback(() => {
    articleRequestRef.current?.abort()
    articleRequestRef.current = null
    openRightDrawer(KNOWLEDGE_DRAWER_ID)
    setActiveSlug('')
    setArticle(null)
    setSearch('')
    setError('')
    setLoadingArticle(false)
  }, [openRightDrawer])

  const value = useMemo(
    () => ({
      isOpen,
      activeSlug,
      article,
      articles,
      search,
      loadingArticle,
      loadingArticles,
      error,
      openKnowledgeArticle,
      openKnowledgeSearch,
      closeKnowledgePanel,
      setKnowledgeSearch: setSearch,
      loadKnowledgeArticle,
    }),
    [
      activeSlug,
      article,
      articles,
      closeKnowledgePanel,
      error,
      isOpen,
      loadKnowledgeArticle,
      loadingArticle,
      loadingArticles,
      openKnowledgeArticle,
      openKnowledgeSearch,
      search,
    ],
  )

  return <KnowledgePanelContext.Provider value={value}>{children}</KnowledgePanelContext.Provider>
}

export const useKnowledgePanel = () => useContext(KnowledgePanelContext)

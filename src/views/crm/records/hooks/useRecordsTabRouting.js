import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { recordTablesByTab } from '../config/recordTables'
import { getRecordListPath, normalizeRecordTab, recordTabBySlug } from '../config/recordTabs'
import {
  getSpecialCategoryIdFromTabKey,
  getSpecialCategoryTabKey,
} from '../utils/specialRecordCategories'

// Everyone defaults to (and can reach) the All tab regardless of role.
// My Quotes remains available as a manual filter.
const defaultTabForUser = () => 'all-tab'

const resolveActiveTab = (serviceSlug, search, defaultTab = 'all-tab') => {
  const params = new URLSearchParams(search)
  const tab = params.get('tab')
  if (tab && recordTablesByTab[tab]) return tab
  const routeTab = normalizeRecordTab(serviceSlug || '')
  if (recordTablesByTab[routeTab]) return routeTab
  return defaultTab
}

const getLegacyQueryTab = (search) => {
  const params = new URLSearchParams(search)
  const tab = params.get('tab')
  return tab && recordTablesByTab[tab] ? tab : 'all-tab'
}

export const useRecordsTabRouting = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { serviceSlug } = useParams()
  const defaultTab = defaultTabForUser()
  const [activeTab, setActiveTab] = useState(() =>
    resolveActiveTab(serviceSlug, location.search, defaultTab),
  )
  const categoryParam = new URLSearchParams(location.search).get('categoryId')
  const parsedCategoryId = Number(categoryParam)
  const activeCategoryId =
    activeTab === 'special-tab' && Number.isInteger(parsedCategoryId) && parsedCategoryId > 0
      ? parsedCategoryId
      : null
  const activeNavigationTab = activeCategoryId
    ? getSpecialCategoryTabKey(activeCategoryId)
    : activeTab

  useEffect(() => {
    if (location.search.includes('tab=')) {
      navigate(getRecordListPath(getLegacyQueryTab(location.search)), { replace: true })
      return
    }

    if (serviceSlug !== undefined && recordTabBySlug[serviceSlug] === undefined) {
      navigate('/crm/records', { replace: true })
      return
    }

    const nextTab = resolveActiveTab(serviceSlug, location.search, defaultTab)
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab))
  }, [defaultTab, location.search, navigate, serviceSlug])

  const handleTabChange = useCallback(
    (tabKey) => {
      const categoryId = getSpecialCategoryIdFromTabKey(tabKey)
      if (categoryId) {
        navigate(`/crm/records/special?categoryId=${encodeURIComponent(categoryId)}`, {
          replace: true,
        })
        return
      }
      navigate(getRecordListPath(tabKey), { replace: true })
    },
    [navigate],
  )

  return {
    activeTab,
    activeCategoryId,
    activeNavigationTab,
    handleTabChange,
  }
}

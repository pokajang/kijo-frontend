import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../../auth/AuthProvider'
import { extractRolesFromSession, hasAnyAllowedRole } from '../../../../utils/roles'
import { recordTablesByTab } from '../config/recordTables'
import { getRecordListPath, normalizeRecordTab, recordTabBySlug } from '../config/recordTabs'

const defaultTabForUser = (user, status) =>
  status !== 'authenticated' ||
  hasAnyAllowedRole(extractRolesFromSession({ user }), ['Manager', 'HR', 'System Admin'])
    ? 'all-tab'
    : 'my-tab'

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
  const { user, status } = useAuth()
  const defaultTab = defaultTabForUser(user, status)
  const [activeTab, setActiveTab] = useState(() =>
    resolveActiveTab(serviceSlug, location.search, defaultTab),
  )

  useEffect(() => {
    if (location.search.includes('tab=')) {
      navigate(getRecordListPath(getLegacyQueryTab(location.search)), { replace: true })
      return
    }

    if (serviceSlug !== undefined && recordTabBySlug[serviceSlug] === undefined) {
      navigate('/crm/records', { replace: true })
      return
    }

    if (serviceSlug === undefined && defaultTab !== 'all-tab') {
      navigate(getRecordListPath(defaultTab), { replace: true })
      return
    }

    const nextTab = resolveActiveTab(serviceSlug, location.search, defaultTab)
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab))
  }, [defaultTab, location.search, navigate, serviceSlug])

  const handleTabChange = (tabKey) => {
    navigate(getRecordListPath(tabKey), { replace: true })
  }

  return {
    activeTab,
    handleTabChange,
  }
}

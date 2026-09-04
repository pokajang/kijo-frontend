import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilCalculator, cilListRich } from '@coreui/icons'

import { useAuth } from '../../../auth/AuthProvider'
import { getQuickCreateModuleItems } from '../../search/moduleSearchIndex'
import { extractRolesFromSession } from '../../../utils/roles'
import MobileSheetItemCard from '../MobileSheetItemCard'
import { useMobileNavSheet } from '../MobileNavSheetContext'

const quickCreatePresentation = {
  '/crm/quotes': {
    title: 'Create Quotation',
    description: 'Start a new quotation',
    icon: cilCalculator,
  },
  '/task-manager?action=create': {
    description: 'Add a task or follow-up',
    icon: cilListRich,
  },
}

const MobileCreateView = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { resetAfterRoute } = useMobileNavSheet()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])
  const actions = useMemo(() => getQuickCreateModuleItems(roles), [roles])

  const handleCreate = (item) => {
    resetAfterRoute()
    navigate(item.to)
  }

  return (
    <div className="app-mobile-create-grid">
      {actions.map((item) => {
        const presentation = quickCreatePresentation[item.to]
        return (
          <MobileSheetItemCard
            key={item.id}
            title={presentation?.title || item.label}
            description={presentation?.description}
            icon={presentation?.icon ? <CIcon icon={presentation.icon} aria-hidden="true" /> : null}
            onClick={() => handleCreate(item)}
          />
        )
      })}
    </div>
  )
}

export default MobileCreateView

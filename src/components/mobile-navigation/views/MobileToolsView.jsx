import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilSpeech } from '@coreui/icons'

import MobileSheetItemCard from '../MobileSheetItemCard'
import { useMobileNavSheet } from '../MobileNavSheetContext'
import { MOBILE_NAV_VIEWS } from '../mobileNavSheetViews'

const MobileToolsView = () => {
  const { pushView } = useMobileNavSheet()

  return (
    <div className="app-mobile-tools-grid">
      <MobileSheetItemCard
        title="Search modules"
        description="Find a module or action"
        icon={<CIcon icon={cilSearch} aria-hidden="true" />}
        onClick={() => pushView({ id: MOBILE_NAV_VIEWS.moduleSearch })}
      />
      <MobileSheetItemCard
        title="Ask Kijo"
        description="Search the knowledge assistant"
        icon={<CIcon icon={cilSpeech} aria-hidden="true" />}
        onClick={() => pushView({ id: MOBILE_NAV_VIEWS.knowledge })}
      />
    </div>
  )
}

export default MobileToolsView

import React from 'react'
import { CAlert, CButton } from '@coreui/react'

import useVersionCheck from '../lib/useVersionCheck'

const VersionNotifier = () => {
  const { updateAvailable, latestVersion, reload } = useVersionCheck()

  if (!updateAvailable) return null

  return (
    <div
      className="version-banner position-fixed bottom-0 start-0 end-0 p-3"
      style={{ zIndex: 2000 }}
    >
      <CAlert
        color="info"
        className="d-flex align-items-center justify-content-between mb-0 shadow"
      >
        <div>
          A new version of the app is available{latestVersion ? ` (v${latestVersion})` : ''}. Reload
          to get the latest updates.
        </div>
        <div className="ms-3 d-flex gap-2">
          <CButton color="info" variant="outline" onClick={reload}>
            Reload now
          </CButton>
        </div>
      </CAlert>
    </div>
  )
}

export default VersionNotifier

import React from 'react'
import { CAlert, CButton } from '@coreui/react'

import useVersionCheck from '../lib/useVersionCheck'

const VersionNotifier = () => {
  const { updateAvailable, latestVersion, reload, forceUpdate, message, isReloading } =
    useVersionCheck()

  if (!updateAvailable) return null

  const bodyText =
    message ||
    `A new version of the app is available${latestVersion ? ` (v${latestVersion})` : ''}. Reload to get the latest updates.`

  if (forceUpdate) {
    return (
      <div
        className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
        style={{ zIndex: 2000, background: 'rgba(var(--cui-dark-rgb), 0.45)' }}
      >
        <CAlert color="danger" className="mb-0 shadow-sm" style={{ maxWidth: '32rem' }}>
          <div className="fw-semibold mb-2">This version is no longer supported.</div>
          <div>{bodyText}</div>
          <div className="mt-3 d-flex justify-content-end">
            <CButton color="primary" size="sm" onClick={reload} disabled={isReloading}>
              {isReloading ? 'Reloading...' : 'Reload now'}
            </CButton>
          </div>
        </CAlert>
      </div>
    )
  }

  return (
    <div
      className="version-banner position-fixed bottom-0 start-0 end-0 p-3"
      style={{ zIndex: 2000 }}
    >
      <CAlert
        color="info"
        className="d-flex align-items-center justify-content-between mb-0 shadow"
      >
        <div>{bodyText}</div>
        <div className="ms-3 d-flex gap-2">
          <CButton color="primary" size="sm" onClick={reload} disabled={isReloading}>
            {isReloading ? 'Reloading...' : 'Reload now'}
          </CButton>
        </div>
      </CAlert>
    </div>
  )
}

export default VersionNotifier

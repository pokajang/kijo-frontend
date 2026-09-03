import React from 'react'

import useMaintenanceStatus from '../lib/useMaintenanceStatus'

const MaintenanceOverlay = () => {
  const { maintenanceActive } = useMaintenanceStatus()

  if (!maintenanceActive) return null

  return (
    <div
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-description"
      aria-modal="true"
      className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-4"
      role="alertdialog"
      style={{ zIndex: 3000, background: '#f4f7fb' }}
    >
      <div
        className="bg-body border rounded-4 shadow p-4 p-sm-5 text-center w-100"
        style={{ maxWidth: '34rem' }}
      >
        <div
          aria-hidden="true"
          className="d-inline-flex align-items-center justify-content-center rounded-4 bg-primary text-white fw-bold fs-3 mb-4"
          style={{ width: '4rem', height: '4rem' }}
        >
          K
        </div>
        <h1 className="h2 fw-bold mb-3" id="maintenance-title">
          Kijo is being upgraded
        </h1>
        <p className="text-body-secondary mb-3" id="maintenance-description">
          We are applying an update and will be back shortly. This page will update automatically.
        </p>
        <div className="text-primary fw-semibold" role="status" aria-live="polite">
          Maintenance in progress
        </div>
      </div>
    </div>
  )
}

export default MaintenanceOverlay

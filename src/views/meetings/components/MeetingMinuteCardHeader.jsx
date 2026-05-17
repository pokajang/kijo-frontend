import React from 'react'
import { CButton, CCardHeader } from '@coreui/react'

export default function MeetingMinuteCardHeader({ isViewMode, isEditRoute, onBack }) {
  return (
    <CCardHeader className="d-flex justify-content-between align-items-center">
      <strong>
        {isViewMode
          ? 'View Meeting Minutes'
          : isEditRoute
            ? 'Edit Meeting Minutes'
            : 'Add Meeting Minutes'}
      </strong>
      <div className="d-flex align-items-center gap-2">
        <CButton color="secondary" variant="outline" size="sm" onClick={onBack}>
          Back
        </CButton>
      </div>
    </CCardHeader>
  )
}

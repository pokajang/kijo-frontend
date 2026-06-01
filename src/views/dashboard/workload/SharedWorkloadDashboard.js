import React, { useCallback } from 'react'
import { CContainer } from '@coreui/react'
import { useParams } from 'react-router-dom'
import WorkloadDashboard from './WorkloadDashboard'
import { fetchSharedWorkload } from './api'

const SharedWorkloadDashboard = () => {
  const { token } = useParams()

  const fetchRows = useCallback(({ signal }) => fetchSharedWorkload({ token, signal }), [token])
  const getLoadErrorMessage = useCallback(
    (error) => error?.message || 'Shared workload dashboard is unavailable.',
    [],
  )

  return (
    <CContainer fluid className="px-4 py-4 app-content-container">
      <WorkloadDashboard
        fetchRows={fetchRows}
        showActions={false}
        enableSharing={false}
        enableHistory={false}
        getLoadErrorMessage={getLoadErrorMessage}
      />
    </CContainer>
  )
}

export default SharedWorkloadDashboard

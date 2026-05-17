import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert } from '@coreui/react'
import { useLeaveRecordHandlers } from './actionHandlersRecords'
import LeaveRecordTable from './LeaveRecordTable'

const LeaveRecord = () => {
  const navigate = useNavigate()
  const {
    leaveRecords,
    loadingRecords,
    recordsError,
    fetchLeaveRecords,
    handleCancel,
    getStatusBadge,
  } = useLeaveRecordHandlers()

  useEffect(() => {
    fetchLeaveRecords()
  }, [fetchLeaveRecords])

  return (
    <>
      {recordsError && (
        <CAlert color="danger" className="mb-3">
          {recordsError}
        </CAlert>
      )}

      <LeaveRecordTable
        leaveRecords={leaveRecords}
        loading={loadingRecords}
        handleCancel={handleCancel}
        getStatusBadge={getStatusBadge}
        onView={(record) =>
          navigate(`/my/leaves/records/${record.id}`, {
            state: { record, returnTo: '/my/leaves' },
          })
        }
      />
    </>
  )
}

export default LeaveRecord

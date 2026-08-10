import React, { useEffect, useState } from 'react'
import {
  CButton,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import { reactivateProject } from './projectApi'

const ReactivateProjectModal = ({ visible, project, onClose, onConfirm }) => {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!visible) return
    setReason('')
    setIsSubmitting(false)
  }, [project?.id, visible])

  const trimmedReason = reason.trim()
  const handleCancel = () => {
    if (!isSubmitting) onClose?.()
  }

  const handleReactivate = async () => {
    if (!trimmedReason || isSubmitting) return
    setIsSubmitting(true)

    try {
      const data = await reactivateProject(project.id, { reason: trimmedReason })

      if (data?.status !== 'success') {
        dialog.alert(data?.message || 'Failed to reactivate project.')
        setIsSubmitting(false)
        return
      }

      showToast('Project reactivated.')
      onConfirm?.(data)
    } catch (err) {
      console.error('Error reactivating project:', err)
      dialog.alert(err?.message || 'Failed to reactivate project.')
      setIsSubmitting(false)
    }
  }

  const projectName = project?.project_name || 'this project'
  const currentStatus = project?.status || 'Closed'

  return (
    <CModal visible={visible} onClose={handleCancel} alignment="center" backdrop="static">
      <CModalHeader>
        <CModalTitle>Reactivate Project</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-2">
          Reactivating <strong>{projectName}</strong> will change its status from{' '}
          <strong>{currentStatus}</strong> to <strong>Active</strong>.
        </p>
        <p id="reactivation-reason-help" className="text-body-secondary small">
          The reason will be recorded in project progress for audit history.
        </p>
        <CFormLabel htmlFor="reactivationReason">Reactivation Reason</CFormLabel>
        <CFormTextarea
          id="reactivationReason"
          rows={3}
          maxLength={2000}
          required
          autoFocus
          aria-describedby="reactivation-reason-help"
          placeholder="e.g. Client resumed the project."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={isSubmitting}
        />
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          disabled={!trimmedReason || isSubmitting}
          onClick={handleReactivate}
        >
          {isSubmitting ? 'Reactivating...' : 'Reactivate Project'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ReactivateProjectModal

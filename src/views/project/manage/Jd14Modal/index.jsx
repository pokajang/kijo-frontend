import React, { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CCard,
  CButton,
} from '@coreui/react'
import EmployerDetails from './EmployerDetails'
import TrainingDetails from './TrainingDetails'
import dialog from '../../../../components/dialog/dialogService'
import {
  confirmExistingCommercialDocs,
  ProjectCommercialDocsNotice,
  useProjectCommercialDocs,
} from '../commercialDocsWarning'
const Jd14Modal = ({ visible, onClose, project }) => {
  const navigate = useNavigate()
  const commercialDocs = useProjectCommercialDocs(project?.id, visible, 'jd14')

  // — Employer state (starts empty, then syncs from `project`) —
  const [employerDetails, setEmployerDetails] = useState({
    employerName: '',
    address: '',
    approvalNo: '',
    groupApproved: '',
    groupClaimed: '',
  })
  const [employerCode, setEmployerCode] = useState('')

  // Sync employerDetails whenever `project` updates
  useEffect(() => {
    if (project) {
      setEmployerDetails({
        employerName: project.client_name || '',
        address: project.client_full_address || '',
        approvalNo: project.grant_approval || '',
        groupApproved: project.group_approved || '',
        groupClaimed: project.group_claimed || '',
      })
    }
  }, [project])

  // Derive employerCode from the approvalNo prefix
  useEffect(() => {
    setEmployerCode(employerDetails.approvalNo.split('_')[0] || '')
  }, [employerDetails.approvalNo])

  const handleEmployerChange = useCallback(
    (field) => (e) => setEmployerDetails((prev) => ({ ...prev, [field]: e.target.value })),
    [],
  )

  // — Training state (starts empty/defaults, adjust sync as needed) —
  const [trainingDetails, setTrainingDetails] = useState({
    topic: '',
    commencedDate: '',
    endDate: '',
    trainingVenue: '',
    noOfPax: '',
    amountApproved: '',
    amountClaimed: '',
  })

  // If you have training-specific fields on `project`, you can sync here:
  useEffect(() => {
    if (project) {
      setTrainingDetails((prev) => ({
        ...prev,
        topic: project.project_name || '',
        commencedDate: project.service_start_date || '',
        endDate: project.service_end_date || '',
        trainingVenue: project.training_venue || '',
        amountApproved: project.quote_value || '',
        amountClaimed: project.quote_value || '',
      }))
    }
  }, [project])

  const handleTrainingChange = useCallback(
    (field) => (e) =>
      setTrainingDetails((prev) => {
        const nextValue = e.target.value
        if (prev[field] === nextValue) return prev
        return { ...prev, [field]: nextValue }
      }),
    [],
  )

  // Build payload for backend
  const prepareJd14Data = () => ({
    project_id: project?.id,
    employer_name: employerDetails.employerName,
    employer_address: employerDetails.address,
    approval_no: employerDetails.approvalNo,
    employer_code: employerCode,
    group_approved: employerDetails.groupApproved,
    group_claimed: employerDetails.groupClaimed,
    course_title: trainingDetails.topic,
    training_venue: trainingDetails.trainingVenue,
    commenced_date: trainingDetails.commencedDate,
    end_date: trainingDetails.endDate,
    no_of_pax: trainingDetails.noOfPax,
    total_fee_approved: trainingDetails.amountApproved,
    total_fee_claimed: trainingDetails.amountClaimed,
  })

  const handleSubmitJd14 = async () => {
    if (
      !(await confirmExistingCommercialDocs({
        ...commercialDocs,
        recordLabel: 'JD14 forms',
        createLabel: 'another JD14 form',
        title: 'Existing JD14 Forms',
      }))
    ) {
      return
    }

    const payload = prepareJd14Data()

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}jd14-forms`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (result.status === 'success') {
        const goToList = await dialog.confirm('JD14 created. Go to list?', {
          title: 'JD14 Created',
          confirmText: 'Go to list',
          cancelText: 'Stay here',
        })
        if (goToList) {
          navigate('/commercial/jd14')
        } else {
          onClose?.()
        }
      } else {
        dialog.alert(result.message || '❌ Failed to create JD14 form.')
      }
    } catch (err) {
      console.error('JD14 Submission Error:', err)
      dialog.alert('❌ Something went wrong. Form may have been created. Please check manually.')
    }
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>Generate JD14</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <ProjectCommercialDocsNotice
          groups={commercialDocs.groups}
          loading={commercialDocs.loading}
          error={commercialDocs.error}
          recordLabel="JD14 forms"
          createLabel="another JD14 form"
        />
        <CCard>
          <EmployerDetails
            employerDetails={employerDetails}
            employerCode={employerCode}
            onChange={handleEmployerChange}
          />
          <TrainingDetails
            trainingDetails={trainingDetails}
            onChange={handleTrainingChange}
            employerAddress={employerDetails.address}
          />
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          onClick={handleSubmitJd14}
          disabled={commercialDocs.loading}
        >
          Generate JD14
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default Jd14Modal

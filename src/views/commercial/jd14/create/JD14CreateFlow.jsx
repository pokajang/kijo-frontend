import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardFooter, CCardHeader } from '@coreui/react'

import EmployerDetails from './JD14EmployerDetailsStep'
import TrainingDetails from './JD14TrainingDetailsStep'
import dialog from '../../../../components/dialog/dialogService'
import {
  confirmExistingCommercialDocs,
  hasProjectCommercialDocGroups,
  ProjectCommercialDocsNotice,
  useProjectCommercialDocs,
} from '../../../project/manage/commercialDocsWarning'
import { buildJD14CreatePayload, createJD14Form } from './jd14CreatePayload'
import JD14ReviewStep from './JD14ReviewStep'
import JD14SuccessStep from './JD14SuccessStep'

const JD14CreateFlow = ({ project, origin = 'project', onBack }) => {
  const navigate = useNavigate()
  const commercialDocs = useProjectCommercialDocs(project?.id, true)
  const [step, setStep] = useState('edit')
  const [submitting, setSubmitting] = useState(false)
  const [createdResult, setCreatedResult] = useState(null)
  const [employerDetails, setEmployerDetails] = useState({
    employerName: '',
    address: '',
    approvalNo: '',
    groupApproved: '',
    groupClaimed: '',
  })
  const [employerCode, setEmployerCode] = useState('')
  const [trainingDetails, setTrainingDetails] = useState({
    topic: '',
    commencedDate: '',
    endDate: '',
    trainingVenue: '',
    noOfPax: '',
    amountApproved: '',
    amountClaimed: '',
  })

  useEffect(() => {
    if (!project) return

    setEmployerDetails({
      employerName: project.client_name || '',
      address: project.client_full_address || '',
      approvalNo: project.grant_approval || '',
      groupApproved: project.group_approved || '',
      groupClaimed: project.group_claimed || '',
    })
    setTrainingDetails({
      topic: project.project_name || '',
      commencedDate: project.service_start_date || '',
      endDate: project.service_end_date || '',
      trainingVenue: project.training_venue || '',
      noOfPax: '',
      amountApproved: project.quote_value || '',
      amountClaimed: project.quote_value || '',
    })
  }, [project])

  useEffect(() => {
    setEmployerCode(employerDetails.approvalNo.split('_')[0] || '')
  }, [employerDetails.approvalNo])

  const handleEmployerChange = useCallback(
    (field) => (event) =>
      setEmployerDetails((current) => ({ ...current, [field]: event.target.value })),
    [],
  )

  const handleTrainingChange = useCallback(
    (field) => (event) =>
      setTrainingDetails((current) => ({ ...current, [field]: event.target.value })),
    [],
  )

  const payload = useMemo(
    () => buildJD14CreatePayload({ project, employerDetails, employerCode, trainingDetails }),
    [employerCode, employerDetails, project, trainingDetails],
  )

  const showCommercialDocsNotice =
    commercialDocs.loading ||
    commercialDocs.error ||
    hasProjectCommercialDocGroups(commercialDocs.groups)

  const handleReview = async () => {
    if (project?.project_type !== 'Training') {
      dialog.alert('JD14 forms can only be generated for Training projects.')
      return
    }
    if (
      !(await confirmExistingCommercialDocs({
        ...commercialDocs,
        recordLabel: 'commercial records',
        createLabel: 'another JD14 form',
        title: 'Existing Commercial Records',
      }))
    ) {
      return
    }
    setStep('review')
  }

  const handleCreate = async () => {
    if (submitting) return

    setSubmitting(true)
    try {
      const result = await createJD14Form(payload)
      if (result.status === 'success') {
        if (origin === 'jd14-list') {
          setCreatedResult(result)
          setStep('success')
          return
        }
        navigate(`/commercial/jd14/${result.form_number}`, {
          state: { fromProjectId: project?.id },
        })
        return
      }
      dialog.alert(result.message || 'Failed to create JD14 form.')
    } catch (err) {
      console.error('JD14 Submission Error:', err)
      dialog.alert('Something went wrong. Form may have been created. Please check manually.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
        <strong>Create JD14</strong>
        <CButton
          color="secondary"
          size="sm"
          variant="outline"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </CButton>
      </CCardHeader>
      {project?.project_type !== 'Training' ? (
        <CCardBody>
          <CAlert color="warning" className="mb-0">
            JD14 forms can only be generated for Training projects.
          </CAlert>
        </CCardBody>
      ) : null}
      {step === 'edit' && (
        <>
          {showCommercialDocsNotice && (
            <CCardBody>
              <ProjectCommercialDocsNotice
                groups={commercialDocs.groups}
                loading={commercialDocs.loading}
                error={commercialDocs.error}
                recordLabel="commercial records"
                createLabel="another JD14 form"
              />
            </CCardBody>
          )}
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
          <CCardFooter className="d-flex justify-content-end gap-2">
            <CButton color="secondary" size="sm" variant="outline" onClick={onBack}>
              Cancel
            </CButton>
            <CButton
              color="primary"
              size="sm"
              onClick={handleReview}
              disabled={commercialDocs.loading || project?.project_type !== 'Training'}
            >
              Review JD14
            </CButton>
          </CCardFooter>
        </>
      )}
      {step === 'review' && (
        <JD14ReviewStep
          payload={payload}
          submitting={submitting}
          onBack={() => setStep('edit')}
          onCreate={handleCreate}
        />
      )}
      {step === 'success' && (
        <JD14SuccessStep
          result={createdResult}
          onReturnToList={() => navigate('/commercial/jd14')}
          onManageProject={() => navigate(`/project/manage/${project?.id}`)}
          onViewJD14={() => navigate(`/commercial/jd14/${createdResult?.form_number}`)}
        />
      )}
    </CCard>
  )
}

export default JD14CreateFlow

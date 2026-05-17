import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailFields, DataTableDetailShell } from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import { deleteFinalAppraisal, fetchFinalAppraisal } from '../actionHandlers'

const normalizeFinalAppraisal = (record) => {
  if (!record) return null
  return {
    ...record,
    staff:
      record.staff ||
      `${record.staff_name || '-'} (${record.staff_code || '-'})${
        record.staff_position ? `, ${record.staff_position}` : ''
      }${record.staff_department ? `, ${record.staff_department}` : ''}`,
    appraisalBy:
      record.appraisalBy ||
      `${record.creator_name || '-'} (${record.creator_code || '-'})${
        record.creator_position ? `, ${record.creator_position}` : ''
      }${record.creator_department ? `, ${record.creator_department}` : ''}`,
    appraisalDate: record.appraisal_date || record.appraisalDate || '',
    workQuality: record.work_quality || record.workQuality || '',
    teamwork: record.teamwork || '',
    leadership: record.leadership || '',
    overallPerformance: record.overall_performance || record.overallPerformance || '',
    supervisorComments: record.supervisor_comments || record.supervisorComments || '',
    salaryIncrementRecommendation:
      record.salary_increment_recommendation || record.salaryIncrementRecommendation || '',
    promotionRecommendation:
      record.promotion_recommendation || record.promotionRecommendation || '',
  }
}

const ratingText = (value) => (value ? `${value} / 5` : '-')

const FinalAppraisalDetailPage = () => {
  const { finalAppraisalId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/staff/appraise'
  const [record, setRecord] = useState(() => normalizeFinalAppraisal(location.state?.record))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchFinalAppraisal(finalAppraisalId)
      setRecord(normalizeFinalAppraisal(data))
    } catch (err) {
      if (location.state?.record) {
        setRecord(normalizeFinalAppraisal(location.state.record))
      } else {
        setError(err?.message || 'Unable to load final appraisal details.')
      }
    } finally {
      setLoading(false)
    }
  }, [finalAppraisalId, location.state])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const removeRecord = useCallback(async () => {
    if (!(await dialog.confirm('Delete this final appraisal record?'))) return

    try {
      await deleteFinalAppraisal(finalAppraisalId)
      dialog.alert('Final appraisal deleted.')
      navigate(returnTo)
    } catch (err) {
      dialog.alert(err?.message || 'Failed to delete final appraisal.')
    }
  }, [finalAppraisalId, navigate, returnTo])

  const actions = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        onClick: () => navigate(`/staff/appraise/final-appraisal/${finalAppraisalId}`),
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        onClick: removeRecord,
      },
    ],
    [finalAppraisalId, navigate, removeRecord],
  )

  return (
    <DataTableDetailShell
      title="Final Appraisal Details"
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={record}
      actions={actions}
      emptyMessage="Final appraisal record not found."
    >
      <DataTableDetailFields
        fields={[
          { key: 'staff', label: 'Staff', value: record?.staff, xs: 12 },
          { key: 'date', label: 'Appraisal Date', value: record?.appraisalDate },
          { key: 'by', label: 'Appraised By', value: record?.appraisalBy },
          { key: 'workQuality', label: 'Work Quality', value: ratingText(record?.workQuality) },
          { key: 'teamwork', label: 'Teamwork', value: ratingText(record?.teamwork) },
          { key: 'leadership', label: 'Leadership', value: ratingText(record?.leadership) },
          {
            key: 'overall',
            label: 'Overall Performance',
            value: ratingText(record?.overallPerformance),
          },
          {
            key: 'comments',
            label: 'Supervisor Comments',
            value: record?.supervisorComments || '-',
            xs: 12,
          },
          {
            key: 'salary',
            label: 'Salary Increment Recommendation',
            value: record?.salaryIncrementRecommendation || '-',
          },
          {
            key: 'promotion',
            label: 'Promotion Recommendation',
            value: record?.promotionRecommendation || '-',
          },
        ]}
      />
    </DataTableDetailShell>
  )
}

export default FinalAppraisalDetailPage

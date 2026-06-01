import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailFields, DataTableDetailShell } from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import {
  fetchDetailJson,
  fetchJson,
  findRecordById,
  getArrayFromPayload,
} from '../../../utils/detailPages'
import AppraisalModal from './AppraisalModal'
import { deleteAppraisalRecord, handleInputChange, updateAppraisalRecord } from './actionHandlers'
import infoDetails from './infoDetails'

const API_BASE = import.meta.env.VITE_API_BASE

const normalizeAppraisal = (record) => {
  if (!record) return null
  return {
    ...record,
    createdAt: record.created_at || record.createdAt || '',
    appraisedBy:
      record.appraisedBy ||
      record.appraisalBy ||
      `${record.creator_name || '-'} (${record.creator_code || '-'})${
        record.creator_position ? `, ${record.creator_position}` : ''
      }${record.creator_department ? `, ${record.creator_department}` : ''}`,
    eventDate: record.event_date || record.eventDate || '',
    section: record.section || '-',
    feedback: record.feedback || '',
    staff:
      record.staff ||
      `${record.staff_name || '-'} (${record.staff_code || '-'})${
        record.staff_position ? `, ${record.staff_position}` : ''
      }${record.staff_department ? `, ${record.staff_department}` : ''}`,
  }
}

const AppraisalRecordDetailPage = ({ mode = 'personal' }) => {
  const { appraisalId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isStaffMode = mode === 'staff'
  const returnTo = location.state?.returnTo || (isStaffMode ? '/staff/appraise' : null)
  const [record, setRecord] = useState(() => normalizeAppraisal(location.state?.record))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [editVisible, setEditVisible] = useState(false)
  const [editFormData, setEditFormData] = useState({
    selectedStaff: '',
    eventDate: '',
    quickInput: '',
  })
  const [saving, setSaving] = useState(false)

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (isStaffMode) {
        const detailResult = await fetchDetailJson(
          `${API_BASE}hr/appraisals/${encodeURIComponent(appraisalId)}`,
          { notFoundMessage: 'Appraisal record not found.' },
        )
        if (detailResult.notFound) {
          setRecord(null)
          return
        }
        const data = detailResult.data
        const found = data?.record || data?.data || data?.appraisal || data
        setRecord(normalizeAppraisal(found?.id ? found : null))
        if (!found?.id) setError('Appraisal record not found.')
      } else {
        const data = await fetchJson(`${API_BASE}hr/appraisals/personal`)
        const records = getArrayFromPayload(data, ['records', 'data'])
        const found = findRecordById(records, appraisalId)
        setRecord(normalizeAppraisal(found))
        if (!found) setError('Appraisal record not found.')
      }
    } catch (err) {
      if (location.state?.record) {
        setRecord(normalizeAppraisal(location.state.record))
        setError('')
      } else {
        setError(err?.message || 'Unable to load appraisal details.')
      }
    } finally {
      setLoading(false)
    }
  }, [appraisalId, isStaffMode, location.state])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const openEdit = useCallback(() => {
    setEditFormData({
      selectedStaff: record?.staff_id || '',
      eventDate: record?.event_date || record?.eventDate || '',
      quickInput: record?.feedback || '',
    })
    setEditVisible(true)
  }, [record])

  const saveEdit = async () => {
    setSaving(true)
    try {
      await updateAppraisalRecord({
        id: appraisalId,
        feedback: editFormData.quickInput,
        event_date: editFormData.eventDate,
      })
      setEditVisible(false)
      await loadRecord()
      dialog.alert('Appraisal updated.')
    } catch (err) {
      dialog.alert(err?.message || 'Failed to update appraisal.')
    } finally {
      setSaving(false)
    }
  }

  const removeRecord = useCallback(async () => {
    if (
      !(await dialog.confirm('Delete this appraisal record?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      await deleteAppraisalRecord(appraisalId)
      dialog.alert('Appraisal deleted.')
      if (returnTo) navigate(returnTo)
      else navigate(-1)
    } catch (err) {
      dialog.alert(err?.message || 'Failed to delete appraisal.')
    }
  }, [appraisalId, navigate, returnTo])

  const actions = useMemo(
    () =>
      isStaffMode
        ? [
            { key: 'edit', label: 'Edit', onClick: openEdit },
            { key: 'delete', label: 'Delete', danger: true, onClick: removeRecord },
          ]
        : [],
    [isStaffMode, openEdit, removeRecord],
  )

  return (
    <>
      <DataTableDetailShell
        title={isStaffMode ? 'Staff Appraisal Details' : 'Appraisal Details'}
        onBack={() => (returnTo ? navigate(returnTo) : navigate(-1))}
        loading={loading}
        error={error}
        record={record}
        actions={actions}
        emptyMessage="Appraisal record not found."
      >
        <DataTableDetailFields
          fields={[
            { key: 'staff', label: 'Staff', value: record?.staff, xs: 12 },
            { key: 'created', label: 'Appraisal Date', value: record?.createdAt },
            { key: 'by', label: 'Appraised By', value: record?.appraisedBy },
            { key: 'event', label: 'Event Date', value: record?.eventDate },
            { key: 'section', label: 'Type', value: record?.section },
            { key: 'feedback', label: 'Feedback', value: record?.feedback || '-', xs: 12 },
          ]}
        />
      </DataTableDetailShell>

      <AppraisalModal
        visible={editVisible}
        section={record?.section}
        title={`Edit ${record?.section || 'Appraisal'}`}
        formData={editFormData}
        disableStaffSelect
        onClose={() => setEditVisible(false)}
        onInputChange={(event) => handleInputChange(event, setEditFormData)}
        onSubmit={saveEdit}
        submitLabel={saving ? 'Saving...' : 'Update'}
        infoContent={infoDetails[record?.section]}
      />
    </>
  )
}

export default AppraisalRecordDetailPage

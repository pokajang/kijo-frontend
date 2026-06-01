import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { DataTableDetailFields, DataTableDetailShell } from '../../components/datatable'
import dialog from '../../components/dialog/dialogService'
import { fetchJson, findRecordById, getArrayFromPayload } from '../../utils/detailPages'

const API_BASE = import.meta.env.VITE_API_BASE

const normalizeRequest = (record) => {
  if (!record) return null
  const startDate = new Date(record.use_start_date || record.startDate)
  const endDate = new Date(record.use_end_date || record.endDate)
  const diffTime = endDate - startDate
  const duration = Number.isFinite(diffTime)
    ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    : record.duration || 0

  return {
    ...record,
    staff: record.staff_name || record.staff || '-',
    equipment: record.equipment_detail || record.equipment || '-',
    startDate: record.use_start_date || record.startDate || '',
    endDate: record.use_end_date || record.endDate || '',
    duration,
    purpose: record.purpose || '-',
    remarks: record.remarks || '-',
    achievement: record.achievement || '',
  }
}

const RequestDetailPage = () => {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/support/requests'
  const [record, setRecord] = useState(() => normalizeRequest(location.state?.record))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [achievement, setAchievement] = useState('')

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchJson(`${API_BASE}tool-requests`)
      const records = getArrayFromPayload(data, ['requests', 'data'])
      const found = findRecordById(records, requestId)
      setRecord(normalizeRequest(found))
      if (!found) setError('Usage record not found.')
    } catch (err) {
      setError(err?.message || 'Unable to load usage record.')
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const openAchievementModal = useCallback(() => {
    setAchievement(record?.achievement || '')
    setModalVisible(true)
  }, [record])

  const saveAchievement = async () => {
    try {
      const data = await fetchJson(`${API_BASE}tool-requests/${requestId}/achievement`, {
        method: 'PUT',
        body: JSON.stringify({ achievement }),
      })
      if (data.status !== 'success') throw new Error(data.message || 'Unable to update achievement')
      setModalVisible(false)
      await loadRecord()
    } catch (err) {
      dialog.alert(err?.message || 'Unable to update achievement.')
    }
  }

  const actions = useMemo(
    () => [
      {
        key: 'update',
        label: 'Update Achievement',
        disabled: Boolean(record?.achievement),
        tooltip: record?.achievement ? 'Achievement has already been recorded.' : undefined,
        onClick: openAchievementModal,
      },
    ],
    [openAchievementModal, record],
  )

  return (
    <>
      <DataTableDetailShell
        title="Usage Record Details"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={error}
        record={record}
        actions={actions}
        emptyMessage="Usage record not found."
      >
        <DataTableDetailFields
          fields={[
            { key: 'staff', label: 'Staff', value: record?.staff },
            { key: 'equipment', label: 'Equipment Detail', value: record?.equipment },
            { key: 'start', label: 'Start Date', value: record?.startDate },
            { key: 'end', label: 'End Date', value: record?.endDate },
            { key: 'duration', label: 'Duration', value: `${record?.duration || 0} days` },
            { key: 'purpose', label: 'Purpose', value: record?.purpose, xs: 12 },
            { key: 'remarks', label: 'Remarks', value: record?.remarks, xs: 12 },
            { key: 'achievement', label: 'Achievement', value: record?.achievement || '-', xs: 12 },
          ]}
        />
      </DataTableDetailShell>

      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>Update Achievement</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel htmlFor="request-detail-achievement">Achievement</CFormLabel>
          <CFormTextarea
            id="request-detail-achievement"
            rows={3}
            value={achievement}
            onChange={(event) => setAchievement(event.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setModalVisible(false)}
          >
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={saveAchievement}>
            Save
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default RequestDetailPage

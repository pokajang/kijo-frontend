import { useEffect, useMemo, useState } from 'react'
import dialog from '../../components/dialog/dialogService'
import { useAuth } from '../../auth/AuthProvider'
import { showToast } from '../../components/toast/toastService'
import { fetchAllPagedRecords } from '../../utils/detailPages'

const API_BASE = import.meta.env.VITE_API_BASE

const isBlank = (value) => !String(value ?? '').trim()

const getSessionStaffIds = (sessionUser) =>
  [sessionUser?.staff_id, sessionUser?.id]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

export function useToolRequestActions() {
  const { user: sessionUser, checkSession } = useAuth()
  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [requestData, setRequestData] = useState({
    equipmentDetail: '',
    useStartDate: '',
    useEndDate: '',
    purpose: '',
    remarks: '',
  })
  const [showModal, setShowModal] = useState(false)
  const [modalRecord, setModalRecord] = useState(null)
  const [newAchievement, setNewAchievement] = useState('')

  const pendingAchievementRecord = useMemo(() => {
    const staffIds = getSessionStaffIds(sessionUser)
    if (!staffIds.length) return null

    return (
      records
        .filter((record) => staffIds.includes(Number(record.staff_id)))
        .filter((record) => isBlank(record.achievement))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null
    )
  }, [records, sessionUser])

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    setRecordsLoading(true)
    try {
      const rows = await fetchAllPagedRecords({
        url: `${API_BASE}tool-requests`,
        params: { year: new Date().getFullYear() },
        dataKeys: ['requests', 'data'],
        perPage: 100,
      })
      setRecords(rows)
    } catch (err) {
      console.error('Records fetch error:', err)
      dialog.alert('Unable to load records. Please try again later.')
    } finally {
      setRecordsLoading(false)
    }
  }

  const handleChange = (field) => (e) => {
    setRequestData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const submitRequest = async () => {
    if (!(await dialog.confirm('Are you sure you want to submit this request?'))) {
      return false
    }

    try {
      const res = await fetch(`${API_BASE}tool-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })
      const data = await res.json()
      if (data.status === 'success') {
        setRequestData({
          equipmentDetail: '',
          useStartDate: '',
          useEndDate: '',
          purpose: '',
          remarks: '',
        })
        fetchRecords()
        showToast('Request submitted.')
        return true
      }

      dialog.alert(`Submission error: ${data.message}`)
      return false
    } catch (err) {
      console.error('Submit error:', err)
      dialog.alert('Unable to submit request. Please try again later.')
      return false
    }
  }

  const handleSubmitClick = async () => {
    if (pendingAchievementRecord) {
      return false
    }

    return submitRequest()
  }

  const handleCancel = () => {
    setRequestData({
      equipmentDetail: '',
      useStartDate: '',
      useEndDate: '',
      purpose: '',
      remarks: '',
    })
  }

  const openModal = (record) => {
    setModalRecord(record)
    setNewAchievement(record.achievement || '')
    setShowModal(true)
  }

  const handleSaveAchievement = async () => {
    try {
      const res = await fetch(`${API_BASE}tool-requests/${modalRecord.id}/achievement`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievement: newAchievement }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        setShowModal(false)
        fetchRecords()
        showToast('Achievement updated.')
      } else {
        dialog.alert(`Update error: ${data.message}`)
      }
    } catch (err) {
      console.error('Update error:', err)
      dialog.alert('Unable to update. Please try again later.')
    }
  }

  return {
    sessionUser,
    records,
    recordsLoading,
    pendingAchievementRecord,
    requestData,
    showModal,
    modalRecord,
    newAchievement,
    fetchSession: checkSession,
    fetchRecords,
    handleChange,
    handleSubmitClick,
    handleCancel,
    openModal,
    handleSaveAchievement,
    setNewAchievement,
    setShowModal,
  }
}

// src/views/project/ManageProjectModal/ProgressTrackerCard.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormCheck,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
} from '@coreui/react'
import { DataTableActionMenu, DataTableLoadingState } from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import { showToast } from '../../../../components/toast/toastService'
import { stripExactProjectMention } from '../../../../utils/projectMentionText'
import { deleteProjectProgress, listProjectProgress, saveProjectProgress } from '../projectApi'
import {
  formatProjectCumulativeDays,
  formatProjectDateTimeParts,
  formatProjectDeltaDays,
} from '../projectDetailFormatters'

const parseDateOnly = (value) => {
  const text = String(value || '').trim()
  if (!text) return null

  const [yearRaw, monthRaw, dayRaw] = text.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null

  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

const getDayDiff = (later, earlier) => {
  if (!later || !earlier) return null
  return Math.round((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24))
}

const compareProgressAsc = (a, b) => {
  const dateCompare = String(a?.progress_date || '').localeCompare(String(b?.progress_date || ''))
  if (dateCompare !== 0) return dateCompare
  return String(a?.updated_on || '').localeCompare(String(b?.updated_on || ''))
}

const isTaskLinkedProgress = (item) =>
  String(item?.source_type || '').toLowerCase() === 'task' || item?.source_task_id != null

const getProgressDisplayText = (item, projectName) => {
  if (!isTaskLinkedProgress(item)) return item?.progress_text || '-'

  return stripExactProjectMention(item?.progress_text || '-', projectName) || '-'
}

const ProgressTrackerCard = ({ projectId, projectName = '', refreshKey = 0 }) => {
  const [progressList, setProgressList] = useState([])
  const [progressDate, setProgressDate] = useState('')
  const [progressText, setProgressText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [editingProgressId, setEditingProgressId] = useState(null)
  const [showAllRows, setShowAllRows] = useState(false)
  const [deletingProgressId, setDeletingProgressId] = useState(null)

  const fetchProgressList = useCallback(
    async (options = {}) => {
      if (!projectId) return

      setLoading(true)
      setLoadError('')

      try {
        const data = await listProjectProgress(projectId, options)
        setProgressList(data)
      } catch (err) {
        if (err.name === 'AbortError') return
        setProgressList([])
        setLoadError(err.message || 'Failed to fetch progress list.')
      } finally {
        setLoading(false)
      }
    },
    [projectId],
  )

  useEffect(() => {
    if (!projectId) {
      setProgressList([])
      setLoadError('')
      setShowAllRows(false)
      return
    }
    const controller = new AbortController()
    fetchProgressList({ signal: controller.signal, silentError: true })

    return () => {
      controller.abort()
    }
  }, [projectId, refreshKey, fetchProgressList])

  const tableRows = useMemo(() => {
    const chronological = Array.isArray(progressList)
      ? [...progressList].sort(compareProgressAsc)
      : []
    if (!chronological.length) return []

    const firstDate = parseDateOnly(chronological[0]?.progress_date)

    const enriched = chronological.map((item, idx) => {
      const currentDate = parseDateOnly(item?.progress_date)
      const previousDate = idx > 0 ? parseDateOnly(chronological[idx - 1]?.progress_date) : null

      return {
        ...item,
        daysLapsed: idx > 0 ? getDayDiff(currentDate, previousDate) : null,
        cumulative: getDayDiff(currentDate, firstDate),
      }
    })

    return enriched.reverse()
  }, [progressList])

  const canSubmit = Boolean(progressDate && progressText.trim() && !submitting)
  const visibleRows = showAllRows ? tableRows : tableRows.slice(0, 5)

  const closeUpdateModal = () => {
    if (submitting) return
    setShowUpdateModal(false)
    setProgressDate('')
    setProgressText('')
    setEditingProgressId(null)
  }

  const handleSaveProgress = async () => {
    const trimmedUpdate = progressText.trim()
    if (!progressDate || !trimmedUpdate) {
      dialog.alert('Both date and update are required.')
      return
    }
    if (!projectId) {
      dialog.alert('Missing project ID.')
      return
    }

    const payload = {
      project_id: projectId,
      date: progressDate,
      update: trimmedUpdate,
    }

    if (editingProgressId) {
      payload.progress_id = editingProgressId
    }

    try {
      setSubmitting(true)

      const result = await saveProjectProgress(null, payload)

      if (result?.status === 'success') {
        await fetchProgressList()
        setProgressDate('')
        setProgressText('')
        setShowUpdateModal(false)
        setEditingProgressId(null)
        showToast(editingProgressId ? 'Progress update saved.' : 'Progress update added.')
      } else {
        dialog.alert(
          result?.message ||
            (editingProgressId ? 'Failed to update progress.' : 'Failed to add progress.'),
        )
      }
    } catch (err) {
      console.error('Save progress error:', err)
      dialog.alert('Server error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditProgress = (item) => {
    if (!item?.id) return
    if (isTaskLinkedProgress(item)) {
      dialog.alert('Task-linked progress updates must be changed from the task list.')
      return
    }

    setEditingProgressId(item.id)
    setProgressDate(item.progress_date || '')
    setProgressText(item.progress_text || '')
    setShowUpdateModal(true)
  }

  const handleDeleteProgress = async (item) => {
    if (!item?.id || !projectId) return
    if (deletingProgressId != null) return
    if (isTaskLinkedProgress(item)) {
      dialog.alert('Task-linked progress updates must be deleted from the task list.')
      return
    }
    if (
      !(await dialog.confirm('Delete this progress update?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return

    try {
      setDeletingProgressId(item.id)
      const result = await deleteProjectProgress({
        project_id: projectId,
        progress_id: item.id,
      })
      if (result?.status === 'success') {
        await fetchProgressList()
        showToast('Progress update deleted.')
      } else {
        dialog.alert(result?.message || 'Failed to delete progress.')
      }
    } catch (err) {
      console.error('Delete progress error:', err)
      dialog.alert('Server error occurred.')
    } finally {
      setDeletingProgressId(null)
    }
  }

  return (
    <>
      <CCardHeader className="rounded-0 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-baseline gap-2">
          <strong>Project Progress Tracking</strong>
          <small className="text-muted">({tableRows.length})</small>
        </div>
        <CButton color="primary" size="sm" onClick={() => setShowUpdateModal(true)}>
          Update
        </CButton>
      </CCardHeader>
      <CCardBody>
        <div className="mb-1 data-table-embedded-shell">
          {/* datatable-exempt: existing embedded/layout table */}
          <CTable hover className="data-table-compact embedded-data-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Logged</CTableHeaderCell>
                <CTableHeaderCell>Event</CTableHeaderCell>
                <CTableHeaderCell>Delta</CTableHeaderCell>
                <CTableHeaderCell>Update</CTableHeaderCell>
                <CTableHeaderCell>By</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>

            <CTableBody>
              {loading ? (
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-center text-muted">
                    <DataTableLoadingState message="Loading progress..." />
                  </CTableDataCell>
                </CTableRow>
              ) : loadError ? (
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-center text-danger">
                    {loadError}
                  </CTableDataCell>
                </CTableRow>
              ) : tableRows.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-center text-muted">
                    No progress updates yet.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                visibleRows.map((item, idx) => {
                  const taskLinked = isTaskLinkedProgress(item)
                  const logged = formatProjectDateTimeParts(item?.updated_on)

                  return (
                    <CTableRow key={`${item?.id || item?.updated_on || 'row'}-${idx}`}>
                      <CTableDataCell>
                        {logged.date}
                        <br />
                        <small className="text-muted">{logged.time}</small>
                      </CTableDataCell>
                      <CTableDataCell>{item?.progress_date || '-'}</CTableDataCell>
                      <CTableDataCell>
                        {formatProjectDeltaDays(item?.daysLapsed)}
                        <br />
                        <small className="text-muted">
                          {formatProjectCumulativeDays(item?.cumulative)}
                        </small>
                      </CTableDataCell>
                      <CTableDataCell>
                        {getProgressDisplayText(item, projectName)}
                        {taskLinked ? (
                          <small className="text-muted ms-2 text-nowrap">Task</small>
                        ) : null}
                      </CTableDataCell>
                      <CTableDataCell>{item?.updated_by || '-'}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        <DataTableActionMenu
                          record={item}
                          actions={[
                            {
                              key: 'edit',
                              label: 'Edit',
                              disabled: taskLinked,
                              onClick: () => handleEditProgress(item),
                            },
                            {
                              key: 'delete',
                              label: deletingProgressId === item.id ? 'Deleting...' : 'Delete',
                              danger: true,
                              dividerBefore: true,
                              disabled: taskLinked || deletingProgressId != null,
                              onClick: () => handleDeleteProgress(item),
                            },
                          ]}
                          ariaLabel="Progress actions"
                        />
                      </CTableDataCell>
                    </CTableRow>
                  )
                })
              )}
            </CTableBody>
          </CTable>
        </div>

        {tableRows.length > 5 && (
          <div className="d-flex justify-content-start mt-2">
            <CFormCheck
              id="progress-show-more"
              label="Show more rows"
              checked={showAllRows}
              onChange={(e) => setShowAllRows(e.target.checked)}
              className="text-muted"
            />
          </div>
        )}
      </CCardBody>

      <CModal visible={showUpdateModal} onClose={closeUpdateModal} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>
            {editingProgressId ? 'Edit Progress Update' : 'Add Progress Update'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12} md={4}>
              <CFormLabel>Event Date</CFormLabel>
              <CFormInput
                type="date"
                value={progressDate}
                onChange={(e) => setProgressDate(e.target.value)}
              />
            </CCol>
            <CCol xs={12} md={8}>
              <CFormLabel>Update Details</CFormLabel>
              <CFormInput value={progressText} onChange={(e) => setProgressText(e.target.value)} />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            onClick={closeUpdateModal}
            disabled={submitting}
          >
            Cancel Update
          </CButton>
          <CButton color="primary" size="sm" onClick={handleSaveProgress} disabled={!canSubmit}>
            {submitting ? <CSpinner size="sm" /> : editingProgressId ? 'Save Update' : 'Add Update'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

ProgressTrackerCard.propTypes = {
  projectId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  projectName: PropTypes.string,
  refreshKey: PropTypes.number,
}

export default ProgressTrackerCard

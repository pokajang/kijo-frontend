import React, { useEffect, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import { KPI_API_BASE } from '../api/kpiApiBase'
import { clearKpiCaches, getKpiParameters, getKpiTracker } from '../api/selfKpiProgressApi'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const getCurrentYear = () => new Date().getFullYear()
const getCurrentMonthNumber = () => new Date().getMonth() + 1

const buildMonthValue = (year, monthNumber) => `${year}-${String(monthNumber).padStart(2, '0')}`

const getSelectableMonthsForYear = (year) => {
  const currentYear = getCurrentYear()
  const currentMonth = getCurrentMonthNumber()
  const monthLimit = Number(year) === currentYear ? currentMonth : 12

  return MONTHS.slice(0, monthLimit).map((label, index) => ({
    label,
    value: buildMonthValue(year, index + 1),
  }))
}

const getDefaultTrackerMonth = () => {
  const currentYear = getCurrentYear()
  const previousMonthInCurrentYear = Math.max(1, getCurrentMonthNumber() - 1)
  return buildMonthValue(currentYear, previousMonthInCurrentYear)
}

const getTrackerMonth = (row) => String(row?.for_month || '').slice(0, 7)
const normalizeText = (value) => String(value ?? '').trim()

const buildTrackerRows = async (month) => {
  const year = Number(String(month).slice(0, 4))
  const kpis = await getKpiParameters(year)
  const sortedKpis = [...(kpis || [])].sort((a, b) =>
    String(a.label).localeCompare(String(b.label)),
  )

  const trackerRows = await Promise.all(
    sortedKpis.map(async (kpi) => {
      const rows = await getKpiTracker(kpi.value, year)
      const existing = (rows || []).find((row) => getTrackerMonth(row) === month)
      const achieved = existing?.actual_value ?? ''
      const remarks = existing?.remarks ?? ''

      return {
        kpiId: kpi.value,
        label: kpi.label,
        description: kpi.description,
        annualTarget: kpi.annual_target,
        unit: kpi.unit,
        weightage: kpi.weightage,
        achieved,
        remarks,
        originalAchieved: achieved,
        originalRemarks: remarks,
        existingId: existing?.id ?? null,
        isEditing: false,
      }
    }),
  )

  return trackerRows
}

const KpiTracker = ({ closeModal, onSaved }) => {
  const [month, setMonth] = useState(getDefaultTrackerMonth)
  const [rows, setRows] = useState([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [savingRowId, setSavingRowId] = useState(null)
  const [alert, setAlert] = useState({ color: '', message: '', visible: false })
  const loadRunIdRef = useRef(0)
  const selectedYear = getCurrentYear()
  const selectableMonths = getSelectableMonthsForYear(selectedYear)

  useEffect(() => {
    if (!month) return

    const runId = ++loadRunIdRef.current
    setLoadingRows(true)
    setAlert({ color: '', message: '', visible: false })

    buildTrackerRows(month)
      .then((nextRows) => {
        if (runId !== loadRunIdRef.current) return
        setRows(nextRows)
      })
      .catch((error) => {
        if (runId !== loadRunIdRef.current) return
        console.error('Load KPI batch failed:', error)
        setRows([])
        setAlert({
          color: 'danger',
          message: error?.message || 'Could not load KPI tracker rows.',
          visible: true,
        })
      })
      .finally(() => {
        if (runId === loadRunIdRef.current) setLoadingRows(false)
      })
  }, [month])

  const isSaving = savingRowId !== null

  const updateRow = (kpiId, field, value) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.kpiId === kpiId ? { ...row, [field]: value } : row)),
    )
  }

  const setRowEditing = (kpiId, isEditing) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.kpiId === kpiId ? { ...row, isEditing } : row)),
    )
  }

  const cancelRowEdit = (kpiId) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.kpiId === kpiId
          ? {
              ...row,
              achieved: row.originalAchieved,
              remarks: row.originalRemarks,
              isEditing: false,
            }
          : row,
      ),
    )
  }

  const saveRow = async (row) => {
    const isDirty =
      normalizeText(row.achieved) !== normalizeText(row.originalAchieved) ||
      normalizeText(row.remarks) !== normalizeText(row.originalRemarks)

    if (!isDirty) {
      setRowEditing(row.kpiId, false)
      return
    }

    if (normalizeText(row.achieved) === '') {
      setAlert({
        color: 'warning',
        message: `Please enter an achieved value for ${row.label}.`,
        visible: true,
      })
      return
    }

    try {
      setSavingRowId(row.kpiId)
      setAlert({ color: '', message: '', visible: false })

      const response = await fetch(`${KPI_API_BASE}/tracker`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpi_id: Number(row.kpiId),
          month,
          target: Number(row.achieved),
          remarks: row.remarks,
        }),
      })
      const result = await response.json()

      if (result.status !== 'success') {
        throw new Error(result.message || `Failed to save ${row.label}`)
      }

      clearKpiCaches()
      setRows((currentRows) =>
        currentRows.map((currentRow) =>
          currentRow.kpiId === row.kpiId
            ? {
                ...currentRow,
                originalAchieved: currentRow.achieved,
                originalRemarks: currentRow.remarks,
                isEditing: false,
              }
            : currentRow,
        ),
      )
      onSaved?.({
        month,
        items: [
          {
            kpiId: Number(row.kpiId),
            value: Number(row.achieved),
            remarks: row.remarks,
          },
        ],
      })
      setAlert({ color: 'success', message: `${row.label} saved.`, visible: true })
    } catch (error) {
      console.error('KPI row save failed:', error)
      setAlert({
        color: 'danger',
        message: error?.message || 'Server error. Try again later.',
        visible: true,
      })
    } finally {
      setSavingRowId(null)
    }
  }

  return (
    <>
      {alert.visible && (
        <CAlert
          color={alert.color}
          dismissible
          onClose={() => setAlert((current) => ({ ...current, visible: false }))}
        >
          {alert.message}
        </CAlert>
      )}

      <CForm onSubmit={(event) => event.preventDefault()}>
        <div className="kpi-tracker-period-selector">
          <CFormLabel className="mb-2">For Month ({selectedYear})</CFormLabel>
          <div className="kpi-tracker-month-card-group" role="list" aria-label="Select KPI month">
            {selectableMonths.map((option) => {
              const isActive = option.value === month
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`kpi-month-card${isActive ? ' is-active' : ''}`}
                  onClick={() => setMonth(option.value)}
                  disabled={loadingRows || isSaving}
                  aria-pressed={isActive}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {closeModal && (
          <CRow className="align-items-end mb-3">
            <CCol xs={12} md="auto" className="mt-2 mt-md-0">
              <CButton
                type="button"
                color="secondary"
                variant="ghost"
                onClick={closeModal}
                disabled={isSaving}
              >
                Cancel
              </CButton>
            </CCol>
          </CRow>
        )}

        {loadingRows ? (
          <DataTableLoadingState message="Loading monthly KPIs..." />
        ) : rows.length === 0 ? (
          <div className="kpi-empty-state text-center text-muted py-5">
            <h6>No KPI parameters available for {String(month).slice(0, 4)}</h6>
          </div>
        ) : (
          <div className="kpi-tracker-batch-list">
            {rows.map((row) => {
              const isDirty =
                normalizeText(row.achieved) !== normalizeText(row.originalAchieved) ||
                normalizeText(row.remarks) !== normalizeText(row.originalRemarks)
              const hasValue = normalizeText(row.originalAchieved) !== ''
              const isRowSaving = savingRowId === row.kpiId
              const statusLabel = isRowSaving
                ? 'Saving...'
                : isDirty
                  ? 'Unsaved changes'
                  : hasValue
                    ? 'Saved'
                    : 'Not updated'
              const actionLabel = hasValue || isDirty ? 'Update' : 'Add'

              return (
                <section
                  key={row.kpiId}
                  className={`kpi-tracker-batch-row${isDirty ? ' is-dirty' : ''}${
                    row.isEditing ? ' is-editing' : ''
                  }`}
                >
                  <div className="kpi-tracker-batch-summary">
                    <div className="kpi-tracker-batch-meta">
                      <div className="kpi-tracker-batch-title-row">
                        <div className="kpi-tracker-batch-title">{row.label}</div>
                        {row.weightage != null && (
                          <CBadge color="secondary" className="kpi-tracker-batch-weight">
                            Weight {row.weightage}%
                          </CBadge>
                        )}
                      </div>
                      <div className="kpi-tracker-batch-subtitle">
                        <span>
                          Target {row.annualTarget} {row.unit}
                        </span>
                        {!!row.description && (
                          <span className="kpi-tracker-batch-description">{row.description}</span>
                        )}
                        {!!normalizeText(row.remarks) && (
                          <span className="kpi-tracker-batch-remarks-preview">{row.remarks}</span>
                        )}
                      </div>
                    </div>

                    <div className="kpi-tracker-batch-current">
                      <div className="kpi-tracker-batch-status">{statusLabel}</div>
                      <div className="kpi-tracker-batch-current-value">
                        {normalizeText(row.achieved) !== '' ? (
                          <>
                            {row.achieved} <span>{row.unit}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="kpi-tracker-batch-actions">
                      {!row.isEditing && (
                        <CButton
                          type="button"
                          color="primary"
                          variant="outline"
                          size="sm"
                          onClick={() => setRowEditing(row.kpiId, true)}
                          disabled={isSaving}
                        >
                          {actionLabel}
                        </CButton>
                      )}
                    </div>
                  </div>

                  {row.isEditing && (
                    <div className="kpi-tracker-batch-editor">
                      <div className="kpi-tracker-batch-fields">
                        <div className="kpi-tracker-batch-achieved-field">
                          <CFormLabel htmlFor={`kpi-achieved-${row.kpiId}`} className="mb-1">
                            Achieved
                          </CFormLabel>
                          <CFormInput
                            id={`kpi-achieved-${row.kpiId}`}
                            type="number"
                            value={row.achieved}
                            onChange={(event) =>
                              updateRow(row.kpiId, 'achieved', event.target.value)
                            }
                            placeholder="0"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <CFormLabel htmlFor={`kpi-remarks-${row.kpiId}`} className="mb-1">
                            Remarks
                          </CFormLabel>
                          <CFormInput
                            id={`kpi-remarks-${row.kpiId}`}
                            type="text"
                            value={row.remarks}
                            onChange={(event) =>
                              updateRow(row.kpiId, 'remarks', event.target.value)
                            }
                            placeholder="Optional monthly remarks"
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                      <div className="kpi-tracker-batch-editor-actions">
                        <CButton
                          type="button"
                          color="primary"
                          size="sm"
                          onClick={() => saveRow(row)}
                          disabled={isSaving}
                        >
                          {isRowSaving && <CSpinner size="sm" className="me-2" />}
                          Save
                        </CButton>
                        <CButton
                          type="button"
                          color="secondary"
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelRowEdit(row.kpiId)}
                          disabled={isSaving}
                        >
                          Cancel
                        </CButton>
                      </div>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </CForm>
    </>
  )
}

export default KpiTracker

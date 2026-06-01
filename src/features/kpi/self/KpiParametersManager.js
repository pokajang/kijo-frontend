import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CAlert, CBadge, CButton, CForm, CFormInput, CFormLabel, CSpinner } from '@coreui/react'
import { DataTableActionMenu, DataTableLoadingState } from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import { KPI_API_BASE } from '../api/kpiApiBase'
import { clearKpiCaches } from '../api/selfKpiProgressApi'

const currentYear = new Date().getFullYear()
const maxYear = currentYear + 2

const normalizeText = (value) => String(value ?? '').trim()

const getYearOptions = (items) => {
  const dataYears = (items || [])
    .map((item) => Number(item.year))
    .filter((year) => Number.isFinite(year))
  const years = new Set([
    currentYear,
    currentYear - 1,
    currentYear - 2,
    currentYear - 3,
    ...dataYears,
  ])
  return Array.from(years).sort((a, b) => b - a)
}

const mapApiRow = (row) => ({
  clientKey: `kpi-${row.id}`,
  id: row.id,
  parameter_name: row.parameter_name ?? '',
  description: row.description ?? '',
  annual_target: row.annual_target ?? '',
  unit: row.unit ?? '',
  weightage: row.weightage ?? '',
  year: Number(row.year || currentYear),
  isNew: false,
  isEditing: false,
  original: {
    parameter_name: row.parameter_name ?? '',
    description: row.description ?? '',
    annual_target: row.annual_target ?? '',
    unit: row.unit ?? '',
    weightage: row.weightage ?? '',
    year: Number(row.year || currentYear),
  },
})

const KpiParametersManager = () => {
  const [allParams, setAllParams] = useState([])
  const [rows, setRows] = useState([])
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState(null)
  const [alert, setAlert] = useState({ color: '', message: '', visible: false })
  const draftIdRef = useRef(0)

  const makeDraftRow = useCallback(
    (draftYear = year) => {
      draftIdRef.current += 1
      return {
        clientKey: `new-${Date.now()}-${draftIdRef.current}`,
        id: null,
        parameter_name: '',
        description: '',
        annual_target: '',
        unit: '',
        weightage: '',
        year: Number(draftYear || currentYear),
        templateSearch: '',
        isNew: true,
        isEditing: true,
        original: null,
      }
    },
    [year],
  )

  const loadAllParams = useCallback(async () => {
    const response = await fetch(`${KPI_API_BASE}/parameters/mine`, {
      credentials: 'include',
    })
    const result = await response.json()

    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to load KPI parameters')
    }

    setAllParams(result.data || [])
    return result.data || []
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        await loadAllParams()
      } catch (error) {
        setAlert({
          color: 'danger',
          message: error?.message || 'Could not load KPI parameters.',
          visible: true,
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [loadAllParams])

  useEffect(() => {
    const nextRows = (allParams || [])
      .filter((item) => Number(item.year) === Number(year))
      .sort((a, b) => String(a.parameter_name).localeCompare(String(b.parameter_name)))
      .map(mapApiRow)

    setRows(nextRows)
  }, [allParams, year])

  const yearOptions = getYearOptions(allParams)
  const isBusy = busyKey !== null
  const isPastSelectedYear = Number(year) < currentYear
  const pastKpiTemplates = (allParams || [])
    .filter((item) => Number(item.year) < currentYear)
    .sort((a, b) => {
      const yearSort = Number(b.year) - Number(a.year)
      if (yearSort !== 0) return yearSort
      return String(a.parameter_name).localeCompare(String(b.parameter_name))
    })

  const isDirtyRow = (row) => {
    if (row.isNew) {
      return (
        normalizeText(row.parameter_name) !== '' ||
        normalizeText(row.description) !== '' ||
        normalizeText(row.annual_target) !== '' ||
        normalizeText(row.unit) !== '' ||
        normalizeText(row.weightage) !== ''
      )
    }

    return (
      normalizeText(row.parameter_name) !== normalizeText(row.original?.parameter_name) ||
      normalizeText(row.description) !== normalizeText(row.original?.description) ||
      normalizeText(row.annual_target) !== normalizeText(row.original?.annual_target) ||
      normalizeText(row.unit) !== normalizeText(row.original?.unit) ||
      normalizeText(row.weightage) !== normalizeText(row.original?.weightage) ||
      Number(row.year) !== Number(row.original?.year)
    )
  }

  const hasOpenChanges = rows.some((row) => row.isEditing || isDirtyRow(row))

  const selectYear = (nextYear) => {
    if (isBusy || Number(nextYear) === Number(year)) return
    if (hasOpenChanges) {
      setAlert({
        color: 'warning',
        message: 'Save or cancel current KPI changes before switching year.',
        visible: true,
      })
      return
    }

    setYear(Number(nextYear))
  }

  const addDraftRow = () => {
    if (isBusy || isPastSelectedYear) return
    setRows((currentRows) => [makeDraftRow(year), ...currentRows])
  }

  const updateRow = (clientKey, field, value) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.clientKey === clientKey ? { ...row, [field]: value } : row)),
    )
  }

  const setRowEditing = (clientKey, isEditing) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.clientKey === clientKey ? { ...row, isEditing } : row)),
    )
  }

  const getTemplateMatches = (query) => {
    const normalizedQuery = normalizeText(query).toLowerCase()
    if (!normalizedQuery) return pastKpiTemplates.slice(0, 6)

    return pastKpiTemplates
      .filter((template) =>
        [
          template.parameter_name,
          template.description,
          template.unit,
          template.year,
          template.annual_target,
        ]
          .map((value) => normalizeText(value).toLowerCase())
          .some((value) => value.includes(normalizedQuery)),
      )
      .slice(0, 6)
  }

  const applyTemplateToRow = (clientKey, template) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.clientKey === clientKey
          ? {
              ...row,
              parameter_name: template.parameter_name ?? '',
              description: template.description ?? '',
              annual_target: template.annual_target ?? '',
              unit: template.unit ?? '',
              weightage: template.weightage ?? '',
              year: Number(year),
              templateSearch: template.parameter_name ?? '',
            }
          : row,
      ),
    )
  }

  const cancelRow = (row) => {
    if (row.isNew) {
      setRows((currentRows) =>
        currentRows.filter((currentRow) => currentRow.clientKey !== row.clientKey),
      )
      return
    }

    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.clientKey === row.clientKey
          ? {
              ...currentRow,
              parameter_name: currentRow.original.parameter_name,
              description: currentRow.original.description,
              annual_target: currentRow.original.annual_target,
              unit: currentRow.original.unit,
              weightage: currentRow.original.weightage,
              year: currentRow.original.year,
              isEditing: false,
            }
          : currentRow,
      ),
    )
  }

  const validateRow = (row) => {
    const annualTarget = Number(row.annual_target)
    const weightage = Number(row.weightage)
    const rowYear = Number(row.year)

    if (!normalizeText(row.parameter_name)) return 'Parameter name is required.'
    if (!Number.isFinite(annualTarget) || annualTarget <= 0) return 'Annual target must be above 0.'
    if (!normalizeText(row.unit)) return 'Unit is required.'
    if (!Number.isFinite(weightage) || weightage <= 0 || weightage > 100) {
      return 'Weightage must be between 1 and 100.'
    }
    if (!Number.isFinite(rowYear) || rowYear < 2020 || rowYear > maxYear) {
      return `Year must be between 2020 and ${maxYear}.`
    }

    return ''
  }

  const toPayload = (row) => ({
    parameter_name: normalizeText(row.parameter_name),
    description: normalizeText(row.description),
    annual_target: Number(row.annual_target),
    unit: normalizeText(row.unit),
    weightage: Number(row.weightage),
    year: Number(row.year || year),
  })

  const saveRow = async (row) => {
    const validationError = validateRow(row)
    if (validationError) {
      setAlert({ color: 'warning', message: validationError, visible: true })
      return
    }

    if (!row.isNew && !isDirtyRow(row)) {
      setRowEditing(row.clientKey, false)
      return
    }

    try {
      setBusyKey(row.clientKey)
      setAlert({ color: '', message: '', visible: false })

      const payload = toPayload(row)
      const response = await fetch(`${KPI_API_BASE}/parameters`, {
        method: row.isNew ? 'POST' : 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row.isNew ? [payload] : [{ id: row.id, ...payload }]),
      })
      const result = await response.json()

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to save KPI parameter')
      }

      clearKpiCaches()
      await loadAllParams()
      setAlert({
        color: 'success',
        message: row.isNew ? 'KPI parameter created.' : 'KPI parameter updated.',
        visible: true,
      })
    } catch (error) {
      setAlert({
        color: 'danger',
        message: error?.message || 'Server error. Try again later.',
        visible: true,
      })
    } finally {
      setBusyKey(null)
    }
  }

  const deleteRow = async (row) => {
    if (row.isNew) {
      cancelRow(row)
      return
    }

    if (
      !(await dialog.confirm(`Delete KPI "${row.parameter_name}"? This cannot be undone.`, {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    ) {
      return
    }

    try {
      setBusyKey(row.clientKey)
      const response = await fetch(`${KPI_API_BASE}/parameters/${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      })
      const result = await response.json()

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to delete KPI parameter')
      }

      clearKpiCaches()
      await loadAllParams()
      setAlert({ color: 'success', message: 'KPI parameter deleted.', visible: true })
    } catch (error) {
      setAlert({
        color: 'danger',
        message: error?.message || 'Server error. Try again later.',
        visible: true,
      })
    } finally {
      setBusyKey(null)
    }
  }

  const copyRowToCurrentYear = async (row) => {
    const validationError = validateRow({ ...row, year: currentYear })
    if (validationError) {
      setAlert({ color: 'warning', message: validationError, visible: true })
      return
    }

    try {
      setBusyKey(row.clientKey)
      setAlert({ color: '', message: '', visible: false })

      const response = await fetch(`${KPI_API_BASE}/parameters`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ ...toPayload(row), year: currentYear }]),
      })
      const result = await response.json()

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to copy KPI parameter')
      }

      clearKpiCaches()
      setYear(currentYear)
      await loadAllParams()
      setAlert({
        color: 'success',
        message: `Copied "${row.parameter_name}" to ${currentYear}.`,
        visible: true,
      })
    } catch (error) {
      setAlert({
        color: 'danger',
        message: error?.message || 'Server error. Try again later.',
        visible: true,
      })
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="kpi-parameter-manager">
      {alert.visible && (
        <CAlert
          color={alert.color}
          dismissible
          onClose={() => setAlert((current) => ({ ...current, visible: false }))}
        >
          {alert.message}
        </CAlert>
      )}

      <div className="kpi-parameter-toolbar">
        <div className="kpi-parameter-year-panel">
          <CFormLabel className="mb-2">KPI Year</CFormLabel>
          <div
            className="kpi-year-card-group kpi-parameter-year-card-group"
            role="list"
            aria-label="Select KPI year"
          >
            {yearOptions.map((optionYear) => {
              const isActive = Number(optionYear) === Number(year)
              return (
                <button
                  key={optionYear}
                  type="button"
                  className={`kpi-year-card${isActive ? ' is-active' : ''}`}
                  onClick={() => selectYear(optionYear)}
                  disabled={isBusy || loading}
                  aria-pressed={isActive}
                >
                  <span className="kpi-year-card-value">{optionYear}</span>
                  {optionYear === currentYear && (
                    <span className="kpi-year-card-meta">Current</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {!isPastSelectedYear && (
        <div className="kpi-parameter-add-row">
          <CButton color="primary" size="sm" onClick={addDraftRow} disabled={isBusy || loading}>
            Add KPI
          </CButton>
        </div>
      )}

      {loading ? (
        <DataTableLoadingState message="Loading KPI parameters..." />
      ) : rows.length === 0 ? (
        <div className="kpi-empty-state text-center text-muted py-5">
          <h6>No KPI parameters available for {year}</h6>
          {!isPastSelectedYear && (
            <CButton color="primary" size="sm" onClick={addDraftRow} disabled={isBusy}>
              Add KPI for {year}
            </CButton>
          )}
        </div>
      ) : (
        <div className="kpi-parameter-list">
          {rows.map((row) => {
            const isBusyRow = busyKey === row.clientKey
            const isDirty = isDirtyRow(row)
            const isPastRow = Number(row.year) < currentYear
            const templateMatches = row.isNew ? getTemplateMatches(row.templateSearch) : []
            const statusLabel = row.isNew
              ? 'New KPI'
              : isBusyRow
                ? isPastRow
                  ? 'Copying...'
                  : 'Saving...'
                : isDirty
                  ? 'Unsaved changes'
                  : ''
            const rowActions = isPastRow
              ? [
                  {
                    key: 'copy',
                    label: `Copy to ${currentYear}`,
                    onClick: () => copyRowToCurrentYear(row),
                    disabled: isBusy,
                  },
                ]
              : [
                  {
                    key: 'edit',
                    label: 'Edit',
                    onClick: () => setRowEditing(row.clientKey, true),
                    disabled: isBusy,
                    hidden: row.isEditing,
                  },
                  {
                    key: 'delete',
                    label: isBusyRow ? 'Deleting...' : 'Delete',
                    onClick: () => deleteRow(row),
                    disabled: isBusy,
                    danger: true,
                  },
                ]

            return (
              <section
                key={row.clientKey}
                className={`kpi-parameter-row${row.isEditing ? ' is-editing' : ''}${
                  isDirty ? ' is-dirty' : ''
                }`}
              >
                <div className="kpi-parameter-summary">
                  <div className="kpi-parameter-main">
                    <div className="kpi-tracker-batch-title-row">
                      <div className="kpi-tracker-batch-title">
                        {normalizeText(row.parameter_name) || 'Untitled KPI'}
                      </div>
                      {normalizeText(row.weightage) && (
                        <CBadge color="secondary" className="kpi-tracker-batch-weight">
                          Weight {row.weightage}%
                        </CBadge>
                      )}
                    </div>
                    <div className="kpi-tracker-batch-subtitle">
                      <span>
                        Target {normalizeText(row.annual_target) || '-'} {normalizeText(row.unit)}
                      </span>
                      {!!normalizeText(row.description) && (
                        <span className="kpi-tracker-batch-description">{row.description}</span>
                      )}
                    </div>
                  </div>

                  <div className="kpi-parameter-status">{statusLabel}</div>

                  <div className="kpi-parameter-actions">
                    <DataTableActionMenu
                      record={row}
                      actions={rowActions}
                      actionKey={row.clientKey}
                      ariaLabel={`Actions for ${row.parameter_name || 'KPI parameter'}`}
                    />
                  </div>
                </div>

                {row.isEditing && (
                  <CForm
                    className="kpi-parameter-editor"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <div className="kpi-parameter-fields">
                      <div className="kpi-parameter-name-field">
                        <CFormLabel className="mb-1">Parameter Name</CFormLabel>
                        <CFormInput
                          value={row.parameter_name}
                          onChange={(event) =>
                            updateRow(row.clientKey, 'parameter_name', event.target.value)
                          }
                          disabled={isBusy}
                          required
                        />
                      </div>
                      <div>
                        <CFormLabel className="mb-1">Description</CFormLabel>
                        <CFormInput
                          value={row.description}
                          onChange={(event) =>
                            updateRow(row.clientKey, 'description', event.target.value)
                          }
                          disabled={isBusy}
                        />
                      </div>
                      <div>
                        <CFormLabel className="mb-1">Annual Target</CFormLabel>
                        <CFormInput
                          type="number"
                          value={row.annual_target}
                          onChange={(event) =>
                            updateRow(row.clientKey, 'annual_target', event.target.value)
                          }
                          disabled={isBusy}
                          required
                        />
                      </div>
                      <div>
                        <CFormLabel className="mb-1">Unit</CFormLabel>
                        <CFormInput
                          value={row.unit}
                          onChange={(event) => updateRow(row.clientKey, 'unit', event.target.value)}
                          disabled={isBusy}
                          required
                        />
                      </div>
                      <div>
                        <CFormLabel className="mb-1">Weightage (%)</CFormLabel>
                        <CFormInput
                          type="number"
                          value={row.weightage}
                          onChange={(event) =>
                            updateRow(row.clientKey, 'weightage', event.target.value)
                          }
                          disabled={isBusy}
                          required
                        />
                      </div>
                    </div>

                    {row.isNew && pastKpiTemplates.length > 0 && (
                      <div className="kpi-parameter-template-search">
                        <CFormLabel className="mb-1">Search past KPI</CFormLabel>
                        <CFormInput
                          value={row.templateSearch || ''}
                          onChange={(event) =>
                            updateRow(row.clientKey, 'templateSearch', event.target.value)
                          }
                          placeholder="Search name, description, unit, target, or year"
                          disabled={isBusy}
                        />
                        <div className="kpi-parameter-template-results">
                          {templateMatches.map((template) => (
                            <button
                              key={`${template.id}-${template.year}`}
                              type="button"
                              className="kpi-parameter-template-option"
                              onClick={() => applyTemplateToRow(row.clientKey, template)}
                              disabled={isBusy}
                            >
                              <span className="kpi-parameter-template-name">
                                {template.parameter_name}
                              </span>
                              <CBadge color="secondary" className="kpi-parameter-template-year">
                                {template.year}
                              </CBadge>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="kpi-parameter-editor-actions">
                      <CButton
                        type="button"
                        color="primary"
                        size="sm"
                        onClick={() => saveRow(row)}
                        disabled={isBusy}
                      >
                        {isBusyRow && <CSpinner size="sm" className="me-2" />}
                        Save
                      </CButton>
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={() => cancelRow(row)}
                        disabled={isBusy}
                      >
                        Cancel
                      </CButton>
                    </div>
                  </CForm>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default KpiParametersManager

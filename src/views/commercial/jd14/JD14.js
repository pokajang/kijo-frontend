// src/views/commercial/jd14/JD14.js

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CRow, CCol, CCard, CCardBody, CFormLabel, CFormSelect } from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableStatsToggle,
} from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { commercialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../../components/filters'
import JD14Table from './JD14Table'
import CommercialProjectPickerModal from '../shared/CommercialProjectPickerModal'

const parseLocalDate = (value) => {
  if (!value) return null

  const raw = String(value).trim()
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw
  const parts = ymd.split('-')
  if (parts.length !== 3) return null

  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!year || !month || !day) return null

  const dateObj = new Date(year, month - 1, day)
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return null
  }

  return dateObj
}

const getFormStatus = (form) => {
  const started = parseLocalDate(form?.commenced_date)
  const ended = parseLocalDate(form?.end_date)

  if (!started && !ended) return 'Unknown'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (started && today < started) return 'Upcoming'
  if (ended && today > ended) return 'Completed'
  return 'Ongoing'
}

const JD14 = () => {
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [projectPickerVisible, setProjectPickerVisible] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [personInChargeFilter, setPersonInChargeFilter] = useState('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('commercial.jd14')

  const personInChargeOptions = useMemo(() => {
    const options = new Set()
    forms.forEach((form) => {
      const code = String(form?.created_by_code || '').trim()
      const name = String(form?.created_by_name || '').trim()
      const id = form?.created_by != null ? String(form.created_by).trim() : ''
      const v = code || name || id
      if (v) options.add(v)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [forms])

  const serviceTypeOptions = useMemo(() => {
    const options = new Set()
    forms.forEach((form) => {
      const title = String(form?.course_title || form?.course_name || '').trim()
      if (title) options.add(title)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [forms])

  const statusOptions = useMemo(() => {
    const options = new Set()
    forms.forEach((form) => {
      const status = getFormStatus(form)
      if (status) options.add(status)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [forms])

  const resetFilters = () => {
    setSearchTerm('')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setPersonInChargeFilter('all')
    setServiceTypeFilter('all')
    setStatusFilter('all')
    setShowAdvancedFilters(false)
  }
  const activeFilterCount = [
    personInChargeFilter !== 'all',
    serviceTypeFilter !== 'all',
    statusFilter !== 'all',
  ].filter(Boolean).length
  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
    personInChargeFilter !== 'all' ? { key: 'pic', label: `PIC: ${personInChargeFilter}` } : null,
    serviceTypeFilter !== 'all'
      ? { key: 'training', label: `Training: ${serviceTypeFilter}` }
      : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
  ].filter(Boolean)
  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'pic') setPersonInChargeFilter('all')
    if (key === 'training') setServiceTypeFilter('all')
    if (key === 'status') setStatusFilter('all')
  }

  const applyStatFilter = (_key, value) => {
    setStatusFilter(value)
    setShowAdvancedFilters(true)
  }

  const openJD14CreateForProject = (project) => {
    const projectId = project?.id ?? project?.project_id
    if (!projectId) return

    setProjectPickerVisible(false)
    navigate(`/commercial/jd14/create/${projectId}?from=jd14-list`, {
      state: { project },
    })
  }

  const fetchForms = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}jd14-forms`, {
        credentials: 'include',
      })
      const result = await res.json()
      if (result.status === 'success') {
        setForms(result.forms || [])
      } else {
        console.error('Fetch failed:', result.message)
      }
    } catch (err) {
      console.error('Error fetching JD14 forms:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const filteredForms = forms.filter((form) => {
    const started = parseLocalDate(form?.commenced_date)

    if (!started || !isDateInPeriodRange(form?.commenced_date, periodRange)) return false

    if (personInChargeFilter !== 'all') {
      const code = String(form?.created_by_code || '').toLowerCase()
      const name = String(form?.created_by_name || '').toLowerCase()
      const id = form?.created_by != null ? String(form.created_by).toLowerCase() : ''
      const chosen = String(personInChargeFilter).toLowerCase()
      if (chosen !== code && chosen !== name && chosen !== id) return false
    }

    if (serviceTypeFilter !== 'all') {
      const chosenType = String(serviceTypeFilter).toLowerCase()
      const type = String(form?.course_title || form?.course_name || '').toLowerCase()
      if (chosenType !== type) return false
    }

    if (statusFilter !== 'all') {
      const status = getFormStatus(form).toLowerCase()
      if (status !== String(statusFilter).toLowerCase()) return false
    }

    const term = searchTerm.trim().toLowerCase()
    const personInCharge = String(
      form?.created_by_code || form?.created_by_name || '',
    ).toLowerCase()

    return (
      String(form?.approval_no || '')
        .toLowerCase()
        .includes(term) ||
      String(form?.employer_name || '')
        .toLowerCase()
        .includes(term) ||
      String(form?.course_title || form?.course_name || '')
        .toLowerCase()
        .includes(term) ||
      String(form?.training_venue || '')
        .toLowerCase()
        .includes(term) ||
      personInCharge.includes(term)
    )
  })
  const statsScopeLabel = periodRange ? getPeriodRangeScopeLabel(periodRange) : ''

  return (
    <CRow>
      <CCol xs={12}>
        <ModuleNavStrip tabs={commercialModuleTabs} ariaLabel="Commercial sections" />
      </CCol>
      <CCol xs={12}>
        <CCard className="mb-4">
          <DataTableCardHeader title="JD14 Forms" scopeLabel={statsScopeLabel}>
            <DataTableStatsToggle
              visible={statsVisible}
              onToggle={toggleStatsVisible}
              controlsVisible={controlsVisible}
              onControlsToggle={toggleControlsVisible}
            />
            <CButton color="primary" size="sm" onClick={() => setProjectPickerVisible(true)}>
              Create JD14
            </CButton>
          </DataTableCardHeader>
          <CCardBody>
            <JD14Table
              forms={filteredForms}
              loading={loading}
              statsVisible={statsVisible}
              beforeList={
                <DataTableRecordControls
                  visible={controlsVisible}
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Type to search..."
                  showAdvancedFilters={showAdvancedFilters}
                  setShowAdvancedFilters={setShowAdvancedFilters}
                  activeFilterCount={activeFilterCount}
                  activeChips={activeChips}
                  clearChip={clearChip}
                  resetFilters={resetFilters}
                  desktopToolsId="jd14-table-tools"
                  mobileToolsId="jd14-mobile-table-tools"
                  loading={loading}
                >
                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Person In Charge</CFormLabel>
                    <CFormSelect
                      value={personInChargeFilter}
                      onChange={(e) => setPersonInChargeFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {personInChargeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Training Title</CFormLabel>
                    <CFormSelect
                      value={serviceTypeFilter}
                      onChange={(e) => setServiceTypeFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {serviceTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Status</CFormLabel>
                    <CFormSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </DataTableRecordControls>
              }
              desktopUtilityPortalId="jd14-table-tools"
              mobileUtilityPortalId="jd14-mobile-table-tools"
              onRefresh={() => fetchForms({ showLoader: false })}
              onStatFilter={applyStatFilter}
              renderQuickFilters={() => (
                <PeriodRangeSelector
                  value={periodRange}
                  onChange={setPeriodRange}
                  className="d-none d-lg-block"
                />
              )}
            />
          </CCardBody>
        </CCard>
      </CCol>
      <CommercialProjectPickerModal
        visible={projectPickerVisible}
        onClose={() => setProjectPickerVisible(false)}
        onContinue={openJD14CreateForProject}
        title="Create JD14"
        searchInputId="jd14ProjectSearch"
        selectLabel="Select Training Project"
        creationLabel="JD14"
        projectScopeLabel="active training projects"
        allowedProjectTypes={['Training']}
      />
    </CRow>
  )
}

export default JD14

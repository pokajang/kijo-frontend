// src/views/commercial/vendor/VendorLoa.jsx

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CRow, CCol, CCard, CCardBody, CFormLabel, CFormSelect } from '@coreui/react'
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
import { fetchAllPagedRecords, fetchJson } from '../../../utils/detailPages'
import VendorLoaTable from './VendorLoaTable'
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

const VendorLoa = () => {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [staffRoles, setStaffRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [projectPickerVisible, setProjectPickerVisible] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [picFilter, setPicFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('commercial.vendor-loa')

  const statusOptions = useMemo(() => {
    const statuses = new Set()
    records.forEach((record) => {
      const status = String(record?.status || '').trim()
      if (!status) return
      statuses.add(status)
    })
    return Array.from(statuses).sort((a, b) => a.localeCompare(b))
  }, [records])

  const resetFilters = () => {
    setSearchTerm('')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setPicFilter('all')
    setStatusFilter('all')
    setShowAdvancedFilters(false)
  }
  const activeFilterCount = [picFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length
  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
    picFilter !== 'all' ? { key: 'pic', label: `PIC: ${picFilter}` } : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
  ].filter(Boolean)
  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'pic') setPicFilter('all')
    if (key === 'status') setStatusFilter('all')
  }

  const applyStatFilter = (_key, value) => {
    setPicFilter(value)
    setShowAdvancedFilters(true)
  }

  const openVendorLoaCreateForProject = (project) => {
    const projectId = project?.id ?? project?.project_id
    if (!projectId) return

    setProjectPickerVisible(false)
    navigate(`/commercial/vendor-loa/create/${projectId}?from=vendor-loa-list`, {
      state: { project },
    })
  }

  const picOptions = useMemo(() => {
    const picSet = new Set()
    records.forEach((record) => {
      const code = String(record?.award_by || '').trim()
      if (code) {
        picSet.add(code)
      }
    })
    return Array.from(picSet).sort((a, b) => a.localeCompare(b))
  }, [records])

  const fetchVendorLoaRecords = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true)
    try {
      const dataUrl = `${import.meta.env.VITE_API_BASE}vendor-loas`
      const result = await fetchJson(`${dataUrl}?per_page=1`, {
        credentials: 'include',
      })
      const rows = await fetchAllPagedRecords({
        url: dataUrl,
        dataKeys: ['data', 'records'],
        perPage: 100,
      })

      if (result?.status === 'success' || result?.success === true || rows.length > 0) {
        const roles = Array.isArray(result?.staff?.roles)
          ? result.staff.roles
          : Array.isArray(result?.roles)
            ? result.roles
            : []
        setStaffRoles(roles)
        const mapped = rows.map((item) => {
          let statusText = 'No Request'
          if (item.payment_requested_on) {
            if (item.status === 'Pending') {
              statusText = 'Payment Requested'
            } else if (item.status === 'Approved') {
              statusText = 'System Level Approved, Pending Bank Transfer'
            } else {
              statusText = item.status || 'Unknown'
            }
          }
          return {
            ...item,
            status: statusText,
            payment_status_raw: item.status || null,
          }
        })
        setRecords(mapped)
      } else {
        setStaffRoles([])
        console.error('Fetch failed:', result.message)
      }
    } catch (err) {
      setStaffRoles([])
      console.error('Error fetching Vendor LOA data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVendorLoaRecords()
  }, [fetchVendorLoaRecords])

  const filteredRecords = records.filter((rec) => {
    const awardDate = parseLocalDate(rec.award_date)
    if (!awardDate || !isDateInPeriodRange(rec.award_date, periodRange)) return false

    if (picFilter !== 'all') {
      if (String(rec.award_by || '').toLowerCase() !== String(picFilter).toLowerCase()) return false
    }

    if (statusFilter !== 'all') {
      if (String(rec.status || '').toLowerCase() !== String(statusFilter).toLowerCase())
        return false
    }

    const term = searchTerm.trim().toLowerCase()
    return (
      rec.loa_ref_no?.toLowerCase().includes(term) ||
      rec.vendor_name?.toLowerCase().includes(term) ||
      rec.project_name?.toLowerCase().includes(term) ||
      rec.services_description?.toLowerCase().includes(term) ||
      rec.award_by?.toLowerCase().includes(term)
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
          <DataTableCardHeader title="Vendor LOA Records" scopeLabel={statsScopeLabel}>
            <DataTableStatsToggle
              visible={statsVisible}
              onToggle={toggleStatsVisible}
              controlsVisible={controlsVisible}
              onControlsToggle={toggleControlsVisible}
            />
            <CButton color="primary" size="sm" onClick={() => setProjectPickerVisible(true)}>
              Create Vendor LOA
            </CButton>
          </DataTableCardHeader>
          <CCardBody>
            <VendorLoaTable
              records={filteredRecords}
              loading={loading}
              statsVisible={statsVisible}
              staffRoles={staffRoles}
              onRefresh={fetchVendorLoaRecords}
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
                  desktopToolsId="vendor-loa-table-tools"
                  mobileToolsId="vendor-loa-mobile-table-tools"
                  loading={loading}
                >
                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Person In Charge</CFormLabel>
                    <CFormSelect value={picFilter} onChange={(e) => setPicFilter(e.target.value)}>
                      <option value="all">All</option>
                      {picOptions.map((code) => (
                        <option key={code} value={code}>
                          {code}
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
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </DataTableRecordControls>
              }
              desktopUtilityPortalId="vendor-loa-table-tools"
              mobileUtilityPortalId="vendor-loa-mobile-table-tools"
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
        onContinue={openVendorLoaCreateForProject}
        title="Create Vendor LOA"
        searchInputId="vendorLoaProjectSearch"
        creationLabel="vendor LOA"
      />
    </CRow>
  )
}

export default VendorLoa

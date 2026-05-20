import React, { useEffect, useMemo, useState } from 'react'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CBadge,
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import SearchControls from './SearchControls'
import FactoryTable from './FactoryTable'
import RegisterModal from './RegisterModal'
import { actionHandlers } from './actionHandlers'
import { getAdvancedFilterCount } from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { pipelineCrmModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  isDateInPeriodRange,
} from '../../../components/filters'

const DEFAULT_STATE_FILTER = ''
const DEFAULT_LIMIT = 10
const DEFAULT_PERIOD_RANGE = getPeriodRangePreset('all')

const getFactoryScopeDate = (record) =>
  record?.created_at || record?.createdAt || record?.updated_at || record?.updatedAt || ''

export default function CallList() {
  //  State Management
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [stateFilter, setStateFilter] = useState(DEFAULT_STATE_FILTER)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [periodRange, setPeriodRange] = useState(() => DEFAULT_PERIOD_RANGE)
  const [details, setDetails] = useState({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [registerNotice, setRegisterNotice] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    address: '',
    place_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [info, setInfo] = useState('')
  const [generating, setGenerating] = useState(false)

  //  Client-Side Filtering
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const tokens = term.split(/\s+/).filter(Boolean) // split search into words
    const stateTerm = (stateFilter || '').toLowerCase()

    return rows.filter((r) => {
      if (!isDateInPeriodRange(getFactoryScopeDate(r), periodRange)) return false

      const name = (r.name || '').toLowerCase()
      const addr = (r.address || r.address_full || '').toLowerCase()

      // Match any search token (OR)
      const matchTerm =
        tokens.length === 0 || tokens.some((t) => name.includes(t) || addr.includes(t))

      const matchState = !stateTerm || addr.includes(stateTerm)
      return matchTerm && matchState
    })
  }, [rows, q, stateFilter, periodRange])

  //  Action Handlers
  const { loadGrid, handleGenerate, handleFetchPhone, handleOpenRegister, handleSaveRegister } =
    useMemo(
      () =>
        actionHandlers({
          setRows,
          setLoading,
          setError,
          setInfo,
          setDetails,
          setGenerating,
          setSaving,
          setShowRegister,
          setRegisterForm,
          setRegisterNotice,
          setRegisterError,
          q,
          stateFilter,
          limit,
          details,
          setQ,
          setStateFilter,
          defaultStateFilter: DEFAULT_STATE_FILTER,
        }),
      [details, limit, q, stateFilter],
    )

  //  Load Initial Data
  useEffect(() => {
    loadGrid()
  }, [loadGrid])

  const activeChips = [
    q.trim() ? { key: 'search', label: `Search: ${q.trim()}` } : null,
    stateFilter !== DEFAULT_STATE_FILTER
      ? { key: 'state', label: `Region: ${stateFilter || 'Malaysia (All)'}` }
      : null,
    Number(limit) !== DEFAULT_LIMIT ? { key: 'limit', label: `Count: ${limit}` } : null,
    periodRange && periodRange.preset !== DEFAULT_PERIOD_RANGE.preset
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
  ].filter(Boolean)

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const resetFilters = () => {
    setQ('')
    setStateFilter(DEFAULT_STATE_FILTER)
    setLimit(DEFAULT_LIMIT)
    setPeriodRange(DEFAULT_PERIOD_RANGE)
  }

  const clearChip = (key) => {
    if (key === 'search') setQ('')
    if (key === 'state') setStateFilter(DEFAULT_STATE_FILTER)
    if (key === 'limit') setLimit(DEFAULT_LIMIT)
    if (key === 'period') setPeriodRange(DEFAULT_PERIOD_RANGE)
  }

  //  Render
  return (
    <CRow>
      <CCol xs={12}>
        <ModuleNavStrip tabs={pipelineCrmModuleTabs} ariaLabel="Pipeline CRM sections" />
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong>
              <span className="d-inline d-md-none">Factory Directory</span>
              <span className="d-none d-md-inline">Factory Directory (Google On-Demand)</span>
            </strong>
            <div className="d-flex align-items-center gap-2 ms-auto">
              <CBadge className="records-status-badge factory-directory-source-badge d-none d-md-inline-flex">
                Powered by Google
              </CBadge>
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => setShowAbout(true)}
              >
                About
              </CButton>
              <CButton color="primary" size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </CButton>
            </div>
          </CCardHeader>

          <CCardBody>
            {/* Alerts */}
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')} className="mb-3">
                {error}
              </CAlert>
            )}
            {info && (
              <CAlert color="info" dismissible onClose={() => setInfo('')} className="mb-3">
                {info}
              </CAlert>
            )}

            {/* Search Controls */}
            <SearchControls
              q={q}
              setQ={setQ}
              stateFilter={stateFilter}
              setStateFilter={setStateFilter}
              limit={limit}
              setLimit={setLimit}
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              activeFilterCount={activeFilterCount}
              activeChips={activeChips}
              clearChip={clearChip}
              resetFilters={resetFilters}
              loading={loading}
              desktopToolsId="factory-find-table-tools"
              mobileToolsId="factory-find-mobile-table-tools"
            />

            {/* Factory Table */}
            <FactoryTable
              filtered={filtered}
              details={details}
              loading={loading}
              onFetchPhone={handleFetchPhone}
              onOpenRegister={handleOpenRegister}
              desktopUtilityPortalId="factory-find-table-tools"
              mobileUtilityPortalId="factory-find-mobile-table-tools"
              renderQuickFilters={() => (
                <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
              )}
            />
          </CCardBody>
        </CCard>
      </CCol>

      {/* Register Modal */}
      <CModal visible={showAbout} onClose={() => setShowAbout(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>About Factory Directory</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>Phones are fetched live via Google Place Details and are not stored automatically.</p>
          <p>
            Use "Register This Contact" to save user-provided contacts to your potential leads list.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setShowAbout(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      <RegisterModal
        showRegister={showRegister}
        setShowRegister={setShowRegister}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        registerNotice={registerNotice}
        registerError={registerError}
        saving={saving}
        onSave={() => handleSaveRegister(registerForm)}
      />
    </CRow>
  )
}

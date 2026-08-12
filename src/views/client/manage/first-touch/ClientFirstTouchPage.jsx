import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CCard, CCardBody, CCol, CFormLabel, CFormSelect, CRow } from '@coreui/react'
import { cilCheckCircle, cilImage, cilWarning } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableStatsToggle,
  getAdvancedFilterCount,
} from '../../../../components/datatable'
import { StatsStrip } from '../../../../components/stats'
import { useDataTableStatsVisibility } from '../../../../hooks/datatable'
import ClientModuleNavStrip from '../components/ClientModuleNavStrip'
import ClientFirstTouchTable from './components/ClientFirstTouchTable'
import FirstTouchClaimModal from './components/FirstTouchClaimModal'
import { getClientFirstTouchRowActions } from './clientFirstTouchActionPolicy'
import {
  listClientFirstTouches,
  listFirstTouchInquiryOptions,
  listFirstTouchStaffOptions,
  submitClientFirstTouchClaim,
  submitClientFirstTouchDispute,
  updateClientFirstTouchClaim,
} from './clientFirstTouchApi'
import { hasOpenFirstTouchConflict } from './clientFirstTouchState'
import {
  filterFirstTouchRecords,
  getFirstTouchStatus,
  hasFirstTouchEvidence,
} from './clientFirstTouchUtils'

const statusLabels = {
  current: 'First touch recorded',
  contested: 'Awaiting independent review',
  unresolved: 'No current first touch',
  missing: 'Needs first-touch evidence',
}

const ClientFirstTouchPage = () => {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [staffOptions, setStaffOptions] = useState([])
  const [inquiryOptions, setInquiryOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sourceGroup, setSourceGroup] = useState('')
  const [evidence, setEvidence] = useState('')
  const [claimAction, setClaimAction] = useState(null)
  const [message, setMessage] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('client.first-touch')

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setPermissionDenied(false)
    try {
      const [nextRecords, nextStaffOptions] = await Promise.all([
        listClientFirstTouches(),
        listFirstTouchStaffOptions(),
      ])
      setRecords(nextRecords)
      setStaffOptions(nextStaffOptions)
    } catch (error) {
      if (error?.status === 403) setPermissionDenied(true)
      else setLoadError(error?.message || 'Unable to load client first-touch records.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const sourceGroups = useMemo(
    () =>
      Array.from(
        new Set(records.map((record) => record.firstTouch?.sourceGroup).filter(Boolean)),
      ).sort(),
    [records],
  )

  const filteredRecords = useMemo(
    () => filterFirstTouchRecords(records, { search, status, sourceGroup, evidence }),
    [evidence, records, search, sourceGroup, status],
  )

  const applyStatFilter = useCallback((nextStatus = '', nextEvidence = '') => {
    setSearch('')
    setSourceGroup('')
    setStatus(nextStatus)
    setEvidence(nextEvidence)
  }, [])

  const stats = useMemo(() => {
    const current = records.filter((record) => getFirstTouchStatus(record) === 'current').length
    const contested = records.filter(hasOpenFirstTouchConflict).length
    const withEvidence = records.filter(hasFirstTouchEvidence).length
    const withoutEvidence = records.length - withEvidence

    return [
      {
        key: 'clients',
        label: 'Clients',
        value: String(records.length),
        tone: 'primary',
        size: 'sm',
        onClick: () => applyStatFilter(),
        actionTooltip: 'Show all clients',
      },
      {
        key: 'current',
        label: 'Recorded First Touches',
        value: String(current),
        tone: 'success',
        size: 'sm',
        icon: cilCheckCircle,
        onClick: () => applyStatFilter('current'),
        actionTooltip: 'Show clients with a recorded first touch',
      },
      {
        key: 'contested',
        label: 'Awaiting Review',
        value: String(contested),
        tone: 'warning',
        size: 'sm',
        icon: cilWarning,
        onClick: () => applyStatFilter('contested'),
        actionTooltip: 'Show clients awaiting independent review',
      },
      {
        key: 'coverage',
        label: 'Evidence Coverage',
        value: `${withEvidence} / ${records.length}`,
        sublabel: `${withoutEvidence} need evidence`,
        tone: 'info',
        size: 'lg',
        icon: cilImage,
        onClick: () => applyStatFilter('', 'missing'),
        actionTooltip: 'Show clients that still need first-touch evidence',
      },
    ]
  }, [applyStatFilter, records])

  const activeChips = [
    search.trim() ? { key: 'search', label: `Search: ${search.trim()}` } : null,
    status ? { key: 'status', label: `Status: ${statusLabels[status] || status}` } : null,
    sourceGroup ? { key: 'source', label: `Source: ${sourceGroup}` } : null,
    evidence
      ? {
          key: 'evidence',
          label: `Evidence: ${evidence === 'missing' ? 'Not documented' : 'Attached'}`,
        }
      : null,
  ].filter(Boolean)

  const clearChip = (key) => {
    if (key === 'search') setSearch('')
    if (key === 'status') setStatus('')
    if (key === 'source') setSourceGroup('')
    if (key === 'evidence') setEvidence('')
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setSourceGroup('')
    setEvidence('')
  }

  const updateRecord = (targetRecord, nextRecord, successMessage) => {
    setRecords((current) =>
      current.map((record) => (record.companyId === targetRecord.companyId ? nextRecord : record)),
    )
    setMessage(successMessage)
  }

  const submitEvidenceAction = async (payload) => {
    if (claimAction.mode === 'dispute') {
      const nextRecord = await submitClientFirstTouchDispute(claimAction.record.companyId, payload)
      updateRecord(
        claimAction.record,
        nextRecord,
        'Dispute submitted separately. The current claim remains visible while independent review is pending.',
      )
      setClaimAction(null)
      return
    }

    const nextRecord =
      claimAction.mode === 'edit'
        ? await updateClientFirstTouchClaim(
            claimAction.record.companyId,
            claimAction.record.firstTouch.id,
            payload,
          )
        : await submitClientFirstTouchClaim(claimAction.record.companyId, payload)
    updateRecord(
      claimAction.record,
      nextRecord,
      claimAction.mode === 'edit'
        ? 'Current first-touch evidence updated. The previous version remains in its audit history.'
        : claimAction.record.firstTouch
          ? 'Competing evidence submitted. The client is now contested and awaits independent review.'
          : 'First touch recorded as the current claim. No routine approval is required.',
    )
    setClaimAction(null)
  }

  const openClaim = (record, mode) => {
    setClaimAction({ record, mode })
    setInquiryOptions([])
    listFirstTouchInquiryOptions(record.companyId)
      .then(setInquiryOptions)
      .catch(() => setInquiryOptions([]))
  }

  const getRowActions = (record) =>
    getClientFirstTouchRowActions(record, {
      onSubmit: openClaim,
      onDispute: (targetRecord) => openClaim(targetRecord, 'dispute'),
      onReviewConflict: (targetRecord) =>
        navigate(
          `/client/first-touch/${targetRecord.companyId}?reviewConflict=${targetRecord.conflict.id}`,
        ),
    })

  return (
    <>
      <ClientModuleNavStrip hideOnNestedRoute={false} />
      {message ? (
        <CAlert color="success" dismissible onClose={() => setMessage('')}>
          {message}
        </CAlert>
      ) : null}

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 first-touch-list-card">
            <DataTableCardHeader title="First Touch" scopeLabel="All time">
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
            </DataTableCardHeader>
            <CCardBody>
              {statsVisible ? (
                <StatsStrip items={stats} layout="balanced" className="client-first-touch-stats" />
              ) : null}

              <DataTableRecordControls
                visible={controlsVisible}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search client, source, or contact"
                searchAriaLabel="Search client first touch"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={getAdvancedFilterCount(activeChips)}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="client-first-touch-table-tools"
                mobileToolsId="client-first-touch-mobile-table-tools"
              >
                <CCol xs={12} md={4} lg={3}>
                  <CFormLabel htmlFor="first-touch-status-filter">Status</CFormLabel>
                  <CFormSelect
                    id="first-touch-status-filter"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="">All</option>
                    <option value="current">First touch recorded</option>
                    <option value="contested">Awaiting independent review</option>
                    <option value="unresolved">No current first touch</option>
                    <option value="missing">Needs first-touch evidence</option>
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={4} lg={3}>
                  <CFormLabel htmlFor="first-touch-source-filter">Source Group</CFormLabel>
                  <CFormSelect
                    id="first-touch-source-filter"
                    value={sourceGroup}
                    onChange={(event) => setSourceGroup(event.target.value)}
                  >
                    <option value="">All</option>
                    {sourceGroups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </DataTableRecordControls>

              <ClientFirstTouchTable
                records={filteredRecords}
                totalRecords={records.length}
                hasActiveFilters={Boolean(activeChips.length)}
                loading={loading}
                error={loadError}
                permissionDenied={permissionDenied}
                onRetry={loadRecords}
                onOpen={(record) => navigate(`/client/first-touch/${record.companyId}`)}
                onSubmit={(record) => openClaim(record, 'create')}
                getRowActions={getRowActions}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <FirstTouchClaimModal
        visible={Boolean(claimAction)}
        companyName={claimAction?.record.companyName || ''}
        companyId={claimAction?.record.companyId}
        existingFirstTouch={claimAction?.record.firstTouch}
        mode={claimAction?.mode}
        conflictOpen={hasOpenFirstTouchConflict(claimAction?.record)}
        staffOptions={staffOptions}
        inquiryOptions={inquiryOptions}
        onClose={() => setClaimAction(null)}
        onSubmit={submitEvidenceAction}
      />
    </>
  )
}

export default ClientFirstTouchPage

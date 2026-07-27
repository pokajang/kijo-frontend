import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CBadge, CButton, CCol, CFormLabel, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'
import {
  DataTableFilterPanel,
  DataTableRecordList,
  DataTableToolbar,
  getAdvancedFilterCount,
} from '../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../../components/filters'
import { useDebouncedSearch } from '../../../hooks/datatable'
import { recordsTruncateStyle } from '../../../utils/datatable/tableFormatters'
import { hasAnyAllowedRole } from '../../../utils/roles'
import { getHandbookSignatures } from '../api/handbookApi'
import HandbookAcknowledgementEvidenceDrawer from './HandbookAcknowledgementEvidenceDrawer'
import {
  acknowledgementColumnPreferenceApiKey,
  acknowledgementColumnStorageKey,
  acknowledgementDataColumns,
  declarationColumnKeys,
  defaultAcknowledgementVisibleColumns,
  emptyAcknowledgementValue,
  formatAcknowledgementSignedAt,
  formatAcknowledgementUserAgent,
  formatDeclarationState,
  requiredAcknowledgementColumns,
} from '../utils/handbookAcknowledgementRecordsConfig'

const desktopUtilityPortalId = 'handbook-acknowledgement-records-utilities'
const mobileUtilityPortalId = 'handbook-acknowledgement-records-mobile-utilities'
const restrictedAuditColumnKeys = new Set(['ipAddress', 'userAgent', 'evidenceScheme'])

const HandbookAcknowledgementRecords = ({ refreshKey = 0 }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canViewEvidence = hasAnyAllowedRole(user?.roles, ['HR', 'System Admin'])
  const availableDataColumns = useMemo(
    () =>
      canViewEvidence
        ? acknowledgementDataColumns
        : acknowledgementDataColumns.filter((column) => !restrictedAuditColumnKeys.has(column.key)),
    [canViewEvidence],
  )
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState([])
  const [error, setError] = useState(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null)
  const { searchInput, setSearchInput, searchTerm, setSearchTerm } = useDebouncedSearch()

  useEffect(() => {
    const controller = new AbortController()

    const loadRecords = async () => {
      setLoading(true)
      setError(null)

      try {
        const json = await getHandbookSignatures({ signal: controller.signal })

        if (json.success) {
          setRecords(Array.isArray(json.data) ? json.data : [])
        } else {
          setRecords([])
          setError(json.message)
        }
      } catch (err) {
        if (err.name === 'AbortError') return

        setRecords([])
        setError('Network error')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadRecords()

    return () => controller.abort()
  }, [refreshKey])

  const normalizedRecords = useMemo(
    () =>
      records.map((record) => {
        const isEvidence = record.evidence_status === 'complete'
        const accepted = Number(record.declarations_accepted || 0)
        const required = Number(record.declarations_required || 0)

        return {
          ...record,
          version: record.version_label || emptyAcknowledgementValue,
          fullName: record.full_name || emptyAcknowledgementValue,
          employeeCode: record.employee_code || emptyAcknowledgementValue,
          declarationsStatus: isEvidence
            ? `${accepted}/${required} accepted`
            : 'Legacy - not captured',
          signatureStatus: isEvidence ? 'Electronically signed' : 'Legacy acknowledgement',
          signedAt: record.signed_at || '',
          signedAtDisplay: formatAcknowledgementSignedAt(record.signed_at),
          handbookReceipt: formatDeclarationState(record, declarationColumnKeys.handbookReceipt),
          salaryDeduction: formatDeclarationState(record, declarationColumnKeys.salaryDeduction),
          confidentialityAi: formatDeclarationState(
            record,
            declarationColumnKeys.confidentialityAi,
          ),
          electronicSignatureValidation: formatDeclarationState(
            record,
            declarationColumnKeys.electronicSignatureValidation,
          ),
          ipAddress: record.ip_address || emptyAcknowledgementValue,
          userAgentShort: formatAcknowledgementUserAgent(record.user_agent),
          userAgentFull: record.user_agent || emptyAcknowledgementValue,
          evidenceScheme: isEvidence ? `v${record.evidence_schema_version}` : 'Legacy',
        }
      }),
    [records],
  )

  const filteredRecords = useMemo(() => {
    const needle = searchTerm.toLowerCase()
    const periodRows = normalizedRecords.filter((record) =>
      isDateInPeriodRange(record.signedAt, periodRange),
    )
    if (!needle) return periodRows

    return periodRows.filter((record) =>
      [
        record.version,
        record.fullName,
        record.employeeCode,
        record.declarationsStatus,
        record.signatureStatus,
        record.signedAtDisplay,
        record.ipAddress,
        record.userAgentShort,
        record.userAgentFull,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [normalizedRecords, periodRange, searchTerm])

  const activeChips = [
    searchTerm ? { key: 'search', label: `Search: ${searchTerm}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
  ].filter(Boolean)

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const clearChip = (key) => {
    if (key === 'search') {
      setSearchInput('')
      setSearchTerm('')
    }
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const renderCell = (record, column) => {
    if (column.key === 'signedAt') return record.signedAtDisplay
    if (column.key === 'declarationsStatus') {
      return (
        <CBadge color={record.evidence_status === 'complete' ? 'success' : 'secondary'}>
          {record.declarationsStatus}
        </CBadge>
      )
    }
    if (column.key === 'signatureStatus') {
      return (
        <div>
          <CBadge color={record.evidence_status === 'complete' ? 'success' : 'secondary'}>
            {record.signatureStatus}
          </CBadge>
          {record.evidence_status === 'complete' && (
            <div className="small text-body-secondary mt-1">{record.signedAtDisplay}</div>
          )}
        </div>
      )
    }
    if (
      [
        'handbookReceipt',
        'salaryDeduction',
        'confidentialityAi',
        'electronicSignatureValidation',
      ].includes(column.key)
    ) {
      const accepted = record[column.key] === 'Accepted'
      return <CBadge color={accepted ? 'success' : 'secondary'}>{record[column.key]}</CBadge>
    }
    if (column.key === 'userAgent') {
      return (
        <span title={record.userAgentFull} style={recordsTruncateStyle}>
          {record.userAgentShort}
        </span>
      )
    }

    return (
      <span title={record[column.key]} style={recordsTruncateStyle}>
        {record[column.key]}
      </span>
    )
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
        <strong>Handbook Acknowledgement Records</strong>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => navigate('/handbook')}
        >
          Back to Handbook
        </CButton>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {!error && (
        <>
          <DataTableToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            activeFilterCount={getAdvancedFilterCount(activeChips)}
            onResetFilters={resetFilters}
            renderQuickFilters={() => (
              <>
                <PeriodRangeSelector
                  value={periodRange}
                  onChange={setPeriodRange}
                  className="d-none d-lg-block"
                />
                <div
                  id={desktopUtilityPortalId}
                  className="handbook-acknowledgement-records-utilities d-none d-lg-flex gap-2"
                />
              </>
            )}
          />

          <DataTableFilterPanel
            visible={showAdvancedFilters}
            activeChips={activeChips}
            clearChip={clearChip}
            resetFilters={resetFilters}
            renderMobileActions={() => (
              <CCol xs={12} className="d-flex d-lg-none justify-content-end gap-2">
                <CTooltip content="Reset filters" placement="top">
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="outline"
                    aria-label="Reset filters"
                    onClick={resetFilters}
                    className="records-filter-icon-btn"
                  >
                    <CIcon icon={cilReload} />
                  </CButton>
                </CTooltip>
                <div id={mobileUtilityPortalId} className="d-flex gap-2" />
              </CCol>
            )}
          >
            <CCol xs={12} md={4} lg={3} className="d-lg-none">
              <CFormLabel>Period</CFormLabel>
              <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
            </CCol>
          </DataTableFilterPanel>

          <DataTableRecordList
            rows={filteredRecords}
            loading={loading}
            loadingMessage="Loading acknowledgement records..."
            dataColumns={availableDataColumns}
            defaultVisibleColumns={defaultAcknowledgementVisibleColumns}
            requiredColumns={requiredAcknowledgementColumns}
            storageKey={acknowledgementColumnStorageKey}
            apiKey={acknowledgementColumnPreferenceApiKey}
            scrollStorageKey="handbook.acknowledgement-records.scroll"
            idPrefix="handbook-acknowledgement"
            exportFilename={`handbook-acknowledgements-${new Date().toISOString().slice(0, 10)}.csv`}
            getRowKey={(record, index) => record.id || `${record.fullName}-${index}`}
            renderCell={renderCell}
            emptyMessage={records.length === 0 ? 'No records found.' : 'No matching records.'}
            initialSortField="signedAt"
            initialSortDir="desc"
            initialSortDirByField={{ signedAt: 'desc' }}
            getSortValue={(record, field) =>
              field === 'signedAt' ? record.signedAt : record[field]
            }
            onRowOpen={canViewEvidence ? (record) => setSelectedEvidenceId(record.id) : undefined}
            getActions={
              canViewEvidence
                ? (record) => [
                    {
                      key: 'view-evidence',
                      label: 'View evidence',
                      onClick: () => setSelectedEvidenceId(record.id),
                    },
                  ]
                : undefined
            }
            className="handbook-acknowledgement-records-table"
            desktopUtilityPlacement="portal"
            desktopUtilityPortalId={desktopUtilityPortalId}
            mobileUtilityPlacement="portal"
            mobileUtilityPortalId={mobileUtilityPortalId}
            showMobileUtilityRow={false}
            showDesktopSummary={false}
            resetDeps={[searchTerm, periodRange]}
            getMobileTitle={(record) => record.fullName}
            getMobileSubtitle={(record) => record.version}
            mobileRecord={{
              title: (record) => record.fullName,
              subtitle: (record) => record.version,
              meta: (record) => record.signedAtDisplay,
              kv: (record) => [
                {
                  key: 'declarations',
                  label: 'Declarations',
                  value: record.declarationsStatus,
                },
                { key: 'signature', label: 'Signature', value: record.signatureStatus },
              ],
            }}
          />
        </>
      )}
      <HandbookAcknowledgementEvidenceDrawer
        recordId={selectedEvidenceId}
        open={selectedEvidenceId !== null}
        onClose={() => setSelectedEvidenceId(null)}
      />
    </>
  )
}

HandbookAcknowledgementRecords.propTypes = {
  refreshKey: PropTypes.number,
}

export default HandbookAcknowledgementRecords

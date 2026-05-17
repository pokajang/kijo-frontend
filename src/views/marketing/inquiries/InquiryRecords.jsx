import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
} from '@coreui/react'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { pipelineCrmModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import {
  PeriodRangeSelector,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
} from '../../../components/filters'
import { StatsStrip } from '../../../components/stats'
import InquiryAssignModal from './InquiryAssignModal'
import InquiryEditModal from './InquiryEditModal'
import InquiryProofModal from './components/InquiryProofModal'
import InquiryShell from './InquiryShell'
import {
  deleteInquiry,
  getStatusTone,
  inquirySources,
  inquiryStatuses,
  listInquiries,
  quoteServiceKeyByInquiryService,
  serviceOptions,
  todayISO,
} from './inquiryUtils'
import {
  buildInquiryRecordActiveChips,
  buildInquiryRecordStats,
  defaultInquiryRecordVisibleColumns,
  filterInquiryRecords,
  getDefaultInquiryRecordFilters,
  getInquiryRecordMobileMeta,
  getInquiryRecordSortValue,
  inquiryRecordColumns,
  normalizeInquiryRecord,
  requiredInquiryRecordColumns,
} from './utils/inquiryRecordsUtils'

const InquiryRecords = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const desktopToolsId = 'inquiry-records-table-tools'
  const mobileToolsId = 'inquiry-records-mobile-table-tools'
  const baselineFilters = useMemo(() => getDefaultInquiryRecordFilters(), [])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState(() => baselineFilters)
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [searchInput, setSearchInput] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [info, setInfo] = useState(location.state?.inquiryMessage || '')
  const [error, setError] = useState('')
  const [proofPreviewInquiry, setProofPreviewInquiry] = useState(null)
  const [editInquiry, setEditInquiry] = useState(null)
  const [assignInquiry, setAssignInquiry] = useState(null)

  const reloadRecords = async () => {
    setLoading(true)
    setError('')
    try {
      setRecords(await listInquiries())
    } catch (err) {
      setRecords([])
      setError(err?.message || 'Unable to load inquiries.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadRecords()
  }, [])

  useEffect(() => {
    if (location.state?.inquiryMessage) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ({ ...current, q: searchInput.trim() }))
    }, 250)

    return () => clearTimeout(timer)
  }, [searchInput])

  const filteredRecords = useMemo(
    () => filterInquiryRecords(records, filters, periodRange),
    [filters, periodRange, records],
  )

  const normalizedRecords = useMemo(
    () => filteredRecords.map(normalizeInquiryRecord),
    [filteredRecords],
  )

  const statsItems = useMemo(() => buildInquiryRecordStats(normalizedRecords), [normalizedRecords])

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => {
    setFilters(baselineFilters)
    setPeriodRange(getPeriodRangePreset('ytd'))
    setSearchInput('')
  }

  const clearChip = (key) => {
    if (key === 'search') {
      setSearchInput('')
      updateFilter('q', '')
      return
    }
    if (key === 'period') {
      setPeriodRange(getPeriodRangePreset('ytd'))
      return
    }
    updateFilter(key, baselineFilters[key])
  }

  const removeInquiry = async (inquiry) => {
    if (!inquiry?.id) return
    if (!window.confirm(`Delete ${inquiry.companyName}?`)) return

    try {
      await deleteInquiry(inquiry.id)
      await reloadRecords()
      setInfo('Inquiry deleted.')
      setError('')
    } catch (err) {
      setError(err?.message || 'Unable to delete inquiry.')
    }
  }

  const handleEditSaved = async () => {
    setEditInquiry(null)
    await reloadRecords()
    setInfo('Inquiry updated.')
    setError('')
  }

  const handleAssignmentSaved = async () => {
    setAssignInquiry(null)
    await reloadRecords()
    setInfo('Inquiry PIC assignment updated.')
    setError('')
  }

  const createQuoteFromInquiry = (inquiry) => {
    const quoteServiceKey = quoteServiceKeyByInquiryService(inquiry.serviceRequired) || 'training'
    const payload = {
      clientId: '',
      service: inquiry.serviceRequiredLabel,
      serviceKey: quoteServiceKey,
      source: inquiry.source === '-' ? '' : inquiry.source,
      remarks: inquiry.sourceRemarks || inquiry.remarks || '',
      inquiryId: inquiry.id,
      timestamp: new Date().toISOString(),
    }

    try {
      sessionStorage.setItem('quoteInquirySource', JSON.stringify(payload))
    } catch (err) {
      setError('Unable to prepare inquiry source for quotation.')
      return
    }

    if (inquiry.clientId) {
      try {
        sessionStorage.setItem('lastCreatedClientId', String(inquiry.clientId))
        if (inquiry.clientName) {
          sessionStorage.setItem('lastCreatedClientName', inquiry.clientName)
        }
      } catch {
        // Quote page remains usable with manual client selection.
      }
    }

    navigate(`/crm/quotes?service=${quoteServiceKey}`)
  }

  const createClientFromInquiry = (inquiry) => {
    if (inquiry.clientId) {
      navigate(`/client/manage/${inquiry.clientId}`)
      return
    }

    try {
      sessionStorage.setItem(
        'inquiryCreateClientDraft',
        JSON.stringify({
          companyName: inquiry.companyNameValue || inquiry.companyName || '',
          ssmNumber: inquiry.ssmNumber === '-' ? '' : inquiry.ssmNumber || '',
          taxIdNoTin: inquiry.taxIdNoTin || '',
          contactName: inquiry.contactName === '-' ? '' : inquiry.contactName || '',
          mobile: inquiry.mobile === '-' ? '601' : inquiry.mobile || '601',
          email: inquiry.email === '-' ? '' : inquiry.email || '',
          address: inquiry.address || '',
          city: inquiry.city || '',
          state: inquiry.state || '',
          zip: inquiry.zip || '',
          inquiryId: inquiry.id,
        }),
      )
      navigate('/client/create')
    } catch (err) {
      setError('Unable to prepare client draft from inquiry.')
    }
  }

  const getActions = (inquiry) =>
    [
      {
        key: 'edit',
        label: 'Edit',
        onClick: () => setEditInquiry(inquiry),
      },
      {
        key: 'client',
        label: inquiry.clientId ? 'View Client' : 'Create Client',
        onClick: () => createClientFromInquiry(inquiry),
      },
      {
        key: 'assign',
        label: 'Assign PIC',
        onClick: () => setAssignInquiry(inquiry),
      },
      inquiry.proofCount > 0
        ? {
            key: 'proof',
            label: 'View Proof',
            onClick: () => setProofPreviewInquiry(inquiry),
          }
        : null,
      inquiry.serviceRequired
        ? {
            key: 'quote',
            label: inquiry.clientId ? 'Create Quote' : 'Create Client First',
            onClick: () =>
              inquiry.clientId ? createQuoteFromInquiry(inquiry) : createClientFromInquiry(inquiry),
          }
        : null,
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        dividerBefore: true,
        onClick: () => removeInquiry(inquiry),
      },
    ].filter(Boolean)

  const renderCell = (inquiry, column) => {
    if (column.key === 'inquiryDate') return inquiry.inquiryDateDisplay
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(inquiry.status)}>
          {inquiry.statusLabel}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'companyName') {
      return (
        <DataTableTextCell
          value={inquiry.companyName}
          maxWidth="220px"
          title="Company"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    if (column.key === 'email') {
      return <DataTableTextCell value={inquiry.email} maxWidth="180px" title="Email" mode="plain" />
    }
    if (column.key === 'serviceRequired') return inquiry.serviceRequiredLabel
    if (column.key === 'ownerStaffName') {
      return (
        <DataTableTextCell
          value={inquiry.ownerStaffDisplay}
          maxWidth="160px"
          title="PIC"
          mode="plain"
        />
      )
    }
    if (column.key === 'ownerAssignedByName') {
      return (
        <DataTableTextCell
          value={inquiry.ownerAssignedByDisplay}
          maxWidth="160px"
          title="Assigned By"
          mode="plain"
        />
      )
    }
    if (column.key === 'proofDataUrl') {
      return inquiry.proofCount > 0 ? (
        <CButton
          type="button"
          color="link"
          size="sm"
          className="p-0 align-baseline"
          data-no-row-open="true"
          onClick={(event) => {
            event.stopPropagation()
            setProofPreviewInquiry(inquiry)
          }}
        >
          View ({inquiry.proofCount})
        </CButton>
      ) : (
        '-'
      )
    }
    if (column.key === 'remarks') {
      return (
        <DataTableTextCell
          value={inquiry.remarks}
          maxWidth="220px"
          title="Remarks"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    return inquiry[column.key] || '-'
  }

  const activeChips = useMemo(
    () => buildInquiryRecordActiveChips({ filters, periodRange, searchInput }),
    [filters, periodRange, searchInput],
  )

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  return (
    <InquiryShell>
      <ModuleNavStrip tabs={pipelineCrmModuleTabs} ariaLabel="Pipeline CRM sections" />
      {error && (
        <CAlert color="danger" className="mb-3">
          {error}
        </CAlert>
      )}
      {info && (
        <CAlert color="success" className="mb-3" dismissible onClose={() => setInfo('')}>
          {info}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div>
              <strong>Inquiry Records</strong>
              <span className="text-muted ms-2">{normalizedRecords.length} records</span>
            </div>
            <CButton
              size="sm"
              color="primary"
              onClick={() => navigate('/pipeline/inquiries/create')}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Add Inquiry
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody>
          <StatsStrip
            loading={loading}
            items={statsItems}
            scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
          />
          <DataTableRecordControls
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Search company, SSM, contact, PIC, assigned by, email, or remarks"
            searchAriaLabel="Search inquiries"
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            activeFilterCount={activeFilterCount}
            activeChips={activeChips}
            clearChip={clearChip}
            resetFilters={resetFilters}
            loading={loading}
            desktopToolsId={desktopToolsId}
            mobileToolsId={mobileToolsId}
          >
            <CCol xs={6} md={3} lg={2}>
              <CFormLabel htmlFor="inquiry-filter-status">Status</CFormLabel>
              <CFormSelect
                id="inquiry-filter-status"
                value={filters.status}
                onChange={(event) => updateFilter('status', event.target.value)}
              >
                <option value="">All statuses</option>
                {inquiryStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={4} lg={2}>
              <CFormLabel htmlFor="inquiry-filter-source">Source</CFormLabel>
              <CFormSelect
                id="inquiry-filter-source"
                value={filters.source}
                onChange={(event) => updateFilter('source', event.target.value)}
              >
                <option value="">All sources</option>
                {inquirySources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={3} lg={2}>
              <CFormLabel htmlFor="inquiry-filter-service">Service</CFormLabel>
              <CFormSelect
                id="inquiry-filter-service"
                value={filters.serviceRequired}
                onChange={(event) => updateFilter('serviceRequired', event.target.value)}
              >
                <option value="">All services</option>
                {serviceOptions
                  .filter((service) => service.value)
                  .map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
              </CFormSelect>
            </CCol>
          </DataTableRecordControls>

          <DataTableRecordList
            rows={normalizedRecords}
            dataColumns={inquiryRecordColumns}
            defaultVisibleColumns={defaultInquiryRecordVisibleColumns}
            requiredColumns={requiredInquiryRecordColumns}
            loading={loading}
            loadingMessage="Loading inquiries..."
            storageKey="marketing.inquiries.visible-columns.v4"
            idPrefix="marketing-inquiry"
            emptyMessage="No inquiries found for this scope."
            showMobileTopFooter={!loading}
            exportFilename={`inquiries-${todayISO()}.csv`}
            showDesktopSummary={false}
            desktopUtilityPlacement="portal"
            desktopUtilityPortalId={desktopToolsId}
            mobileUtilityPlacement="portal"
            mobileUtilityPortalId={mobileToolsId}
            showMobileUtilityRow={false}
            renderQuickFilters={() => (
              <PeriodRangeSelector
                value={periodRange}
                onChange={setPeriodRange}
                className="d-none d-lg-block"
              />
            )}
            getRowKey={(inquiry, index) => inquiry.id || index}
            renderCell={renderCell}
            getActions={getActions}
            onRowOpen={(inquiry) => navigate(`/pipeline/inquiries/${inquiry.id}`)}
            getRowOpenDisabled={(inquiry) => !inquiry?.id}
            getMobileTitle={(inquiry) => inquiry.companyName}
            getMobileSubtitle={(inquiry) => inquiry.serviceRequiredLabel}
            getMobileMeta={getInquiryRecordMobileMeta}
            getMobileStatus={(inquiry) => inquiry.statusLabel}
            getMobileStatusTone={(inquiry) => getStatusTone(inquiry.status)}
            mobileRecord={{
              title: (inquiry) => inquiry.companyName,
              subtitle: (inquiry) => inquiry.serviceRequiredLabel,
              meta: getInquiryRecordMobileMeta,
              badges: (inquiry) => [
                {
                  key: 'status',
                  label: inquiry.statusLabel,
                  tone: getStatusTone(inquiry.status),
                },
              ],
            }}
            mobileFieldKeys={{
              title: 'companyName',
              subtitle: 'serviceRequired',
              meta: ['inquiryDate', 'ssmNumber', 'mobile', 'email'],
              status: 'status',
            }}
            initialSortField="inquiryDate"
            initialSortDir="desc"
            initialSortDirByField={{ inquiryDate: 'desc' }}
            getSortValue={getInquiryRecordSortValue}
            resetDeps={[records, filters]}
            actionColumnWidth="56px"
            className="inquiry-records-table"
          />
        </CCardBody>
      </CCard>

      <InquiryProofModal
        inquiry={proofPreviewInquiry}
        onClose={() => setProofPreviewInquiry(null)}
      />
      <InquiryAssignModal
        visible={Boolean(assignInquiry)}
        inquiry={assignInquiry}
        onClose={() => setAssignInquiry(null)}
        onSaved={handleAssignmentSaved}
      />
      <InquiryEditModal
        visible={Boolean(editInquiry)}
        inquiry={editInquiry}
        onClose={() => setEditInquiry(null)}
        onSaved={handleEditSaved}
      />
    </InquiryShell>
  )
}

export default InquiryRecords

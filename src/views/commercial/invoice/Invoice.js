import React, { useEffect, useMemo, useState } from 'react'
import { CButton, CRow, CCol, CCard, CCardBody, CFormLabel, CFormSelect } from '@coreui/react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableStatsToggle,
} from '../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../../components/filters'
import InvoiceTable from './InvoiceTable'
import ViewInvoiceModal from './InvoiceModal/ViewInvoiceModal'
import EditInvoiceModal from './InvoiceModal/edit/EditInvoiceModal'
import MarkPaidModal from './InvoiceModal/MarkPaidModal'
import UpdateHrdClaimRefModal from './InvoiceModal/UpdateHrdClaimRefModal'
import CommercialProjectPickerModal from '../shared/CommercialProjectPickerModal'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { commercialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'

// import everything from our actionHandlers
import {
  fetchAllInvoices,
  handleAction,
  handleMarkPaidConfirmed,
  handleMarkUnpaidConfirmed,
  handleUpdateHrdClaimRefConfirmed,
  handleDelete,
} from './actionHandlers'

const getTrainingPaymentCategory = (paymentMethod) => {
  const raw = String(paymentMethod || '')
    .trim()
    .toLowerCase()

  if (!raw) return ''
  if (raw.includes('hrd')) return 'HRD'
  if (raw.includes('self') || raw.includes('direct')) return 'Self Paid'
  return ''
}

const Invoice = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentInvoice, setCurrentInvoice] = useState(null)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [showHrdClaimRefModal, setShowHrdClaimRefModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [hrdClaimInvoice, setHrdClaimInvoice] = useState(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [projectPickerVisible, setProjectPickerVisible] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [personInChargeFilter, setPersonInChargeFilter] = useState('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const [trainingPaymentFilter, setTrainingPaymentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('commercial.invoice')

  const personInChargeOptions = useMemo(() => {
    const pics = new Set()
    invoices.forEach((invoice) => {
      const code = String(invoice?.internalPic?.code || '').trim()
      const name = String(invoice?.internalPic?.name || '').trim()
      const id = invoice?.internalPic?.id != null ? String(invoice.internalPic.id).trim() : ''
      const pic = code || name || id
      if (pic) pics.add(pic)
    })
    return Array.from(pics).sort((a, b) => a.localeCompare(b))
  }, [invoices])

  const serviceTypeOptions = useMemo(() => {
    const types = new Set()
    invoices.forEach((invoice) => {
      const type = String(invoice?.serviceType || '').trim()
      if (type) types.add(type)
    })
    return Array.from(types).sort((a, b) => a.localeCompare(b))
  }, [invoices])

  const statusOptions = useMemo(() => {
    const statuses = new Set()
    invoices.forEach((invoice) => {
      const status = String(invoice?.status || '').trim()
      if (status) statuses.add(status)
    })
    return Array.from(statuses).sort((a, b) => a.localeCompare(b))
  }, [invoices])

  const trainingPaymentOptions = useMemo(() => {
    const options = new Set()
    invoices.forEach((invoice) => {
      const isTraining = String(invoice?.serviceType || '').toLowerCase() === 'training'
      if (!isTraining) return
      const category = getTrainingPaymentCategory(invoice?.paymentMethod)
      if (category) options.add(category)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [invoices])

  const resetFilters = () => {
    setSearchTerm('')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setPersonInChargeFilter('all')
    setServiceTypeFilter('all')
    setTrainingPaymentFilter('all')
    setStatusFilter('all')
    setShowAdvancedFilters(false)
  }
  const activeFilterCount = [
    personInChargeFilter !== 'all',
    serviceTypeFilter !== 'all',
    trainingPaymentFilter !== 'all',
    statusFilter !== 'all',
  ].filter(Boolean).length
  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
    personInChargeFilter !== 'all' ? { key: 'pic', label: `PIC: ${personInChargeFilter}` } : null,
    serviceTypeFilter !== 'all' ? { key: 'service', label: `Service: ${serviceTypeFilter}` } : null,
    trainingPaymentFilter !== 'all'
      ? { key: 'trainingPayment', label: `Training Payment: ${trainingPaymentFilter}` }
      : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
  ].filter(Boolean)
  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'pic') setPersonInChargeFilter('all')
    if (key === 'service') setServiceTypeFilter('all')
    if (key === 'trainingPayment') setTrainingPaymentFilter('all')
    if (key === 'status') setStatusFilter('all')
  }

  const applyStatFilter = (_key, value) => {
    setPersonInChargeFilter(value)
    setShowAdvancedFilters(true)
  }

  const openInvoiceCreateForProject = (project) => {
    const projectId = project?.id ?? project?.project_id
    if (!projectId) return

    setProjectPickerVisible(false)
    navigate(`/commercial/invoice/create/${projectId}?from=invoice-list`, {
      state: { project },
    })
  }

  useEffect(() => {
    fetchAllInvoices(setInvoices, setLoading)
  }, [])

  const refreshInvoicesQuietly = () =>
    fetchAllInvoices(setInvoices, setLoading, { showLoader: false })

  useEffect(() => {
    if (String(serviceTypeFilter).toLowerCase() !== 'training' && trainingPaymentFilter !== 'all') {
      setTrainingPaymentFilter('all')
    }
  }, [serviceTypeFilter, trainingPaymentFilter])

  const filteredInvoices = invoices.filter((inv) => {
    if (!isDateInPeriodRange(inv?.dateIssued, periodRange)) return false

    if (personInChargeFilter !== 'all') {
      const code = String(inv?.internalPic?.code || '').toLowerCase()
      const name = String(inv?.internalPic?.name || '').toLowerCase()
      const id = inv?.internalPic?.id != null ? String(inv.internalPic.id).toLowerCase() : ''
      const chosen = String(personInChargeFilter).toLowerCase()
      if (chosen !== code && chosen !== name && chosen !== id) return false
    }

    if (serviceTypeFilter !== 'all') {
      const chosenType = String(serviceTypeFilter).toLowerCase()
      const invoiceServiceType = String(inv?.serviceType || '').toLowerCase()
      if (chosenType !== invoiceServiceType) return false
    }

    if (String(serviceTypeFilter).toLowerCase() === 'training' && trainingPaymentFilter !== 'all') {
      const category = getTrainingPaymentCategory(inv?.paymentMethod).toLowerCase()
      if (category !== String(trainingPaymentFilter).toLowerCase()) return false
    }

    if (statusFilter !== 'all') {
      const invoiceStatus = String(inv?.status || '').toLowerCase()
      if (invoiceStatus !== String(statusFilter).toLowerCase()) return false
    }

    const term = searchTerm.trim().toLowerCase()
    const reqCompany = inv.requestor?.company?.name || ''
    const reqPic = inv.requestor?.pic?.name || ''
    const internalPic = inv?.internalPic?.code || inv?.internalPic?.name || ''

    return (
      inv.id?.toString().toLowerCase().includes(term) ||
      reqCompany.toLowerCase().includes(term) ||
      reqPic.toLowerCase().includes(term) ||
      internalPic.toLowerCase().includes(term) ||
      String(inv?.serviceType || '')
        .toLowerCase()
        .includes(term) ||
      inv.purpose?.toLowerCase().includes(term)
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
          <DataTableCardHeader title="Invoices" scopeLabel={statsScopeLabel}>
            <DataTableStatsToggle
              visible={statsVisible}
              onToggle={toggleStatsVisible}
              controlsVisible={controlsVisible}
              onControlsToggle={toggleControlsVisible}
            />
            <CButton color="primary" size="sm" onClick={() => setProjectPickerVisible(true)}>
              Create Invoice
            </CButton>
          </DataTableCardHeader>
          <CCardBody>
            <InvoiceTable
              invoices={filteredInvoices}
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
                  desktopToolsId="invoice-table-tools"
                  mobileToolsId="invoice-mobile-table-tools"
                  loading={loading}
                >
                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Person In Charge</CFormLabel>
                    <CFormSelect
                      value={personInChargeFilter}
                      onChange={(e) => setPersonInChargeFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {personInChargeOptions.map((pic) => (
                        <option key={pic} value={pic}>
                          {pic}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Type of Service</CFormLabel>
                    <CFormSelect
                      value={serviceTypeFilter}
                      onChange={(e) => setServiceTypeFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {serviceTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  {String(serviceTypeFilter).toLowerCase() === 'training' && (
                    <CCol xs={12} md={4} lg={3}>
                      <CFormLabel>Training Payment</CFormLabel>
                      <CFormSelect
                        value={trainingPaymentFilter}
                        onChange={(e) => setTrainingPaymentFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        {trainingPaymentOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  )}

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
              onAction={(action, invoice) => {
                if (action === 'markunpaid') {
                  handleMarkUnpaidConfirmed(invoice, refreshInvoicesQuietly)
                  return
                }
                handleAction(
                  action,
                  invoice,
                  setCurrentInvoice,
                  setSelectedInvoice,
                  setShowMarkPaid,
                  setViewModalVisible,
                  setEditModalVisible,
                  setHrdClaimInvoice,
                  setShowHrdClaimRefModal,
                )
              }}
              onDelete={(invoice) => handleDelete(invoice, refreshInvoicesQuietly)}
              onOpen={(invoice) =>
                navigate(`/commercial/invoice/${invoice.rawId || invoice.id}`, {
                  state: { record: invoice, returnTo: getCurrentReturnTo(location) },
                })
              }
              desktopUtilityPortalId="invoice-table-tools"
              mobileUtilityPortalId="invoice-mobile-table-tools"
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

      <ViewInvoiceModal
        visible={viewModalVisible}
        onClose={() => setViewModalVisible(false)}
        invoice={selectedInvoice}
      />

      <EditInvoiceModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        invoice={selectedInvoice}
        onSaved={refreshInvoicesQuietly}
      />

      <MarkPaidModal
        visible={showMarkPaid}
        onClose={() => setShowMarkPaid(false)}
        invoice={currentInvoice}
        onConfirmed={(invoice, paidData) =>
          handleMarkPaidConfirmed(invoice, paidData, refreshInvoicesQuietly, setShowMarkPaid)
        }
      />

      <UpdateHrdClaimRefModal
        visible={showHrdClaimRefModal}
        onClose={() => setShowHrdClaimRefModal(false)}
        invoice={hrdClaimInvoice}
        onConfirmed={(invoice, hrdClaimRef) =>
          handleUpdateHrdClaimRefConfirmed(
            invoice,
            hrdClaimRef,
            refreshInvoicesQuietly,
            setShowHrdClaimRefModal,
          )
        }
      />

      <CommercialProjectPickerModal
        visible={projectPickerVisible}
        onClose={() => setProjectPickerVisible(false)}
        onContinue={openInvoiceCreateForProject}
        title="Create Invoice"
        searchInputId="invoiceProjectSearch"
        creationLabel="invoice"
      />
    </CRow>
  )
}

export default Invoice

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'

import SelectClientCard from './SelectClientCard'
import {
  getQuoteService,
  getServiceList,
  normalizeQuoteServiceKey,
  serviceConfig,
} from './quoteMainServices'
import {
  getMatchingInquiryId,
  readQuoteInquirySource,
  removeQuoteInquirySource,
  writeQuoteInquirySource,
} from './quoteInquirySource'
import { inquirySourceOptions } from '../../../features/client-origin/sourceCatalog'
import {
  clearQuoteMainDraft,
  clearQuoteServiceDraft,
  readQuoteMainDraft,
  writeQuoteMainDraft,
} from './quoteMainDrafts'
import { isQuoteResultSuccess, readQuoteResultRow } from './quoteApi'
import { useQuoteRouteParams } from './helpers/quoteRouteParams'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'
import { listSpecialCategories } from '../../templates/shared/specialCategoryApi'
import {
  buildQuoteServiceOptions,
  findSpecialCategory,
  parseQuoteServiceOption,
  specialCategoryOptionValue,
} from './quoteServiceOptions'
import {
  getCreatedProposalTemplate,
  withoutCreatedProposalTemplate,
} from '../../templates/shared/templateHandoff'

const pick = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

const getInitialInquiryData = (inquirySource, draftMain, explicitServiceKey) => {
  if (!inquirySource) return draftMain?.inquiryData || { source: '', remarks: '' }
  const inquiryServiceKey = normalizeQuoteServiceKey(
    inquirySource.serviceKey || inquirySource.service,
  )
  if (explicitServiceKey && inquiryServiceKey && explicitServiceKey !== inquiryServiceKey) {
    return draftMain?.inquiryData || { source: '', remarks: '' }
  }
  return { source: inquirySource.source || '', remarks: inquirySource.remarks || '' }
}

const quoteMainLabels = {
  en: {
    createQuotation: 'Create Quotation',
    selectServiceQuotation: 'Select Service Quotation',
    serviceType: 'Service Type',
    selectService: 'Select Service',
    proposalLanguage: 'Proposal Language',
    inquirySource: 'Inquiry Source',
    selectSource: 'Select Source...',
    sourceRemarks: 'Source Remarks (optional)',
    sourceRemarksPlaceholder: 'e.g., from SSS Telegram group, from ex-staff',
  },
  bm: {
    createQuotation: 'Cipta Sebut Harga',
    selectServiceQuotation: 'Pilih Sebut Harga Perkhidmatan',
    serviceType: 'Jenis Perkhidmatan',
    selectService: 'Pilih Perkhidmatan',
    proposalLanguage: 'Bahasa Cadangan',
    inquirySource: 'Sumber Pertanyaan',
    selectSource: 'Pilih Sumber...',
    sourceRemarks: 'Catatan Sumber (pilihan)',
    sourceRemarksPlaceholder: 'cth. daripada kumpulan Telegram SSS, daripada bekas staf',
  },
}

const QuoteMain = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    quoteId,
    isEditMode,
    priceExceptionRequestId,
    service: serviceQueryParam,
    categoryId: categoryQueryParam,
  } = useQuoteRouteParams()
  const isNegotiationApply = Boolean(priceExceptionRequestId)
  const serviceParam = normalizeQuoteServiceKey(serviceQueryParam)
  const hasInvalidServiceParam = Boolean(serviceQueryParam && !serviceParam)
  const initialServiceParam = serviceQueryParam || location.state?.initialService || ''
  const quoteResetToken = location.state?.quoteResetToken
  const returnTo = getDetailReturnTo(location, '/crm/records')
  const createdProposalTemplate = getCreatedProposalTemplate(location)
  const explicitServiceKey = normalizeQuoteServiceKey(initialServiceParam)
  const [editFormData, setEditFormData] = useState(null)
  const [editLoadError, setEditLoadError] = useState('')
  const [isEditLoading, setIsEditLoading] = useState(false)
  const draftMain = hasInvalidServiceParam
    ? null
    : readQuoteMainDraft({
        serviceKey: explicitServiceKey,
        isEditMode: isEditMode || isNegotiationApply,
      })
  const inquirySource =
    !hasInvalidServiceParam && !isEditMode && !isNegotiationApply ? readQuoteInquirySource() : null
  const [selectedClient, setSelectedClient] = useState(draftMain?.selectedClient || null)
  const [selectedService, setSelectedService] = useState(
    hasInvalidServiceParam
      ? ''
      : explicitServiceKey ||
          normalizeQuoteServiceKey(
            inquirySource?.serviceKey || inquirySource?.service || draftMain?.selectedService,
          ),
  )
  const [specialCategories, setSpecialCategories] = useState([])
  const [specialCategoriesLoaded, setSpecialCategoriesLoaded] = useState(false)
  const [specialCategoryError, setSpecialCategoryError] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    Number(categoryQueryParam || draftMain?.specialCategoryId) || null,
  )
  const [inquiryData, setInquiryData] = useState(() =>
    getInitialInquiryData(inquirySource, draftMain, explicitServiceKey),
  )
  const [proposalLanguage, setProposalLanguage] = useState(draftMain?.proposalLanguage || 'en')
  const [templateHandoffError, setTemplateHandoffError] = useState('')
  const text = proposalLanguage === 'ms-MY' ? quoteMainLabels.bm : quoteMainLabels.en
  const inquirySourcePendingRef = useRef(Boolean(inquirySource))

  useEffect(() => {
    if (!quoteResetToken || isEditMode || isNegotiationApply) return

    clearQuoteMainDraft()
    clearQuoteServiceDraft()
    removeQuoteInquirySource()
    inquirySourcePendingRef.current = false
    setSelectedClient(null)
    setSelectedService('')
    setSelectedCategoryId(null)
    setInquiryData({ source: '', remarks: '' })
    setProposalLanguage('en')
    setEditFormData(null)
    setEditLoadError('')
    setIsEditLoading(false)
  }, [isEditMode, isNegotiationApply, quoteResetToken])

  useEffect(() => {
    if (isEditMode) return undefined
    const controller = new AbortController()
    setSpecialCategoriesLoaded(false)
    setSpecialCategoryError('')
    listSpecialCategories({ signal: controller.signal })
      .then((payload) =>
        setSpecialCategories(
          Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [],
        ),
      )
      .catch((error) => {
        if (error.name !== 'AbortError')
          setSpecialCategoryError('Service categories could not be loaded.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setSpecialCategoriesLoaded(true)
      })
    return () => controller.abort()
  }, [isEditMode])

  useEffect(() => {
    if (isEditMode || !specialCategoriesLoaded || selectedService !== 'special') return
    if (findSpecialCategory(specialCategories, selectedCategoryId)) return
    const fallback = specialCategories.find(
      (category) =>
        String(category.code || '').toUpperCase() === 'SPECIAL' &&
        Number(category.templateCount) > 0,
    )
    if (fallback) setSelectedCategoryId(Number(fallback.id))
  }, [isEditMode, selectedCategoryId, selectedService, specialCategories, specialCategoriesLoaded])

  // Create-mode handlers
  const handleClientChange = useCallback((client) => {
    setSelectedClient((previousClient) => {
      const previousClientId = previousClient?.company_id || null
      const nextClientId = client?.company_id || null
      const hasCompanyChanged = Boolean(
        previousClientId && nextClientId && previousClientId !== nextClientId,
      )
      const hasClientCleared = Boolean(previousClientId && !nextClientId)

      // Keep selected service/source when only PIC/address changes for the same client.
      if (hasCompanyChanged || hasClientCleared) {
        clearQuoteServiceDraft()
        if (inquirySourcePendingRef.current) {
          inquirySourcePendingRef.current = false
        } else {
          setSelectedService('')
          setSelectedCategoryId(null)
          setInquiryData({ source: '', remarks: '' })
        }
      }

      return client
    })
  }, [])

  const handleServiceChange = (e) => {
    const selection = parseQuoteServiceOption(e.target.value)
    const nextService = normalizeQuoteServiceKey(selection.serviceKey)
    setSelectedService(nextService)
    setSelectedCategoryId(selection.categoryId)

    if (!isEditMode && !isNegotiationApply) {
      const params = new URLSearchParams(location.search)
      if (nextService) {
        params.set('service', nextService)
      } else {
        params.delete('service')
      }
      if (selection.categoryId) params.set('categoryId', String(selection.categoryId))
      else params.delete('categoryId')

      const search = params.toString()
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : '',
        },
        {
          replace: true,
          state: {
            ...(location.state || {}),
            initialService: nextService || undefined,
            specialCategoryId: selection.categoryId || undefined,
          },
        },
      )
    }
  }

  useEffect(() => {
    if (isNegotiationApply && explicitServiceKey && selectedService !== explicitServiceKey) {
      setSelectedService(explicitServiceKey)
    }
  }, [explicitServiceKey, isNegotiationApply, selectedService])

  useEffect(() => {
    if (!isEditMode && selectedService === 'equipment' && proposalLanguage !== 'en') {
      setProposalLanguage('en')
    }
  }, [isEditMode, selectedService, proposalLanguage])

  const handleInquiryChange = (e) => {
    const { name, value } = e.target
    setInquiryData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreatedProposalTemplateConsumed = useCallback(
    (message = '') => {
      setTemplateHandoffError(message)
      navigate(
        { pathname: location.pathname, search: location.search },
        {
          replace: true,
          state: withoutCreatedProposalTemplate(location.state),
        },
      )
    },
    [location.pathname, location.search, location.state, navigate],
  )

  // Save the main quote draft on every change.
  useEffect(() => {
    if (!isEditMode && !isNegotiationApply) {
      try {
        writeQuoteMainDraft({
          selectedClient,
          selectedService,
          inquiryData,
          proposalLanguage,
          specialCategoryId: selectedCategoryId,
        })
      } catch (err) {
        console.warn('Unable to save quote main draft.', err)
      }
    }
  }, [
    selectedClient,
    selectedService,
    inquiryData,
    proposalLanguage,
    selectedCategoryId,
    isEditMode,
    isNegotiationApply,
  ])

  // Clear draft if switching to edit mode
  useEffect(() => {
    if (isEditMode || isNegotiationApply) {
      clearQuoteMainDraft(serviceParam || explicitServiceKey || selectedService)
      removeQuoteInquirySource()
    }
  }, [explicitServiceKey, isEditMode, isNegotiationApply, selectedService, serviceParam])

  // Edit-mode: fetch existing quote
  useEffect(() => {
    if (!isEditMode) {
      setEditFormData(null)
      setEditLoadError('')
      setIsEditLoading(false)
      return undefined
    }

    if (!quoteId) {
      setEditFormData(null)
      setEditLoadError('Missing quotation id. Open the quotation from the records list again.')
      setIsEditLoading(false)
      return undefined
    }

    const controller = new AbortController()
    const config = getQuoteService(serviceParam)
    if (!config) {
      setEditFormData(null)
      setEditLoadError(
        'Missing or unsupported quotation service. Open the quotation from the records list again.',
      )
      setIsEditLoading(false)
      return undefined
    }

    setEditFormData(null)
    setEditLoadError('')
    setIsEditLoading(true)

    fetch(config.getEditEndpoint(quoteId), {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((result) => {
        if (controller.signal.aborted) return
        if (!isQuoteResultSuccess(result)) {
          throw new Error(result?.message || 'Failed to load quotation')
        }
        const row = readQuoteResultRow(result)
        if (!row) throw new Error('No quotation data found')

        const selectedPic = {
          full_name: pick(row, 'picName', 'pic_name'),
          email: pick(row, 'picEmail', 'pic_email'),
          mobile_number: pick(row, 'picPhone', 'pic_phone'),
          position: pick(row, 'picPosition', 'pic_position'),
        }

        setSelectedClient({
          company_id: pick(row, 'clientId', 'client_id'),
          company_name: pick(row, 'clientName', 'client_name'),
          ssm_number: pick(row, 'clientSsm', 'client_ssm'),
          address: pick(row, 'clientAddress', 'client_address'),
          city: pick(row, 'clientCity', 'client_city'),
          state: pick(row, 'clientState', 'client_state'),
          zip: pick(row, 'clientZip', 'client_zip'),
          selected_pic: selectedPic,
          selected_pics: [selectedPic],
        })

        setEditFormData(config.mapRowToFormData(row))
        setProposalLanguage(pick(row, 'proposalLanguage', 'proposal_language') || 'en')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error(err)
        setEditLoadError(err.message || 'Error loading quotation data.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsEditLoading(false)
        }
      })

    return () => controller.abort()
  }, [isEditMode, quoteId, serviceParam])

  const renderCreateForm = () => {
    if (!selectedService || !inquiryData.source) return null
    const key = normalizeQuoteServiceKey(selectedService)
    if (key === 'special' && !selectedCategoryId) return null
    const Form = getQuoteService(key)?.formComponent
    return Form ? (
      <Form
        selectedClient={selectedClient}
        proposalLanguage={proposalLanguage}
        createdProposalTemplate={createdProposalTemplate}
        onCreatedProposalTemplateConsumed={handleCreatedProposalTemplateConsumed}
        specialCategoryId={key === 'special' ? selectedCategoryId : null}
        specialCategoryName={
          key === 'special'
            ? findSpecialCategory(specialCategories, selectedCategoryId)?.name || 'Special Service'
            : ''
        }
      />
    ) : null
  }

  const renderEditForm = () => {
    const config = getQuoteService(serviceParam)
    if (!config) return null

    const Form = config.formComponent
    return (
      <Form
        selectedClient={selectedClient}
        initialFormData={editFormData}
        isEditMode
        quoteId={quoteId}
        proposalLanguage={proposalLanguage}
      />
    )
  }

  useEffect(() => {
    if (isEditMode || isNegotiationApply) return

    if (!selectedClient || !selectedService || !inquiryData.source) {
      if (selectedClient || !inquirySourcePendingRef.current) {
        removeQuoteInquirySource()
      }
      return
    }

    const currentInquirySource = readQuoteInquirySource()
    const inquiryPayload = {
      clientId: selectedClient.company_id,
      service: serviceConfig[selectedService]?.displayName || selectedService,
      serviceKey: selectedService,
      source: inquiryData.source,
      remarks: inquiryData.remarks,
      inquiryId: getMatchingInquiryId({ currentInquirySource, selectedClient, selectedService }),
      timestamp: new Date().toISOString(),
    }
    inquirySourcePendingRef.current = false
    writeQuoteInquirySource(inquiryPayload)
  }, [selectedClient, selectedService, inquiryData, isEditMode, isNegotiationApply])

  const inquirySources = inquirySourceOptions

  const routeError = hasInvalidServiceParam
    ? `Unsupported quote service "${serviceQueryParam}". Select a valid service to continue.`
    : ''
  const serviceOptions = buildQuoteServiceOptions(getServiceList(), specialCategories)
  const selectedServiceOption =
    selectedService === 'special' && selectedCategoryId
      ? specialCategoryOptionValue(selectedCategoryId)
      : selectedService

  return (
    <CRow className="quote-main-page">
      {routeError && (
        <CCol xs={12}>
          <CAlert color="warning" className="mb-4">
            {routeError}
          </CAlert>
        </CCol>
      )}

      {templateHandoffError && (
        <CCol xs={12}>
          <CAlert
            color="warning"
            dismissible
            onClose={() => setTemplateHandoffError('')}
            className="mb-4"
          >
            {templateHandoffError}
          </CAlert>
        </CCol>
      )}
      {specialCategoryError && !isEditMode && (
        <CCol xs={12}>
          <CAlert color="warning" className="mb-4">
            {specialCategoryError}
          </CAlert>
        </CCol>
      )}

      {isEditMode && (
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <strong>Edit Quotation</strong>
              <div className="d-flex flex-wrap gap-2">
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate(returnTo)}
                >
                  Back
                </CButton>
              </div>
            </CCardHeader>
          </CCard>
        </CCol>
      )}

      {isEditMode && isEditLoading && (
        <CCol xs={12}>
          <CAlert color="info" className="mb-4">
            Loading quotation data...
          </CAlert>
        </CCol>
      )}

      {isEditMode && editLoadError && (
        <CCol xs={12}>
          <CAlert color="danger" className="mb-4">
            {editLoadError}
          </CAlert>
        </CCol>
      )}

      {!isEditMode && (
        <SelectClientCard
          selectedClient={selectedClient}
          onClientChange={handleClientChange}
          title={text.createQuotation}
          onBack={() => navigate(returnTo)}
        />
      )}

      {!isEditMode && selectedClient && (
        <>
          <CCol xs={12}>
            <CCard className="mb-4">
              <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <strong>{text.selectServiceQuotation}</strong>
              </CCardHeader>
              <CCardBody>
                <CForm className="row g-3">
                  <CCol xs={12} md={selectedService === 'equipment' ? 4 : 3}>
                    <CFormLabel htmlFor="serviceType">{text.serviceType}</CFormLabel>
                    <CFormSelect
                      id="serviceType"
                      value={selectedServiceOption}
                      onChange={handleServiceChange}
                    >
                      <option value="">{text.selectService}</option>
                      {serviceOptions.map(({ key, label }) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  {selectedService !== 'equipment' && (
                    <CCol xs={12} md={3}>
                      <CFormLabel htmlFor="proposalLanguage">{text.proposalLanguage}</CFormLabel>
                      <CFormSelect
                        id="proposalLanguage"
                        value={proposalLanguage}
                        onChange={(event) => setProposalLanguage(event.target.value)}
                        aria-label="Proposal language"
                      >
                        <option value="en">English</option>
                        <option value="ms-MY">Bahasa Melayu</option>
                      </CFormSelect>
                    </CCol>
                  )}

                  <CCol xs={12} md={selectedService === 'equipment' ? 4 : 3}>
                    <CFormLabel htmlFor="inquirySource">{text.inquirySource}</CFormLabel>
                    <Select
                      id="inquirySource"
                      name="source"
                      options={inquirySources}
                      value={inquirySources.find((opt) => opt.value === inquiryData.source) || null}
                      onChange={(selected) =>
                        handleInquiryChange({
                          target: { name: 'source', value: selected ? selected.value : '' },
                        })
                      }
                      placeholder={text.selectSource}
                      isClearable
                    />
                  </CCol>

                  <CCol xs={12} md={selectedService === 'equipment' ? 4 : 3}>
                    <CFormLabel htmlFor="inquiryRemarks">{text.sourceRemarks}</CFormLabel>
                    <CFormInput
                      id="inquiryRemarks"
                      name="remarks"
                      value={inquiryData.remarks}
                      onChange={handleInquiryChange}
                      placeholder={text.sourceRemarksPlaceholder}
                    />
                  </CCol>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>

          {renderCreateForm()}
        </>
      )}

      {isEditMode && !editLoadError && editFormData && renderEditForm()}
    </CRow>
  )
}

export default QuoteMain

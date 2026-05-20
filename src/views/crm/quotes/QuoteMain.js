import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
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
import { clearQuoteMainDraft, readQuoteMainDraft, writeQuoteMainDraft } from './quoteMainDrafts'
import dialog from '../../../components/dialog/dialogService'

const pick = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

const isSuccess = (payload) =>
  payload?.status === 'success' ||
  payload?.success === true ||
  payload?.ok === true ||
  Array.isArray(payload) ||
  (payload &&
    typeof payload === 'object' &&
    (payload.id || payload.quote_ref_no || payload.quoteRefNo))

const unwrapQuoteRow = (payload) => {
  if (Array.isArray(payload)) return payload[0] || null
  if (Array.isArray(payload?.data)) return payload.data[0] || null
  if (Array.isArray(payload?.result)) return payload.result[0] || null
  if (payload?.data && typeof payload.data === 'object') return payload.data
  if (payload?.result && typeof payload.result === 'object') return payload.result
  if (payload && typeof payload === 'object') return payload
  return null
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

const QuoteMain = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const query = new URLSearchParams(location.search)
  const quoteId = query.get('quoteId')
  const isEditMode = query.get('edit') === 'true'
  const isNegotiationApply = Boolean(query.get('priceExceptionRequestId'))
  const serviceQueryParam = query.get('service')
  const serviceParam = normalizeQuoteServiceKey(serviceQueryParam)
  const hasInvalidServiceParam = Boolean(serviceQueryParam && !serviceParam)
  const initialServiceParam = serviceQueryParam || location.state?.initialService || ''
  const returnTo = location.state?.returnTo || '/crm/records'
  const explicitServiceKey = normalizeQuoteServiceKey(initialServiceParam)
  const [editFormData, setEditFormData] = useState(null)
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
  const [inquiryData, setInquiryData] = useState(() =>
    getInitialInquiryData(inquirySource, draftMain, explicitServiceKey),
  )
  const [proposalLanguage, setProposalLanguage] = useState(draftMain?.proposalLanguage || 'en')
  const inquirySourcePendingRef = useRef(Boolean(inquirySource))

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
        if (inquirySourcePendingRef.current) {
          inquirySourcePendingRef.current = false
        } else {
          setSelectedService('')
          setInquiryData({ source: '', remarks: '' })
        }
      }

      return client
    })
  }, [])

  const handleServiceChange = (e) => {
    setSelectedService(normalizeQuoteServiceKey(e.target.value))
  }

  useEffect(() => {
    if (!isEditMode && explicitServiceKey && selectedService !== explicitServiceKey) {
      setSelectedService(explicitServiceKey)
    }
  }, [explicitServiceKey, isEditMode, selectedService])

  useEffect(() => {
    if (!isEditMode && selectedService === 'equipment' && proposalLanguage !== 'en') {
      setProposalLanguage('en')
    }
  }, [isEditMode, selectedService, proposalLanguage])

  const handleInquiryChange = (e) => {
    const { name, value } = e.target
    setInquiryData((prev) => ({ ...prev, [name]: value }))
  }

  // Save to localStorage on every change
  useEffect(() => {
    if (!isEditMode && !isNegotiationApply) {
      try {
        writeQuoteMainDraft({
          selectedClient,
          selectedService,
          inquiryData,
          proposalLanguage,
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
    isEditMode,
    isNegotiationApply,
  ])

  // Clear draft if switching to edit mode
  useEffect(() => {
    if (isEditMode || isNegotiationApply) {
      clearQuoteMainDraft()
    }
  }, [isEditMode, isNegotiationApply])

  // Edit-mode: fetch existing quote
  useEffect(() => {
    if (!isEditMode || !quoteId) {
      setEditFormData(null)
      return undefined
    }

    const controller = new AbortController()
    const config = getQuoteService(serviceParam)
    if (!config) {
      setEditFormData(null)
      return undefined
    }

    setEditFormData(null)

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
        if (!isSuccess(result)) throw new Error(result?.message || 'Failed to load quotation')
        const row = unwrapQuoteRow(result)
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
        dialog.alert('Error loading quotation data.')
      })

    return () => controller.abort()
  }, [isEditMode, quoteId, serviceParam])

  const renderCreateForm = () => {
    if (!selectedService || !inquiryData.source) return null
    const key = normalizeQuoteServiceKey(selectedService)
    const Form = getQuoteService(key)?.formComponent
    return Form ? (
      <Form selectedClient={selectedClient} proposalLanguage={proposalLanguage} />
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

  const inquirySources = [
    { label: 'Management Provided', value: 'Management Provided' },
    { label: 'Online Pitching', value: 'Online Pitching' },
    { label: 'Physical Meeting', value: 'Physical Meeting' },
    { label: 'Call Office', value: 'Call Office' },
    { label: 'Call Personal', value: 'Call Personal' },
    { label: 'Email Info Admin', value: 'Email Info Admin' },
    { label: 'Email Personal', value: 'Email Personal' },
    { label: 'Email Marketing', value: 'Email Marketing' },
    { label: 'WhatsApp Training', value: 'WhatsApp Training' },
    { label: 'WhatsApp Health', value: 'WhatsApp Health' },
    { label: 'WhatsApp Manpower', value: 'WhatsApp Manpower' },
    { label: 'WhatsApp Personal', value: 'WhatsApp Personal' },
    { label: 'WhatsApp Group', value: 'WhatsApp Group' },
    { label: 'Telegram Group', value: 'Telegram Group' },
    { label: 'Telegram Personal', value: 'Telegram Personal' },
    { label: 'LinkedIn Chat', value: 'LinkedIn Chat' },
    { label: 'LinkedIn Post', value: 'LinkedIn Post' },
    { label: 'Facebook Post', value: 'Facebook Post' },
    { label: 'Facebook Chat', value: 'Facebook Chat' },
    { label: 'Instagram Post', value: 'Instagram Post' },
    { label: 'Instagram Chat', value: 'Instagram Chat' },
    { label: 'Ex-Staff', value: 'Ex-Staff' },
    { label: 'OSH Practitioners Group', value: 'OSH Practitioners Group' },
  ]

  return (
    <CRow>
      {isEditMode && (
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <strong>Edit Quotation</strong>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => navigate(returnTo)}
              >
                Back
              </CButton>
            </CCardHeader>
          </CCard>
        </CCol>
      )}

      {!isEditMode && (
        <SelectClientCard
          selectedClient={selectedClient}
          onClientChange={handleClientChange}
          title="Create Quotation"
          onBack={() => navigate(returnTo)}
        />
      )}

      {!isEditMode && selectedClient && (
        <>
          <CCol xs={12}>
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Select Service Quotation</strong>
              </CCardHeader>
              <CCardBody>
                <CForm className="row g-3">
                  <CCol xs={12} md={selectedService === 'equipment' ? 4 : 3}>
                    <CFormLabel htmlFor="serviceType">Service Type</CFormLabel>
                    <CFormSelect
                      id="serviceType"
                      value={selectedService}
                      onChange={handleServiceChange}
                    >
                      <option value="">Select Service</option>
                      {getServiceList().map(({ key, label }) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  {selectedService !== 'equipment' && (
                    <CCol xs={12} md={3}>
                      <CFormLabel htmlFor="proposalLanguage">Proposal Language</CFormLabel>
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
                    <CFormLabel htmlFor="inquirySource">Inquiry Source</CFormLabel>
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
                      placeholder="Select Source..."
                      isClearable
                    />
                  </CCol>

                  <CCol xs={12} md={selectedService === 'equipment' ? 4 : 3}>
                    <CFormLabel htmlFor="inquiryRemarks">Source Remarks (optional)</CFormLabel>
                    <CFormInput
                      id="inquiryRemarks"
                      name="remarks"
                      value={inquiryData.remarks}
                      onChange={handleInquiryChange}
                      placeholder="e.g., from SSS Telegram group, from ex-staff"
                    />
                  </CCol>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>

          {renderCreateForm()}
        </>
      )}

      {isEditMode && editFormData && renderEditForm()}
    </CRow>
  )
}

export default QuoteMain

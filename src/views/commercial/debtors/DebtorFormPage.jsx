import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Select from '../../../components/forms/ThemedSelect'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { commercialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { fetchAllPagedRecords, fetchJson } from '../../../utils/detailPages'
import {
  getClientPaymentTermsMeta,
  getPaymentTermsCompactLabel,
  normalizePaymentTermsDays,
  SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS,
} from '../../../shared/paymentTerms'
import { getTodayDate, manualDebtorToForm, normalizeDebtorRow } from './debtorUtils'

const debtorDraftStorageKey = 'debtorCreateDraft'
const cameFromDebtorStorageKey = 'cameFromDebtor'
const lastCreatedClientIdStorageKey = 'lastCreatedClientId'
const lastCreatedClientNameStorageKey = 'lastCreatedClientName'

const debtorServiceOptions = [
  { value: 'Training', label: 'Training' },
  { value: 'Industrial Hygiene', label: 'Industrial Hygiene' },
  { value: 'Manpower Supply', label: 'Manpower Supply' },
  { value: 'Equipment Supply', label: 'Equipment Supply' },
  { value: 'Special Service', label: 'Special Service' },
]

const blankForm = {
  invoice_ref_no: '',
  client_id: '',
  pic_id: '',
  client_name: '',
  pic_name: '',
  pic_phone: '',
  pic_email: '',
  service_type: '',
  service_period: '',
  service_start_date: '',
  service_end_date: '',
  purpose: '',
  invoice_date: getTodayDate(),
  override_payment_terms: false,
  payment_terms_days: '',
  payment_terms_source: '',
  due_date: '',
  grand_total: '',
  status: 'Open',
  payment_method: '',
  paid_date: '',
  paid_amount: '',
  paid_remarks: '',
  attachmentUrl: '',
  attachmentOriginalName: '',
}

const normalizePic = (pic = {}) => ({
  pic_id: pic.pic_id ?? pic.picId ?? '',
  full_name: pic.full_name ?? pic.fullName ?? pic.pic_name ?? '',
  email: pic.email ?? pic.pic_email ?? '',
  mobile_number: pic.mobile_number ?? pic.mobileNumber ?? pic.pic_phone ?? '',
  position: pic.position ?? pic.pic_position ?? '',
})

const hasPicData = (pic) =>
  Boolean(pic?.pic_id || pic?.full_name || pic?.email || pic?.mobile_number || pic?.position)

const contactKey = (pic = {}, index = 0) =>
  [pic.pic_id, pic.email, pic.full_name, index].filter(Boolean).join('|') || `pic-${index}`

const extractPreviewPics = (client = {}) =>
  (Array.isArray(client.pic_preview) ? client.pic_preview : []).map(normalizePic).filter(hasPicData)

const formatInlineAddress = ({ address, zip, city, state }) =>
  [address, zip && city ? `${zip} ${city}` : zip || city, state].filter(Boolean).join(', ')

const buildServicePeriod = (startDate, endDate, fallback = '') => {
  const start = String(startDate || '').trim()
  const end = String(endDate || '').trim()

  if (start && end) return start === end ? start : `${start} - ${end}`
  return start || end || String(fallback || '').trim()
}

const addDaysToDate = (dateValue, days) => {
  if (!dateValue) return ''
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + normalizePaymentTermsDays(days))
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10)
}

const resolveClientPaymentTerms = (client = {}) => {
  const meta = getClientPaymentTermsMeta(client)
  return {
    days: meta.days,
    source: meta.source,
    label: getPaymentTermsCompactLabel(meta.source, meta.days),
  }
}

const getManualTermsLabel = (form) => {
  if (
    form.payment_terms_days === null ||
    form.payment_terms_days === undefined ||
    form.payment_terms_days === ''
  ) {
    return '-'
  }
  const days = normalizePaymentTermsDays(form.payment_terms_days, SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS)
  return getPaymentTermsCompactLabel(
    form.override_payment_terms ? 'manual_override' : form.payment_terms_source || 'legacy',
    days,
  )
}

const buildGroupedClientOptions = (clients = []) => {
  const grouped = new Map()

  clients.forEach((client) => {
    const companyId = client.company_id ?? client.companyId ?? ''
    const rowPics = extractPreviewPics(client)

    if (!grouped.has(companyId)) {
      grouped.set(companyId, {
        company_id: companyId,
        company_name: client.company_name ?? client.companyName ?? '',
        ssm_number: client.ssm_number ?? client.ssmNumber ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        state: client.state ?? '',
        zip: client.zip ?? '',
        payment_terms_days: client.payment_terms_days ?? client.paymentTermsDays ?? null,
        effective_payment_terms_days:
          client.effective_payment_terms_days ?? client.effectivePaymentTermsDays ?? null,
        payment_terms_source: client.payment_terms_source ?? client.paymentTermsSource ?? '',
        pic_count: Number(client.pic_count || 0),
        all_pics: rowPics,
      })
      return
    }

    grouped.get(companyId).all_pics.push(...rowPics)
  })

  return Array.from(grouped.values()).map((client) => {
    const picNames = client.all_pics.map((pic) => pic.full_name).filter(Boolean)
    const additionalCount = Math.max(0, Number(client.pic_count || 0) - picNames.length)
    const picLabel = picNames.length > 0 ? picNames.join(', ') : 'No PIC'

    return {
      value: client.company_id,
      label: `${client.company_name} - ${picLabel}${additionalCount > 0 ? ` (+${additionalCount} more)` : ''}`,
      data: client,
    }
  })
}

const resolveClientOption = (options, clientId, clientName = '') => {
  const id = String(clientId || '')
  const name = String(clientName || '')
  return (
    options.find((option) => (id ? String(option.value) === id : false)) ||
    options.find((option) => (name ? option.data?.company_name === name : false)) ||
    null
  )
}

const DebtorClientSelector = ({
  clientOptions,
  clientLoading,
  selectedClient,
  clientPics,
  selectedPicKeys,
  onClientSelect,
  onContactToggle,
  onSelectAllContacts,
  onSelectPrimaryContact,
  onCreateClient,
}) => {
  const selectedOption = selectedClient
    ? resolveClientOption(clientOptions, selectedClient.company_id, selectedClient.company_name)
    : null
  const hasContactOptions = clientPics.length > 1

  return (
    <div className="mb-3">
      <div className="mb-2">
        <div>
          <div className="fw-semibold">Select Client</div>
        </div>
      </div>

      <CRow className="g-3">
        <CCol xs={12}>
          <Select
            options={clientOptions}
            value={selectedOption}
            isLoading={clientLoading}
            isClearable
            placeholder="Search client"
            onChange={(option) => onClientSelect(option?.data || null)}
            noOptionsMessage={({ inputValue }) =>
              inputValue ? (
                <span>
                  No client found.{' '}
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onCreateClient()
                    }}
                  >
                    Create one?
                  </CButton>
                </span>
              ) : (
                'Type to search...'
              )
            }
          />
        </CCol>
        {selectedClient && (
          <CCol xs={12} md={7}>
            <CFormLabel>Company Name</CFormLabel>
            <div>
              <strong>{selectedClient.company_name}</strong>{' '}
              <small className="text-muted">(Reg. No.: {selectedClient.ssm_number || '-'})</small>
              <br />
              {formatInlineAddress(selectedClient) || '-'}
            </div>
          </CCol>
        )}
        {selectedClient && (
          <CCol xs={12} md={5}>
            <CFormLabel>Contact Information</CFormLabel>
            {hasContactOptions ? (
              <div className="d-flex flex-column gap-2">
                <div className="d-flex gap-2 mb-1">
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={onSelectAllContacts}
                  >
                    Select all
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={onSelectPrimaryContact}
                  >
                    Primary only
                  </CButton>
                </div>
                {clientPics.map((pic, index) => {
                  const isSelected = selectedPicKeys.includes(contactKey(pic, index))
                  return (
                    <label
                      key={contactKey(pic, index)}
                      className={`border rounded p-2 d-flex align-items-start gap-2 ${
                        isSelected ? 'border-primary bg-light' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      <CFormCheck
                        type="checkbox"
                        name="debtorContactPic"
                        checked={isSelected}
                        onChange={() => onContactToggle(pic, index)}
                      />
                      <div>
                        <strong>
                          {pic.full_name || '-'} {pic.position ? `(${pic.position})` : ''}
                        </strong>
                        <br />
                        {pic.email || '-'}{' '}
                        <small className="text-muted">({pic.mobile_number || '-'})</small>
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : clientPics.length === 1 ? (
              <div>
                <strong>{clientPics[0].full_name || '-'}</strong>{' '}
                <small className="text-muted">
                  {clientPics[0].position ? `(${clientPics[0].position})` : ''}
                </small>
                <br />
                {clientPics[0].email || '-'}{' '}
                <small className="text-muted">({clientPics[0].mobile_number || '-'})</small>
              </div>
            ) : (
              <div className="text-muted">No contacts found.</div>
            )}
          </CCol>
        )}
      </CRow>
    </div>
  )
}

const DebtorFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(blankForm)
  const [attachment, setAttachment] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [clientOptions, setClientOptions] = useState([])
  const [clientLoading, setClientLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientPics, setClientPics] = useState([])
  const [selectedPicKeys, setSelectedPicKeys] = useState([])
  const [paymentTermsDirty, setPaymentTermsDirty] = useState(false)
  const returnHydratedRef = useRef(false)
  const editHydratedRef = useRef(false)

  const title = useMemo(() => (isEdit ? 'Edit Manual Debtor' : 'Add Manual Debtor'), [isEdit])
  const selectedClientTerms = useMemo(
    () => (selectedClient ? resolveClientPaymentTerms(selectedClient) : null),
    [selectedClient],
  )
  const effectiveClientTermsLabel = useMemo(() => {
    if (!isEdit || paymentTermsDirty || form.payment_terms_days === '') {
      return selectedClientTerms?.label || 'Client terms'
    }
    return `Saved ${getManualTermsLabel(form)}`
  }, [form, isEdit, paymentTermsDirty, selectedClientTerms])

  const updateField = useCallback((field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'invoice_date' && current.payment_terms_days !== ''
        ? {
            due_date: addDaysToDate(value, current.payment_terms_days),
          }
        : {}),
      ...(field === 'payment_terms_days'
        ? {
            due_date:
              value !== '' && current.invoice_date
                ? addDaysToDate(current.invoice_date, value)
                : '',
          }
        : {}),
      ...(field === 'status' && value !== 'Paid'
        ? { paid_date: '', paid_amount: '', paid_remarks: '' }
        : {}),
    }))
  }, [])

  const applySelectedPicsSnapshot = useCallback((pics) => {
    const selectedPics = pics.filter(hasPicData)
    const primaryPic = selectedPics[0] || null
    const joinField = (field) =>
      selectedPics
        .map((pic) => String(pic[field] || '').trim())
        .filter(Boolean)
        .join(', ')

    setForm((current) => ({
      ...current,
      pic_id: primaryPic?.pic_id ? String(primaryPic.pic_id) : '',
      pic_name: joinField('full_name'),
      pic_phone: joinField('mobile_number'),
      pic_email: joinField('email'),
    }))
  }, [])

  const handlePaymentTermsModeChange = useCallback(
    (useManualOverride) => {
      setPaymentTermsDirty(true)
      setForm((current) => {
        const baseDays =
          selectedClientTerms?.days ??
          normalizePaymentTermsDays(current.payment_terms_days, SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS)
        const days = useManualOverride
          ? normalizePaymentTermsDays(current.payment_terms_days || baseDays)
          : baseDays
        const source = useManualOverride
          ? 'manual_override'
          : selectedClientTerms?.source || 'system_default'

        return {
          ...current,
          override_payment_terms: useManualOverride,
          payment_terms_days: days,
          payment_terms_source: source,
          due_date: current.invoice_date ? addDaysToDate(current.invoice_date, days) : '',
        }
      })
    },
    [selectedClientTerms],
  )

  const fetchCompanyPics = useCallback(async (companyId, fallbackPics = []) => {
    if (!companyId) return fallbackPics

    try {
      const payload = await fetchJson(
        `${import.meta.env.VITE_API_BASE}client-companies/${encodeURIComponent(companyId)}/pics`,
      )
      const pics = Array.isArray(payload?.data)
        ? payload.data.map(normalizePic).filter(hasPicData)
        : []
      return pics.length ? pics : fallbackPics
    } catch (error) {
      console.error('Unable to load client PICs:', error)
      return fallbackPics
    }
  }, [])

  const hydrateSelectedClient = useCallback(
    async (
      client,
      { fillSnapshots = true, defaultFirstPic = false, markPaymentTermsDirty = true } = {},
    ) => {
      if (!client) {
        setSelectedClient(null)
        setClientPics([])
        setSelectedPicKeys([])
        setForm((current) => ({
          ...current,
          client_id: '',
          pic_id: '',
          override_payment_terms: false,
          payment_terms_days: '',
          payment_terms_source: '',
          due_date: '',
        }))
        if (markPaymentTermsDirty) setPaymentTermsDirty(true)
        return
      }

      const normalizedClient = {
        ...client,
        company_id: client.company_id ?? client.companyId ?? '',
        company_name: client.company_name ?? client.companyName ?? '',
        ssm_number: client.ssm_number ?? client.ssmNumber ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        state: client.state ?? '',
        zip: client.zip ?? '',
        payment_terms_days: client.payment_terms_days ?? client.paymentTermsDays ?? null,
        effective_payment_terms_days:
          client.effective_payment_terms_days ?? client.effectivePaymentTermsDays ?? null,
        payment_terms_source: client.payment_terms_source ?? client.paymentTermsSource ?? '',
        all_pics: Array.isArray(client.all_pics) ? client.all_pics : extractPreviewPics(client),
      }
      const clientTerms = resolveClientPaymentTerms(normalizedClient)
      const pics = await fetchCompanyPics(normalizedClient.company_id, normalizedClient.all_pics)
      setSelectedClient(normalizedClient)
      setClientPics(pics)
      const currentPic = form.pic_id
        ? pics.find((pic) => String(pic.pic_id) === String(form.pic_id))
        : null
      const selectedPics = currentPic ? [currentPic] : defaultFirstPic && pics[0] ? [pics[0]] : []
      const primaryPic = selectedPics[0] || null

      setSelectedPicKeys(selectedPics.map((pic) => contactKey(pic, pics.indexOf(pic))))

      setForm((current) => {
        return {
          ...current,
          client_id: normalizedClient.company_id ? String(normalizedClient.company_id) : '',
          pic_id: primaryPic?.pic_id
            ? String(primaryPic.pic_id)
            : fillSnapshots
              ? ''
              : current.pic_id,
          ...(fillSnapshots
            ? {
                client_name: normalizedClient.company_name || current.client_name,
                pic_name: primaryPic?.full_name || '',
                pic_phone: primaryPic?.mobile_number || '',
                pic_email: primaryPic?.email || '',
                override_payment_terms: false,
                payment_terms_days: clientTerms.days,
                payment_terms_source: clientTerms.source,
                due_date: current.invoice_date
                  ? addDaysToDate(current.invoice_date, clientTerms.days)
                  : '',
              }
            : {}),
        }
      })
      if (fillSnapshots && markPaymentTermsDirty) setPaymentTermsDirty(true)
    },
    [fetchCompanyPics, form.pic_id],
  )

  const loadClientOptions = useCallback(async () => {
    setClientLoading(true)
    try {
      const clients = await fetchAllPagedRecords({
        url: `${import.meta.env.VITE_API_BASE}client-companies`,
        dataKeys: ['data'],
        perPage: 200,
      })
      setClientOptions(Array.isArray(clients) ? buildGroupedClientOptions(clients) : [])
    } catch (error) {
      console.error('Unable to load clients:', error)
      setClientOptions([])
    } finally {
      setClientLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClientOptions()
  }, [loadClientOptions])

  useEffect(() => {
    if (isEdit) return

    let draft = null
    try {
      draft = JSON.parse(sessionStorage.getItem(debtorDraftStorageKey))
    } catch {
      sessionStorage.removeItem(debtorDraftStorageKey)
    }

    if (!draft) return

    setForm({
      ...blankForm,
      ...draft,
      attachmentUrl: '',
      attachmentOriginalName: '',
    })
    sessionStorage.removeItem(debtorDraftStorageKey)
  }, [isEdit])

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false

    const loadDebtor = async () => {
      setLoading(true)
      try {
        const payload = await fetchJson(
          `${import.meta.env.VITE_API_BASE}debtors/manual/${encodeURIComponent(id)}`,
        )
        if (cancelled) return
        const nextForm = {
          ...blankForm,
          ...manualDebtorToForm(normalizeDebtorRow(payload?.debtor || {})),
        }
        setForm(nextForm)
        setPaymentTermsDirty(false)
      } catch (error) {
        if (!cancelled) {
          dialog.alert(error?.message || 'Unable to load manual debtor.')
          navigate('/commercial/debtors')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDebtor()

    return () => {
      cancelled = true
    }
  }, [id, isEdit, navigate])

  useEffect(() => {
    if (returnHydratedRef.current || isEdit || clientOptions.length === 0) return

    const lastCreatedClientId = sessionStorage.getItem(lastCreatedClientIdStorageKey)
    const lastCreatedClientName = sessionStorage.getItem(lastCreatedClientNameStorageKey)
    const cameFromDebtor = sessionStorage.getItem(cameFromDebtorStorageKey) === 'true'
    if (!cameFromDebtor && !lastCreatedClientId && !lastCreatedClientName) return

    const match = resolveClientOption(clientOptions, lastCreatedClientId, lastCreatedClientName)
    returnHydratedRef.current = true

    if (match) {
      hydrateSelectedClient(match.data, {
        fillSnapshots: true,
        defaultFirstPic: true,
        markPaymentTermsDirty: true,
      })
    }

    sessionStorage.removeItem(cameFromDebtorStorageKey)
    sessionStorage.removeItem(lastCreatedClientIdStorageKey)
    sessionStorage.removeItem(lastCreatedClientNameStorageKey)
  }, [clientOptions, hydrateSelectedClient, isEdit])

  useEffect(() => {
    if (
      !isEdit ||
      loading ||
      editHydratedRef.current ||
      !form.client_id ||
      clientOptions.length === 0
    ) {
      return
    }

    const match = resolveClientOption(clientOptions, form.client_id, form.client_name)
    if (!match) return

    editHydratedRef.current = true
    hydrateSelectedClient(match.data, { fillSnapshots: false, markPaymentTermsDirty: false })
  }, [clientOptions, form.client_id, form.client_name, hydrateSelectedClient, isEdit, loading])

  const handleContactToggle = (pic, index) => {
    const key = contactKey(pic, index)
    const isSelected = selectedPicKeys.includes(key)
    const nextKeys = isSelected
      ? selectedPicKeys.filter((selectedKey) => selectedKey !== key)
      : [...selectedPicKeys, key]
    const effectiveKeys = nextKeys.length
      ? nextKeys
      : clientPics[0]
        ? [contactKey(clientPics[0], 0)]
        : []
    const selectedPics = clientPics.filter((candidate, candidateIndex) =>
      effectiveKeys.includes(contactKey(candidate, candidateIndex)),
    )

    setSelectedPicKeys(effectiveKeys)
    applySelectedPicsSnapshot(selectedPics)
  }

  const handleSelectAllContacts = () => {
    const allKeys = clientPics.map((pic, index) => contactKey(pic, index))
    setSelectedPicKeys(allKeys)
    applySelectedPicsSnapshot(clientPics)
  }

  const handleSelectPrimaryContact = () => {
    const primaryPic = clientPics[0] || null
    setSelectedPicKeys(primaryPic ? [contactKey(primaryPic, 0)] : [])
    applySelectedPicsSnapshot(primaryPic ? [primaryPic] : [])
  }

  const handleCreateClient = () => {
    sessionStorage.setItem(
      debtorDraftStorageKey,
      JSON.stringify({
        ...form,
        attachmentUrl: '',
        attachmentOriginalName: '',
      }),
    )
    sessionStorage.setItem(cameFromDebtorStorageKey, 'true')
    navigate('/client/create')
  }

  const buildPayload = () => {
    const data = new FormData()
    const servicePeriod = buildServicePeriod(
      form.service_start_date,
      form.service_end_date,
      form.service_period,
    )
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'attachmentUrl' || key === 'attachmentOriginalName') return
      if (key === 'override_payment_terms') {
        data.append(key, value ? '1' : '0')
        return
      }
      data.append(key, key === 'service_period' ? servicePeriod : (value ?? ''))
    })
    data.append('payment_terms_changed', !isEdit || paymentTermsDirty ? '1' : '0')
    if (attachment) data.append('attachment', attachment)
    return data
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedClient) {
      dialog.alert('Please select or create a client before saving the debtor.')
      return
    }

    setSaving(true)
    try {
      const endpoint = isEdit
        ? `${import.meta.env.VITE_API_BASE}debtors/manual/${encodeURIComponent(id)}`
        : `${import.meta.env.VITE_API_BASE}debtors/manual`
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: buildPayload(),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || payload?.status !== 'success') {
        throw new Error(payload?.message || `Request failed with HTTP ${res.status}`)
      }
      navigate('/commercial/debtors')
    } catch (error) {
      dialog.alert(error?.message || 'Unable to save manual debtor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <ModuleNavStrip tabs={commercialModuleTabs} ariaLabel="Commercial sections" />
      </CCol>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
            <strong>{title}</strong>
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => navigate('/commercial/debtors')}
              disabled={saving}
            >
              Back
            </CButton>
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <div className="text-center text-muted py-4">Loading manual debtor...</div>
            ) : (
              <CForm onSubmit={handleSubmit}>
                <DebtorClientSelector
                  clientOptions={clientOptions}
                  clientLoading={clientLoading}
                  selectedClient={selectedClient}
                  clientPics={clientPics}
                  selectedPicKeys={selectedPicKeys}
                  onClientSelect={(client) =>
                    hydrateSelectedClient(client, {
                      fillSnapshots: true,
                      defaultFirstPic: true,
                      markPaymentTermsDirty: true,
                    })
                  }
                  onContactToggle={handleContactToggle}
                  onSelectAllContacts={handleSelectAllContacts}
                  onSelectPrimaryContact={handleSelectPrimaryContact}
                  onCreateClient={handleCreateClient}
                />

                {selectedClient && (
                  <>
                    <CAlert color="warning" className="py-2">
                      Insert old or manual debt details below. Do not duplicate invoices already
                      created in KIJO; this entry is for receivables not traceable to a system
                      invoice.
                    </CAlert>
                    <CRow className="g-3">
                      <CCol xs={12} md={3}>
                        <CFormLabel>Invoice Ref</CFormLabel>
                        <CFormInput
                          value={form.invoice_ref_no}
                          onChange={(event) => updateField('invoice_ref_no', event.target.value)}
                          required
                        />
                      </CCol>
                      <CCol xs={12} md={3}>
                        <CFormLabel>Invoice Date</CFormLabel>
                        <CFormInput
                          type="date"
                          value={form.invoice_date}
                          onChange={(event) => updateField('invoice_date', event.target.value)}
                          required
                        />
                      </CCol>
                      <CCol xs={12} md={3}>
                        <CFormLabel>Payment Terms</CFormLabel>
                        <div className="d-flex flex-wrap gap-3 mb-2">
                          <CFormCheck
                            type="radio"
                            id="manualDebtorClientTerms"
                            name="manualDebtorPaymentTermsMode"
                            label={effectiveClientTermsLabel}
                            checked={!form.override_payment_terms}
                            onChange={() => handlePaymentTermsModeChange(false)}
                          />
                          <CFormCheck
                            type="radio"
                            id="manualDebtorCustomTerms"
                            name="manualDebtorPaymentTermsMode"
                            label="Custom"
                            checked={Boolean(form.override_payment_terms)}
                            onChange={() => handlePaymentTermsModeChange(true)}
                          />
                        </div>
                        {form.override_payment_terms ? (
                          <CFormInput
                            type="number"
                            min="0"
                            max="365"
                            value={form.payment_terms_days}
                            onChange={(event) => {
                              setPaymentTermsDirty(true)
                              updateField('payment_terms_days', event.target.value)
                            }}
                            required
                          />
                        ) : (
                          <div className="text-muted small">{getManualTermsLabel(form)}</div>
                        )}
                      </CCol>
                      <CCol xs={12} md={3}>
                        <CFormLabel>Due Date</CFormLabel>
                        <CFormInput type="date" value={form.due_date || ''} readOnly disabled />
                      </CCol>
                      <CCol xs={12} md={4}>
                        <CFormLabel>Grand Total</CFormLabel>
                        <CFormInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.grand_total}
                          onChange={(event) => updateField('grand_total', event.target.value)}
                          required
                        />
                      </CCol>

                      <CCol xs={12} md={6}>
                        <CFormLabel>Service</CFormLabel>
                        <CFormSelect
                          value={form.service_type}
                          onChange={(event) => updateField('service_type', event.target.value)}
                        >
                          <option value="">Select Service</option>
                          {debtorServiceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol xs={12} md={3}>
                        <CFormLabel>Service Start Date</CFormLabel>
                        <CFormInput
                          type="date"
                          value={form.service_start_date}
                          onChange={(event) =>
                            updateField('service_start_date', event.target.value)
                          }
                        />
                      </CCol>
                      <CCol xs={12} md={3}>
                        <CFormLabel>Service End Date</CFormLabel>
                        <CFormInput
                          type="date"
                          value={form.service_end_date}
                          min={form.service_start_date || undefined}
                          onChange={(event) => updateField('service_end_date', event.target.value)}
                        />
                      </CCol>
                      <CCol xs={12}>
                        <CFormLabel>Remarks</CFormLabel>
                        <CFormTextarea
                          rows={3}
                          placeholder="e.g. Follow client payment terms, project direct award, old invoice reference notes, payment arrangement, or other related legacy debt details."
                          value={form.purpose}
                          onChange={(event) => updateField('purpose', event.target.value)}
                        />
                      </CCol>

                      <CCol xs={12} md={4}>
                        <CFormLabel>Status</CFormLabel>
                        <CFormSelect
                          value={form.status}
                          onChange={(event) => updateField('status', event.target.value)}
                        >
                          <option value="Open">Open</option>
                          <option value="Paid">Paid</option>
                          <option value="Cancelled">Cancelled</option>
                        </CFormSelect>
                      </CCol>
                      <CCol xs={12} md={4}>
                        <CFormLabel>Payment Method</CFormLabel>
                        <CFormInput
                          value={form.payment_method}
                          onChange={(event) => updateField('payment_method', event.target.value)}
                        />
                      </CCol>
                      <CCol xs={12} md={4}>
                        <CFormLabel>Attachment</CFormLabel>
                        <CFormInput
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                        />
                        {form.attachmentUrl && (
                          <div className="small mt-1">
                            <a href={form.attachmentUrl} target="_blank" rel="noreferrer">
                              {form.attachmentOriginalName || 'Current attachment'}
                            </a>
                          </div>
                        )}
                      </CCol>

                      {form.status === 'Paid' && (
                        <>
                          <CCol xs={12} md={4}>
                            <CFormLabel>Paid Date</CFormLabel>
                            <CFormInput
                              type="date"
                              value={form.paid_date}
                              onChange={(event) => updateField('paid_date', event.target.value)}
                              required
                            />
                          </CCol>
                          <CCol xs={12} md={4}>
                            <CFormLabel>Paid Amount</CFormLabel>
                            <CFormInput
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.paid_amount}
                              onChange={(event) => updateField('paid_amount', event.target.value)}
                              required
                            />
                          </CCol>
                          <CCol xs={12} md={4}>
                            <CFormLabel>Paid Remarks</CFormLabel>
                            <CFormInput
                              value={form.paid_remarks}
                              onChange={(event) => updateField('paid_remarks', event.target.value)}
                            />
                          </CCol>
                        </>
                      )}
                    </CRow>
                  </>
                )}

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/commercial/debtors')}
                    disabled={saving}
                  >
                    Cancel
                  </CButton>
                  {selectedClient && (
                    <CButton type="submit" color="primary" size="sm" disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </CButton>
                  )}
                </div>
              </CForm>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default DebtorFormPage

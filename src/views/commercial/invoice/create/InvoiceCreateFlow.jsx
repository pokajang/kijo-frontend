import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardFooter, CCardHeader } from '@coreui/react'

import dialog from '../../../../components/dialog/dialogService'
import {
  confirmExistingCommercialDocs,
  hasProjectCommercialDocGroups,
  ProjectCommercialDocsNotice,
  useProjectCommercialDocs,
} from '../../../project/manage/commercialDocsWarning'
import { getCurrentProjectValue } from '../../../project/manage/projectApi'
import { getProjectServiceCategory } from '../../../project/manage/projectServiceCategory'
import { isProjectActive } from '../../../project/manage/projectStatus'
import InvoiceFormShell from '../../../../shared/invoice/InvoiceFormShell'
import { normalizePaymentTermsDays } from '../../../../shared/paymentTerms'
import { isSpecialProjectType } from '../../../../shared/project/projectTypeUtils'
import { buildInvoiceCreatePayload } from './invoiceCreatePayload'
import {
  submitInvoicePayload,
  useEquipmentQuoteData as fetchEquipmentQuoteData,
  useHygieneQuoteData as fetchHygieneQuoteData,
  useJD14ApprovalNo as fetchJD14ApprovalNo,
  useManpowerQuoteData as fetchManpowerQuoteData,
  useSpecialQuoteData as fetchSpecialQuoteData,
  useTrainingQuoteData as fetchTrainingQuoteData,
} from './invoiceCreateApi'
import InvoiceReviewStep from './InvoiceReviewStep'
import { navigateToProjectDocument } from '../../shared/commercialReturnNavigation'
import useCommercialCreationSuccess from '../../shared/useCommercialCreationSuccess'

const getLocalISODate = () => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const getProjectPaymentTerms = (project = {}) => {
  const raw = project?.client_payment_terms_days
  const hasClientTerms = raw !== null && raw !== undefined && raw !== ''
  const days = normalizePaymentTermsDays(raw)
  const source =
    project?.client_payment_terms_source || (hasClientTerms ? 'client' : 'system_default')

  return {
    paymentTermsDays: days,
    paymentTermsBaseDays: days,
    paymentTermsSource: source,
    paymentTermsBaseSource: source,
    overridePaymentTerms: false,
  }
}

const MONEY_TOLERANCE = 0.01

const focusFirstFieldError = (fieldErrors = {}) => {
  const firstPath = Object.keys(fieldErrors)[0]
  if (!firstPath) return
  requestAnimationFrame(() => {
    const input = document.querySelector(`[data-field-path="${firstPath}"]`)
    input?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    input?.focus?.({ preventScroll: true })
  })
}

const toMoneyNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const toNullableMoneyNumber = (value) => {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const isCancelledInvoice = (invoice = {}) => {
  const status = String(invoice.status || '').toLowerCase()
  return status.includes('void') || status.includes('cancel')
}

const buildProjectInvoiceSummary = ({ project, payload, docs }) => {
  const projectValue = toNullableMoneyNumber(getCurrentProjectValue(project, null))
  const invoices = Array.isArray(docs?.invoices) ? docs.invoices : []
  const alreadyInvoiced = invoices
    .filter((invoice) => !isCancelledInvoice(invoice))
    .reduce((total, invoice) => total + toMoneyNumber(invoice.grand_total), 0)
  const thisInvoice = toMoneyNumber(payload?.grand_total)
  const hasProjectValue = projectValue !== null && projectValue > 0
  const remainingBefore = hasProjectValue ? projectValue - alreadyInvoiced : null
  const remainingAfter = hasProjectValue ? projectValue - alreadyInvoiced - thisInvoice : null
  const activeProject = isProjectActive({
    ...project,
    closed: project?.closed || project?.closing_details?.close_date || '',
  })
  const canCloseProject = hasProjectValue && remainingAfter <= MONEY_TOLERANCE && activeProject

  return {
    projectValue,
    alreadyInvoiced,
    thisInvoice,
    remainingBefore,
    remainingAfter,
    hasProjectValue,
    canCloseProject,
  }
}

const fetchersByType = {
  Training: (project, setters) => [
    fetchTrainingQuoteData(project.quote_id, setters.setQuoteDetails, setters.setPricing),
    fetchJD14ApprovalNo(project.id, setters.setGrantApprovalNo),
  ],
  'Equipment Supply': (project, setters) => [
    fetchEquipmentQuoteData(project.quote_id, setters.setQuoteDetails, setters.setPricing),
  ],
  'Manpower Supply': (project, setters) => [
    fetchManpowerQuoteData(project.quote_id, setters.setQuoteDetails, setters.setPricing),
  ],
  'Industrial Hygiene': (project, setters) => [
    fetchHygieneQuoteData(
      project.quote_id,
      setters.setQuoteDetails,
      setters.setPricing,
      setters.setQuoteError,
    ),
  ],
  'Special Service': (project, setters) => [
    fetchSpecialQuoteData(project.quote_id, setters.setQuoteDetails, setters.setPricing),
  ],
  Special: (project, setters) => [
    fetchSpecialQuoteData(project.quote_id, setters.setQuoteDetails, setters.setPricing),
  ],
}

const getInitialPricing = () => ({
  training_total: 0,
  training_qty: 1,
  training_unit: 'Lot',
  meal_total: 0,
  meal_qty: 1,
  meal_unit: 'Lot',
  mobilization_cost: 0,
  mobilization_qty: 1,
  mobilization_unit: 'Lot',
  discount_amount: 0,
  discount_qty: 1,
  discount_unit: 'Lot',
  subtotal: 0,
  sst_rate: 0,
  sst_amount: 0,
  grand_total: 0,
  hrd_rate: 0,
  hrd_amount: 0,
  hrd_qty: 1,
  hrd_unit: 'Lot',
  sub_total: 0,
  discount: 0,
  discount_unit_price: 0,
  delivery_charge: 0,
  delivery_qty: 1,
  delivery_unit: 'Lot',
  delivery_unit_price: 0,
  misc_charge: 0,
  misc_qty: 1,
  misc_unit: 'Lot',
  misc_unit_price: 0,
  sst_percent: 0,
  equipment_items: [],
  month: '',
  duration: 0,
  quantity: 0,
  unit_cost: 0,
  unit: 'pax-mth',
  manpower_items: [],
  claim_type: 'single',
  claim_months_text: '',
  sample_counts: 0,
  sample_unit: 'sample(s)',
  num_work_units: 0,
  unit_price: 0,
  travel_charge: 0,
  travel_qty: 1,
  travel_unit: 'Lot',
  travel_unit_price: 0,
  hygiene_items: [],
  service_title: '',
  remarks: '',
  quotation_remarks: '',
  training_items: [],
  special_items: [],
})

const InvoiceCreateFlow = ({ project, origin = 'project', onBack }) => {
  const navigate = useNavigate()
  const isInvoiceListOrigin = origin === 'invoice-list'
  const presentCreationSuccess = useCommercialCreationSuccess({
    documentType: 'invoice',
    documentLabel: 'Invoice',
    projectId: project.id,
    projectLabel: project.project_name || `Project #${project.id}`,
    origin,
    listOrigin: 'invoice-list',
    listPath: '/commercial/invoice',
    detailPath: '/commercial/invoice',
    viewLabel: 'View Invoice',
    listLabel: 'View Invoice List',
  })
  const commercialDocs = useProjectCommercialDocs(project?.id, true)
  const showCommercialDocsNotice =
    commercialDocs.loading ||
    commercialDocs.error ||
    hasProjectCommercialDocGroups(commercialDocs.groups)
  const fetchedRef = useRef(false)
  const draftAppliedRef = useRef(false)
  const isSupportedType = Boolean(fetchersByType[project?.project_type])
  const allowsManualInvoice =
    project?.project_type === 'Manpower Supply' ||
    (isSpecialProjectType(project?.project_type) && !project?.quote_id)
  const requiresQuote = isSupportedType && !allowsManualInvoice

  const [step, setStep] = useState('edit')
  const [quoteDetails, setQuoteDetails] = useState(null)
  const [clientOverrides, setClientOverrides] = useState({
    clientName: project.client_name || '',
    clientSSM: project.client_ssm || '',
    clientTIN: project.client_tin || '',
    clientAddress: project.client_address || project.client_full_address || '',
    clientCity: project.client_city || '',
    clientState: project.client_state || '',
    clientZip: project.client_zip || '',
    picName: project.client_pics?.[0]?.full_name || '',
    picEmail: project.client_pics?.[0]?.email || '',
    picPhone: project.client_pics?.[0]?.mobile_number || '',
    picPosition: project.client_pics?.[0]?.position || '',
    ...getProjectPaymentTerms(project),
  })
  const [pricing, setPricing] = useState(getInitialPricing)
  const [projectMeta, setProjectMeta] = useState({
    project_name: project.project_name || '',
    project_type: project.project_type || '',
    award_date: (project.award_date || '').split(' ')[0],
    service_start_date: (project.service_start_date || '').split(' ')[0],
    service_end_date: (project.service_end_date || '').split(' ')[0],
    description: project.description || '',
  })
  const [grantApprovalNo, setGrantApprovalNo] = useState('')
  const [paymentMethodOverride, setPaymentMethodOverride] = useState('')
  const [draftReady, setDraftReady] = useState(false)
  const [loadedDraftKey, setLoadedDraftKey] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [reviewPayload, setReviewPayload] = useState(null)
  const [closeProject, setCloseProject] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [deviationReason, setDeviationReason] = useState('')
  const [deviationAcknowledged, setDeviationAcknowledged] = useState(false)
  const [deviationError, setDeviationError] = useState('')
  const [quoteLoadError, setQuoteLoadError] = useState('')
  const [quoteFetchAttempt, setQuoteFetchAttempt] = useState(0)
  const effectivePaymentMethod =
    paymentMethodOverride || (quoteDetails?.payment_method || '').trim().toLowerCase()
  const missingTrainingDates =
    project?.project_type === 'Training' &&
    (!projectMeta.service_start_date || !projectMeta.service_end_date)
  const draftKey = project?.id ? `invoiceDraft:${project.id}` : null
  const [loaNo, setLoaNo] = useState(project.po_loa_number || project.client_award_ref_no || '')
  const [invoiceMeta] = useState(() => ({
    dateIssued: getLocalISODate(),
    status: 'Pending',
  }))

  useEffect(() => {
    fetchedRef.current = false
    draftAppliedRef.current = false
    setStep('edit')
    setDraftReady(false)
    setLoadedDraftKey(null)
    setQuoteDetails(null)
    setPricing(getInitialPricing())
    setGrantApprovalNo('')
    setReviewPayload(null)
    setCloseProject(false)
    setFieldErrors({})
    setDeviationReason('')
    setDeviationAcknowledged(false)
    setDeviationError('')
    setQuoteLoadError('')
    setQuoteFetchAttempt(0)
    setLoaNo(project?.po_loa_number || project?.client_award_ref_no || '')
    setClientOverrides({
      clientName: project?.client_name || '',
      clientSSM: project?.client_ssm || '',
      clientTIN: project?.client_tin || '',
      clientAddress: project?.client_address || project?.client_full_address || '',
      clientCity: project?.client_city || '',
      clientState: project?.client_state || '',
      clientZip: project?.client_zip || '',
      picName: project?.client_pics?.[0]?.full_name || '',
      picEmail: project?.client_pics?.[0]?.email || '',
      picPhone: project?.client_pics?.[0]?.mobile_number || '',
      picPosition: project?.client_pics?.[0]?.position || '',
      ...getProjectPaymentTerms(project),
    })
    setProjectMeta({
      project_name: project?.project_name || '',
      project_type: project?.project_type || '',
      award_date: (project?.award_date || '').split(' ')[0],
      service_start_date: (project?.service_start_date || '').split(' ')[0],
      service_end_date: (project?.service_end_date || '').split(' ')[0],
      description: project?.description || '',
    })
    setPaymentMethodOverride('')
  }, [project])

  useEffect(() => {
    if (!draftKey) {
      setLoadedDraftKey(null)
      setDraftReady(true)
      return
    }
    if (draftReady) return
    const rawDraft = localStorage.getItem(draftKey)
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft)
        if (draft?.clientOverrides) {
          setClientOverrides((prev) => ({ ...prev, ...draft.clientOverrides }))
        }
        if (draft?.pricing) setPricing((prev) => ({ ...prev, ...draft.pricing }))
        if (draft?.paymentMethodOverride !== undefined) {
          setPaymentMethodOverride(draft.paymentMethodOverride)
        }
        if (draft?.grantApprovalNo !== undefined) setGrantApprovalNo(draft.grantApprovalNo)
        if (draft?.loaNo !== undefined) setLoaNo(draft.loaNo)
        draftAppliedRef.current = true
      } catch (err) {
        console.warn('Failed to load invoice draft:', err)
      }
    }
    setLoadedDraftKey(draftKey)
    setDraftReady(true)
  }, [draftKey, draftReady])

  useEffect(() => {
    if (!draftKey || !draftReady || loadedDraftKey !== draftKey) return
    const draft = {
      version: 1,
      clientOverrides,
      pricing,
      paymentMethodOverride,
      grantApprovalNo,
      loaNo,
    }
    localStorage.setItem(draftKey, JSON.stringify(draft))
  }, [
    draftKey,
    draftReady,
    clientOverrides,
    pricing,
    paymentMethodOverride,
    grantApprovalNo,
    loaNo,
    loadedDraftKey,
  ])

  useEffect(() => {
    if (!project?.quote_id || fetchedRef.current) return
    fetchedRef.current = true
    const factory = fetchersByType[project.project_type]
    const setPricingFromQuote = (updater) => {
      if (draftAppliedRef.current) return
      setPricing(updater)
    }
    const aborts = factory
      ? factory(project, {
          setQuoteDetails,
          setPricing: setPricingFromQuote,
          setGrantApprovalNo,
          setQuoteError: setQuoteLoadError,
        })
      : []
    return () => aborts.forEach((abort) => abort && abort())
  }, [project, quoteFetchAttempt])

  useEffect(() => {
    if (!quoteDetails) return
    if (draftAppliedRef.current) {
      draftAppliedRef.current = false
      return
    }

    setLoaNo((prev) => {
      const next = quoteDetails.client_award_ref_no ?? ''
      if (String(next).trim() !== '') return next
      if (String(prev).trim() !== '') return prev
      return project?.po_loa_number || ''
    })

    const normalizedPaymentMethod = (quoteDetails?.payment_method || '').trim().toLowerCase()
    const nextPaymentMethod = paymentMethodOverride || normalizedPaymentMethod
    if (!paymentMethodOverride) setPaymentMethodOverride(normalizedPaymentMethod)

    const baseClient = {
      clientName: quoteDetails.client_name ?? project?.client_name ?? '',
      clientSSM: quoteDetails.client_ssm ?? project?.client_ssm ?? '',
      clientTIN: quoteDetails.client_tin ?? project?.client_tin ?? '',
      clientAddress:
        quoteDetails.client_address ??
        project?.client_address ??
        project?.client_full_address ??
        '',
      clientCity: quoteDetails.client_city ?? project?.client_city ?? '',
      clientState: quoteDetails.client_state ?? project?.client_state ?? '',
      clientZip: quoteDetails.client_zip ?? project?.client_zip ?? '',
      picName: quoteDetails.pic_name ?? project?.client_pics?.[0]?.full_name ?? '',
      picEmail: quoteDetails.pic_email ?? project?.client_pics?.[0]?.email ?? '',
      picPhone: quoteDetails.pic_phone ?? project?.client_pics?.[0]?.mobile_number ?? '',
      picPosition: quoteDetails.pic_position ?? project?.client_pics?.[0]?.position ?? '',
      ...getProjectPaymentTerms(project),
    }

    if (nextPaymentMethod === 'hrd grant') {
      setClientOverrides({
        clientName: 'Human Resource Development Corporation',
        clientSSM: '',
        clientTIN: '',
        clientAddress: 'Wisma HRD Corp, Jalan Beringin',
        clientCity: 'Bukit Damansara',
        clientState: 'Kuala Lumpur',
        clientZip: '50490',
        picName: 'HRD Officer',
        picEmail: '',
        picPhone: '',
        picPosition: 'HRD Officer',
        paymentTermsDays: baseClient.paymentTermsDays,
        paymentTermsBaseDays: baseClient.paymentTermsBaseDays,
        paymentTermsSource: baseClient.paymentTermsSource,
        paymentTermsBaseSource: baseClient.paymentTermsBaseSource,
        overridePaymentTerms: baseClient.overridePaymentTerms,
      })
    } else {
      setClientOverrides(baseClient)
    }
  }, [quoteDetails, paymentMethodOverride, project])

  const getCreateInvoiceArgs = () => ({
    project,
    quoteDetails,
    pricing,
    projectMeta,
    grantApprovalNo,
    clientOverrides,
    paymentMethodOverride: effectivePaymentMethod,
    allowWithoutQuote: allowsManualInvoice,
    loaNo,
    paymentTermsDays: clientOverrides.paymentTermsDays,
    overridePaymentTerms: clientOverrides.overridePaymentTerms,
  })

  const validateInvoiceReady = async () => {
    if (!isSupportedType) {
      dialog.alert(`Unsupported project type: ${project?.project_type || 'Unknown'}`)
      return false
    }
    if (requiresQuote && !project?.quote_id) {
      dialog.alert('Missing quote reference for this project. Unable to create invoice.')
      return false
    }
    if (requiresQuote && !quoteDetails) {
      dialog.alert('Quote details are still loading. Please wait and try again.')
      return false
    }
    if (
      !(await confirmExistingCommercialDocs({
        ...commercialDocs,
        recordLabel: 'commercial records',
        createLabel: 'another invoice',
        title: 'Existing Commercial Records',
      }))
    ) {
      return false
    }
    return true
  }

  const handleReviewInvoice = async () => {
    if (submitting) return
    if (!(await validateInvoiceReady())) return

    const built = buildInvoiceCreatePayload(project.project_type, getCreateInvoiceArgs())
    if (!built.success) {
      if (built.fieldErrors) {
        setFieldErrors(built.fieldErrors)
        focusFirstFieldError(built.fieldErrors)
        return
      }
      dialog.alert(built.message || 'Invoice cannot be created.')
      return
    }

    setReviewPayload(built.payload)
    setFieldErrors({})
    setCloseProject(false)
    setStep('review')
  }

  const projectInvoiceSummary = useMemo(
    () =>
      buildProjectInvoiceSummary({
        project,
        payload: reviewPayload,
        docs: commercialDocs.docs,
      }),
    [commercialDocs.docs, project, reviewPayload],
  )

  const handleConfirmCreateInvoice = async () => {
    if (submitting) return
    if (
      projectInvoiceSummary.remainingAfter !== null &&
      projectInvoiceSummary.remainingAfter < -MONEY_TOLERANCE
    ) {
      if (!deviationReason.trim() || !deviationAcknowledged) {
        setDeviationError(
          !deviationReason.trim()
            ? 'Briefly explain why this invoice exceeds the project value.'
            : 'Confirm the project-value difference to continue.',
        )
        return
      }
    }
    setSubmitting(true)
    try {
      const result = await submitInvoicePayload({
        ...reviewPayload,
        deviation_reason: deviationReason.trim() || null,
        deviation_acknowledged: deviationAcknowledged,
        close_project: Boolean(closeProject && projectInvoiceSummary.canCloseProject),
      })
      if (result?.fieldErrors) {
        const pricingErrors = Object.fromEntries(
          Object.entries(result.fieldErrors).filter(([path]) => path.startsWith('pricing.')),
        )
        if (Object.keys(pricingErrors).length > 0) {
          setFieldErrors(pricingErrors)
          setStep('edit')
          focusFirstFieldError(pricingErrors)
        } else {
          setDeviationError(result.message || 'Review the project-value difference to continue.')
        }
        return
      }
      if (result?.openExisting && result.invoiceId) {
        const detailPath = `/commercial/invoice/${result.invoiceId}`
        if (isInvoiceListOrigin) navigate(detailPath)
        else navigateToProjectDocument(navigate, detailPath, project.id)
        return
      }
      if (result?.success) {
        if (draftKey) localStorage.removeItem(draftKey)
        await presentCreationSuccess({
          detailId: result.invoiceId,
          reference: result.invoiceRefNo || result.invoiceId,
          detailLines: result.projectClosed ? ['Project status was marked Completed.'] : [],
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const invoiceDetails = {
    invoiceRef: '',
    purpose: pricing.service_title || projectMeta.project_name || project?.project_name || '',
    dateIssued: invoiceMeta.dateIssued,
    status: invoiceMeta.status,
    serviceType: getProjectServiceCategory(project || {}),
    serviceTypeLabel: 'Service Category',
    loaNo,
    paidDate: '',
    paidAmount: '',
    paidRemarks: '',
    paymentTermsDays: clientOverrides.paymentTermsDays ?? 30,
    paymentTermsBaseDays:
      clientOverrides.paymentTermsBaseDays ?? clientOverrides.paymentTermsDays ?? 30,
    paymentTermsSource: clientOverrides.paymentTermsSource,
    paymentTermsBaseSource: clientOverrides.paymentTermsBaseSource,
    overridePaymentTerms: clientOverrides.overridePaymentTerms,
  }
  const serviceCategory = getProjectServiceCategory(project || {})

  const commercialDocsNotice = (
    <ProjectCommercialDocsNotice
      groups={commercialDocs.groups}
      loading={commercialDocs.loading}
      error={commercialDocs.error}
      recordLabel="commercial records"
      createLabel="another invoice"
    />
  )

  const renderEditStep = () => (
    <>
      {showCommercialDocsNotice && <CCardBody>{commercialDocsNotice}</CCardBody>}
      {quoteLoadError ? (
        <CCardBody className="pb-0">
          <CAlert
            color="warning"
            className="d-flex align-items-center justify-content-between gap-2"
          >
            <span>{quoteLoadError}</span>
            <CButton
              color="warning"
              variant="outline"
              size="sm"
              onClick={() => {
                fetchedRef.current = false
                setQuoteLoadError('')
                setQuoteFetchAttempt((value) => value + 1)
              }}
            >
              Retry
            </CButton>
          </CAlert>
        </CCardBody>
      ) : null}
      {draftReady ? (
        <InvoiceFormShell
          mode="create"
          client={clientOverrides}
          onClientChange={(event) => {
            const { name, value } = event.target
            setClientOverrides((prev) => ({ ...prev, [name]: value }))
          }}
          showPaymentMethod={project?.project_type === 'Training'}
          paymentMethod={effectivePaymentMethod}
          onPaymentMethodChange={setPaymentMethodOverride}
          project={project || {}}
          quoteDetails={quoteDetails}
          onProjectChange={setProjectMeta}
          invoiceDetails={invoiceDetails}
          onInvoiceDetailsChange={(event) => {
            if (!event?.target) return
            const { name, value, checked } = event.target
            if (name === 'loaNo') setLoaNo(value)
            if (name === 'overridePaymentTerms') {
              setClientOverrides((prev) => ({
                ...prev,
                overridePaymentTerms: checked,
                paymentTermsSource: checked ? 'invoice_override' : prev.paymentTermsBaseSource,
                paymentTermsDays: checked ? prev.paymentTermsDays : prev.paymentTermsBaseDays,
              }))
            }
            if (name === 'paymentTermsDays') {
              setClientOverrides((prev) => ({
                ...prev,
                paymentTermsDays: value,
                paymentTermsSource: 'invoice_override',
                overridePaymentTerms: true,
              }))
            }
          }}
          pricing={pricing}
          setPricing={setPricing}
          fieldErrors={fieldErrors}
          onClearFieldError={(path) =>
            setFieldErrors((prev) => {
              if (!prev[path]) return prev
              const next = { ...prev }
              delete next[path]
              return next
            })
          }
          grantApprovalNo={grantApprovalNo}
          onGrantApprovalChange={(event) => setGrantApprovalNo(event.target.value)}
        />
      ) : (
        <CCardBody>Loading invoice draft...</CCardBody>
      )}
      <CCardFooter className="d-flex justify-content-end gap-2">
        <CButton color="secondary" size="sm" variant="outline" onClick={onBack}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          onClick={handleReviewInvoice}
          disabled={
            !project ||
            !isSupportedType ||
            (requiresQuote && !quoteDetails) ||
            missingTrainingDates ||
            !draftReady ||
            commercialDocs.loading ||
            submitting
          }
        >
          Review Invoice
        </CButton>
      </CCardFooter>
    </>
  )

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div style={{ minWidth: 0 }}>
          <strong>{step === 'review' ? 'Review Invoice' : 'Create Invoice'}</strong>
          <div className="small text-body-secondary text-truncate">
            For project: {project?.project_name || `Project #${project?.id}`}
          </div>
        </div>
        <CButton color="secondary" size="sm" variant="outline" onClick={onBack}>
          {isInvoiceListOrigin ? 'Back to Invoice List' : 'Back to Project'}
        </CButton>
      </CCardHeader>

      {step === 'edit' && renderEditStep()}
      {step === 'review' && (
        <InvoiceReviewStep
          payload={reviewPayload}
          project={project}
          serviceCategory={serviceCategory}
          projectInvoiceSummary={projectInvoiceSummary}
          closeProject={closeProject && projectInvoiceSummary.canCloseProject}
          onCloseProjectChange={setCloseProject}
          submitting={submitting}
          onBack={() => setStep('edit')}
          onConfirm={handleConfirmCreateInvoice}
          deviationReason={deviationReason}
          deviationAcknowledged={deviationAcknowledged}
          deviationError={deviationError}
          onDeviationReasonChange={(value) => {
            setDeviationReason(value)
            setDeviationError('')
          }}
          onDeviationAcknowledgedChange={(value) => {
            setDeviationAcknowledged(value)
            setDeviationError('')
          }}
        />
      )}
    </CCard>
  )
}

export default InvoiceCreateFlow

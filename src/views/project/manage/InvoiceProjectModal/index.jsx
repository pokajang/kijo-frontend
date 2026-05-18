// src/views/project/InvoiceProjectModal/index.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CCard,
  CButton,
} from '@coreui/react'

import InvoiceFormShell from '../../../../shared/invoice/InvoiceFormShell'

import {
  useTrainingQuoteData as fetchTrainingQuoteData,
  useEquipmentQuoteData as fetchEquipmentQuoteData,
  useManpowerQuoteData as fetchManpowerQuoteData,
  useSpecialQuoteData as fetchSpecialQuoteData,
  useHygieneQuoteData as fetchHygieneQuoteData,
  useJD14ApprovalNo as fetchJD14ApprovalNo,
  createInvoiceForType,
} from './actionHandlers'
import dialog from '../../../../components/dialog/dialogService'
import {
  confirmExistingCommercialDocs,
  ProjectCommercialDocsNotice,
  useProjectCommercialDocs,
} from '../commercialDocsWarning'

const getLocalISODate = () => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
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
    fetchHygieneQuoteData(project.quote_id, setters.setQuoteDetails, setters.setPricing),
  ],
  'Special Service': (project, setters) => [
    fetchSpecialQuoteData(project.quote_id, setters.setQuoteDetails, setters.setPricing),
  ],
  Special: (project, setters) => [
    fetchSpecialQuoteData(project.quote_id, setters.setQuoteDetails, setters.setPricing),
  ],
}

export default function InvoiceProjectModal({ visible, project, onClose, onSubmit }) {
  const navigate = useNavigate()
  const commercialDocs = useProjectCommercialDocs(project?.id, visible)
  const fetchedRef = useRef(false)
  const draftAppliedRef = useRef(false)
  const isSupportedType = Boolean(fetchersByType[project?.project_type])
  const allowsManualInvoice = project?.project_type === 'Manpower Supply'
  const requiresQuote = isSupportedType && !allowsManualInvoice

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
  })

  const [pricing, setPricing] = useState({
    // Training
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
    // Equipment
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
    // Manpower
    month: '',
    duration: 0,
    quantity: 0,
    unit_cost: 0,
    unit: 'pax-mth',
    manpower_items: [],
    claim_type: 'single',
    claim_months_text: '',
    // Hygiene
    sample_counts: 0,
    sample_unit: 'sample(s)',
    num_work_units: 0,
    unit_price: 0,
    travel_charge: 0,
    travel_qty: 1,
    travel_unit: 'Lot',
    travel_unit_price: 0,
    hygiene_items: [],
    // Form fields
    service_title: '',
    remarks: '',
    training_items: [],
    special_items: [],
  })
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
    setDraftReady(false)
    setQuoteDetails(null)
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

  // Load saved draft once per project when modal opens
  useEffect(() => {
    if (!visible || !draftKey || draftReady) return
    const rawDraft = localStorage.getItem(draftKey)
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft)
        if (draft?.clientOverrides) {
          setClientOverrides((prev) => ({ ...prev, ...draft.clientOverrides }))
        }
        if (draft?.pricing) {
          setPricing((prev) => ({ ...prev, ...draft.pricing }))
        }
        if (draft?.paymentMethodOverride !== undefined) {
          setPaymentMethodOverride(draft.paymentMethodOverride)
        }
        if (draft?.grantApprovalNo !== undefined) {
          setGrantApprovalNo(draft.grantApprovalNo)
        }
        if (draft?.loaNo !== undefined) {
          setLoaNo(draft.loaNo)
        }
        draftAppliedRef.current = true
      } catch (err) {
        console.warn('Failed to load invoice draft:', err)
      }
    }
    setDraftReady(true)
  }, [visible, draftKey, draftReady])

  // Persist draft while editing
  useEffect(() => {
    if (!visible || !draftKey || !draftReady) return
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
    visible,
    draftKey,
    draftReady,
    clientOverrides,
    pricing,
    paymentMethodOverride,
    grantApprovalNo,
    loaNo,
  ])

  // 1) Fetch quote data exactly once
  useEffect(() => {
    if (!project?.quote_id || fetchedRef.current) return
    fetchedRef.current = true
    const factory = fetchersByType[project.project_type]
    const aborts = factory
      ? factory(project, {
          setQuoteDetails,
          setPricing,
          setGrantApprovalNo,
        })
      : []
    return () => aborts.forEach((a) => a && a())
  }, [project])

  // 2) When quoteDetails arrive, reseed clientOverrides
  useEffect(() => {
    if (!quoteDetails) return
    if (draftAppliedRef.current) {
      draftAppliedRef.current = false
      return
    }

    //set loa number
    setLoaNo((prev) => {
      const next = quoteDetails.client_award_ref_no ?? ''
      if (String(next).trim() !== '') return next
      if (String(prev).trim() !== '') return prev
      return project?.po_loa_number || ''
    })

    const normalizedPaymentMethod = (quoteDetails?.payment_method || '').trim().toLowerCase()
    const nextPaymentMethod = paymentMethodOverride || normalizedPaymentMethod
    if (!paymentMethodOverride) {
      setPaymentMethodOverride(normalizedPaymentMethod)
    }

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
    }

    if (nextPaymentMethod === 'hrd grant') {
      setClientOverrides({
        clientName: 'Human Resource Development Corporation',
        clientSSM: '', // Optional if known
        clientTIN: '',
        clientAddress: 'Wisma HRD Corp, Jalan Beringin',
        clientCity: 'Bukit Damansara',
        clientState: 'Kuala Lumpur',
        clientZip: '50490',
        picName: 'HRD Officer',
        picEmail: '', // Fill if you have a generic HRD email
        picPhone: '', // Fill if you have a generic HRD phone
        picPosition: 'HRD Officer',
      })
    } else {
      setClientOverrides(baseClient)
    }
  }, [quoteDetails, paymentMethodOverride, project])

  // 3) Generate invoice
  const handleGenerateInvoice = async () => {
    if (!isSupportedType) {
      dialog.alert(`Unsupported project type: ${project?.project_type || 'Unknown'}`)
      return
    }

    if (requiresQuote && !project?.quote_id) {
      dialog.alert('Missing quote reference for this project. Unable to create invoice.')
      return
    }

    if (requiresQuote && !quoteDetails) {
      dialog.alert('Quote details are still loading. Please wait and try again.')
      return
    }

    if (
      !(await confirmExistingCommercialDocs({
        ...commercialDocs,
        recordLabel: 'commercial records',
        createLabel: 'another invoice',
        title: 'Existing Commercial Records',
      }))
    ) {
      return
    }

    const result = await createInvoiceForType(project.project_type, {
      project,
      quoteDetails,
      pricing,
      projectMeta,
      grantApprovalNo,
      clientOverrides,
      paymentMethodOverride: effectivePaymentMethod,
      allowWithoutQuote: allowsManualInvoice,
      loaNo,
      navigate,
    })
    if (result?.success) {
      if (draftKey) localStorage.removeItem(draftKey)
      if (onSubmit) onSubmit()
    }
  }

  if (!visible) return null

  const invoiceDetails = {
    invoiceRef: '',
    purpose: pricing.service_title || projectMeta.project_name || project?.project_name || '',
    dateIssued: invoiceMeta.dateIssued,
    status: invoiceMeta.status,
    serviceType: project?.project_type || '',
    loaNo,
    paidDate: '',
    paidAmount: '',
    paidRemarks: '',
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      backdrop="static"
      scrollable
    >
      <CModalHeader onClose={onClose}>
        <CModalTitle>Generate Invoice</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <ProjectCommercialDocsNotice
          groups={commercialDocs.groups}
          loading={commercialDocs.loading}
          error={commercialDocs.error}
          recordLabel="commercial records"
          createLabel="another invoice"
        />
        <CCard>
          <InvoiceFormShell
            mode="create"
            client={clientOverrides}
            onClientChange={(e) => {
              const { name, value } = e.target
              setClientOverrides((prev) => ({
                ...prev,
                [name]: value,
              }))
            }}
            showPaymentMethod={project?.project_type === 'Training'}
            paymentMethod={effectivePaymentMethod}
            onPaymentMethodChange={setPaymentMethodOverride}
            project={project || {}}
            quoteDetails={quoteDetails}
            onProjectChange={setProjectMeta}
            invoiceDetails={invoiceDetails}
            onInvoiceDetailsChange={(e) => {
              if (!e?.target) return
              const { name, value } = e.target
              if (name === 'loaNo') setLoaNo(value)
            }}
            pricing={pricing}
            setPricing={setPricing}
            grantApprovalNo={grantApprovalNo}
            onGrantApprovalChange={(e) => setGrantApprovalNo(e.target.value)}
          />
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          onClick={handleGenerateInvoice}
          disabled={
            !project ||
            !isSupportedType ||
            (requiresQuote && !quoteDetails) ||
            missingTrainingDates ||
            commercialDocs.loading
          }
        >
          Create Invoice
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

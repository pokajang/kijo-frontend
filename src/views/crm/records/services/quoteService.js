// crm/records/services/quoteService.js
// Used to fetch all quotes from all services and rearrange fields into standardized data stream

const fetchJsonCompat = async (url) => {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  const payload = await res.json()
  if (
    res.ok ||
    payload?.status === 'success' ||
    payload?.success === true ||
    Array.isArray(payload)
  ) {
    return payload
  }
  throw new Error(payload?.message || `HTTP error! status: ${res.status}`)
}

const unwrapRows = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows
  return []
}

const unwrapAuxArray = (payload, ...keys) => {
  for (const key of keys) {
    const value = payload?.[key]
    if (Array.isArray(value)) return value
    if (Array.isArray(payload?.data?.[key])) return payload.data[key]
  }
  return []
}

const toBool = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  }
  return false
}

const toPositiveInt = (value) => {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

const normalizeProposalPayload = (row = {}, fallback = {}) => {
  const proposal = row.proposal || {}

  return {
    attachedToPdf: toBool(
      proposal.attachedToPdf ?? proposal.attached_to_pdf ?? fallback.attachedToPdf,
    ),
    templateType: proposal.templateType ?? proposal.template_type ?? fallback.templateType ?? null,
    templateId: toPositiveInt(proposal.templateId ?? proposal.template_id ?? fallback.templateId),
    title: proposal.title ?? fallback.title ?? null,
    language: proposal.language ?? fallback.language ?? null,
    canPreviewInline: toBool(
      proposal.canPreviewInline ?? proposal.can_preview_inline ?? fallback.canPreviewInline,
    ),
  }
}

const normalizeProjectStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase()

const isRealizedProjectStatus = (status) =>
  ['active', 'completed'].includes(normalizeProjectStatus(status))

const buildAwardHistoryMap = (rows = []) =>
  rows.reduce((acc, r) => {
    const qid = Number(r.quote_id)
    if (!acc[qid]) acc[qid] = []
    acc[qid].push({
      id: Number(r.id),
      awardDate: r.award_date || null,
      createdAt: r.created_at || null,
      status: r.status || '',
      quoteValue: Number(r.quote_value || 0),
    })
    return acc
  }, {})

const getProjectOutcomeFields = (awardHistory = []) => {
  const counts = awardHistory.reduce(
    (acc, project) => {
      const status = normalizeProjectStatus(project.status)
      acc.total += 1
      if (status === 'active') acc.active += 1
      if (status === 'completed') acc.completed += 1
      if (status === 'terminated') acc.terminated += 1
      return acc
    },
    { active: 0, completed: 0, terminated: 0, total: 0 },
  )
  const terminatedProjectValue = awardHistory
    .filter((project) => normalizeProjectStatus(project.status) === 'terminated')
    .reduce((sum, project) => sum + Number(project.quoteValue || 0), 0)
  const realizedProjectValue = awardHistory
    .filter((project) => isRealizedProjectStatus(project.status))
    .reduce((sum, project) => sum + Number(project.quoteValue || 0), 0)

  return {
    projectStatusCounts: counts,
    project_status_counts: counts,
    terminatedProjectValue,
    terminated_project_value: terminatedProjectValue,
    realizedProjectValue,
    realized_project_value: realizedProjectValue,
  }
}

export async function fetchTrainingQuotes() {
  try {
    const payload = await fetchJsonCompat(`${import.meta.env.VITE_API_BASE}quote-records/training`)

    // Support both new ({status,data,followups}) and legacy (array) shapes
    const rows = unwrapRows(payload)
    const fuRows = unwrapAuxArray(payload, 'followups', 'follow_ups')
    const ahRows = unwrapAuxArray(payload, 'award_history', 'awardHistory')

    // Build quote_id -> [followUps...] (newest-first; SQL already ordered DESC)
    const fuMap = fuRows.reduce((acc, r) => {
      const qid = Number(r.quote_id)
      if (!acc[qid]) acc[qid] = []
      acc[qid].push({
        id: Number(r.id),
        remarks: r.remarks || '',
        followUpDate: r.follow_up_date || null,
        createdBy: r.created_by ?? null,
        createdAt: r.created_at || null,
        quoteType: r.quote_type || 'training',
      })
      return acc
    }, {})

    const ahMap = buildAwardHistoryMap(ahRows)

    const formatted = rows.map((row) => {
      const id = Number(row.id)
      const followUps = fuMap[id] || []
      const awardHistory = ahMap[id] || []
      const rawRemarks = (row.status_remarks || '').trim() // exact DB value

      return {
        id,
        clientId: row.client_id ? Number(row.client_id) : null,
        quotationId: row.quote_ref_no,
        dateCreated: row.created_at,
        dateUpdated: row.updated_at,
        status: row.status || 'Open',
        awardCount: parseInt(row.award_count ?? awardHistory.length ?? 0, 10),

        // Keep the raw DB status_remarks EXACTLY as-is (will render on top)
        statusRemarks: rawRemarks,

        awardDate: row.award_date,
        clientLoaRefNo: row.client_award_ref_no,
        inquirySource: row.inquiry_source || '',
        inquirySourceRemarks: row.inquiry_source_remarks || '',

        createdById: row.created_by_id ? parseInt(row.created_by_id, 10) : null,
        createdByName: row.created_by_name || '-',
        createdByCode: row.created_by_code || '-',

        attach_proposal: Number(row.attach_proposal) === 1,
        attachProposal: Number(row.attach_proposal) === 1,
        proposalId: row.proposal_id
          ? Number(row.proposal_id)
          : row.training_id
            ? Number(row.training_id)
            : null,
        proposal_id: row.proposal_id
          ? Number(row.proposal_id)
          : row.training_id
            ? Number(row.training_id)
            : null,
        proposalLanguage: row.proposal_language || 'en',
        proposal_language: row.proposal_language || 'en',
        proposal: normalizeProposalPayload(row, {
          attachedToPdf: Number(row.attach_proposal) === 1,
          templateType: 'training',
          templateId: row.proposal_id ? Number(row.proposal_id) : null,
          language: row.proposal_language || null,
        }),
        revisionNo: row.revision_no ? parseInt(row.revision_no, 10) : 0,
        priceExceptionRequestId: row.price_exception_request_id
          ? Number(row.price_exception_request_id)
          : null,
        activeNegotiationRequestCount: Number(row.active_price_exception_request_count || 0),

        clientDetails: {
          fullName: row.pic_name,
          email: row.pic_email,
          mobileNumber: row.pic_phone,
          position: row.pic_position,
          companyName: row.client_name,
          ssmNumber: row.client_ssm,
          address: row.client_address,
          city: row.client_city,
          state: row.client_state,
          zip: row.client_zip,
        },

        formData: {
          trainingTopic: row.training_title,
          trainingId: row.training_id ? Number(row.training_id) : null,
          proposalId: row.proposal_id ? Number(row.proposal_id) : null,
          trainingTypeOption: row.training_type,
          paymentMethod: row.payment_method,
          selectedDate: row.proposed_date,
          selectedEndDate: row.proposed_end_date,
          toBeConfirmed: toBool(row.to_be_confirmed),
          trainingVenue: row.venue,
          trainingInqRemarks: row.remarks,

          sessionCount: parseInt(row.session_count ?? 0, 10),
          trainingDuration: parseInt(row.duration_per_session ?? 0, 10),
          durationUnit: row.duration_unit,
          noOfPax: parseInt(row.pax ?? 0, 10),

          unitPrice: parseFloat(row.unit_price ?? 0),
          travelCharge: parseFloat(row.travel_charge ?? 0),
          mealsProvided: row.meals_provided,
          mealPrice: parseFloat(row.meal_price ?? 0),

          discountType: row.discount_type,
          discountValue: parseFloat(row.discount_value ?? 0),

          sstRate: parseFloat(row.sst_rate ?? 0),
          hrdCharge: parseFloat(row.hrd_charge ?? 0),

          targetGroups: row.target_groups,
        },

        amount: row.grand_total != null ? Number(row.grand_total).toFixed(2) : '0.00',
        subtotal: parseFloat(row.subtotal ?? 0),
        sst_amount: parseFloat(row.sst_amount ?? 0),
        hrd_amount: parseFloat(row.hrd_amount ?? 0),
        discountAmount: parseFloat(row.discount_amount ?? 0),

        personInCharge: row.pic_name,

        // Attach ALL follow-ups (array; newest first)
        followUps,
        awardHistory,
        ...getProjectOutcomeFields(awardHistory),
      }
    })

    return formatted
  } catch (error) {
    console.error('Error fetching training quotes:', error)
    return []
  }
}

// fetch ih quotes
// src/views/crm/records/services/quoteService.js

export async function fetchIHQuotes() {
  try {
    const payload = await fetchJsonCompat(`${import.meta.env.VITE_API_BASE}quote-records/ih`)

    // Support both new ({status,data,followups}) and legacy (array) shapes
    const rows = unwrapRows(payload)
    const fuRows = unwrapAuxArray(payload, 'followups', 'follow_ups')
    const ahRows = unwrapAuxArray(payload, 'award_history', 'awardHistory')

    // Build quote_id -> [followUps...] (newest-first; SQL should already order DESC)
    const fuMap = fuRows.reduce((acc, r) => {
      const qid = Number(r.quote_id)
      if (!acc[qid]) acc[qid] = []
      acc[qid].push({
        id: Number(r.id),
        remarks: r.remarks || '',
        followUpDate: r.follow_up_date || null,
        createdBy: r.created_by ?? null,
        createdAt: r.created_at || null,
        quoteType: r.quote_type || 'ih',
      })
      return acc
    }, {})

    const ahMap = buildAwardHistoryMap(ahRows)

    const formatted = rows.map((row) => {
      const id = Number(row.id)
      const followUps = fuMap[id] || []
      const awardHistory = ahMap[id] || []
      const rawRemarks = (row.status_remarks || '').trim() // exact DB value

      return {
        // core fields
        id,
        clientId: row.client_id ? Number(row.client_id) : null,
        quotationId: row.quote_ref_no,
        revisionNo: row.revision_no ? parseInt(row.revision_no, 10) : 0,
        dateCreated: row.created_at,
        dateUpdated: row.updated_at,
        status: row.status || 'Open',
        awardCount: parseInt(row.award_count ?? awardHistory.length ?? 0, 10),
        statusRemarks: rawRemarks, // UI shows this on top (dateUpdated → remark)
        awardDate: row.award_date,
        clientLoaRefNo: row.client_award_ref_no,
        inquirySource: row.inquiry_source || '',
        inquirySourceRemarks: row.inquiry_source_remarks || '',

        // creator info
        createdById: row.created_by_id ? parseInt(row.created_by_id, 10) : null,
        createdByName: row.created_by_name || '-',
        createdByCode: row.created_by_code || '-',

        // proposal flag
        attach_proposal: Number(row.attach_proposal) === 1,
        attachProposal: Number(row.attach_proposal) === 1,
        proposalId: row.service_id ? Number(row.service_id) : null,
        proposal_id: row.service_id ? Number(row.service_id) : null,
        proposalLanguage: row.proposal_language || 'en',
        proposal_language: row.proposal_language || 'en',
        proposal: normalizeProposalPayload(row, {
          attachedToPdf: Number(row.attach_proposal) === 1,
          templateType: 'ih',
          templateId: row.service_id ? Number(row.service_id) : null,
          language: row.proposal_language || null,
        }),
        priceExceptionRequestId: row.price_exception_request_id
          ? Number(row.price_exception_request_id)
          : null,
        activeNegotiationRequestCount: Number(row.active_price_exception_request_count || 0),

        // client details
        clientDetails: {
          fullName: row.pic_name,
          email: row.pic_email,
          mobileNumber: row.pic_phone,
          position: row.pic_position,
          companyName: row.client_name,
          ssmNumber: row.client_ssm,
          address: row.client_address,
          city: row.client_city,
          state: row.client_state,
          zip: row.client_zip,
        },

        // service‐specific form data
        formData: {
          serviceGroup: row.service_group,
          serviceId: row.service_id ? Number(row.service_id) : null,
          serviceTitle: row.service_title,
          serviceCode: row.service_code,
          siteAddress: row.site_address,

          sampleCounts: parseInt(row.sample_counts ?? 0, 10),
          sampleUnit: row.sample_unit,
          numWorkUnits: parseInt(row.num_work_units ?? 0, 10),
          inquiryRemarks: row.inquiry_remarks,

          unitPrice: parseFloat(row.unit_price ?? 0),
          travelCharge: parseFloat(row.travel_charge ?? 0),

          discountValue: parseFloat(row.discount ?? 0),
          sstPercent: parseFloat(row.sst_percent ?? 0),
        },

        // totals
        amount: row.grand_total != null ? Number(row.grand_total).toFixed(2) : '0.00',
        subtotal: parseFloat(row.sub_total ?? 0),
        sst_amount: parseFloat(row.sst_amount ?? 0),
        discountAmount: parseFloat(row.discount ?? 0),

        // PIC in table
        personInCharge: row.pic_name,

        // attach ALL follow-ups (array, newest first)
        followUps,
        awardHistory,
        ...getProjectOutcomeFields(awardHistory),
      }
    })

    return formatted
  } catch (error) {
    console.error('Error fetching IH quotes:', error)
    return []
  }
}

// fetch manpower quotes: includes ALL follow-ups (newest first)
export async function fetchManpowerQuotes() {
  try {
    const payload = await fetchJsonCompat(`${import.meta.env.VITE_API_BASE}quote-records/manpower`)

    // Support both new ({status,data,followups}) and legacy (array) shapes
    const rows = unwrapRows(payload)
    const fuRows = unwrapAuxArray(payload, 'followups', 'follow_ups')
    const ahRows = unwrapAuxArray(payload, 'award_history', 'awardHistory')

    // Build quote_id -> [followUps...] (newest-first; SQL ordered DESC)
    const fuMap = fuRows.reduce((acc, r) => {
      const qid = Number(r.quote_id)
      if (!acc[qid]) acc[qid] = []
      acc[qid].push({
        id: Number(r.id),
        remarks: r.remarks || '',
        followUpDate: r.follow_up_date || null,
        createdBy: r.created_by ?? null,
        createdAt: r.created_at || null,
        quoteType: r.quote_type || 'manpower',
      })
      return acc
    }, {})

    const ahMap = buildAwardHistoryMap(ahRows)

    const formatted = rows.map((row) => {
      const id = Number(row.id)
      const followUps = fuMap[id] || []
      const awardHistory = ahMap[id] || []
      const rawRemarks = (row.status_remarks || '').trim() // exact DB value

      return {
        // core fields
        id,
        clientId: row.client_id ? Number(row.client_id) : null,
        quotationId: row.quote_ref_no,
        revisionNo: row.revision_no ? parseInt(row.revision_no, 10) : 0,
        dateCreated: row.created_at,
        dateUpdated: row.updated_at,
        status: row.status || 'Open',
        awardCount: parseInt(row.award_count ?? awardHistory.length ?? 0, 10),
        statusRemarks: rawRemarks,
        awardDate: row.award_date || null,
        clientLoaRefNo: row.client_award_ref_no || null,
        inquirySource: row.inquiry_source || '',
        inquirySourceRemarks: row.inquiry_source_remarks || '',

        // creator info
        createdById: row.created_by_id ? parseInt(row.created_by_id, 10) : null,
        createdByName: row.created_by_name || '-',
        createdByCode: row.created_by_code || '-',

        // proposal flag
        attach_proposal: Number(row.attach_proposal) === 1,
        attachProposal: Number(row.attach_proposal) === 1,
        proposalId: row.mp_id ? Number(row.mp_id) : null,
        proposal_id: row.mp_id ? Number(row.mp_id) : null,
        proposalLanguage: row.proposal_language || 'en',
        proposal_language: row.proposal_language || 'en',
        proposal: normalizeProposalPayload(row, {
          attachedToPdf: Number(row.attach_proposal) === 1,
          templateType: 'manpower',
          templateId: row.mp_id ? Number(row.mp_id) : null,
          language: row.proposal_language || null,
        }),
        priceExceptionRequestId: row.price_exception_request_id
          ? Number(row.price_exception_request_id)
          : null,
        activeNegotiationRequestCount: Number(row.active_price_exception_request_count || 0),

        // client details
        clientDetails: {
          fullName: row.pic_name,
          email: row.pic_email,
          mobileNumber: row.pic_phone,
          position: row.pic_position,
          companyName: row.client_name,
          ssmNumber: row.client_ssm,
          address: row.client_address,
          city: row.client_city,
          state: row.client_state,
          zip: row.client_zip,
        },

        // service-specific form data
        formData: {
          serviceGroup: row.service_group,
          mpId: row.mp_id ? Number(row.mp_id) : null,
          serviceTitle: row.service_title,
          serviceCode: row.service_code,
          manpowerRateType: row.manpower_rate_type || '',
          billingUnit: row.billing_unit || 'month',
          natureOfWork: row.nature_of_work,
          siteLocation: row.site_location,
          durationMonths: parseInt(row.duration_months ?? 0, 10),
          durationHours: parseFloat(row.duration_hours ?? 0),
          noOfPax: parseInt(row.no_of_pax ?? 0, 10),
          inquiryRemarks: row.inquiry_remarks || '',
          requiresManagementApproval: toBool(row.requires_management_approval),

          unitCost: parseFloat(row.unit_cost ?? 0),
          discount: parseFloat(row.discount ?? 0),
          sstPercent: parseFloat(row.sst_percent ?? 0),
        },

        // totals
        amount: row.grand_total != null ? Number(row.grand_total).toFixed(2) : '0.00',
        subtotal: parseFloat(row.sub_total ?? 0),
        sst_amount: parseFloat(row.sst_amount ?? 0),
        discountAmount: parseFloat(row.discount ?? 0),

        // display PIC in table
        personInCharge: row.pic_name,

        // attach ALL follow-ups (array, newest first)
        followUps,
        awardHistory,
        ...getProjectOutcomeFields(awardHistory),
      }
    })

    return formatted
  } catch (error) {
    console.error('Error fetching manpower quotes:', error)
    return []
  }
}

// fetch special quotes, including nested line-items and ALL follow-ups (newest first)
export async function fetchSpecialQuotes() {
  try {
    const payload = await fetchJsonCompat(`${import.meta.env.VITE_API_BASE}quote-records/special`)

    // Support both new ({status,data,followups}) and legacy (array) shapes
    const rows = unwrapRows(payload)
    const fuRows = unwrapAuxArray(payload, 'followups', 'follow_ups')
    const ahRows = unwrapAuxArray(payload, 'award_history', 'awardHistory')

    // Build quote_id -> [followUps...] (newest-first; SQL should already order DESC)
    const fuMap = fuRows.reduce((acc, r) => {
      const qid = Number(r.quote_id)
      if (!acc[qid]) acc[qid] = []
      acc[qid].push({
        id: Number(r.id),
        remarks: r.remarks || '',
        followUpDate: r.follow_up_date || null,
        createdBy: r.created_by ?? null,
        createdAt: r.created_at || null,
        quoteType: r.quote_type || 'special',
      })
      return acc
    }, {})

    const ahMap = buildAwardHistoryMap(ahRows)

    return rows.map((row) => {
      const id = Number(row.id)
      const followUps = fuMap[id] || []
      const awardHistory = ahMap[id] || []
      const rawRemarks = (row.status_remarks || '').trim() // exact DB value

      return {
        // --- Core quote fields ---
        id,
        clientId: row.client_id ? Number(row.client_id) : null,
        quotationId: row.quote_ref_no,
        revisionNo: row.revision_no ? parseInt(row.revision_no, 10) : 0,
        dateCreated: row.created_at,
        dateUpdated: row.updated_at,
        status: row.status || 'Open',
        awardCount: parseInt(row.award_count ?? awardHistory.length ?? 0, 10),
        statusRemarks: rawRemarks, // UI shows on top (dateUpdated → remark)
        awardDate: row.award_date || null,
        clientLoaRefNo: row.client_award_ref_no || null,
        inquirySource: row.inquiry_source || '',
        inquirySourceRemarks: row.inquiry_source_remarks || '',

        // --- Creator info ---
        createdById: row.created_by_id ? parseInt(row.created_by_id, 10) : null,
        createdByName: row.created_by_name || '-',
        createdByCode: row.created_by_code || '-',

        // --- Proposal flag ---
        attachProposal: Number(row.attach_proposal) === 1,
        attach_proposal: Number(row.attach_proposal) === 1,
        proposalId: row.sp_id ? Number(row.sp_id) : null,
        proposal_id: row.sp_id ? Number(row.sp_id) : null,
        proposalLanguage: row.proposal_language || 'en',
        proposal_language: row.proposal_language || 'en',
        proposal: normalizeProposalPayload(row, {
          attachedToPdf: Number(row.attach_proposal) === 1,
          templateType: 'special',
          templateId: row.sp_id ? Number(row.sp_id) : null,
          language: row.proposal_language || null,
        }),
        priceExceptionRequestId: row.price_exception_request_id
          ? Number(row.price_exception_request_id)
          : null,
        activeNegotiationRequestCount: Number(row.active_price_exception_request_count || 0),

        // --- Client details ---
        clientDetails: {
          companyName: row.client_name,
          ssmNumber: row.client_ssm,
          address: row.client_address,
          city: row.client_city,
          state: row.client_state,
          zip: row.client_zip,
          fullName: row.pic_name,
          email: row.pic_email,
          mobileNumber: row.pic_phone,
          position: row.pic_position,
        },

        // --- Service‐specific form data ---
        formData: {
          spId: row.sp_id ? parseInt(row.sp_id, 10) : null,
          proposalId: row.sp_id ? parseInt(row.sp_id, 10) : null,
          serviceTitle: row.service_title || '',
          serviceCode: row.service_code || '',
          generalRemarks: row.general_remarks || '',
        },

        // --- Totals & pricing ---
        subtotal: parseFloat(row.sub_total ?? 0),
        sstAmount: parseFloat(row.sst_amount ?? 0),
        discount: parseFloat(row.discount ?? 0),
        amount: row.grand_total != null ? Number(row.grand_total).toFixed(2) : '0.00',

        // --- Line‐items array (with unit, quantity, unitPrice, lineTotal & timestamps) ---
        lineItems: Array.isArray(row.line_items)
          ? row.line_items.map((item) => ({
              id: parseInt(item.id, 10),
              serviceId: item.service_id ? parseInt(item.service_id, 10) : null,
              title: item.line_item_title || '',
              description: item.description || '',
              unit: item.unit || '',
              quantity: item.quantity ? parseInt(item.quantity, 10) : 1,
              unitPrice: item.unit_price ? parseFloat(item.unit_price) : 0,
              lineTotal: item.line_total != null ? Number(item.line_total).toFixed(2) : '0.00',
              createdBy: item.created_by ? parseInt(item.created_by, 10) : null,
              createdAt: item.created_at || null,
              updatedAt: item.updated_at || null,
            }))
          : [],

        // --- Display helper for table ---
        personInCharge: row.pic_name,

        // --- Attach ALL follow-ups (array, newest first) ---
        followUps,
        awardHistory,
        ...getProjectOutcomeFields(awardHistory),
      }
    })
  } catch (error) {
    console.error('Error fetching special quotes:', error)
    return []
  }
}

// fetch equipment quotes, including catalog-enriched lineItems and ALL follow-ups (newest first)

export async function fetchEquipmentQuotes() {
  try {
    const payload = await fetchJsonCompat(`${import.meta.env.VITE_API_BASE}quote-records/equipment`)

    // Support both new ({status,data,followups}) and legacy (array) shapes
    const rows = unwrapRows(payload)
    const fuRows = unwrapAuxArray(payload, 'followups', 'follow_ups')
    const ahRows = unwrapAuxArray(payload, 'award_history', 'awardHistory')

    // Build quote_id -> [followUps...] (newest-first; SQL orders DESC by date/id)
    const fuMap = fuRows.reduce((acc, r) => {
      const qid = Number(r.quote_id)
      if (!acc[qid]) acc[qid] = []
      acc[qid].push({
        id: Number(r.id),
        remarks: r.remarks || '',
        followUpDate: r.follow_up_date || null,
        createdBy: r.created_by ?? null,
        createdAt: r.created_at || null,
        quoteType: r.quote_type || 'equipment',
      })
      return acc
    }, {})

    const ahMap = buildAwardHistoryMap(ahRows)

    return rows.map((row) => {
      const id = Number(row.id)
      const followUps = fuMap[id] || []
      const awardHistory = ahMap[id] || []
      const rawRemarks = (row.status_remarks || '').trim() // exact DB value

      return {
        // --- Core quote fields ---
        id,
        clientId: row.client_id ? Number(row.client_id) : null,
        quotationId: row.quote_ref_no,
        revisionNo: row.revision_no ? parseInt(row.revision_no, 10) : 0,
        dateCreated: row.created_at,
        dateUpdated: row.updated_at,
        status: row.status || 'Open',
        awardCount: parseInt(row.award_count ?? awardHistory.length ?? 0, 10),
        statusRemarks: rawRemarks,
        awardDate: row.award_date || null,
        clientLoaRefNo: row.client_award_ref_no || null,
        inquirySource: row.inquiry_source || '',
        inquirySourceRemarks: row.inquiry_source_remarks || '',

        // --- Creator info ---
        createdById: row.created_by_id ? parseInt(row.created_by_id, 10) : null,
        createdByName: row.created_by_name || '-',
        createdByCode: row.created_by_code || '-',

        // --- Proposal flag ---
        attachProposal: Number(row.attach_proposal) === 1,
        attach_proposal: Number(row.attach_proposal) === 1,
        proposal: normalizeProposalPayload(row, {
          attachedToPdf: Number(row.attach_proposal) === 1,
          templateType: null,
          templateId: null,
          title: null,
          language: null,
          canPreviewInline: false,
        }),
        priceExceptionRequestId: row.price_exception_request_id
          ? Number(row.price_exception_request_id)
          : null,
        activeNegotiationRequestCount: Number(row.active_price_exception_request_count || 0),

        // --- Client details ---
        clientDetails: {
          companyName: row.client_name,
          ssmNumber: row.client_ssm,
          address: row.client_address,
          city: row.client_city,
          state: row.client_state,
          zip: row.client_zip,
          fullName: row.pic_name,
          email: row.pic_email,
          mobileNumber: row.pic_phone,
          position: row.pic_position,
        },

        // --- Equipment‐specific form data ---
        formData: {
          inquiryRemarks: row.inquiry_remarks || '',
        },

        // --- Charges & totals ---
        discount: parseFloat(row.discount ?? 0),
        deliveryCharge: parseFloat(row.delivery_charge ?? 0),
        miscCharge: parseFloat(row.misc_charge ?? 0),
        sstPercent: parseFloat(row.sst_percent ?? 0),
        subtotal: parseFloat(row.sub_total ?? 0),
        sstAmount: parseFloat(row.sst_amount ?? 0),
        grandTotal: parseFloat(row.grand_total ?? 0),

        // --- Line‐items array, enriched with catalog fields ---
        lineItems: Array.isArray(row.line_items)
          ? row.line_items.map((item) => ({
              id: parseInt(item.id, 10),
              itemId: parseInt(item.item_id, 10),
              itemName: item.item_name || '',
              categoryId: item.category_id || '',
              description: item.description || '',
              unit: item.unit || '',
              quantity: item.quantity ? parseInt(item.quantity, 10) : 0,
              unitPrice: item.unit_price ? parseFloat(item.unit_price) : 0,
              markedUp: item.marked_up_price ? parseFloat(item.marked_up_price) : 0,
              lineTotal: item.line_total != null ? Number(item.line_total).toFixed(2) : '0.00',
              createdBy: item.created_by ? parseInt(item.created_by, 10) : null,
              createdAt: item.created_at || null,
              updatedAt: item.updated_at || null,
            }))
          : [],

        // --- Display helper for table ---
        personInCharge: row.pic_name,

        // --- Attach ALL follow-ups (array, newest first) ---
        followUps,
        awardHistory,
        ...getProjectOutcomeFields(awardHistory),
      }
    })
  } catch (error) {
    console.error('Error fetching equipment quotes:', error)
    return []
  }
}

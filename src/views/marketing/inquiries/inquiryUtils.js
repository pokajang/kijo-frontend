export const inquiryStorageKey = 'marketing.inquiries.records.v1'
export const MAX_PROOF_IMAGE_BYTES = 500 * 1024
export const API_BASE = import.meta.env.VITE_API_BASE

const apiPath = (path) => `${API_BASE || '/'}${String(path).replace(/^\/+/, '')}`

export const getInquiryProofUrl = (inquiryId, proof) => {
  if (!inquiryId || !proof) return proof?.dataUrl || proof?.url || ''
  if (proof.dataUrl?.startsWith('data:image/')) return proof.dataUrl
  if (!proof.id) return proof.url || ''

  return apiPath(
    `sales-inquiries/${encodeURIComponent(inquiryId)}/proofs/${encodeURIComponent(proof.id)}`,
  )
}

export const inquirySources = [
  'Management Provided',
  'Online Pitching',
  'Physical Meeting',
  'Call Office',
  'Call Personal',
  'Email Info Admin',
  'Email Personal',
  'Email Marketing',
  'WhatsApp Training',
  'WhatsApp Health',
  'WhatsApp Manpower',
  'WhatsApp Personal',
  'WhatsApp Group',
  'Telegram Group',
  'Telegram Personal',
  'LinkedIn Chat',
  'LinkedIn Post',
  'Facebook Post',
  'Facebook Chat',
  'Instagram Post',
  'Instagram Chat',
  'Ex-Staff',
  'OSH Practitioners Group',
]

export const serviceOptions = [
  { value: '', label: 'Not classified' },
  { value: 'training', label: 'Training' },
  { value: 'consultancy_iso', label: 'Consultancy - ISO' },
  { value: 'consultancy_ihoh', label: 'Consultancy - IHOH' },
  { value: 'man_power', label: 'Man Power' },
  { value: 'equipment_supply', label: 'Equipment Supply' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'special_service', label: 'Special Service' },
]

export const inquiryStatuses = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'quote_created', label: 'Quote Created' },
  { value: 'converted_client', label: 'Converted Client' },
  { value: 'lost', label: 'Lost' },
  { value: 'archived', label: 'Archived' },
]

export const formatLocalISODate = (date) => {
  const nextDate = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(nextDate.getTime())) return ''

  const year = nextDate.getFullYear()
  const month = String(nextDate.getMonth() + 1).padStart(2, '0')
  const day = String(nextDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayISO = () => formatLocalISODate(new Date())

export const monthStartISO = () => {
  const date = new Date()
  date.setDate(1)
  return formatLocalISODate(date)
}

export const formatDate = (dateValue) => {
  if (!dateValue) return '-'
  const rawValue = String(dateValue).trim()
  const isoDateMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDateMatch) return isoDateMatch[1]

  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) return dateValue

  return formatLocalISODate(date)
}

export const statusLabel = (value) =>
  inquiryStatuses.find((status) => status.value === value)?.label || value || '-'

export const serviceLabel = (value, fallback = 'Not classified') =>
  serviceOptions.find((service) => service.value === (value || ''))?.label || fallback

export const quoteServiceKeyByInquiryService = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''

  const quoteServiceKeys = {
    training: 'training',
    consultancy_ihoh: 'ih',
    man_power: 'manpower',
    equipment_supply: 'equipment',
    consultancy_iso: 'special',
    engineering: 'special',
    infrastructure: 'special',
    special_service: 'special',
  }

  return quoteServiceKeys[normalized] || 'special'
}

export const getStatusTone = (status) => {
  if (status === 'qualified' || status === 'quote_created' || status === 'converted_client') {
    return 'success'
  }
  if (status === 'contacted') return 'info'
  if (status === 'lost' || status === 'archived') return 'secondary'
  return 'warning'
}

export const createBlankInquiry = () => ({
  id: '',
  companyName: '',
  ssmNumber: '',
  taxIdNoTin: '',
  contactName: '',
  mobile: '601',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  serviceRequired: '',
  source: 'WhatsApp Personal',
  sourceRemarks: '',
  inquiryDate: todayISO(),
  status: 'new',
  remarks: '',
  proofs: [],
  proofDataUrl: '',
  proofOriginalName: '',
  proofMimeType: '',
  createdAt: '',
  updatedAt: '',
})

const parseJsonResponse = async (response) => {
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.status === 'error') {
    throw new Error(payload?.message || `Request failed with status ${response.status}`)
  }
  return payload
}

const cleanInquiryPayload = (inquiry, { includeProof = true } = {}) => {
  const payload = {
    companyName: (inquiry.companyName || '').trim(),
    ssmNumber: (inquiry.ssmNumber || '').trim(),
    taxIdNoTin: (inquiry.taxIdNoTin || '').trim(),
    contactName: (inquiry.contactName || '').trim(),
    mobile: (inquiry.mobile || '').trim(),
    email: (inquiry.email || '').trim(),
    address: (inquiry.address || '').trim(),
    city: (inquiry.city || '').trim(),
    state: (inquiry.state || '').trim(),
    zip: (inquiry.zip || '').trim(),
    serviceRequired: inquiry.serviceRequired || '',
    source: (inquiry.source || '').trim(),
    sourceRemarks: (inquiry.sourceRemarks || '').trim(),
    inquiryDate: inquiry.inquiryDate || todayISO(),
    status: inquiry.status || 'new',
    remarks: (inquiry.remarks || '').trim(),
  }

  if (includeProof) {
    const newProofs = Array.isArray(inquiry.proofs)
      ? inquiry.proofs
          .filter((proof) => proof.dataUrl?.startsWith('data:image/'))
          .map((proof) => ({
            dataUrl: proof.dataUrl,
            originalName: proof.originalName || '',
            mimeType: proof.mimeType || '',
          }))
      : []

    if (newProofs.length > 0) {
      payload.proofs = newProofs
    }

    if (Array.isArray(inquiry.removedProofIds) && inquiry.removedProofIds.length > 0) {
      payload.removedProofIds = inquiry.removedProofIds
    }
  }

  return payload
}

export const listInquiries = async (filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  const response = await fetch(`${API_BASE}sales-inquiries${query ? `?${query}` : ''}`, {
    credentials: 'include',
  })
  const payload = await parseJsonResponse(response)
  return Array.isArray(payload.data) ? payload.data : []
}

export const getInquiry = async (id) => {
  const response = await fetch(`${API_BASE}sales-inquiries/${encodeURIComponent(id)}`, {
    credentials: 'include',
  })
  const payload = await parseJsonResponse(response)
  return payload.data || null
}

export const saveInquiry = async (inquiry, options = {}) => {
  const isUpdate = Boolean(inquiry.id)
  const response = await fetch(
    isUpdate
      ? `${API_BASE}sales-inquiries/${encodeURIComponent(inquiry.id)}`
      : `${API_BASE}sales-inquiries/create`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanInquiryPayload(inquiry, options)),
    },
  )
  const payload = await parseJsonResponse(response)
  return payload.data
}

export const deleteInquiry = async (id) => {
  const response = await fetch(`${API_BASE}sales-inquiries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await parseJsonResponse(response)
}

export const listAssignableStaff = async () => {
  const response = await fetch(`${API_BASE}staff/list?per_page=500`, {
    credentials: 'include',
  })
  const payload = await parseJsonResponse(response)
  const rows = payload.data?.items || payload.staff || []
  return Array.isArray(rows)
    ? rows
        .filter((staff) => String(staff.status || 'Active').toLowerCase() !== 'inactive')
        .map((staff) => ({
          id: staff.staff_id,
          fullName: staff.full_name || '',
          nameCode: staff.name_code || '',
          email: staff.email || '',
          department: staff.department || '',
          label: [
            staff.full_name || staff.name_code || staff.email || `Staff #${staff.staff_id}`,
            staff.name_code ? `(${staff.name_code})` : '',
          ]
            .filter(Boolean)
            .join(' '),
        }))
    : []
}

export const assignInquiryOwner = async (id, staffId) => {
  const response = await fetch(
    `${API_BASE}sales-inquiries/${encodeURIComponent(id)}/assign-owner`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId || null }),
    },
  )
  const payload = await parseJsonResponse(response)
  return payload.data
}

export const linkInquiryClient = async (id, { clientId, clientName }) => {
  const response = await fetch(`${API_BASE}sales-inquiries/${encodeURIComponent(id)}/link-client`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_name: clientName }),
  })
  const payload = await parseJsonResponse(response)
  return payload.data
}

export const linkInquiryQuote = async (id, { quoteId, quoteRefNo, serviceType }) => {
  const response = await fetch(`${API_BASE}sales-inquiries/${encodeURIComponent(id)}/link-quote`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quote_id: quoteId,
      quote_ref_no: quoteRefNo,
      service_type: serviceType,
    }),
  })
  const payload = await parseJsonResponse(response)
  return payload.data
}

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })

export const compressProofImage = async (file) => {
  if (!file || file.size <= MAX_PROOF_IMAGE_BYTES || !file.type.startsWith('image/')) {
    return file
  }

  const imageUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.src = imageUrl

    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
    })

    let maxDimension = 1600
    let blob = null

    while (maxDimension >= 800) {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))

      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      let quality = 0.82
      blob = await canvasToBlob(canvas, 'image/jpeg', quality)

      while (blob && blob.size > MAX_PROOF_IMAGE_BYTES && quality > 0.48) {
        quality -= 0.08
        blob = await canvasToBlob(canvas, 'image/jpeg', quality)
      }

      if (!blob || blob.size <= MAX_PROOF_IMAGE_BYTES) break
      maxDimension -= 200
    }

    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'inquiry-proof'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const emptyValue = '-'

const statusLabels = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  missing_certificate: 'Missing Certificate',
  unknown: 'Unknown',
}

const formatDate = (value) => String(value || '').slice(0, 10) || ''

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export const buildVendorRegistrationDetailPath = (id) =>
  `/client/vendor-registration/${encodeURIComponent(id)}`

export const buildVendorRegistrationEditPath = (id) =>
  `${buildVendorRegistrationDetailPath(id)}/edit`

export const getVendorRegistrationEditActionLabel = (status) =>
  status === 'expired' ? 'Renew Registration' : 'Edit'

export const normalizeVendorRegistrationRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).filter(Boolean).map((row) => {
    const recipients = Array.isArray(row.recipients) ? row.recipients : []
    const recipientNames = recipients
      .map((recipient) => recipient.full_name || recipient.name_code || recipient.email)
      .filter(Boolean)
      .join(', ')

    return {
      ...row,
      client: row.client_name || `Client #${row.client_id}`,
      validFrom: formatDate(row.valid_from),
      validUntil: formatDate(row.valid_until),
      daysLeft:
        row.days_left === null || typeof row.days_left === 'undefined'
          ? null
          : toNumber(row.days_left),
      status: row.status || 'unknown',
      statusLabel: statusLabels[row.status] || row.status || 'Unknown',
      recipientsText: recipientNames || emptyValue,
      certificate: row.has_certificate
        ? row.certificate_original_name || 'Certificate'
        : emptyValue,
      certificateUrl: row.certificate_url || '',
      portalUrl: row.portal_url || '',
      portalUsername: row.portal_username || '',
      portalPassword: row.portal_password || '',
      updatedAt: formatDate(row.updated_at),
      recipientStaffIds: Array.isArray(row.recipient_staff_ids)
        ? row.recipient_staff_ids.map(Number)
        : [],
    }
  })

export const buildVendorRegistrationFormData = (form) => {
  const payload = new FormData()
  const recipientStaffIds = Array.isArray(form.recipientStaffIds) ? form.recipientStaffIds : []

  payload.append('client_id', form.selectedClient?.company_id || '')
  payload.append('valid_from', form.validFrom || '')
  payload.append('valid_until', form.validUntil || '')
  payload.append('portal_url', form.portalUrl || '')
  payload.append('portal_username', form.portalUsername || '')
  payload.append('portal_password', form.portalPassword || '')
  payload.append('remarks', form.remarks || '')
  recipientStaffIds.forEach((staffId) => {
    payload.append('recipient_staff_ids[]', String(staffId))
  })
  if (form.certificate) {
    payload.append('certificate', form.certificate)
  }
  return payload
}

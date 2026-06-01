const excludedInvoiceItemKeywords = ['discount', 'delivery charge', 'misc charge', 'sst', 'hrd']

export const shouldIncludeInvoiceItem = (item) => {
  const label = String(item?.item_description || '')
    .trim()
    .toLowerCase()
  if (!label) return false
  return !excludedInvoiceItemKeywords.some((keyword) => label.includes(keyword))
}

export const buildDeliveryOrderCreatePayload = ({
  clientDetails,
  companyDetails,
  projectDetails,
  items,
  forceCreate = false,
}) => {
  const mappedItems = (Array.isArray(items) ? items : []).map((item) => ({
    item_name: item.name,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
  }))

  return {
    details: {
      client_name: clientDetails.name,
      client_address: clientDetails.address,
      client_contact_name: clientDetails.contact.name,
      client_contact_position: clientDetails.contact.position,
      client_contact_email: clientDetails.contact.email,
      client_contact_phone: clientDetails.contact.phone,
      company_contact_name: companyDetails.contact.name,
      company_contact_email: companyDetails.contact.email,
      company_contact_phone: companyDetails.contact.phone,
      project_id: projectDetails.project_id,
      project_name: projectDetails.name,
      project_code: projectDetails.code,
      project_award_date: projectDetails.date,
      project_type: projectDetails.type,
      project_description: projectDetails.description,
      project_service_period: projectDetails.servicePeriod,
    },
    items: mappedItems,
    breakdown: mappedItems,
    forceCreate,
  }
}

export const createDeliveryOrder = async (payload) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE}delivery-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return response.json()
}

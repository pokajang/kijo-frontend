const toDeliveryOrderItemRows = (updatedData = {}) => {
  if (Array.isArray(updatedData?.breakdown)) return updatedData.breakdown
  if (Array.isArray(updatedData?.items)) return updatedData.items
  return []
}

const toDeliveryOrderBreakdown = (itemRows) =>
  itemRows.map(({ item_name, name, description, quantity, unit }) => ({
    item_name: item_name || name || '',
    description,
    quantity,
    unit,
  }))

export const resolveDeliveryOrderProjectId = (updatedData = {}, fallbackData = {}) =>
  updatedData?.project_id ??
  updatedData?.projectId ??
  fallbackData?.project_id ??
  fallbackData?.projectId ??
  null

export const buildDeliveryOrderUpdatePayload = (updatedData = {}, fallbackData = {}) => {
  const itemRows = toDeliveryOrderItemRows(updatedData)
  const breakdown = toDeliveryOrderBreakdown(itemRows)
  const projectId = resolveDeliveryOrderProjectId(updatedData, fallbackData)
  const details = {
    do_number: updatedData.do_number,
    client_name: updatedData.client_name,
    client_address: updatedData.client_address,
    client_contact_name: updatedData.client_contact_name,
    client_contact_position: updatedData.client_contact_position,
    client_contact_email: updatedData.client_contact_email,
    client_contact_phone: updatedData.client_contact_phone,
    company_contact_name: updatedData.company_contact_name,
    company_contact_email: updatedData.company_contact_email,
    company_contact_phone: updatedData.company_contact_phone,
    project_name: updatedData.project_name,
    project_code: updatedData.project_code,
    project_award_date: updatedData.project_award_date,
    project_type: updatedData.project_type,
    project_description: updatedData.project_description,
    project_service_period: updatedData.project_service_period,
  }

  if (projectId !== null && projectId !== undefined) {
    details.project_id = projectId
  }

  return {
    details,
    items: breakdown,
    breakdown,
  }
}

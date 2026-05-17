export const normalizeContact = (pic = {}) => ({
  full_name: pic.full_name ?? pic.fullName ?? pic.pic_name ?? '',
  email: pic.email ?? pic.pic_email ?? '',
  mobile_number: pic.mobile_number ?? pic.mobileNumber ?? pic.pic_phone ?? '',
  position: pic.position ?? pic.pic_position ?? '',
})

export const contactKey = (pic = {}, index = 0) => {
  const normalized = normalizeContact(pic)
  const baseKey = [
    normalized.email || 'no-email',
    normalized.full_name || 'no-name',
    normalized.mobile_number || 'no-phone',
  ].join('|')

  return baseKey === 'no-email|no-name|no-phone' ? `contact-${index}` : baseKey
}

const hasContactData = (pic) =>
  Boolean(pic?.full_name || pic?.email || pic?.mobile_number || pic?.position)

export const getSelectedContacts = (client) => {
  if (!client) return []

  const selectedContacts = Array.isArray(client.selected_pics)
    ? client.selected_pics.map(normalizeContact).filter(hasContactData)
    : []

  if (selectedContacts.length > 0) return selectedContacts

  const selectedPic = client.selected_pic ? normalizeContact(client.selected_pic) : null
  if (selectedPic && hasContactData(selectedPic)) return [selectedPic]

  const firstPic = Array.isArray(client.all_pics) ? normalizeContact(client.all_pics[0]) : null
  return firstPic && hasContactData(firstPic) ? [firstPic] : []
}

const joinUnique = (contacts, field) => {
  const values = contacts.map((contact) => String(contact?.[field] || '').trim()).filter(Boolean)

  return Array.from(new Set(values)).join('; ')
}

export const buildPicPayload = (client) => {
  const contacts = getSelectedContacts(client)
  const primaryPIC = contacts[0] || null
  const withFallback = (field) => joinUnique(contacts, field) || '-'

  return {
    contacts,
    primaryPIC,
    pic_name: withFallback('full_name'),
    pic_email: withFallback('email'),
    pic_phone: withFallback('mobile_number'),
    pic_position: withFallback('position'),
  }
}

export const formatContactSummary = (client) => {
  const contacts = getSelectedContacts(client)
  return contacts.map((pic) => ({
    name: pic.full_name || '-',
    position: pic.position || '',
    email: pic.email || '-',
    phone: pic.mobile_number || '-',
  }))
}

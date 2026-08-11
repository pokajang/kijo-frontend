export const clientOriginSourceCatalog = [
  source('Management Provided', 'Internal', 'Management', 'Assigned lead'),
  source('Online Pitching', 'Digital', 'Online pitching', 'Outreach'),
  source('Physical Meeting', 'Direct / field', 'Physical meeting', 'Face-to-face'),
  source('Call Office', 'Phone', 'Office phone', 'Call'),
  source('Call Personal', 'Phone', 'Personal phone', 'Call'),
  source('Email Info Admin', 'Email', 'Info / admin email', 'Email'),
  source('Email Personal', 'Email', 'Personal email', 'Email'),
  source('Email Marketing', 'Email', 'Marketing email', 'Email'),
  source('WhatsApp Training', 'Messaging', 'WhatsApp', 'Training'),
  source('WhatsApp Health', 'Messaging', 'WhatsApp', 'Health'),
  source('WhatsApp Manpower', 'Messaging', 'WhatsApp', 'Manpower'),
  source('WhatsApp Personal', 'Messaging', 'WhatsApp', 'Personal message'),
  source('WhatsApp Group', 'Messaging', 'WhatsApp', 'Group message'),
  source('Telegram Group', 'Messaging', 'Telegram', 'Group message'),
  source('Telegram Personal', 'Messaging', 'Telegram', 'Personal message'),
  source('LinkedIn Chat', 'Digital', 'LinkedIn', 'Direct message'),
  source('LinkedIn Post', 'Digital', 'LinkedIn', 'Post'),
  source('Facebook Post', 'Digital', 'Facebook', 'Post'),
  source('Facebook Chat', 'Digital', 'Facebook', 'Direct message'),
  source('Instagram Post', 'Digital', 'Instagram', 'Post'),
  source('Instagram Chat', 'Digital', 'Instagram', 'Direct message'),
  source('Ex-Staff', 'Referral', 'Former staff', 'Referral'),
  source('OSH Practitioners Group', 'Referral', 'OSH practitioners group', 'Community referral'),
]

function source(value, group, channel, method) {
  return { value, label: value, group, channel, method }
}

export const inquirySourceValues = clientOriginSourceCatalog.map((item) => item.value)

export const inquirySourceOptions = clientOriginSourceCatalog.map(({ value, label }) => ({
  value,
  label,
}))

export const findClientOriginSource = (value) =>
  clientOriginSourceCatalog.find((item) => item.value === value)

export const inferClientOriginSourceValue = (firstTouch) => {
  if (!firstTouch) return ''
  if (firstTouch.sourceValue && findClientOriginSource(firstTouch.sourceValue)) {
    return firstTouch.sourceValue
  }
  if (firstTouch.sourceValue) return firstTouch.sourceValue

  const channel = String(firstTouch.channel || '').toLowerCase()
  const method = String(firstTouch.method || '').toLowerCase()
  if (channel.includes('linkedin')) {
    return method.includes('post') ? 'LinkedIn Post' : 'LinkedIn Chat'
  }
  if (channel.includes('facebook')) {
    return method.includes('post') ? 'Facebook Post' : 'Facebook Chat'
  }
  if (channel.includes('instagram')) {
    return method.includes('post') ? 'Instagram Post' : 'Instagram Chat'
  }
  if (channel.includes('whatsapp')) return 'WhatsApp Personal'
  if (channel.includes('telegram')) {
    return method.includes('group') ? 'Telegram Group' : 'Telegram Personal'
  }
  if (channel.includes('office phone')) return 'Call Office'
  if (channel.includes('personal phone')) return 'Call Personal'
  if (channel.includes('physical')) return 'Physical Meeting'
  if (channel.includes('former staff')) return 'Ex-Staff'
  if (channel.includes('management')) return 'Management Provided'
  return ''
}

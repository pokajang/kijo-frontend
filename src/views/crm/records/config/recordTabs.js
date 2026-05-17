export const recordTabOptions = [
  { key: 'all-tab', label: 'All', slug: '' },
  { key: 'my-tab', label: 'My Quotes', slug: 'my' },
  { key: 'training-tab', label: 'Training', slug: 'training' },
  { key: 'ih-tab', label: 'Industrial Hygiene', slug: 'industrial-hygiene' },
  { key: 'manpower-tab', label: 'Manpower Supply', slug: 'manpower-supply' },
  { key: 'equipment-tab', label: 'Equipment Supply', slug: 'equipment-supply' },
  { key: 'special-tab', label: 'Special', slug: 'special' },
]

const aggregateRecordTabs = new Set(['all-tab', 'my-tab'])

export const isAggregateRecordTab = (tabKey) => aggregateRecordTabs.has(tabKey)

const quoteServiceByRecordTab = {
  'training-tab': 'training',
  'ih-tab': 'ih',
  'manpower-tab': 'manpower',
  'equipment-tab': 'equipment',
  'special-tab': 'special',
}

const negotiationRecordTabs = new Set(['training-tab', 'manpower-tab'])

export const recordTabBySlug = recordTabOptions.reduce((acc, tab) => {
  acc[tab.slug] = tab.key
  return acc
}, {})

export const recordSlugByTab = recordTabOptions.reduce((acc, tab) => {
  acc[tab.key] = tab.slug
  return acc
}, {})

export const normalizeRecordTab = (value) => {
  if (recordSlugByTab[value] !== undefined) return value
  if (recordTabBySlug[value] !== undefined) return recordTabBySlug[value]
  return 'all-tab'
}

export const getRecordListPath = (tabKey = 'all-tab') => {
  const slug = recordSlugByTab[normalizeRecordTab(tabKey)]
  return slug ? `/crm/records/${slug}` : '/crm/records'
}

export const getRecordDetailPath = (tabKey, recordId) => {
  const slug = recordSlugByTab[normalizeRecordTab(tabKey)]
  return `/crm/records/${slug || 'all'}/${encodeURIComponent(recordId)}`
}

export const getQuoteServiceFromRecordTab = (tabKey) =>
  quoteServiceByRecordTab[normalizeRecordTab(tabKey)] || ''

export const canRecordTabRequestNegotiation = (tabKey) =>
  negotiationRecordTabs.has(normalizeRecordTab(tabKey))

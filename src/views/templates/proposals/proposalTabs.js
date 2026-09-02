export const PROPOSAL_TYPES = ['training', 'ih', 'manpower', 'special']

export const proposalTabOptions = [
  { key: 'all-tab', label: 'All', slug: '' },
  { key: 'training-tab', label: 'Training', type: 'training', slug: 'training' },
  { key: 'ih-tab', label: 'Industrial Hygiene', type: 'ih', slug: 'industrial-hygiene' },
  { key: 'manpower-tab', label: 'Manpower Supply', type: 'manpower', slug: 'manpower-supply' },
  { key: 'special-tab', label: 'Other Services', type: 'special', slug: 'special' },
]

export const proposalTypeMeta = {
  training: {
    label: 'Training',
    tabKey: 'training-tab',
    slug: 'training',
    legacyListPath: '/templates/list-training',
  },
  ih: {
    label: 'Industrial Hygiene',
    tabKey: 'ih-tab',
    slug: 'industrial-hygiene',
    legacyListPath: '/templates/list-ih',
  },
  manpower: {
    label: 'Manpower Supply',
    tabKey: 'manpower-tab',
    slug: 'manpower-supply',
    legacyListPath: '/templates/list-manpower',
  },
  special: {
    label: 'Other Services',
    tabKey: 'special-tab',
    slug: 'special',
    legacyListPath: '/templates/list-special',
  },
}

export const proposalTypeByTab = proposalTabOptions.reduce((acc, tab) => {
  if (tab.type) acc[tab.key] = tab.type
  return acc
}, {})

export const proposalTabBySlug = proposalTabOptions.reduce((acc, tab) => {
  acc[tab.slug] = tab.key
  return acc
}, {})

export const proposalTypeBySlug = Object.entries(proposalTypeMeta).reduce((acc, [type, meta]) => {
  acc[meta.slug] = type
  acc[type] = type
  return acc
}, {})

export const proposalSlugByTab = proposalTabOptions.reduce((acc, tab) => {
  acc[tab.key] = tab.slug
  return acc
}, {})

export const normalizeProposalTab = (value) => {
  if (proposalSlugByTab[value] !== undefined) return value
  if (proposalTabBySlug[value] !== undefined) return proposalTabBySlug[value]
  return 'all-tab'
}

export const normalizeProposalType = (value) => proposalTypeBySlug[value] || value

export const getProposalListPath = (typeOrTab = 'all-tab', language = 'en') => {
  const tabKey = proposalTypeMeta[typeOrTab]?.tabKey || normalizeProposalTab(typeOrTab)
  const slug = proposalSlugByTab[tabKey]
  const params = new URLSearchParams()
  if (language === 'ms-MY') params.set('language', 'ms-MY')
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return `/templates/proposals${slug ? `/${slug}` : ''}${suffix}`
}

export const getProposalDetailPath = (type, templateId) =>
  `/templates/proposals/${proposalTypeMeta[type]?.slug || type}/${encodeURIComponent(templateId)}`

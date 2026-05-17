export const emptyAcknowledgementValue = 'N/A'

export const acknowledgementColumnStorageKey = 'handbook.acknowledgements.visible-columns.v1'
export const acknowledgementColumnPreferenceApiKey = 'handbook-acknowledgements-visible-columns'

export const defaultAcknowledgementVisibleColumns = {
  version: true,
  fullName: true,
  signedAt: true,
  ipAddress: true,
  userAgent: true,
}

export const requiredAcknowledgementColumns = new Set(['fullName', 'signedAt'])

export const acknowledgementColumnLabels = {
  version: 'Version',
  fullName: 'Full Name',
  signedAt: 'Signed At',
  ipAddress: 'IP Address',
  userAgent: 'User Agent',
}

export const acknowledgementDataColumns = [
  {
    key: 'version',
    label: acknowledgementColumnLabels.version,
    width: '150px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'fullName',
    label: acknowledgementColumnLabels.fullName,
    width: '220px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'signedAt',
    label: acknowledgementColumnLabels.signedAt,
    width: '190px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    noWrap: true,
    getExportValue: (record) => record.signedAtDisplay,
  },
  {
    key: 'ipAddress',
    label: acknowledgementColumnLabels.ipAddress,
    width: '150px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'userAgent',
    label: acknowledgementColumnLabels.userAgent,
    width: '220px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.userAgentFull,
  },
]

export const formatAcknowledgementUserAgent = (userAgent) => {
  const ua = userAgent || ''
  const match = ua.match(/Chrome\/[\d.]+/)

  return match ? match[0] : ua.split(' ')[0] || emptyAcknowledgementValue
}

export const formatAcknowledgementSignedAt = (signedAt) => {
  if (!signedAt) {
    return emptyAcknowledgementValue
  }

  const date = new Date(signedAt)

  return Number.isNaN(date.getTime()) ? emptyAcknowledgementValue : date.toLocaleString()
}

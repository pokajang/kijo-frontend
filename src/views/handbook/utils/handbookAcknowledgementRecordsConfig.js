export const emptyAcknowledgementValue = 'N/A'

export const acknowledgementColumnStorageKey = 'handbook.acknowledgements.visible-columns.v2'
export const acknowledgementColumnPreferenceApiKey = 'handbook-acknowledgements-visible-columns-v2'

export const declarationColumnKeys = {
  handbookReceipt: 'handbook_receipt',
  salaryDeduction: 'salary_deduction_consent',
  confidentialityAi: 'confidentiality_ai_boundaries',
  electronicSignatureValidation: 'electronic_signature_validation',
}

export const defaultAcknowledgementVisibleColumns = {
  version: true,
  fullName: true,
  employeeCode: false,
  declarationsStatus: true,
  signatureStatus: true,
  signedAt: true,
  handbookReceipt: false,
  salaryDeduction: false,
  confidentialityAi: false,
  electronicSignatureValidation: false,
  ipAddress: false,
  userAgent: false,
  evidenceScheme: false,
}

export const requiredAcknowledgementColumns = new Set([
  'fullName',
  'declarationsStatus',
  'signatureStatus',
  'signedAt',
])

export const acknowledgementDataColumns = [
  {
    key: 'version',
    label: 'Version',
    width: '155px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'fullName',
    label: 'Full Name',
    width: '220px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'employeeCode',
    label: 'Employee ID',
    width: '130px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'declarationsStatus',
    label: 'Declarations',
    width: '145px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'signatureStatus',
    label: 'Signature',
    width: '175px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'signedAt',
    label: 'Signed At',
    width: '190px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    noWrap: true,
    getExportValue: (record) => record.signedAtDisplay,
  },
  {
    key: 'handbookReceipt',
    label: 'Handbook Receipt',
    width: '170px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'salaryDeduction',
    label: 'Salary Deduction',
    width: '175px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'confidentialityAi',
    label: 'Confidentiality & AI',
    width: '190px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'electronicSignatureValidation',
    label: 'E-signature Validation',
    width: '190px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'ipAddress',
    label: 'IP Address',
    width: '150px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'userAgent',
    label: 'User Agent',
    width: '220px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.userAgentFull,
  },
  {
    key: 'evidenceScheme',
    label: 'Evidence Scheme',
    width: '150px',
    sortable: true,
    sortType: 'string',
  },
]

export const formatAcknowledgementUserAgent = (userAgent) => {
  const ua = userAgent || ''
  const match = ua.match(/(?:Chrome|Firefox|Edg|Safari)\/[\d.]+/)

  return match ? match[0] : ua.split(' ')[0] || emptyAcknowledgementValue
}

export const formatAcknowledgementSignedAt = (signedAt) => {
  if (!signedAt) return emptyAcknowledgementValue
  const date = new Date(signedAt)

  return Number.isNaN(date.getTime()) ? emptyAcknowledgementValue : date.toLocaleString()
}

export const formatDeclarationState = (record, declarationId) => {
  if (record.evidence_status !== 'complete') return 'Legacy - not captured'

  return record.declarations?.[declarationId] === true ? 'Accepted' : 'Not accepted'
}

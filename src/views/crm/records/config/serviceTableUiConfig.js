export const SERVICE_TABLE_COLUMN_STORAGE_KEY_PREFIX = 'crm.records.service.visible-columns'
export const SERVICE_TABLE_COLUMN_PREFERENCE_API_KEY_PREFIX = 'crm-records-service-visible-columns'

export const SERVICE_TABLE_COLUMN_LABELS = {
  quotationId: 'Quotation ID',
  client: 'Client',
  email: 'Email',
  status: 'Status',
  subject: 'Subject',
  amount: 'Amount',
  created: 'Created',
  age: 'Age',
  pic: 'PIC',
  remarks: 'Remarks',
}

export const SERVICE_TABLE_DEFAULT_VISIBLE_COLUMNS = {
  quotationId: true,
  client: true,
  email: false,
  status: true,
  subject: false,
  amount: true,
  created: true,
  age: true,
  pic: false,
  remarks: false,
}

export const SERVICE_TABLE_REQUIRED_COLUMNS = new Set(['quotationId', 'client', 'status'])

export const SERVICE_TABLE_TOGGLABLE_COLUMN_ORDER = [
  'quotationId',
  'client',
  'email',
  'status',
  'subject',
  'amount',
  'created',
  'age',
  'pic',
  'remarks',
]

export const getServiceTableColumnStorageKey = (serviceKey) =>
  `${SERVICE_TABLE_COLUMN_STORAGE_KEY_PREFIX}.${serviceKey}.v3`

export const getServiceTableColumnPreferenceApiKey = (serviceKey) =>
  `${SERVICE_TABLE_COLUMN_PREFERENCE_API_KEY_PREFIX}.${serviceKey}.v3`

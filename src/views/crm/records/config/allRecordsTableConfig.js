export const SERVICE_LABELS = {
  'training-tab': 'Training',
  'ih-tab': 'Industrial Hygiene',
  'manpower-tab': 'Manpower Supply',
  'equipment-tab': 'Equipment Supply',
  'special-tab': 'Special Service',
}

export const COLUMN_STORAGE_KEY = 'crm.records.all.visible-columns.v3'
export const COLUMN_PREFERENCE_API_KEY = 'crm-records-all-visible-columns-v3'

export const COLUMN_LABELS = {
  service: 'Service',
  quotationId: 'Quotation ID',
  client: 'Client',
  email: 'Email',
  inquirySource: 'Inquiry Source',
  status: 'Status',
  subject: 'Subject',
  amount: 'Amount',
  estimatedCost: 'Est. Cost',
  created: 'Created',
  age: 'Age',
  pic: 'PIC',
  remarks: 'Remarks',
}

export const DEFAULT_VISIBLE_COLUMNS = {
  service: true,
  quotationId: true,
  client: true,
  email: false,
  inquirySource: false,
  status: true,
  subject: false,
  amount: true,
  estimatedCost: false,
  created: true,
  age: true,
  pic: false,
  remarks: false,
}

export const REQUIRED_COLUMNS = new Set(['quotationId', 'client', 'status'])

export const TOGGLABLE_COLUMN_ORDER = [
  'service',
  'quotationId',
  'client',
  'email',
  'inquirySource',
  'status',
  'subject',
  'amount',
  'estimatedCost',
  'created',
  'age',
  'pic',
  'remarks',
]

export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]

export const LARGE_DATASET_THRESHOLD = 1500

export const columnWidths = {
  actionFront: '56px',
  service: '140px',
  quotationId: '150px',
  client: '220px',
  pic: '150px',
  email: '180px',
  inquirySource: '160px',
  subject: '220px',
  amount: '120px',
  estimatedCost: '130px',
  created: '120px',
  age: '80px',
  status: '110px',
  remarks: '220px',
  action: '56px',
}

export const commercialModuleTabs = [
  { key: 'invoice', label: 'Invoice', to: '/commercial/invoice' },
  { key: 'debtors', label: 'Debtors', to: '/commercial/debtors' },
  { key: 'jd14', label: 'JD 14', to: '/commercial/jd14' },
  { key: 'vendor-loa', label: 'Vendor LOAs', to: '/commercial/vendor-loa' },
  { key: 'supplier-po', label: 'Supplier POs', to: '/commercial/supplier-po' },
  { key: 'delivery-order', label: 'Delivery Order', to: '/commercial/delivery-order' },
]

export const pipelineCrmModuleTabs = [
  { key: 'find', label: 'Find Clients', to: '/pipeline/find' },
  { key: 'records', label: 'Call Records', to: '/pipeline/call-records' },
  { key: 'inquiries', label: 'Inquiries', to: '/pipeline/inquiries' },
  { key: 'pipeline-entries', label: 'Pipeline Entries', to: '/pipeline/entries' },
]

export const clientModuleTabs = [
  { key: 'records', label: 'Client Records', to: '/client/manage' },
  { key: 'roi', label: 'ROI per Client', to: '/client/roi' },
  {
    key: 'vendor-registration',
    label: 'Vendor Registration',
    to: '/client/vendor-registration',
    notificationTabKey: 'client.vendor-registration',
  },
  { key: 'past-pics', label: 'Past PICs', to: '/client/past-pics' },
]

export const administrationModuleTabs = [
  { key: 'meetings', label: 'Meetings', to: '/administration/meetings' },
  { key: 'procedures', label: 'Procedures', to: '/administration/procedures' },
  { key: 'sport-time', label: 'Sport Time', to: '/administration/sport-time' },
]

export const supportModuleTabs = [
  { key: 'requests', label: 'Request Tool', to: '/support/requests' },
  { key: 'feedback-records', label: 'Feedback Records', to: '/support/feedback' },
  { key: 'feedback-sla', label: 'SLA Analytics', to: '/support/feedback/sla' },
]

export const dashboardModuleTabs = [
  { key: 'sales', label: 'Sales Tracking', to: '/dashboard/sales' },
  { key: 'crm', label: 'CRM Tracking', to: '/dashboard/crm' },
  { key: 'financial', label: 'Financial Tracking', to: '/dashboard/financial' },
  { key: 'monitoring', label: 'Pipeline Monitoring', to: '/dashboard/monitoring' },
  { key: 'workload', label: 'Workload Tracking', to: '/dashboard/workload' },
]

export const accountModuleTabs = [
  { key: 'profile', label: 'Profile', to: '/my/profile' },
  { key: 'signature', label: 'Signature', to: '/my/signature' },
  { key: 'password', label: 'Password', to: '/my/password' },
]

export const salarySelfModuleTabs = [
  {
    key: 'payment-queue',
    label: 'Payment Queue',
    to: '/my/salary/payment-queue',
    notificationTabKey: 'my.salary.payment-queue',
  },
  { key: 'apply', label: 'Apply Salary', to: '/my/salary/apply' },
  {
    key: 'records',
    label: 'Salary Records',
    to: '/my/salary/records',
    notificationTabKey: 'my.salary.records',
  },
  { key: 'other-claim-apply', label: 'Apply Other Claim', to: '/my/salary/other-claims/apply' },
  {
    key: 'other-claim-records',
    label: 'Other Claim Records',
    to: '/my/salary/other-claims/records',
    notificationTabKey: 'my.salary.other-claim-records',
  },
  { key: 'settings', label: 'Settings', to: '/my/salary/settings' },
]

export const systemAdminModuleTabs = [
  { key: 'migration-status', label: 'Migration Status' },
  { key: 'email-test', label: 'Email Test' },
  { key: 'monthly-report-test', label: 'Monthly Report Test' },
  {
    key: 'ai-workload-governance',
    label: 'AI Workload Governance',
    notificationTabKey: 'system-admin.ai-workload-governance',
  },
  { key: 'ai-assistant-governance', label: 'AI Assistant Governance' },
]

export const vendorModuleTabs = [
  {
    key: 'payment-records',
    label: 'Payment Queue',
    to: '/vendor/payment-records',
    notificationTabKey: 'vendor.payment-records',
  },
  { key: 'paid', label: 'Vendor Ledger', to: '/vendor/paid' },
  { key: 'manage', label: 'Manage Vendors', to: '/vendor/manage' },
  { key: 'frozen', label: 'Frozen Vendors', to: '/vendor/frozen' },
  {
    key: 'workflow',
    label: 'Workflow Settings',
    to: '/workflows/vendor-payment',
    allowedRoles: ['System Admin', 'Manager', 'HR', 'Finance', 'Account', 'Bank'],
  },
]

export const workflowModuleTabs = [
  { key: 'salary-application', label: 'Salary', to: '/workflows/salary-application' },
  { key: 'vendor-payment', label: 'Vendor Payment', to: '/workflows/vendor-payment' },
  { key: 'leave-application', label: 'Leave Application', to: '/workflows/leave-application' },
  { key: 'quote-price-exception', label: 'Negotiation', to: '/workflows/quote-price-exception' },
]

export const financialModuleTabs = [
  {
    key: 'payment-queue',
    label: 'Payment Queue',
    to: '/financial/payment-queue',
    notificationTabKey: 'financial.payment-queue',
  },
  {
    key: 'salary-records',
    label: 'Salary Records',
    to: '/financial/salary-records',
    notificationTabKey: 'financial.salary-records',
  },
  {
    key: 'other-claim-records',
    label: 'Other Claim Records',
    to: '/financial/other-claim-records',
    notificationTabKey: 'financial.other-claim-records',
  },
  { key: 'balance-sheet', label: 'Balance Sheet', to: '/financial/balance-sheet' },
]

export const catalogModuleTabs = [
  { key: 'manage', label: 'Catalog List', to: '/catalog/manage' },
  { key: 'supplier-po', label: 'Award Supplier PO', to: '/catalog/supplier-po' },
]

export const staffModuleTabs = [
  {
    key: 'leaves',
    label: 'Leave Records',
    to: '/staff/leaves',
    notificationTabKey: 'staff.leaves',
  },
  { key: 'tasks', label: 'View Tasks', to: '/staff/tasks' },
  { key: 'kpi', label: 'Manage KPI', to: '/staff/kpi' },
  { key: 'manage', label: 'Manage Staff', to: '/staff/manage' },
  { key: 'appraise', label: 'Appraise Staff', to: '/staff/appraise' },
  { key: 'activities', label: 'Activity Logs', to: '/staff/activities' },
]

export const projectRecordTabs = [
  { key: 'all-tab', label: 'All' },
  { key: 'my-tab', label: 'My Project' },
]

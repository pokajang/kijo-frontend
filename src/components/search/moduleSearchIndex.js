import navigation from '../../_nav'
import {
  accountModuleTabs,
  administrationModuleTabs,
  catalogModuleTabs,
  clientModuleTabs,
  commercialModuleTabs,
  dashboardModuleTabs,
  financialModuleTabs,
  pipelineCrmModuleTabs,
  salarySelfModuleTabs,
  staffModuleTabs,
  supportModuleTabs,
  vendorModuleTabs,
  workflowModuleTabs,
} from '../navigation/moduleNavConfigs'
import { hasAnyAllowedRole } from '../../utils/roles'

const STAFF_ALLOWED_ROLES = ['Manager', 'System Admin', 'HR']
const HR_SYSTEM_ADMIN_ALLOWED_ROLES = ['System Admin', 'HR']
const WORKFLOW_ALLOWED_ROLES = ['System Admin', 'Manager', 'HR', 'Finance', 'Account', 'Bank']
const SYSTEM_ADMIN_ALLOWED_ROLES = ['System Admin']
const MAX_RESULTS = 8
const RECENT_STORAGE_KEY = 'kijo:module-search:recent:v1'
const MAX_RECENT_ITEMS = 10
const DEFAULT_RECENT_RESULTS = 5
const STRONG_MATCH_SCORE = 700
const FUZZY_ONLY_SCORE = 260
const SHORT_FUZZY_EXCLUSIONS = new Set(['hr', 'po', 'do', 'kpi', 'crm', 'mc', 'roi', 'loa'])

const moduleGroups = [
  {
    group: 'Dashboard',
    tabs: dashboardModuleTabs,
    keywords: ['dashboard', 'stats', 'tracking', 'monitoring', 'reporting'],
    aliases: ['home dashboard', 'statistics'],
    intentPhrases: ['sales dashboard', 'crm dashboard', 'financial dashboard', 'pipeline report'],
  },
  {
    group: 'Pipeline CRM',
    tabs: pipelineCrmModuleTabs,
    keywords: ['pipeline', 'crm', 'sales pipeline', 'marketing', 'calls'],
    aliases: ['sales', 'lead generation'],
    intentPhrases: ['find customer', 'sales call', 'new inquiry'],
  },
  {
    group: 'Clients',
    tabs: clientModuleTabs,
    keywords: ['client', 'company', 'customer', 'pic', 'roi', 'vendor registration'],
    aliases: ['customers', 'companies', 'contacts'],
    intentPhrases: ['client contact', 'company contact', 'customer record'],
  },
  {
    group: 'Commercial',
    tabs: commercialModuleTabs,
    keywords: ['commercial', 'finance', 'billing', 'payment', 'po', 'loa'],
    aliases: ['accounts', 'billing'],
    intentPhrases: ['invoice', 'billing', 'debtor', 'commercial payment', 'supplier po'],
  },
  {
    group: 'Vendors',
    tabs: vendorModuleTabs,
    keywords: ['vendor', 'supplier', 'payment', 'payables'],
    aliases: ['suppliers', 'pay vendor', 'pay supplier'],
    intentPhrases: [
      'vendor payment',
      'supplier payment',
      'payment queue',
      'vendor ledger',
      'payment records',
      'payables',
    ],
  },
  {
    group: 'Catalog',
    tabs: catalogModuleTabs,
    keywords: ['catalog', 'equipment', 'items', 'supplier po'],
    aliases: ['inventory', 'item list'],
    intentPhrases: ['catalog item', 'equipment item', 'supplier purchase order'],
  },
  {
    group: 'Staff Management',
    tabs: staffModuleTabs,
    allowedRoles: STAFF_ALLOWED_ROLES,
    keywords: ['staff', 'hr', 'employee', 'leave', 'kpi', 'appraisal', 'activity'],
    aliases: ['employees', 'human resource'],
    intentPhrases: ['staff leave', 'annual leave', 'medical leave', 'mc', 'appraise staff'],
  },
  {
    group: 'Administration',
    tabs: administrationModuleTabs,
    keywords: ['admin', 'meeting', 'procedure', 'sport time'],
    aliases: ['admin', 'sop', 'mom'],
    intentPhrases: ['meeting minutes', 'minutes of meeting', 'work instruction'],
  },
  {
    group: 'Support',
    tabs: supportModuleTabs,
    keywords: ['support', 'request', 'feedback', 'ticket'],
    aliases: ['help', 'ticket'],
    intentPhrases: ['support ticket', 'system request', 'send feedback'],
  },
  {
    group: 'My Account',
    tabs: accountModuleTabs,
    keywords: ['my account', 'profile', 'signature', 'password', 'settings'],
    aliases: ['account settings'],
    intentPhrases: ['account settings'],
  },
  {
    group: 'My Salary',
    tabs: salarySelfModuleTabs,
    keywords: ['my salary', 'salary self service', 'salary payment queue', 'other claim'],
    aliases: ['salary workspace', 'my claims'],
    intentPhrases: [
      'apply salary',
      'salary records',
      'apply other claim',
      'other claim records',
      'salary settings',
    ],
  },
  {
    group: 'Financial',
    tabs: financialModuleTabs,
    allowedRoles: WORKFLOW_ALLOWED_ROLES,
    keywords: ['financial', 'finance', 'salary records', 'payment queue', 'other claim'],
    aliases: ['finance operations', 'financial records'],
    intentPhrases: [
      'financial payment queue',
      'financial salary records',
      'financial other claim records',
      'balance sheet',
    ],
  },
  {
    group: 'Workflows',
    tabs: workflowModuleTabs,
    allowedRoles: WORKFLOW_ALLOWED_ROLES,
    keywords: ['workflow', 'approval setup', 'workflow settings'],
    aliases: ['approval workflow', 'workflow setup'],
    intentPhrases: [
      'salary approval',
      'vendor payment workflow',
      'leave approval',
      'negotiation workflow',
    ],
  },
]

const itemEnhancements = {
  'CRM Management:Quotations': {
    aliases: ['quote', 'quotes', 'quotation', 'quotations'],
    intentPhrases: ['pricing', 'proposal price', 'service quotation', 'create quote'],
  },
  '/crm/quotes': {
    aliases: ['quote', 'quotes', 'quotation', 'quotations'],
    intentPhrases: ['pricing', 'proposal price', 'service quotation', 'create quote'],
  },
  '/crm/records': {
    aliases: ['quote', 'quotes', 'quotation', 'quotations'],
    intentPhrases: ['pricing', 'proposal price', 'service quotation', 'create quote'],
  },
  '/staff/leaves': {
    aliases: ['leave', 'leaves', 'leave record', 'leave records'],
    intentPhrases: ['mc', 'annual leave', 'time off', 'vacation', 'holiday', 'medical leave'],
  },
  '/staff/tasks': {
    aliases: ['staff tasks', 'employee tasks'],
    intentPhrases: ['view staff tasks', 'staff task achievement', 'employee task achievement'],
  },
  '/staff/kpi': {
    aliases: ['staff kpi', 'manage kpi'],
    intentPhrases: ['employee kpi', 'staff performance parameter', 'kpi management'],
  },
  '/staff/manage': {
    aliases: ['staff', 'employees', 'manage employee'],
    intentPhrases: ['staff list', 'employee profile', 'staff record', 'manage staff'],
  },
  '/staff/appraise': {
    aliases: ['appraisal', 'appraise', 'staff appraisal'],
    intentPhrases: ['employee appraisal', 'performance review', 'appraisal record'],
  },
  '/staff/activities': {
    aliases: ['activity', 'activity logs', 'staff activity'],
    intentPhrases: ['employee activity', 'activity report', 'staff logs'],
  },
  '/my/leaves': {
    aliases: ['my leave', 'my leaves', 'leave'],
    intentPhrases: ['apply leave', 'mc', 'annual leave', 'time off', 'vacation', 'holiday'],
  },
  '/my/kpi': {
    aliases: ['my kpi', 'personal kpi'],
    intentPhrases: ['my performance', 'kpi progress', 'kpi overview'],
  },
  '/my/kpi/update': {
    aliases: ['update kpi', 'kpi tracker'],
    intentPhrases: ['achievement', 'monthly remarks', 'progress update', 'add kpi progress'],
  },
  '/my/kpi/parameters': {
    aliases: ['kpi parameter', 'kpi parameters'],
    intentPhrases: ['add kpi', 'create kpi', 'target', 'weightage', 'annual target'],
  },
  '/my/profile': {
    aliases: ['my profile', 'user profile'],
    intentPhrases: ['view profile', 'update my profile', 'employee profile'],
  },
  '/my/signature': {
    aliases: ['my signature', 'digital signature'],
    intentPhrases: ['update signature', 'upload signature'],
  },
  '/my/password': {
    aliases: ['my password', 'change password'],
    intentPhrases: ['change password', 'update password'],
  },
  '/commercial/invoice': {
    aliases: ['invoice', 'invoices', 'billing'],
    intentPhrases: ['commercial invoice', 'customer invoice', 'bill client'],
  },
  '/commercial/debtors': {
    aliases: ['debtor', 'debtors', 'receivable'],
    intentPhrases: ['accounts receivable', 'commercial payment', 'customer payment'],
  },
  '/commercial/delivery-order': {
    aliases: ['delivery order', 'do'],
    intentPhrases: ['delivery note', 'delivery record', 'commercial delivery'],
  },
  '/commercial/jd14': {
    aliases: ['jd14', 'jd 14', 'hrd claim'],
    intentPhrases: ['approval number', 'employer', 'course claim', 'training claim'],
  },
  '/commercial/vendor-loa': {
    aliases: ['vendor loa', 'loa'],
    intentPhrases: ['award value', 'payment terms', 'scope of award', 'vendor letter of award'],
  },
  '/commercial/supplier-po': {
    aliases: ['supplier po', 'po', 'purchase order'],
    intentPhrases: ['supplier purchase order', 'po number', 'grand total'],
  },
  '/vendor/payment-records': {
    aliases: [
      'payment queue',
      'payment records',
      'vendor payment records',
      'supplier payment records',
      'payables',
    ],
    intentPhrases: [
      'payment queue',
      'payment records',
      'payment history',
      'vendor payment history',
    ],
  },
  '/vendor/paid': {
    aliases: ['vendor ledger', 'paid by vendor', 'paid vendors', 'vendor paid ledger'],
    intentPhrases: ['vendor ledger', 'paid by vendor', 'vendor paid history'],
  },
  '/vendor/pay': {
    aliases: ['pay vendor', 'pay supplier', 'vendor payment', 'supplier payment'],
    intentPhrases: [
      'vendor payment',
      'supplier payment',
      'make payment',
      'payment request',
      'payment context',
      'payment type',
      'bank account',
      'upload invoice',
    ],
  },
  '/vendor/manage': {
    aliases: ['vendor list', 'supplier list'],
    intentPhrases: ['manage vendor', 'manage supplier', 'vendor record'],
  },
  '/vendor/frozen': {
    aliases: ['frozen vendor', 'inactive vendor', 'deactivated vendor'],
    intentPhrases: ['frozen vendor', 'inactive vendor', 'reactivate vendor'],
  },
  '/catalog/supplier-po': {
    aliases: ['catalog supplier po', 'award supplier po'],
    intentPhrases: ['award supplier purchase order', 'supplier price', 'catalog purchase order'],
  },
  '/task-manager': {
    aliases: ['task', 'tasks', 'todo', 'to do'],
    intentPhrases: ['follow up', 'reminder', 'task list', 'five minutes meeting'],
  },
  '/administration/meetings': {
    aliases: ['meeting', 'meetings', 'mom'],
    intentPhrases: ['minutes', 'minutes of meeting', 'meeting minutes', 'action items'],
  },
  '/administration/procedures': {
    aliases: ['procedure', 'procedures', 'sop'],
    intentPhrases: ['work instruction', 'process document', 'admin procedure'],
  },
  '/administration/sport-time': {
    aliases: ['sport time', 'sports'],
    intentPhrases: ['sport attendance', 'sport session', 'activity time'],
  },
  '/pipeline/find': {
    aliases: ['find clients', 'find customer', 'prospect'],
    intentPhrases: ['call list', 'lead search', 'customer prospect'],
  },
  '/pipeline/call-records': {
    aliases: ['call records', 'calls'],
    intentPhrases: ['sales call', 'call history', 'contact records'],
  },
  '/pipeline/inquiries': {
    aliases: ['inquiry', 'inquiries', 'leads'],
    intentPhrases: ['sales inquiry', 'new lead', 'lead record'],
  },
  '/pipeline/entries': {
    aliases: ['pipeline entries', 'pipeline records'],
    intentPhrases: ['manual pipeline', 'pipeline value', 'estimated rm', 'service category'],
  },
  '/client/manage': {
    aliases: ['client', 'clients', 'customer', 'customers', 'company'],
    intentPhrases: [
      'client record',
      'customer record',
      'company record',
      'pic',
      'contact person',
      'company address',
    ],
  },
  '/client/first-touch': {
    aliases: ['first touch', 'client origin', 'acquisition evidence'],
    intentPhrases: [
      'how client found us',
      'first encounter',
      'source proof',
      'client contribution by source',
    ],
  },
  '/client/roi': {
    aliases: ['roi', 'client roi', 'commercial history'],
    intentPhrases: ['return on investment', 'client sales history', 'customer commercial history'],
  },
  '/client/vendor-registration': {
    aliases: ['vendor registration', 'client vendor registration'],
    intentPhrases: ['register client as vendor', 'vendor form', 'registration status'],
  },
  '/client/past-pics': {
    aliases: ['past pic', 'past pics', 'old pic'],
    intentPhrases: ['previous contact person', 'past contact', 'former pic'],
  },
  '/catalog/manage': {
    aliases: ['catalog', 'inventory', 'item'],
    intentPhrases: ['catalog item', 'equipment item', 'item list', 'supplier item'],
  },
  '/support/requests': {
    aliases: ['request tool', 'tool request', 'asset request'],
    intentPhrases: [
      'equipment request',
      'request laptop',
      'request projector',
      'use start date',
      'use end date',
      'purpose of use',
    ],
  },
  '/support/feedback': {
    aliases: ['feedback', 'support ticket', 'bug report'],
    intentPhrases: ['submit feedback', 'report issue', 'improvement request', 'system feedback'],
  },
  '/support/feedback/sla': {
    aliases: ['feedback sla', 'sla analytics', 'feedback analytics'],
    intentPhrases: ['feedback sla chart', '30 day feedback fix', 'feedback performance'],
  },
  '/handbook': {
    aliases: ['handbook', 'policy', 'policies'],
    intentPhrases: ['employee handbook', 'company policy', 'leave entitlement policy'],
  },
  '/internal-tools': {
    aliases: ['internal tools', 'tools'],
    intentPhrases: ['free osh', 'free iso', 'assessment tool', 'gap analysis', 'legal compliance'],
  },
  '/internal-tools/legal-compliance': {
    aliases: ['legal compliance', 'osh assessment', 'osha checklist'],
    intentPhrases: [
      'legal compliance assessment',
      'osh legal compliance',
      'osha checklist',
      'compliance form',
      'assessment report',
    ],
  },
  '/internal-tools/legal-compliance/records': {
    aliases: ['legal compliance records', 'assessment records', 'osh records'],
    intentPhrases: [
      'legal compliance records',
      'saved legal compliance assessments',
      'assessment records',
      'see all records',
    ],
  },
  '/internal-tools/legal-compliance/templates': {
    aliases: ['legal compliance templates', 'assessment templates', 'osh template builder'],
    intentPhrases: [
      'manage legal compliance templates',
      'edit assessment template',
      'create compliance form',
      'form template builder',
    ],
  },
  '/internal-tools/legal-compliance/templates/:templateId/groups/:groupKey': {
    aliases: ['legal compliance group editor', 'edit legislation group', 'edit clauses'],
    intentPhrases: ['edit legal compliance clauses', 'edit legislation group clauses'],
  },
  '/internal-tools/legal-compliance/templates/:templateId': {
    aliases: ['legal compliance template detail', 'template legislation groups'],
    intentPhrases: ['open legal compliance template', 'manage template groups'],
  },
  '/system-admin/dashboard': {
    aliases: ['system admin', 'migration status', 'email test'],
    intentPhrases: ['admin dashboard', 'laravel migration', 'mail diagnostics', 'schema sync'],
  },
  '/my/salary/payment-queue': {
    aliases: ['my salary payment queue', 'salary payment queue'],
    intentPhrases: ['review my salary payment', 'salary payment queue'],
  },
  '/my/salary/records': {
    aliases: ['my salary records', 'salary records'],
    intentPhrases: ['view my salary records', 'salary payslips'],
  },
  '/my/salary/other-claims/records': {
    aliases: ['my other claim records', 'other claim records'],
    intentPhrases: ['view my other claims', 'claim records'],
  },
  '/financial/payment-queue': {
    aliases: ['financial payment queue', 'finance payment queue'],
    intentPhrases: ['approve salary payment', 'financial payment approval'],
  },
  '/financial/other-claim-records': {
    aliases: ['financial other claim records', 'finance claim records'],
    intentPhrases: ['review other claims', 'financial claim records'],
  },
  '/workflows/salary-application': {
    aliases: ['salary workflow', 'salary approval'],
    intentPhrases: ['salary approval setup', 'salary workflow settings'],
  },
  '/workflows/vendor-payment': {
    aliases: ['vendor payment workflow', 'vendor workflow'],
    intentPhrases: ['vendor payment approval setup', 'vendor workflow settings'],
  },
  '/workflows/leave-application': {
    aliases: ['leave application workflow', 'leave approval'],
    intentPhrases: ['leave approval setup', 'leave workflow settings'],
  },
  '/workflows/quote-price-exception': {
    aliases: ['negotiation workflow', 'quote price exception workflow'],
    intentPhrases: ['negotiation approval setup', 'quote approval workflow'],
  },
  '/workflows/client-first-touch-conflict': {
    aliases: ['first touch workflow', 'client origin conflict reviewers'],
    intentPhrases: ['configure first touch reviewers', 'first touch conflict workflow'],
  },
}

const standaloneItems = [
  {
    label: 'Knowledge Hub',
    group: 'Tools & Resources',
    to: '/knowledge',
    keywords: ['knowledge', 'learn kijo', 'help articles', 'guide'],
    aliases: ['learn kijo', 'knowledge base', 'help hub'],
    intentPhrases: ['open knowledge hub', 'learn kijo', 'how to use kijo'],
  },
  {
    label: 'Legal Compliance Assessment',
    group: 'Tools & Resources',
    to: '/internal-tools/legal-compliance',
    keywords: ['legal compliance', 'osh assessment', 'osha checklist', 'internal tools'],
    aliases: ['legal compliance', 'osh assessment', 'osha checklist'],
    intentPhrases: ['legal compliance assessment', 'osh legal compliance', 'compliance form'],
  },
  {
    label: 'Legal Compliance Records',
    group: 'Tools & Resources',
    to: '/internal-tools/legal-compliance/records',
    keywords: ['legal compliance records', 'assessment records', 'osh records', 'internal tools'],
    aliases: ['legal compliance records', 'assessment records', 'osh records'],
    intentPhrases: ['saved legal compliance assessments', 'see all records'],
  },
  {
    label: 'Legal Compliance Templates',
    group: 'Tools & Resources',
    to: '/internal-tools/legal-compliance/templates',
    keywords: ['legal compliance templates', 'assessment templates', 'form builder'],
    aliases: ['legal compliance templates', 'assessment templates', 'osh template builder'],
    intentPhrases: ['manage legal compliance templates', 'edit assessment template'],
  },
  {
    label: 'Choose Legal Compliance Template',
    group: 'Tools & Resources',
    to: '/internal-tools/legal-compliance/select-template',
    keywords: ['legal compliance template selector', 'choose assessment template'],
    aliases: ['select legal compliance template', 'choose osh template'],
    intentPhrases: ['start from legal compliance template', 'choose legal assessment template'],
  },
  {
    label: 'Task Manager',
    group: 'Tools & Resources',
    to: '/task-manager',
    keywords: ['tasks', 'five minutes meeting', 'to do', 'todo'],
    aliases: ['task', 'tasks', 'todo'],
    intentPhrases: ['follow up', 'reminder', 'task list'],
  },
  {
    label: "What's New",
    group: 'Tools & Resources',
    to: '/whats-new',
    keywords: ['release notes', 'updates', 'news', 'announcements'],
    aliases: ['updates', 'news'],
    intentPhrases: ['release notes', 'latest changes'],
  },
  {
    label: 'My KPI',
    group: 'My Workspace',
    to: '/my/kpi',
    keywords: ['self kpi', 'my performance', 'parameters'],
    aliases: ['kpi', 'my performance'],
  },
  {
    label: 'My Leaves',
    group: 'My Workspace',
    to: '/my/leaves',
    keywords: ['my leave', 'apply leave', 'leave application', 'annual leave'],
    aliases: ['leave', 'leaves', 'my leave'],
    intentPhrases: ['mc', 'annual leave', 'time off', 'vacation', 'holiday'],
  },
  {
    label: 'About This App',
    group: 'Tools & Resources',
    to: '/about',
    keywords: ['about', 'version', 'app info'],
    aliases: ['about', 'version'],
  },
  {
    label: 'My KPI Update',
    group: 'My Workspace',
    to: '/my/kpi/update',
    keywords: ['update kpi', 'achievement', 'monthly remarks', 'kpi tracker'],
    aliases: ['kpi progress', 'update progress'],
    intentPhrases: ['add kpi achievement', 'monthly kpi update', 'progress update'],
  },
  {
    label: 'My KPI Parameters',
    group: 'My Workspace',
    to: '/my/kpi/parameters',
    keywords: ['kpi parameters', 'target', 'weightage', 'unit', 'annual target'],
    aliases: ['kpi parameter', 'add kpi'],
    intentPhrases: ['create kpi', 'add kpi parameter', 'set kpi target'],
  },
  {
    label: 'Handbook Signatures',
    group: 'Handbook',
    to: '/handbook/signatures',
    allowedRoles: STAFF_ALLOWED_ROLES,
    keywords: ['handbook signatures', 'acknowledgement records'],
    aliases: ['handbook acknowledgement', 'signatures'],
    intentPhrases: ['employee acknowledgement', 'handbook signed records'],
  },
  {
    label: 'Handbook Change Log',
    group: 'Handbook',
    to: '/handbook/change-log',
    allowedRoles: STAFF_ALLOWED_ROLES,
    keywords: ['handbook change log', 'handbook changes'],
    aliases: ['policy changes', 'change log'],
    intentPhrases: ['handbook update history', 'policy update log'],
  },
  {
    label: 'Handbook Version History',
    group: 'Handbook',
    to: '/handbook/versions',
    allowedRoles: STAFF_ALLOWED_ROLES,
    keywords: ['handbook version history', 'handbook versions'],
    aliases: ['policy versions', 'version history'],
    intentPhrases: ['published handbook versions', 'employee handbook history'],
  },
  {
    label: 'System Updates',
    group: 'System Admin',
    to: '/system-admin/whats-new',
    allowedRoles: SYSTEM_ADMIN_ALLOWED_ROLES,
    keywords: ['whats new admin', 'release admin', 'publish update'],
    aliases: ['admin updates', 'system update'],
    intentPhrases: ['publish update', 'create system update'],
  },
  {
    label: 'Migration Status',
    group: 'System Admin',
    to: '/system-admin/dashboard',
    allowedRoles: SYSTEM_ADMIN_ALLOWED_ROLES,
    skipEnhancements: true,
    keywords: ['migration status', 'schema sync', 'laravel migrations'],
    aliases: ['migrations', 'database status'],
    intentPhrases: ['pending migrations', 'applied migrations', 'missing files'],
  },
  {
    label: 'Email Test',
    group: 'System Admin',
    to: '/system-admin/dashboard',
    allowedRoles: SYSTEM_ADMIN_ALLOWED_ROLES,
    skipEnhancements: true,
    keywords: ['email test', 'mail diagnostics', 'smtp'],
    aliases: ['mail test', 'email diagnostics', 'mail diagnostics'],
    intentPhrases: ['send test email', 'mail configuration', 'test smtp'],
  },
  {
    label: 'Monthly Report Test',
    group: 'System Admin',
    to: '/system-admin/dashboard',
    allowedRoles: SYSTEM_ADMIN_ALLOWED_ROLES,
    skipEnhancements: true,
    keywords: ['monthly report test', 'monthly report scheduler'],
    aliases: ['report scheduler', 'scheduler test'],
    intentPhrases: ['test monthly report', 'monthly dashboard report test'],
  },
  {
    label: 'AI Workload Governance',
    group: 'System Admin',
    to: '/system-admin/dashboard',
    allowedRoles: SYSTEM_ADMIN_ALLOWED_ROLES,
    skipEnhancements: true,
    keywords: ['ai workload governance', 'workload ai governance'],
    aliases: ['workload governance', 'ai workload settings'],
    intentPhrases: ['review ai workload governance', 'workload ai controls'],
  },
  {
    label: 'AI Assistant Governance',
    group: 'System Admin',
    to: '/system-admin/dashboard',
    allowedRoles: SYSTEM_ADMIN_ALLOWED_ROLES,
    skipEnhancements: true,
    keywords: ['ai assistant governance', 'assistant governance'],
    aliases: ['assistant ai governance', 'ai assistant settings'],
    intentPhrases: ['review ai assistant governance', 'assistant ai controls'],
  },
]

const actionItems = [
  {
    label: 'Apply Leave',
    group: 'My Workspace',
    to: '/my/leaves/apply',
    aliases: ['leave application', 'apply mc'],
    intentPhrases: ['apply leave', 'take leave', 'submit leave', 'request leave', 'annual leave'],
  },
  {
    label: 'Update KPI Progress',
    group: 'My Workspace',
    to: '/my/kpi/update',
    aliases: ['update kpi', 'kpi tracker'],
    intentPhrases: ['add achievement', 'monthly remarks', 'progress update', 'kpi achievement'],
  },
  {
    label: 'Add KPI Parameter',
    group: 'My Workspace',
    to: '/my/kpi/parameters',
    aliases: ['create kpi', 'new kpi'],
    intentPhrases: ['add kpi', 'kpi parameter', 'target', 'weightage', 'annual target'],
  },
  {
    label: 'Create Client',
    group: 'Clients',
    to: '/client/create',
    aliases: ['new client', 'new customer', 'create customer'],
    intentPhrases: ['add client', 'add customer', 'register client', 'create company'],
  },
  {
    label: 'Create Project',
    group: 'Projects',
    to: '/project/create',
    aliases: ['new project'],
    intentPhrases: ['add project', 'start project'],
  },
  {
    label: 'Create Vendor',
    group: 'Vendors',
    to: '/vendor/create',
    aliases: ['new vendor', 'new supplier', 'create supplier'],
    intentPhrases: [
      'add vendor',
      'add supplier',
      'register vendor',
      'bank details',
      'account holder',
      'vendor contact',
    ],
  },
  {
    label: 'Pay Vendor',
    group: 'Vendors',
    to: '/vendor/pay',
    aliases: ['pay supplier', 'make payment'],
    intentPhrases: [
      'make vendor payment',
      'make supplier payment',
      'bank account',
      'upload invoice',
    ],
  },
  {
    label: 'Create Catalog Item',
    group: 'Catalog',
    to: '/catalog/create',
    aliases: ['new catalog item', 'new item'],
    intentPhrases: [
      'add catalog item',
      'add equipment item',
      'create inventory item',
      'supplier price',
      'item code',
      'unit price',
    ],
  },
  {
    label: 'Create Procedure',
    group: 'Administration',
    to: '/administration/procedures/create',
    aliases: ['new procedure', 'create sop'],
    intentPhrases: ['add procedure', 'add sop', 'create work instruction'],
  },
  {
    label: 'Add Meeting Minute',
    group: 'Administration',
    to: '/administration/meetings/add',
    aliases: ['new meeting', 'new mom', 'create meeting minute'],
    intentPhrases: [
      'meeting minutes',
      'minutes of meeting',
      'meeting title',
      'meeting type',
      'attendees',
      'agenda',
      'action items',
      'guest attendees',
    ],
  },
  {
    label: 'Create Inquiry',
    group: 'Pipeline CRM',
    to: '/pipeline/inquiries/create',
    aliases: ['new inquiry', 'new lead'],
    intentPhrases: [
      'add inquiry',
      'create lead',
      'new sales inquiry',
      'lead source',
      'client inquiry',
      'service category',
    ],
  },
  {
    label: 'Bulk Add Pipeline Entries',
    group: 'Pipeline CRM',
    to: '/pipeline/entries/bulk-add',
    aliases: ['bulk pipeline', 'bulk leads', 'bulk add leads'],
    intentPhrases: [
      'manual pipeline',
      'bulk pipeline entries',
      'prospect',
      'estimated rm',
      'classification',
      'service category',
      'screenshot proof',
    ],
  },
  {
    label: 'Create Vendor Registration',
    group: 'Clients',
    to: '/client/vendor-registration/create',
    aliases: ['new vendor registration'],
    intentPhrases: ['register client as vendor', 'create vendor registration'],
  },
  {
    label: 'Create Template',
    group: 'Tools & Resources',
    to: '/templates/create',
    aliases: ['new template'],
    intentPhrases: ['add template', 'create document template'],
  },
  {
    label: 'Create Knowledge Article',
    group: 'Tools & Resources',
    to: '/knowledge/create',
    aliases: ['new knowledge article', 'write guide'],
    intentPhrases: ['add knowledge article', 'create help article', 'write kijo guide'],
  },
  {
    label: 'Create Training Template',
    group: 'Proposals',
    to: '/templates/create?type=training',
    aliases: ['training proposal template', 'training template'],
    intentPhrases: [
      'training requirements',
      'training materials',
      'lecture medium',
      'agenda',
      'tentative program',
      'objectives',
      'modules',
    ],
  },
  {
    label: 'Create IH Template',
    group: 'Proposals',
    to: '/templates/create?type=ih',
    aliases: ['industrial hygiene template', 'ih template', 'oh template'],
    intentPhrases: [
      'industrial hygiene proposal',
      'scope of work',
      'project schedule',
      'references',
      'chra template',
    ],
  },
  {
    label: 'Create Manpower Template',
    group: 'Proposals',
    to: '/templates/create?type=manpower',
    aliases: ['manpower template', 'manpower proposal template'],
    intentPhrases: [
      'service title',
      'service code',
      'service deliverables',
      'supplied manpower deliverables',
    ],
  },
  {
    label: 'Create Special Template',
    group: 'Proposals',
    to: '/templates/create?type=special',
    aliases: ['special template', 'special proposal template'],
    intentPhrases: [
      'upload full proposal',
      'write proposal',
      'special service title',
      'service code',
      'attachments',
    ],
  },
  {
    label: 'Create Staff',
    group: 'Staff Management',
    to: '/staff/create',
    allowedRoles: STAFF_ALLOWED_ROLES,
    aliases: ['new staff', 'new employee', 'hire staff'],
    intentPhrases: [
      'add staff',
      'add employee',
      'employee profile',
      'personal details',
      'contact details',
      'emergency contact',
      'bank details',
      'hiring details',
    ],
  },
  {
    label: 'Leave Entitlements',
    group: 'Staff Management',
    to: '/staff/leaves/entitlements',
    allowedRoles: HR_SYSTEM_ADMIN_ALLOWED_ROLES,
    aliases: ['leave entitlement', 'leave balance'],
    intentPhrases: ['annual leave balance', 'staff leave allocation', 'leave type entitlement'],
  },
  {
    label: 'Assign Leave Entitlement',
    group: 'Staff Management',
    to: '/staff/leaves/assign',
    allowedRoles: HR_SYSTEM_ADMIN_ALLOWED_ROLES,
    aliases: ['assign leave', 'add leave entitlement'],
    intentPhrases: ['staff leave allocation', 'annual leave balance', 'leave entitlement'],
  },
  {
    label: 'Leave Workflow',
    group: 'Staff Management',
    to: '/workflows/leave-application',
    allowedRoles: WORKFLOW_ALLOWED_ROLES,
    aliases: ['leave approval', 'leave workflow'],
    intentPhrases: [
      'approve leave',
      'recommend leave',
      'reject leave',
      'revoke leave',
      'leave request action',
    ],
  },
  {
    label: 'Appraisal Feedback',
    group: 'Staff Management',
    to: '/staff/appraise/feedback',
    allowedRoles: STAFF_ALLOWED_ROLES,
    aliases: ['appraisal feedback', 'staff feedback'],
    intentPhrases: ['employee feedback', 'performance feedback', 'appraisal notes'],
  },
  {
    label: 'Final Appraisal',
    group: 'Staff Management',
    to: '/staff/appraise/final-appraisal',
    allowedRoles: STAFF_ALLOWED_ROLES,
    aliases: ['final appraisal', 'final performance review'],
    intentPhrases: ['final appraisal record', 'year end appraisal', 'employee final review'],
  },
  {
    label: 'Create Manual Debtor',
    group: 'Commercial',
    to: '/commercial/debtors/create',
    aliases: ['manual debtor', 'debtor entry'],
    intentPhrases: [
      'accounts receivable',
      'receivable',
      'customer payment',
      'invoice not in system',
      'manual receivable',
    ],
  },
  {
    label: 'Create System Update',
    group: 'System Admin',
    to: '/system-admin/whats-new/create',
    allowedRoles: SYSTEM_ADMIN_ALLOWED_ROLES,
    aliases: ['new system update', 'new release note'],
    intentPhrases: ['publish system update', 'create release note'],
  },
  {
    label: 'Create Task',
    group: 'Task Manager',
    to: '/task-manager?action=create',
    quickCreateOrder: 2,
    aliases: ['new task', 'new todo', 'create todo'],
    intentPhrases: ['add task', 'create reminder', 'new follow up'],
  },
  {
    label: 'Create Quote',
    group: 'CRM Management',
    to: '/crm/quotes',
    quickCreateOrder: 1,
    aliases: ['new quote', 'new quotation'],
    intentPhrases: ['create quotation', 'create quote', 'proposal price', 'pricing'],
  },
  {
    label: 'Create Training Quote',
    group: 'CRM Management',
    to: '/crm/quotes?service=training',
    aliases: ['training quote', 'training quotation'],
    intentPhrases: [
      'training pricing',
      'training topic',
      'training title',
      'training type',
      'venue',
      'pax',
      'hrd',
      'per pax',
      'per session',
    ],
  },
  {
    label: 'Create Industrial Hygiene Quote',
    group: 'CRM Management',
    to: '/crm/quotes?service=ih',
    aliases: ['ih quote', 'oh quote', 'hygiene quotation'],
    intentPhrases: [
      'industrial hygiene quote',
      'site address',
      'sample count',
      'work unit',
      'chra',
      'noise monitoring',
      'chemical exposure',
    ],
  },
  {
    label: 'Create Manpower Quote',
    group: 'CRM Management',
    to: '/crm/quotes?service=manpower',
    aliases: ['manpower quote', 'worker supply quote'],
    intentPhrases: [
      'manpower supply',
      'worker supply',
      'nature of work',
      'site location',
      'duration months',
      'billing unit',
    ],
  },
  {
    label: 'Create Equipment Quote',
    group: 'CRM Management',
    to: '/crm/quotes?service=equipment',
    aliases: ['equipment quote', 'equipment supply quote'],
    intentPhrases: [
      'equipment supply',
      'catalog item quote',
      'delivery charge',
      'misc charge',
      'item selection',
      'supplier price',
    ],
  },
  {
    label: 'Create Special Quote',
    group: 'CRM Management',
    to: '/crm/quotes?service=special',
    aliases: ['special quote', 'custom quote'],
    intentPhrases: [
      'special service',
      'line item',
      'quotation remarks',
      'service title',
      'service code',
      'custom quotation',
    ],
  },
]

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenize = (value) => normalize(value).split(' ').filter(Boolean)

const isNavigablePath = (to) =>
  typeof to === 'string' && to.startsWith('/') && !to.includes(':') && !to.includes('*')

const createItem = ({
  label,
  group,
  to,
  keywords = [],
  aliases = [],
  intentPhrases = [],
  allowedRoles,
  type = 'module',
  action,
  quickCreateOrder,
  skipEnhancements = false,
}) => {
  const enhancement =
    !skipEnhancements && type !== 'action'
      ? itemEnhancements[to] || itemEnhancements[`${group}:${label}`] || {}
      : {}
  const itemKeywords = [...keywords]
  const itemAliases = [...aliases, ...(enhancement.aliases || [])]
  const itemIntentPhrases = [...intentPhrases, ...(enhancement.intentPhrases || [])]
  const searchText = [label, group, ...itemKeywords, ...itemAliases, ...itemIntentPhrases]
    .filter(Boolean)
    .join(' ')

  return {
    id: `${slugify(group)}-${slugify(label)}-${slugify(to)}`,
    label,
    group,
    to,
    keywords: itemKeywords,
    aliases: itemAliases,
    intentPhrases: itemIntentPhrases,
    allowedRoles,
    type,
    action,
    quickCreateOrder,
    skipEnhancements,
    searchText: normalize(searchText),
  }
}

const flattenNavigationItems = () => {
  const items = []
  let currentGroup = 'General'

  navigation.forEach((item) => {
    if (!item?.to && typeof item?.name === 'string') {
      currentGroup = item.name
      return
    }

    if (!isNavigablePath(item?.to) || typeof item?.name !== 'string') return

    items.push(
      createItem({
        label: item.name,
        group: currentGroup,
        to: item.to,
        allowedRoles: item.allowedRoles,
        keywords: [item.name, ...(item.activePaths || [])],
      }),
    )
  })

  return items
}

const buildModuleTabItems = () =>
  moduleGroups.flatMap((moduleGroup) =>
    moduleGroup.tabs
      .filter((tab) => isNavigablePath(tab?.to))
      .map((tab) =>
        createItem({
          label: tab.label,
          group: moduleGroup.group,
          to: tab.to,
          allowedRoles: tab.allowedRoles || moduleGroup.allowedRoles,
          keywords: [
            tab.key,
            `${moduleGroup.group} ${tab.label}`,
            ...(tab.activePaths || []),
            ...(moduleGroup.keywords || []),
          ],
          aliases: moduleGroup.aliases || [],
          intentPhrases: moduleGroup.intentPhrases || [],
        }),
      ),
  )

const buildStandaloneItems = () => standaloneItems.map((item) => createItem(item))
const buildActionItems = () =>
  actionItems.map((item) => createItem({ ...item, type: 'action', action: 'navigate' }))

export const moduleSearchItems = [
  ...flattenNavigationItems(),
  ...buildModuleTabItems(),
  ...buildStandaloneItems(),
  ...buildActionItems(),
]

export const canAccessSearchItem = (item, roles = []) =>
  !Array.isArray(item.allowedRoles) ||
  item.allowedRoles.length === 0 ||
  hasAnyAllowedRole(roles, item.allowedRoles)

export const getAccessibleModuleSearchItems = (roles = []) =>
  moduleSearchItems.filter((item) => canAccessSearchItem(item, roles))

export const getQuickCreateModuleItems = (roles = []) =>
  getAccessibleModuleSearchItems(roles)
    .filter((item) => Number.isFinite(item.quickCreateOrder))
    .sort((first, second) => first.quickCreateOrder - second.quickCreateOrder)

const scoreSearchItem = (item, normalizedQuery, queryTokens) => {
  const label = normalize(item.label)
  const group = normalize(item.group)
  const aliases = (item.aliases || []).map(normalize)
  const intentPhrases = (item.intentPhrases || []).map(normalize)
  const keywordsList = (item.keywords || []).map(normalize)
  const keywords = normalize((item.keywords || []).join(' '))
  const searchablePhrases = [...intentPhrases, ...keywordsList].filter(Boolean)

  if (!normalizedQuery) return 0
  if (label === normalizedQuery) return 1000
  if (label.startsWith(normalizedQuery)) return 900
  if (aliases.some((alias) => alias === normalizedQuery)) return 880
  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) return 840
  if (label.includes(normalizedQuery)) return 800
  if (searchablePhrases.some((phrase) => phrase === normalizedQuery)) return 760
  if (searchablePhrases.some((phrase) => phrase.includes(normalizedQuery))) return 720
  if (group === normalizedQuery) return 760
  if (group.startsWith(normalizedQuery)) return 720
  if (group.includes(normalizedQuery)) return 680
  if (keywords.includes(normalizedQuery)) return 620

  const textTokens = new Set(tokenize(item.searchText))
  const labelGroupTokens = tokenize(`${item.label} ${item.group} ${(item.aliases || []).join(' ')}`)
  const hasAllTokensInLabelOrGroup = queryTokens.every((token) =>
    labelGroupTokens.some((textToken) => textToken.startsWith(token) || textToken === token),
  )

  if (hasAllTokensInLabelOrGroup) return 560

  const matchedTokens = queryTokens.filter((token) =>
    Array.from(textTokens).some((textToken) => textToken.startsWith(token) || textToken === token),
  )

  if (matchedTokens.length === 0) return 0

  return 400 + matchedTokens.length * 40 - Math.max(0, textTokens.size - matchedTokens.length)
}

const getFuzzyDistanceLimit = (token) => {
  if (!token || token.length < 4 || SHORT_FUZZY_EXCLUSIONS.has(token)) return 0
  return token.length >= 7 ? 2 : 1
}

const boundedEditDistance = (a, b, maxDistance) => {
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1
  if (a.length === b.length && a.length > 1) {
    for (let index = 0; index < a.length - 1; index += 1) {
      const swapped = `${a.slice(0, index)}${a[index + 1]}${a[index]}${a.slice(index + 2)}`
      if (swapped === b) return 1
    }
  }

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let rowMin = current[0]

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const next = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      current[j] = next
      rowMin = Math.min(rowMin, next)
    }

    if (rowMin > maxDistance) return maxDistance + 1
    previous = current
  }

  return previous[b.length]
}

const getCandidateTokens = (items) =>
  Array.from(
    new Set(
      items
        .flatMap((item) => tokenize(item.searchText))
        .filter((token) => getFuzzyDistanceLimit(token) > 0),
    ),
  )

const correctQueryTokens = (queryTokens, candidateTokens) => {
  let correctedAny = false

  const correctedTokens = queryTokens.map((token) => {
    const maxDistance = getFuzzyDistanceLimit(token)
    if (!maxDistance) return token
    if (candidateTokens.includes(token)) return token

    let best = null

    candidateTokens.forEach((candidate) => {
      const distance = boundedEditDistance(token, candidate, maxDistance)
      if (distance > maxDistance) return

      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && candidate.length < best.candidate.length)
      ) {
        best = { candidate, distance }
      }
    })

    if (!best) return token
    correctedAny = true
    return best.candidate
  })

  return correctedAny ? correctedTokens.join(' ') : ''
}

const scoreSearchItems = (items, query) => {
  const normalizedQuery = normalize(query)
  const queryTokens = tokenize(query)

  if (!normalizedQuery) return []

  return items
    .map((item) => {
      const rawScore = scoreSearchItem(item, normalizedQuery, queryTokens)
      const score =
        item.type === 'action' && rawScore > 0 && rawScore < 700
          ? Math.max(1, rawScore - 420)
          : item.type === 'action' && rawScore === 900 && queryTokens.length === 1
            ? rawScore - 120
            : rawScore

      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return `${a.item.group} ${a.item.label}`.localeCompare(`${b.item.group} ${b.item.label}`)
    })
}

const getRecentIds = () => {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

const writeRecentIds = (ids) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENT_ITEMS)))
  } catch {
    // ignore storage failures; search still works without recents
  }
}

export const recordModuleSearchSelection = (itemId) => {
  if (!itemId) return
  const ids = [itemId, ...getRecentIds().filter((id) => id !== itemId)]
  writeRecentIds(ids)
}

export const getRecentModuleSearchItems = (roles = [], limit = DEFAULT_RECENT_RESULTS) => {
  const accessibleById = new Map(
    getAccessibleModuleSearchItems(roles).map((item) => [item.id, item]),
  )

  return getRecentIds()
    .map((id) => accessibleById.get(id))
    .filter(Boolean)
    .slice(0, limit)
}

export const getModuleSearchResults = (query, roles = [], options = {}) => {
  const limit = options.limit || MAX_RESULTS
  const recentLimit = options.recentLimit || DEFAULT_RECENT_RESULTS
  const accessibleItems = getAccessibleModuleSearchItems(roles)
  const normalizedQuery = normalize(query)

  if (!normalizedQuery) {
    return {
      results: [],
      suggestion: null,
      recentResults: getRecentModuleSearchItems(roles, recentLimit),
    }
  }

  const scored = scoreSearchItems(accessibleItems, normalizedQuery)
  const results = scored.slice(0, limit).map(({ item }) => item)
  const topScore = scored[0]?.score || 0
  const correctedQuery = correctQueryTokens(
    tokenize(normalizedQuery),
    getCandidateTokens(accessibleItems),
  )
  const correctedScored =
    correctedQuery && correctedQuery !== normalizedQuery
      ? scoreSearchItems(accessibleItems, correctedQuery)
      : []
  const correctedTopScore = correctedScored[0]?.score || 0
  const shouldSuggest =
    correctedQuery &&
    correctedTopScore >= STRONG_MATCH_SCORE &&
    (results.length === 0 || topScore < STRONG_MATCH_SCORE)

  if (shouldSuggest && correctedScored.length > 0) {
    return {
      results: correctedScored
        .map(({ item, score }) => ({ item, score: Math.min(score, FUZZY_ONLY_SCORE) }))
        .slice(0, limit)
        .map(({ item }) => item),
      suggestion: shouldSuggest ? { query: normalizedQuery, correctedQuery, reason: 'typo' } : null,
      recentResults: [],
    }
  }

  return {
    results,
    suggestion: shouldSuggest ? { query: normalizedQuery, correctedQuery, reason: 'typo' } : null,
    recentResults: [],
  }
}

export const searchModuleItems = (query, roles = [], limit = MAX_RESULTS) => {
  return getModuleSearchResults(query, roles, { limit }).results
}

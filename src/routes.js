import React from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import {
  ProposalDetailRedirect,
  ProposalListRedirect,
} from './views/templates/proposals/ProposalRedirects'

// CRM pages
const Quotes = React.lazy(() => import('./views/crm/quotes/QuoteMain'))
const Records = React.lazy(() => import('./views/crm/records/routes/RecordsPage.jsx'))
const Negotiations = React.lazy(() => import('./views/crm/price-exceptions/Negotiation.jsx'))
const NegotiationDetailsPage = React.lazy(
  () => import('./views/crm/price-exceptions/NegotiationDetailsPage.jsx'),
)
const RecordDetailsPage = React.lazy(
  () => import('./views/crm/records/routes/RecordDetailsPage.jsx'),
)

// Proposal template pages
const ProposalsPage = React.lazy(() => import('./views/templates/proposals/ProposalsPage'))
const ProposalDetailRouter = React.lazy(
  () => import('./views/templates/proposals/ProposalDetailRouter'),
)
const CreateTemplate = React.lazy(() => import('./views/templates/create/CreateTemplate'))

// Equipment Supply Management
const CreateCatalog = React.lazy(() => import('./views/catalog/create/CreateCatalog'))
const ManageCatalog = React.lazy(() => import('./views/catalog/manage/ManageCatalog'))
const CatalogDetailPage = React.lazy(() => import('./views/catalog/manage/CatalogDetailPage'))
const SupplierPo = React.lazy(() => import('./views/catalog/supplier-po/SupplierPo'))

// Client pages
const CreateClient = React.lazy(() => import('./views/client/create/CreateClient'))
const ClientsList = React.lazy(() => import('./views/client/manage/ClientsList'))
const ClientCompanyDetailPage = React.lazy(
  () => import('./views/client/manage/ClientCompanyDetailPage'),
)

// Staff pages
const Activities = React.lazy(() => import('./views/staff/activities/Activities'))
const CreateStaff = React.lazy(() => import('./views/staff/create/CreateStaff'))
const Manage = React.lazy(() => import('./views/staff/manage/managestaff'))
const StaffDetailPage = React.lazy(() => import('./views/staff/manage/StaffDetailPage'))
const Appraisal = React.lazy(() => import('./views/staff/appraise/Appraisal'))
const AppraisalRecordDetailPage = React.lazy(
  () => import('./views/staff/appraise/AppraisalRecordDetailPage'),
)
const FinalAppraisal = React.lazy(
  () => import('./views/staff/appraise/final-appraisal/FinalAppraisal'),
)
const FinalAppraisalDetailPage = React.lazy(
  () => import('./views/staff/appraise/final-appraisal/FinalAppraisalDetailPage'),
)
const ManageLeaves = React.lazy(() => import('./views/staff/leaves/ManageLeaves'))
const StaffLeaveRecordDetailPage = React.lazy(
  () => import('./views/staff/leaves/StaffLeaveRecordDetailPage'),
)
const ManageKpi = React.lazy(() => import('./features/kpi/staff/ManageKpi'))
const KpiWorkspace = React.lazy(() => import('./features/kpi/self/KpiWorkspace'))
const LeaveWorkspace = React.lazy(() => import('./features/leave/self/LeaveWorkspace'))
const LeaveRecordDetailPage = React.lazy(() => import('./components/leave/LeaveRecordDetailPage'))
const ViewTasks = React.lazy(() => import('./views/staff/tasks/ViewTasks'))
const TaskDetailPage = React.lazy(() => import('./views/task-manager/TaskDetailPage'))

// Vendor pages
const CreateVendor = React.lazy(() => import('./views/vendor/create/CreateVendor'))
const ManageVendor = React.lazy(() => import('./views/vendor/manage/ManageVendor'))
const FrozenVendorDetailPage = React.lazy(
  () => import('./views/vendor/manage/FrozenVendorDetailPage'),
)
const PayVendor = React.lazy(() => import('./views/vendor/pay/PayVendor'))
const PaymentHistoryDetailPage = React.lazy(
  () => import('./views/vendor/pay/PaymentHistoryDetailPage'),
)
const PaymentRecords = React.lazy(() => import('./views/vendor/payment-records/PaymentRecords'))

// Project Pages
const ManageProject = React.lazy(() => import('./views/project/manage/ManageProject'))
const ManageProjectPage = React.lazy(() => import('./views/project/manage/ManageProjectPage'))
const CreateProject = React.lazy(() => import('./views/project/create/CreateProject'))

// Commercial Pages
const Invoice = React.lazy(() => import('./views/commercial/invoice/Invoice'))
const InvoiceDetailPage = React.lazy(() => import('./views/commercial/invoice/InvoiceDetailPage'))
const DeliveryOrder = React.lazy(() => import('./views/commercial/delivery-order/DeliveryOrder'))
const DeliveryOrderDetailPage = React.lazy(
  () => import('./views/commercial/delivery-order/DeliveryOrderDetailPage'),
)
const JD14 = React.lazy(() => import('./views/commercial/jd14/JD14'))
const JD14DetailPage = React.lazy(() => import('./views/commercial/jd14/JD14DetailPage'))
const VendorLoa = React.lazy(() => import('./views/commercial/vendor-loa/VendorLoa'))
const VendorLoaDetailPage = React.lazy(
  () => import('./views/commercial/vendor-loa/VendorLoaDetailPage'),
)
const PoList = React.lazy(() => import('./views/commercial/supplier-po/PoList'))
const SupplierPoDetailPage = React.lazy(
  () => import('./views/commercial/supplier-po/SupplierPoDetailPage'),
)
const Debtors = React.lazy(() => import('./views/commercial/debtors/Debtors'))
const DebtorFormPage = React.lazy(() => import('./views/commercial/debtors/DebtorFormPage'))

// Internal Tools Pages
const Handbook = React.lazy(() => import('./views/handbook/Handbook'))
const HandbookSignatures = React.lazy(
  () => import('./views/handbook/components/HandbookAcknowledgementRecords'),
)
const HandbookChangeLog = React.lazy(() => import('./views/handbook/components/HandbookChangeLog'))
const HandbookVersionHistory = React.lazy(
  () => import('./views/handbook/components/HandbookVersionHistory'),
)
const HandbookVersionDetail = React.lazy(
  () => import('./views/handbook/components/HandbookVersionDetail'),
)
const InternalTools = React.lazy(() => import('./views/internal-tools/InternalTools'))
const TaskManager = React.lazy(() => import('./views/task-manager/TaskManager'))
const RequestDetailPage = React.lazy(() => import('./views/request-tool/RequestDetailPage'))
const RequestTool = React.lazy(() => import('./views/request-tool/RequestTool'))
const About = React.lazy(() => import('./views/about/About'))

const SystemAdminDashboard = React.lazy(() => import('./views/system-admin/SystemAdminDashboard'))
const WhatsNewAdmin = React.lazy(() => import('./views/system-admin/WhatsNewAdmin'))

// existing theme components
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const FeedbackPage = React.lazy(() => import('./views/feedback/FeedbackPage'))
const FeedbackDetailPage = React.lazy(() => import('./views/feedback/FeedbackDetailPage'))
const Meetings = React.lazy(() => import('./views/meetings/Meetings'))
const MeetingMinuteForm = React.lazy(() => import('./views/meetings/MeetingMinuteForm'))

//  procedure route
const CreateProcedure = React.lazy(() => import('./views/procedure/create/CreateProcedure'))
const ProceduresList = React.lazy(() => import('./views/procedure/ProceduresList'))
const ViewProcedure = React.lazy(() => import('./views/procedure/view/ViewProcedure'))
const EditProcedure = React.lazy(() => import('./views/procedure/edit/EditProcedure'))
const SportTime = React.lazy(() => import('./views/procedure/sport-time/SportTime'))

// Marketing route
const CallList = React.lazy(() => import('./views/marketing/find/CallList'))
const CallRecords = React.lazy(() => import('./views/marketing/records/CallRecords'))
const CallRecordDetailPage = React.lazy(
  () => import('./views/marketing/records/CallRecordDetailPage'),
)
const PipelineEntries = React.lazy(() => import('./views/marketing/pipeline/PipelineEntries'))
const PipelineEntryDetailPage = React.lazy(
  () => import('./views/marketing/pipeline/PipelineEntryDetailPage'),
)
const PipelineEntriesBulkAdd = React.lazy(
  () => import('./views/marketing/pipeline/PipelineEntriesBulkAdd'),
)
const InquiryManagement = React.lazy(() => import('./views/marketing/inquiries/InquiryManagement'))
const InquiryCreate = React.lazy(() => import('./views/marketing/inquiries/InquiryCreate'))
const InquiryDetailPage = React.lazy(() => import('./views/marketing/inquiries/InquiryDetailPage'))

// Login page
const Login = React.lazy(() => import('./views/pages/login/Login'))

// DEFINE ALLOWED ROUTES
const staffAllowedRoles = ['Manager', 'System Admin', 'HR']
const systemAdminAllowedRoles = ['System Admin']

const LegacyRouteRedirect = ({ to, paramName }) => {
  const location = useLocation()
  const params = useParams()
  const target = paramName ? `${to}/${encodeURIComponent(params[paramName] || '')}` : to

  return <Navigate to={`${target}${location.search}${location.hash}`} replace />
}

const routes = [
  // Marketing paths
  { path: '/pipeline', name: 'Pipeline CRM', element: <Navigate to="/pipeline/find" replace /> },
  { path: '/pipeline/find', name: 'Call List', element: CallList },
  {
    path: '/pipeline/call-records/:id',
    name: 'Call Record Details',
    element: CallRecordDetailPage,
  },
  { path: '/pipeline/call-records', name: 'Call Records', element: CallRecords },
  { path: '/pipeline/inquiries/create', name: 'Create Inquiry', element: InquiryCreate },
  { path: '/pipeline/inquiries/:id', name: 'Inquiry Details', element: InquiryDetailPage },
  { path: '/pipeline/inquiries', name: 'Inquiries', element: InquiryManagement },
  {
    path: '/pipeline/entries/bulk-add',
    name: 'Bulk Pipeline Entries',
    element: PipelineEntriesBulkAdd,
  },
  {
    path: '/pipeline/entries/:id',
    name: 'Pipeline Entry Details',
    element: PipelineEntryDetailPage,
  },
  { path: '/pipeline/entries', name: 'Pipeline Entries', element: PipelineEntries },
  {
    path: '/calls',
    name: 'Pipeline CRM Redirect',
    element: <LegacyRouteRedirect to="/pipeline/find" />,
  },
  {
    path: '/calls/find',
    name: 'Call List Redirect',
    element: <LegacyRouteRedirect to="/pipeline/find" />,
  },
  {
    path: '/calls/records/:id',
    name: 'Call Record Details Redirect',
    element: <LegacyRouteRedirect to="/pipeline/call-records" paramName="id" />,
  },
  {
    path: '/calls/records',
    name: 'Call Records Redirect',
    element: <LegacyRouteRedirect to="/pipeline/call-records" />,
  },
  {
    path: '/calls/inquiries/create',
    name: 'Create Inquiry Redirect',
    element: <LegacyRouteRedirect to="/pipeline/inquiries/create" />,
  },
  {
    path: '/calls/inquiries/:id',
    name: 'Inquiry Details Redirect',
    element: <LegacyRouteRedirect to="/pipeline/inquiries" paramName="id" />,
  },
  {
    path: '/calls/inquiries',
    name: 'Inquiries Redirect',
    element: <LegacyRouteRedirect to="/pipeline/inquiries" />,
  },
  {
    path: '/calls/pipeline-entries/bulk-add',
    name: 'Bulk Pipeline Entries Redirect',
    element: <LegacyRouteRedirect to="/pipeline/entries/bulk-add" />,
  },
  {
    path: '/calls/pipeline-entries/:id',
    name: 'Pipeline Entry Details Redirect',
    element: <LegacyRouteRedirect to="/pipeline/entries" paramName="id" />,
  },
  {
    path: '/calls/pipeline-entries',
    name: 'Pipeline Entries Redirect',
    element: <LegacyRouteRedirect to="/pipeline/entries" />,
  },

  // Administration paths
  {
    path: '/administration',
    name: 'Administration',
    element: <Navigate to="/administration/meetings" replace />,
  },
  { path: '/administration/meetings', name: 'Meetings', element: Meetings },
  {
    path: '/administration/meetings/add',
    name: 'Add Meeting Minute',
    element: MeetingMinuteForm,
  },
  {
    path: '/administration/meetings/view/:id',
    name: 'View Meeting Minute',
    element: MeetingMinuteForm,
  },
  {
    path: '/administration/meetings/view',
    name: 'View Meeting Minute',
    element: MeetingMinuteForm,
  },
  {
    path: '/administration/meetings/edit/:id',
    name: 'Edit Meeting Minute',
    element: MeetingMinuteForm,
  },
  {
    path: '/administration/meetings/edit',
    name: 'Edit Meeting Minute',
    element: MeetingMinuteForm,
  },
  {
    path: '/administration/procedures/create',
    name: 'Create Procedure',
    element: CreateProcedure,
  },
  { path: '/administration/procedures', name: 'Procedures List', element: ProceduresList },
  {
    path: '/administration/procedures/view/:id',
    name: 'View Procedure',
    element: ViewProcedure,
  },
  { path: '/administration/procedures/view', name: 'View Procedure', element: ViewProcedure },
  {
    path: '/administration/procedures/edit/:id',
    name: 'Edit Procedure',
    element: EditProcedure,
  },
  { path: '/administration/procedures/edit', name: 'Edit Procedure', element: EditProcedure },
  { path: '/administration/sport-time', name: 'Sport Time', element: SportTime },
  {
    path: '/meetings',
    name: 'Meetings Redirect',
    element: <LegacyRouteRedirect to="/administration/meetings" />,
  },
  {
    path: '/meetings/add',
    name: 'Add Meeting Minute Redirect',
    element: <LegacyRouteRedirect to="/administration/meetings/add" />,
  },
  {
    path: '/meetings/view/:id',
    name: 'View Meeting Minute Redirect',
    element: <LegacyRouteRedirect to="/administration/meetings/view" paramName="id" />,
  },
  {
    path: '/meetings/view',
    name: 'View Meeting Minute Redirect',
    element: <LegacyRouteRedirect to="/administration/meetings/view" />,
  },
  {
    path: '/meetings/edit/:id',
    name: 'Edit Meeting Minute Redirect',
    element: <LegacyRouteRedirect to="/administration/meetings/edit" paramName="id" />,
  },
  {
    path: '/meetings/edit',
    name: 'Edit Meeting Minute Redirect',
    element: <LegacyRouteRedirect to="/administration/meetings/edit" />,
  },
  {
    path: '/procedure/create',
    name: 'Create Procedure Redirect',
    element: <LegacyRouteRedirect to="/administration/procedures/create" />,
  },
  {
    path: '/procedure',
    name: 'Procedures List Redirect',
    element: <LegacyRouteRedirect to="/administration/procedures" />,
  },
  {
    path: '/procedure/view/:id',
    name: 'View Procedure Redirect',
    element: <LegacyRouteRedirect to="/administration/procedures/view" paramName="id" />,
  },
  {
    path: '/procedure/view',
    name: 'View Procedure Redirect',
    element: <LegacyRouteRedirect to="/administration/procedures/view" />,
  },
  {
    path: '/procedure/edit/:id',
    name: 'Edit Procedure Redirect',
    element: <LegacyRouteRedirect to="/administration/procedures/edit" paramName="id" />,
  },
  {
    path: '/procedure/edit',
    name: 'Edit Procedure Redirect',
    element: <LegacyRouteRedirect to="/administration/procedures/edit" />,
  },
  {
    path: '/sport-time',
    name: 'Sport Time Redirect',
    element: <LegacyRouteRedirect to="/administration/sport-time" />,
  },
  // CRM paths
  { path: '/crm/quotes', name: 'Quotes', element: Quotes },
  { path: '/crm/price-exceptions', name: 'Negotiations', element: Negotiations },
  {
    path: '/crm/price-exceptions/:requestId',
    name: 'Negotiation Details',
    element: NegotiationDetailsPage,
  },
  { path: '/crm/records', name: 'Records', element: Records },
  { path: '/crm/records/:serviceSlug', name: 'Records', element: Records },
  {
    path: '/crm/records/:serviceTab/:recordId',
    name: 'Record Details',
    element: RecordDetailsPage,
  },

  // Template paths
  { path: '/templates/proposals', name: 'Proposal Records', element: ProposalsPage },
  { path: '/templates/proposals/:proposalSlug', name: 'Proposal Records', element: ProposalsPage },
  {
    path: '/templates/proposals/:type/:id',
    name: 'Proposal Details',
    element: ProposalDetailRouter,
  },
  {
    path: '/templates/list-training',
    name: 'Training Proposal',
    element: <ProposalListRedirect type="training" />,
  },
  {
    path: '/templates/list-training/:id',
    name: 'Training Proposal Details',
    element: <ProposalDetailRedirect type="training" />,
  },
  {
    path: '/templates/list-ih',
    name: 'IH-OH Proposal',
    element: <ProposalListRedirect type="ih" />,
  },
  {
    path: '/templates/list-ih/:id',
    name: 'IH-OH Proposal Details',
    element: <ProposalDetailRedirect type="ih" />,
  },
  {
    path: '/templates/list-manpower',
    name: 'Manpower Proposal',
    element: <ProposalListRedirect type="manpower" />,
  },
  {
    path: '/templates/list-manpower/:id',
    name: 'Manpower Proposal Details',
    element: <ProposalDetailRedirect type="manpower" />,
  },
  {
    path: '/templates/list-special',
    name: 'Special Proposal',
    element: <ProposalListRedirect type="special" />,
  },
  {
    path: '/templates/list-special/:id',
    name: 'Special Proposal Details',
    element: <ProposalDetailRedirect type="special" />,
  },
  { path: '/templates/create', name: 'Create New Template', element: CreateTemplate },

  // Catalog paths
  { path: '/catalog/create', name: 'Create Catalog Item', element: CreateCatalog },
  { path: '/catalog/manage/:itemId', name: 'Catalog Item Details', element: CatalogDetailPage },
  { path: '/catalog/manage', name: 'Manage Catalog', element: ManageCatalog },
  { path: '/catalog/supplier-po', name: 'Supplier PO', element: SupplierPo },

  // Client paths
  { path: '/client/create', name: 'Create Client', element: CreateClient },
  {
    path: '/client/manage/:companyId',
    name: 'Client Company Details',
    element: ClientCompanyDetailPage,
  },
  { path: '/client/manage', name: 'Clients List', element: ClientsList },

  // === Employee Management (protected) ===
  {
    path: '/staff/activities',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <Activities />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/create',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <CreateStaff />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/manage',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <Manage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/manage/:staffId',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <StaffDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/appraise',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <Appraisal />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/appraise/feedback',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <Appraisal routeSection="feedback" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/appraise/final-appraisal',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <FinalAppraisal />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/appraise/final-appraisal/records/:finalAppraisalId',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <FinalAppraisalDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/appraise/final-appraisal/:finalAppraisalId',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <FinalAppraisal />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/appraise/records/:appraisalId',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <AppraisalRecordDetailPage mode="staff" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/leaves',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <ManageLeaves />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/leaves/entitlements',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <ManageLeaves routeSection="entitlements" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/leaves/assign',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <ManageLeaves routeSection="assign" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/leaves/entitlements/:entitlementId/edit',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <ManageLeaves routeSection="assign" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/leaves/records/:leaveId',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <StaffLeaveRecordDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/kpi',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <ManageKpi />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my/kpi',
    name: 'My KPI',
    element: (
      <ProtectedRoute>
        <KpiWorkspace />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my/kpi/update',
    name: 'My KPI Update',
    element: (
      <ProtectedRoute>
        <KpiWorkspace routeSection="update" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my/kpi/parameters',
    name: 'My KPI Parameters',
    element: (
      <ProtectedRoute>
        <KpiWorkspace routeSection="parameters" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my/leaves',
    name: 'My Leave Records',
    element: (
      <ProtectedRoute>
        <LeaveWorkspace />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my/leaves/apply',
    name: 'Apply Leave',
    element: (
      <ProtectedRoute>
        <LeaveWorkspace routeSection="apply" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my/leaves/records/:leaveId',
    name: 'My Leave Details',
    element: (
      <ProtectedRoute>
        <LeaveRecordDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/appraisal/records/:appraisalId',
    name: 'Appraisal Details',
    element: (
      <ProtectedRoute>
        <AppraisalRecordDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/tasks/:taskId',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <TaskDetailPage scope="staff" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/tasks',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <ViewTasks />
      </ProtectedRoute>
    ),
  },

  // Vendor paths
  { path: '/vendor/create', name: 'Create Vendor', element: CreateVendor },
  {
    path: '/vendor/manage/frozen/:vendorId',
    name: 'Frozen Vendor Details',
    element: FrozenVendorDetailPage,
  },
  { path: '/vendor/manage', name: 'Manage Vendor', element: ManageVendor },
  {
    path: '/vendor/pay/history/:paymentId',
    name: 'Payment History Details',
    element: PaymentHistoryDetailPage,
  },
  { path: '/vendor/pay', name: 'Pay Vendor', element: PayVendor },
  { path: '/vendor/payment-records', name: 'Payment Records', element: PaymentRecords },

  // Project paths
  {
    path: '/project/manage/:id/:type/:name',
    name: 'Manage Project Details',
    element: ManageProjectPage,
  },
  { path: '/project/manage/:id', name: 'Manage Project Details', element: ManageProjectPage },
  { path: '/project/manage', name: 'Manage Project', element: ManageProject },
  { path: '/project/create', name: 'Create Project', element: CreateProject },

  // Commercial paths
  { path: '/commercial/invoice/:id', name: 'Invoice Details', element: InvoiceDetailPage },
  { path: '/commercial/invoice', name: 'Invoice', element: Invoice },
  {
    path: '/commercial/delivery-order/:id',
    name: 'Delivery Order Details',
    element: DeliveryOrderDetailPage,
  },
  { path: '/commercial/delivery-order', name: 'Delivery Order', element: DeliveryOrder },
  { path: '/commercial/jd14/:id', name: 'JD 14 Details', element: JD14DetailPage },
  { path: '/commercial/jd14', name: 'JD 14', element: JD14 },
  { path: '/commercial/vendor-loa/:id', name: 'Vendor LOA Details', element: VendorLoaDetailPage },
  { path: '/commercial/vendor-loa', name: 'Vendor LOA', element: VendorLoa },
  {
    path: '/commercial/supplier-po/:id',
    name: 'Supplier PO Details',
    element: SupplierPoDetailPage,
  },
  { path: '/commercial/supplier-po', name: 'PO List', element: PoList },
  { path: '/commercial/debtors/create', name: 'Create Manual Debtor', element: DebtorFormPage },
  {
    path: '/commercial/debtors/manual/:id/edit',
    name: 'Edit Manual Debtor',
    element: DebtorFormPage,
  },
  { path: '/commercial/debtors', name: 'Debtors', element: Debtors },

  // Internal tools path

  { path: 'handbook', name: 'Handbook', element: Handbook },
  {
    path: '/handbook/signatures',
    name: 'Handbook Signatures',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <HandbookSignatures />
      </ProtectedRoute>
    ),
  },
  {
    path: '/handbook/change-log',
    name: 'Handbook Change Log',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <HandbookChangeLog />
      </ProtectedRoute>
    ),
  },
  {
    path: '/handbook/versions/:versionId',
    name: 'Handbook Version',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <HandbookVersionDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/handbook/versions',
    name: 'Handbook Version History',
    element: (
      <ProtectedRoute allowedRoles={staffAllowedRoles}>
        <HandbookVersionHistory />
      </ProtectedRoute>
    ),
  },
  { path: 'internal-tools', name: 'Internal Tools', element: InternalTools },
  // Support paths
  {
    path: '/support',
    name: 'Support',
    element: <Navigate to="/support/requests" replace />,
  },
  {
    path: '/support/requests/:requestId',
    name: 'Usage Record Details',
    element: <RequestDetailPage />,
  },
  { path: '/support/requests', name: 'Request Tool', element: RequestTool },
  { path: '/support/feedback/:feedbackId', name: 'Feedback Details', element: FeedbackDetailPage },
  { path: '/support/feedback', name: 'FeedbackPage', element: FeedbackPage },
  { path: '/about', name: 'About This App', element: About },
  {
    path: '/request-tool/:requestId',
    name: 'Usage Record Details Redirect',
    element: <LegacyRouteRedirect to="/support/requests" paramName="requestId" />,
  },
  {
    path: '/request-tool',
    name: 'Request Tool Redirect',
    element: <LegacyRouteRedirect to="/support/requests" />,
  },
  {
    path: '/whats-new',
    name: "What's New",
    element: (
      <ProtectedRoute>
        <WhatsNewAdmin mode="records" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/whats-new/:noticeId',
    name: "What's New Detail",
    element: (
      <ProtectedRoute>
        <WhatsNewAdmin mode="detail" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/task-manager/:taskId',
    name: 'Task Details',
    element: (
      <ProtectedRoute>
        <TaskDetailPage />
      </ProtectedRoute>
    ),
  },
  { path: 'task-manager', name: 'Five Minutes Meeting', element: TaskManager },
  // { path: 'internal-tools/free-osh', name: 'Free OSH Legal Assessment', element: FreeOsh },
  // { path: 'internal-tools/free-iso', name: 'Free ISO Gap Analysis', element: FreeISO },

  {
    path: '/system-admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={systemAdminAllowedRoles}>
        <SystemAdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/system-admin/whats-new',
    element: (
      <ProtectedRoute allowedRoles={systemAdminAllowedRoles}>
        <WhatsNewAdmin mode="records" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/system-admin/whats-new/create',
    element: (
      <ProtectedRoute allowedRoles={systemAdminAllowedRoles}>
        <WhatsNewAdmin mode="create" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/system-admin/whats-new/:noticeId/edit',
    element: (
      <ProtectedRoute allowedRoles={systemAdminAllowedRoles}>
        <WhatsNewAdmin mode="edit" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/system-admin/whats-new/:noticeId',
    element: (
      <ProtectedRoute allowedRoles={systemAdminAllowedRoles}>
        <WhatsNewAdmin mode="detail" />
      </ProtectedRoute>
    ),
  },

  { path: '/login', name: 'Login', element: Login },

  // Theme related paths
  /*--------------------*/
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/dashboard/:dashboardTab', name: 'Dashboard Section', element: Dashboard },
  {
    path: '/feedback/:feedbackId',
    name: 'Feedback Details Redirect',
    element: <LegacyRouteRedirect to="/support/feedback" paramName="feedbackId" />,
  },
  {
    path: '/feedback',
    name: 'FeedbackPage Redirect',
    element: <LegacyRouteRedirect to="/support/feedback" />,
  },
]

export default routes

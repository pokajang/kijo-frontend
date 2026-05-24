export const knowledgeRouteMap = {
  '/my/leaves/apply': 'how-to-apply-leave',
  '/my/kpi': 'how-to-set-up-and-update-your-kpi',
  '/my/kpi/update': 'how-to-set-up-and-update-your-kpi',
  '/my/kpi/parameters': 'how-to-set-up-and-update-your-kpi',
  '/dashboard': 'how-to-read-dashboard-statistics',
  '/dashboard/sales': 'how-to-read-dashboard-statistics',
  '/dashboard/crm': 'how-to-read-dashboard-statistics',
  '/dashboard/financial': 'how-to-read-dashboard-statistics',
  '/dashboard/monitoring': 'how-to-add-manual-pipeline-entries-and-read-monitoring',
  '/pipeline/find': 'how-to-find-prospects-and-manage-call-records',
  '/pipeline/call-records': 'how-to-find-prospects-and-manage-call-records',
  '/pipeline/entries': 'how-to-add-manual-pipeline-entries-and-read-monitoring',
  '/task-manager': 'how-to-create-and-manage-daily-tasks',
  '/templates/create': 'how-to-create-a-proposal',
  '/crm/quotes': 'how-to-create-a-quotation',
  '/crm/records': 'how-to-request-and-apply-quote-negotiations',
  '/crm/price-exceptions': 'how-to-request-and-apply-quote-negotiations',
  '/catalog/create': 'how-to-create-a-catalog-item',
  '/client/create': 'how-to-create-a-client',
  '/client/vendor-registration': 'how-to-manage-client-vendor-registrations',
  '/project/create': 'how-to-create-a-project-directly',
  '/project/manage': 'how-to-manage-projects',
  '/vendor/manage': 'how-to-manage-vendors',
  '/commercial/invoice': 'how-to-use-commercial-records',
  '/commercial/delivery-order': 'how-to-use-commercial-records',
  '/commercial/jd14': 'how-to-use-commercial-records',
  '/commercial/vendor-loa': 'how-to-use-commercial-records',
  '/commercial/supplier-po': 'how-to-use-commercial-records',
  '/commercial/debtors': 'how-to-track-and-create-manual-debtors',
  '/internal-tools/legal-compliance/select-template':
    'how-to-create-legal-compliance-templates-and-manage-assessment-reports',
  '/internal-tools/legal-compliance/records':
    'how-to-create-legal-compliance-templates-and-manage-assessment-reports',
  '/internal-tools/legal-compliance/templates':
    'how-to-create-legal-compliance-templates-and-manage-assessment-reports',
  '/internal-tools/legal-compliance':
    'how-to-create-legal-compliance-templates-and-manage-assessment-reports',
  '/support/feedback': 'how-to-submit-and-track-system-feedback-tickets',
  '/support/requests': 'how-to-submit-a-support-request',
  '/request-tool': 'how-to-submit-a-support-request',
  '/administration/meetings': 'how-to-create-and-manage-meeting-minutes',
  '/administration/procedures': 'how-to-upload-and-manage-standard-operating-procedures',
  '/administration/sport-time': 'how-to-record-and-track-sport-time-events',
}

export const getKnowledgeSlugForPathname = (pathname = '') => {
  const normalizedPath = pathname || ''
  const keys = Object.keys(knowledgeRouteMap).sort((left, right) => right.length - left.length)

  for (const key of keys) {
    if (normalizedPath === key || normalizedPath.startsWith(`${key}/`)) {
      return knowledgeRouteMap[key]
    }
  }

  return ''
}

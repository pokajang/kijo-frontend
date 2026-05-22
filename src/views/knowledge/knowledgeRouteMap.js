export const knowledgeRouteMap = {
  '/my/leaves/apply': 'how-to-apply-leave',
  '/my/kpi': 'how-to-set-up-and-update-your-kpi',
  '/my/kpi/update': 'how-to-set-up-and-update-your-kpi',
  '/my/kpi/parameters': 'how-to-set-up-and-update-your-kpi',
  '/dashboard/monitoring': 'how-to-add-manual-pipeline-entries-and-read-monitoring',
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
  '/support/requests': 'how-to-submit-a-support-request',
  '/request-tool': 'how-to-submit-a-support-request',
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

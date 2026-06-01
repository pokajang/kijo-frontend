import { isClosedProject } from './projectStatus'

export const PROJECT_COMMERCIAL_DOCUMENT_TYPES = Object.freeze({
  JD14: 'jd14',
  INVOICE: 'invoice',
  DELIVERY_ORDER: 'delivery-order',
  VENDOR_LOA: 'vendor-loa',
  SUPPLIER_PO: 'supplier-po',
})

const closedProjectTooltip = 'Project is already closed.'

export const buildProjectActions = ({
  project,
  deleting = false,
  tableMode = false,
  onGenerateCommercialDocument,
  onCompleteProject,
  onTerminateProject,
  onDeleteProject,
} = {}) => {
  if (!project) return []

  const closedProject = isClosedProject(project)

  return [
    project.project_type === 'Training'
      ? {
          key: 'jd14',
          label: 'Generate JD14',
          onClick: () =>
            onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.JD14, project),
        }
      : null,
    {
      key: 'invoice',
      label: 'Generate Invoice',
      onClick: () =>
        onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.INVOICE, project),
    },
    {
      key: 'delivery-order',
      label: 'Generate DO',
      onClick: () =>
        onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.DELIVERY_ORDER, project),
    },
    {
      key: 'vendor-loa',
      label: 'Create Vendor LOA',
      onClick: () =>
        onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.VENDOR_LOA, project),
    },
    {
      key: 'supplier-po',
      label: 'Create Supplier PO',
      onClick: () =>
        onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.SUPPLIER_PO, project),
    },
    {
      key: 'complete',
      label: 'Complete Project',
      disabled: closedProject,
      tooltip: closedProject ? closedProjectTooltip : undefined,
      onClick: () => onCompleteProject?.(project),
    },
    {
      key: 'terminate',
      label: 'Terminate Project',
      disabled: closedProject,
      tooltip: closedProject ? closedProjectTooltip : undefined,
      danger: true,
      onClick: () => onTerminateProject?.(project),
    },
    {
      key: 'delete',
      label: 'Delete Project',
      buttonLabel: deleting ? 'Deleting...' : 'Delete Project',
      danger: true,
      disabled: deleting,
      dividerBefore: tableMode,
      onClick: () => onDeleteProject?.(project),
    },
  ].filter(Boolean)
}

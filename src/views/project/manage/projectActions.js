import { isClosedProject } from './projectStatus'

export const PROJECT_COMMERCIAL_DOCUMENT_TYPES = Object.freeze({
  JD14: 'jd14',
  INVOICE: 'invoice',
  DELIVERY_ORDER: 'delivery-order',
  VENDOR_LOA: 'vendor-loa',
  SUPPLIER_PO: 'supplier-po',
})

const closedProjectTooltip = 'Project is already closed.'

const commercialDocumentActionProps = (closedProject) => ({
  disabled: closedProject,
  tooltip: closedProject ? closedProjectTooltip : undefined,
})

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
          ...commercialDocumentActionProps(closedProject),
          onClick: () =>
            onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.JD14, project),
        }
      : null,
    {
      key: 'invoice',
      label: 'Generate Invoice',
      ...commercialDocumentActionProps(closedProject),
      onClick: () =>
        onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.INVOICE, project),
    },
    {
      key: 'delivery-order',
      label: 'Generate DO',
      ...commercialDocumentActionProps(closedProject),
      onClick: () =>
        onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.DELIVERY_ORDER, project),
    },
    {
      key: 'vendor-loa',
      label: 'Create Vendor LOA',
      ...commercialDocumentActionProps(closedProject),
      onClick: () =>
        onGenerateCommercialDocument?.(PROJECT_COMMERCIAL_DOCUMENT_TYPES.VENDOR_LOA, project),
    },
    {
      key: 'supplier-po',
      label: 'Create Supplier PO',
      ...commercialDocumentActionProps(closedProject),
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

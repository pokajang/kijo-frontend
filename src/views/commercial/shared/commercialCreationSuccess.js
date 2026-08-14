import dialog from '../../../components/dialog/dialogService'

const secondaryAction = (key, label) => ({
  key,
  label,
  color: 'secondary',
  variant: 'outline',
})

export const showCommercialCreationSuccess = ({
  documentLabel,
  documentReference,
  projectLabel,
  viewLabel,
  listLabel,
  canView = true,
  additionalActions = [],
  detailLines = [],
}) => {
  const reference = String(documentReference || '').trim()
  const project = String(projectLabel || '').trim()
  const message = [
    `${documentLabel}${reference ? ` ${reference}` : ''} was created successfully.`,
    project ? `For project: ${project}` : '',
    ...detailLines.filter(Boolean),
  ]
    .filter(Boolean)
    .join('\n')

  const actions = [
    secondaryAction('project', 'Back to Project'),
    secondaryAction('list', listLabel),
    ...additionalActions,
  ]

  if (canView) {
    actions.push({
      key: 'view',
      label: viewLabel,
      color: 'primary',
      autoFocus: true,
    })
  }

  return dialog.choice(message, {
    title: `${documentLabel} Created`,
    dismissAction: 'project',
    actions,
  })
}

import { describe, expect, it, vi } from 'vitest'

import { buildProjectActions } from '../projectActions'

const activeTrainingProject = {
  id: 12,
  project_name: 'Training Alpha',
  project_type: 'Training',
  status: 'Active',
}

const activeSupplyProject = {
  id: 13,
  project_name: 'Supply Alpha',
  project_type: 'Equipment Supply',
  status: 'Active',
}

const getAction = (actions, key) => actions.find((action) => action.key === key)

describe('projectActions', () => {
  it('includes JD14 only for training projects', () => {
    const trainingActions = buildProjectActions({ project: activeTrainingProject })
    const supplyActions = buildProjectActions({ project: activeSupplyProject })

    expect(getAction(trainingActions, 'jd14')).toEqual(
      expect.objectContaining({ label: 'Generate JD14' }),
    )
    expect(getAction(supplyActions, 'jd14')).toBeUndefined()
  })

  it.each([
    'Training',
    'Industrial Hygiene',
    'Equipment Supply',
    'Manpower Supply',
    'Special Service',
  ])('exposes every applicable commercial document action for %s', (projectType) => {
    const actions = buildProjectActions({
      project: { ...activeSupplyProject, project_type: projectType },
    })
    const actionKeys = actions.map((action) => action.key)

    expect(actionKeys).toEqual(
      expect.arrayContaining(['invoice', 'delivery-order', 'vendor-loa', 'supplier-po']),
    )
    expect(actionKeys.includes('jd14')).toBe(projectType === 'Training')
  })

  it('allows complete and terminate for active projects', () => {
    const actions = buildProjectActions({ project: activeSupplyProject })

    expect(getAction(actions, 'complete')).toEqual(
      expect.objectContaining({
        label: 'Complete Project',
        disabled: false,
        tooltip: undefined,
      }),
    )
    expect(getAction(actions, 'terminate')).toEqual(
      expect.objectContaining({
        label: 'Terminate Project',
        disabled: false,
        tooltip: undefined,
        danger: true,
      }),
    )
  })

  it.each(['Completed', 'Terminated', 'Closed'])(
    'swaps closing actions for reactivation and disables commercial actions for %s projects',
    (status) => {
      const actions = buildProjectActions({
        project: { ...activeSupplyProject, status },
      })
      const commercialActionKeys = ['invoice', 'delivery-order', 'vendor-loa', 'supplier-po']

      commercialActionKeys.forEach((key) => {
        expect(getAction(actions, key)).toEqual(
          expect.objectContaining({
            disabled: true,
            tooltip: 'Project is already closed.',
          }),
        )
      })
      expect(getAction(actions, 'reactivate')).toEqual(
        expect.objectContaining({
          label: 'Reactivate Project',
        }),
      )
      expect(getAction(actions, 'complete')).toBeUndefined()
      expect(getAction(actions, 'terminate')).toBeUndefined()
    },
  )

  it('exposes delete loading metadata and table divider metadata', () => {
    const actions = buildProjectActions({
      project: activeSupplyProject,
      deleting: true,
      tableMode: true,
    })

    expect(getAction(actions, 'delete')).toEqual(
      expect.objectContaining({
        label: 'Delete Project',
        buttonLabel: 'Deleting...',
        danger: true,
        disabled: true,
        dividerBefore: true,
      }),
    )
  })

  it('omits delete divider outside table mode', () => {
    const actions = buildProjectActions({
      project: activeSupplyProject,
      tableMode: false,
    })

    expect(getAction(actions, 'delete')).toEqual(
      expect.objectContaining({
        buttonLabel: 'Delete Project',
        disabled: false,
        dividerBefore: false,
      }),
    )
  })

  it('calls callbacks with the expected document type and project', () => {
    const onGenerateCommercialDocument = vi.fn()
    const onCompleteProject = vi.fn()
    const onTerminateProject = vi.fn()
    const onReactivateProject = vi.fn()
    const onDeleteProject = vi.fn()

    const actions = buildProjectActions({
      project: activeTrainingProject,
      onGenerateCommercialDocument,
      onCompleteProject,
      onTerminateProject,
      onReactivateProject,
      onDeleteProject,
    })

    getAction(actions, 'jd14').onClick()
    getAction(actions, 'invoice').onClick()
    getAction(actions, 'delivery-order').onClick()
    getAction(actions, 'vendor-loa').onClick()
    getAction(actions, 'supplier-po').onClick()
    getAction(actions, 'complete').onClick()
    getAction(actions, 'terminate').onClick()
    getAction(actions, 'delete').onClick()

    expect(onGenerateCommercialDocument).toHaveBeenNthCalledWith(1, 'jd14', activeTrainingProject)
    expect(onGenerateCommercialDocument).toHaveBeenNthCalledWith(
      2,
      'invoice',
      activeTrainingProject,
    )
    expect(onGenerateCommercialDocument).toHaveBeenNthCalledWith(
      3,
      'delivery-order',
      activeTrainingProject,
    )
    expect(onGenerateCommercialDocument).toHaveBeenNthCalledWith(
      4,
      'vendor-loa',
      activeTrainingProject,
    )
    expect(onGenerateCommercialDocument).toHaveBeenNthCalledWith(
      5,
      'supplier-po',
      activeTrainingProject,
    )
    expect(onCompleteProject).toHaveBeenCalledWith(activeTrainingProject)
    expect(onTerminateProject).toHaveBeenCalledWith(activeTrainingProject)
    expect(onDeleteProject).toHaveBeenCalledWith(activeTrainingProject)
  })

  it.each(['Completed', 'Terminated', 'Closed'])(
    'calls the reactivation callback for a %s project',
    (status) => {
      const project = { ...activeSupplyProject, status }
      const onReactivateProject = vi.fn()
      const actions = buildProjectActions({ project, onReactivateProject })

      getAction(actions, 'reactivate').onClick()

      expect(onReactivateProject).toHaveBeenCalledWith(project)
    },
  )
})

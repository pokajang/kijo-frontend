import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import TaskTitleProjectCell from './TaskTitleProjectCell'

describe('TaskTitleProjectCell', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the project mention as one badge when the title already contains it', () => {
    render(
      <TaskTitleProjectCell
        task={{
          title: 'Prepare gantt chart for @Active Project',
          projectName: 'Active Project',
        }}
      />,
    )

    expect(screen.getByText('Prepare gantt chart for')).toBeInTheDocument()
    expect(screen.getAllByText('@Active Project')).toHaveLength(1)
  })

  it('appends a project badge for legacy titles without inline mentions', () => {
    render(
      <TaskTitleProjectCell
        task={{
          title: 'Prepare gantt chart',
          projectName: 'Active Project',
        }}
      />,
    )

    expect(screen.getByText('Prepare gantt chart')).toBeInTheDocument()
    expect(screen.getByText('@Active Project')).toBeInTheDocument()
  })

  it('renders AI classification lifecycle labels', () => {
    const { rerender } = render(
      <TaskTitleProjectCell
        task={{
          title: 'Prepare handover summary',
          aiClassificationStatus: 'pending',
        }}
      />,
    )

    expect(screen.getByText('AI pending')).toBeInTheDocument()

    rerender(
      <TaskTitleProjectCell
        task={{
          title: 'Prepare handover summary',
          classificationSource: 'ai',
        }}
      />,
    )
    expect(screen.getByText('AI classified')).toBeInTheDocument()

    rerender(
      <TaskTitleProjectCell
        task={{
          title: 'Prepare handover summary',
          classificationSource: 'ai_cache',
        }}
      />,
    )
    expect(screen.getByText('Learned classification')).toBeInTheDocument()
  })
})

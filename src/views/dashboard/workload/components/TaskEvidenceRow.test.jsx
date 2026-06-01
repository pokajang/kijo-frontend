import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import ActiveTaskActivityRow from './ActiveTaskActivityRow'
import TaskEvidenceRow from './TaskEvidenceRow'

describe('workload task evidence AI classification labels', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders AI classification labels in standard task evidence rows', () => {
    render(
      <TaskEvidenceRow
        todayStr="2026-05-28"
        task={{
          title: 'Prepare handover summary',
          status: 'Ongoing',
          dueDate: '2026-05-30',
          createdAt: '2026-05-28',
          aiClassificationStatus: 'pending',
        }}
      />,
    )

    expect(screen.getByText('AI pending')).toBeInTheDocument()
  })

  it('places the AI classification badge next to the work type in standard task rows', () => {
    render(
      <TaskEvidenceRow
        todayStr="2026-05-28"
        task={{
          title: 'Prepare handover summary',
          status: 'Ongoing',
          dueDate: '2026-05-30',
          createdAt: '2026-05-28',
          workTypeLabel: 'Clerical / Admin',
          classificationSource: 'ai_cache',
        }}
      />,
    )

    const classificationLine = screen
      .getByText('Clerical / Admin')
      .closest('.workload-evidence-classification-line')

    expect(classificationLine).toContainElement(screen.getByText('Learned classification'))
  })

  it('renders AI classification labels in active task activity rows', () => {
    render(
      <ActiveTaskActivityRow
        todayStr="2026-05-28"
        task={{
          title: 'Prepare handover summary',
          status: 'Ongoing',
          dueDate: '2026-05-30',
          createdAt: '2026-05-28',
          classificationSource: 'ai_cache',
        }}
      />,
    )

    expect(screen.getByText('Learned classification')).toBeInTheDocument()
  })
})

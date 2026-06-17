import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import TaskDetailPage from './TaskDetailPage'

vi.mock('../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
    prompt: vi.fn(),
  },
}))

const taskRecord = {
  id: 501,
  title: 'Prepare handover summary',
  status: 'Ongoing',
  createdAt: '2026-06-17 10:00:00',
  dueDate: '2026-06-20',
  completedAt: '',
  commentLogs: [],
  projectName: '',
  taskCategory: 'administrative',
  taskCategoryLabel: 'Administrative',
  effortScore: 1,
  classificationConfidence: 'high',
  classificationSource: 'ai',
  matchedPattern: 'ai:handover summary preparation',
  workType: 'clerical_admin',
  workTypeLabel: 'Clerical / Admin',
  aiClassificationStatus: 'applied',
}

const renderDetail = () =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/task-manager/501',
          state: { record: taskRecord, returnTo: '/task-manager' },
        },
      ]}
    >
      <Routes>
        <Route path="/task-manager/:taskId" element={<TaskDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('TaskDetailPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows stored workload classification details', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', tasks: [taskRecord] }),
    })

    renderDetail()

    expect(await screen.findByText('Classification')).toBeInTheDocument()
    expect(screen.getByText('Administrative')).toBeInTheDocument()
    expect(screen.getByText('Clerical / Admin')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText('ai:handover summary preparation')).toBeInTheDocument()
  })
})

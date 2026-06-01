import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import CreateTask from './CreateTask'

const projectOptions = [
  { value: '100', label: 'Active Project' },
  { value: '101', label: 'Second Project' },
]
const projectProgressNote =
  'Tagged tasks will be inserted as project progress tracking in Manage Project as "Ongoing" tasks.'
const projectTagHint = 'New: type @ in the task field to tag an active project linked to you.'
const taskPlaceholder = 'E.g. Prepare gantt chart...'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const renderCreateTask = ({
  initialTask,
  onDraftChange = vi.fn(),
  projectOptionsOverride = projectOptions,
} = {}) => {
  const Harness = () => {
    const [task, setTask] = useState(
      initialTask || {
        id: 'a',
        title: 'Prepare gantt chart for ',
        dueDate: '2026-05-14',
        projectId: '',
        taskCategory: 'real_effort',
        taskCategoryLabel: 'Real Effort',
        effortScore: 3,
        classificationConfidence: 'high',
        classificationSource: 'system',
        userOverride: false,
        matchedPattern: 'prepare gantt chart',
        classificationStatus: 'resolved',
      },
    )

    const handleDraftChange = (id, field, value) => {
      onDraftChange(id, field, value)
      setTask((current) => ({ ...current, [field]: value }))
    }

    return (
      <CreateTask
        embedded
        taskDrafts={[task]}
        projectOptions={projectOptionsOverride}
        onDraftChange={handleDraftChange}
        onAddDraft={vi.fn()}
        onRemoveDraft={vi.fn()}
        onSaveTasks={vi.fn()}
        onReset={vi.fn()}
      />
    )
  }

  return render(<Harness />)
}

describe('CreateTask', () => {
  it('tags a project inline from @ search and stores title plus project id', () => {
    const onDraftChange = vi.fn()
    renderCreateTask({ onDraftChange })

    const taskInput = screen.getByPlaceholderText(taskPlaceholder)
    fireEvent.change(taskInput, { target: { value: 'Prepare gantt chart for @sec' } })
    fireEvent.click(screen.getByRole('option', { name: 'Second Project' }))

    expect(screen.getByText('@Second Project')).toBeInTheDocument()
    expect(onDraftChange).toHaveBeenCalledWith(
      'a',
      'title',
      'Prepare gantt chart for @Second Project',
    )
    expect(onDraftChange).toHaveBeenCalledWith('a', 'projectId', '101')
    expect(onDraftChange).toHaveBeenCalledWith('a', 'projectLabel', 'Second Project')
  })

  it('opens project suggestions from / search', () => {
    renderCreateTask()

    fireEvent.change(screen.getByPlaceholderText(taskPlaceholder), {
      target: { value: 'Prepare gantt chart for /active project' },
    })

    expect(screen.getByRole('option', { name: 'Active Project' })).toBeInTheDocument()
  })

  it('selects project suggestions with arrow keys and enter', () => {
    const onDraftChange = vi.fn()
    renderCreateTask({ onDraftChange })

    const taskInput = screen.getByPlaceholderText(taskPlaceholder)
    fireEvent.change(taskInput, { target: { value: 'Prepare gantt chart for @' } })
    fireEvent.keyDown(taskInput, { key: 'ArrowDown' })
    fireEvent.keyDown(taskInput, { key: 'Enter' })

    expect(screen.getByText('@Second Project')).toBeInTheDocument()
    expect(onDraftChange).toHaveBeenCalledWith(
      'a',
      'title',
      'Prepare gantt chart for @Second Project',
    )
    expect(onDraftChange).toHaveBeenCalledWith('a', 'projectId', '101')
    expect(onDraftChange).toHaveBeenCalledWith('a', 'projectLabel', 'Second Project')
  })

  it('removes the project badge and clears project id', () => {
    const onDraftChange = vi.fn()
    renderCreateTask({
      initialTask: {
        id: 'a',
        title: 'Prepare gantt chart for @Active Project',
        dueDate: '2026-05-14',
        projectId: '100',
        projectLabel: 'Active Project',
      },
      onDraftChange,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove project tag' }))

    expect(onDraftChange).toHaveBeenCalledWith('a', 'title', 'Prepare gantt chart for')
    expect(onDraftChange).toHaveBeenCalledWith('a', 'projectId', '')
    expect(onDraftChange).toHaveBeenCalledWith('a', 'projectLabel', '')
  })

  it('renders the stored project badge before project options reload', () => {
    renderCreateTask({
      projectOptionsOverride: [],
      initialTask: {
        id: 'a',
        title: 'Prepare gantt chart for @Saved Project',
        dueDate: '2026-05-14',
        projectId: '777',
        projectLabel: 'Saved Project',
        taskCategory: 'real_effort',
        taskCategoryLabel: 'Real Effort',
        effortScore: 3,
        classificationConfidence: 'high',
        classificationSource: 'system',
        userOverride: false,
        matchedPattern: 'prepare gantt chart',
        classificationStatus: 'resolved',
      },
    })

    expect(screen.getByText('@Saved Project')).toBeInTheDocument()
  })

  it('does not render a separate project input', () => {
    renderCreateTask()

    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument()
  })

  it('uses native browser spellcheck on task title inputs', () => {
    renderCreateTask()

    expect(screen.getByPlaceholderText(taskPlaceholder)).toHaveAttribute('spellcheck', 'true')
  })

  it('keeps native browser spellcheck after a project is tagged inline', () => {
    renderCreateTask()

    fireEvent.change(screen.getByPlaceholderText(taskPlaceholder), {
      target: { value: 'Prepare gantt chart for @active' },
    })
    fireEvent.click(screen.getByRole('option', { name: 'Active Project' }))

    expect(screen.getByDisplayValue('Prepare gantt chart for')).toHaveAttribute(
      'spellcheck',
      'true',
    )
    expect(screen.getByLabelText('Task text after project tag')).toHaveAttribute(
      'spellcheck',
      'true',
    )
  })

  it('shows the suggested task type from backend classification', () => {
    renderCreateTask()

    expect(screen.queryByText('Deciding task type...')).not.toBeInTheDocument()
    expect(screen.getByText(/Suggested:/i)).toBeInTheDocument()
    expect(screen.getByText(/Real Effort/i)).toBeInTheDocument()
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Task type for row 1')).not.toBeInTheDocument()
  })

  it('shows a pending task type while backend classification is loading', () => {
    renderCreateTask({
      initialTask: {
        id: 'a',
        title: 'prepare quotation custom',
        dueDate: '2026-05-14',
        projectId: '',
        taskCategory: 'uncategorised',
        taskCategoryLabel: 'General Task',
        effortScore: 1,
        classificationConfidence: 'low',
        classificationSource: 'system',
        userOverride: false,
        matchedPattern: null,
        classificationStatus: 'pending',
      },
    })

    expect(screen.getByText('Deciding task type...')).toBeInTheDocument()
    expect(screen.queryByText(/Default:/i)).not.toBeInTheDocument()
  })

  it('shows general task as the default fallback', () => {
    renderCreateTask({
      initialTask: {
        id: 'a',
        title: 'prepare quotation custom',
        dueDate: '2026-05-14',
        projectId: '',
        taskCategory: 'uncategorised',
        taskCategoryLabel: 'General Task',
        effortScore: 1,
        classificationConfidence: 'low',
        classificationSource: 'system',
        userOverride: false,
        matchedPattern: null,
        classificationStatus: 'resolved',
      },
    })

    expect(screen.getByText(/Default:/i)).toBeInTheDocument()
    expect(screen.getByText(/General Task/i)).toBeInTheDocument()
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument()
  })

  it('warns but still allows non-rated tasks to be saved', () => {
    renderCreateTask({
      initialTask: {
        id: 'a',
        title: 'watching tv',
        dueDate: '2026-05-14',
        projectId: '',
        taskCategory: 'non_work',
        taskCategoryLabel: 'Non-rated / Not graded',
        effortScore: 0,
        classificationConfidence: 'high',
        classificationSource: 'system',
        userOverride: false,
        matchedPattern: 'non_work:watching tv',
        classificationStatus: 'resolved',
      },
    })

    expect(screen.getByText(/Non-rated:/i)).toBeInTheDocument()
    expect(screen.getByText(/Non-rated \/ Not graded \(0\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to include this task\?/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save\s+1 Task/i })).toBeEnabled()
  })

  it('warns but still allows unclear tasks to be saved', () => {
    renderCreateTask({
      initialTask: {
        id: 'a',
        title: 'random unknown noun',
        dueDate: '2026-05-14',
        projectId: '',
        taskCategory: 'unclear_unrated',
        taskCategoryLabel: 'Unclear / Not graded',
        effortScore: 0,
        classificationConfidence: 'low',
        classificationSource: 'system',
        userOverride: false,
        matchedPattern: 'unclear:no_work_signal',
        classificationStatus: 'resolved',
      },
    })

    expect(screen.getByText(/Unclear:/i)).toBeInTheDocument()
    expect(screen.getByText(/Unclear \/ Not graded \(0\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Task is too vague/i)).toBeInTheDocument()
    expect(screen.getByText(/prepare, review, follow up/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save\s+1 Task/i })).toBeEnabled()
  })

  it('hides the suggested task type for an empty task row', () => {
    renderCreateTask({
      initialTask: {
        id: 'a',
        title: '',
        dueDate: '2026-05-14',
        projectId: '',
        taskCategory: 'uncategorised',
        taskCategoryLabel: 'General Task',
        effortScore: 1,
        classificationConfidence: 'low',
        classificationSource: 'system',
        userOverride: false,
        matchedPattern: null,
        classificationStatus: 'idle',
      },
    })

    expect(screen.queryByText(/Suggested:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Default:/i)).not.toBeInTheDocument()
  })

  it('shows a dismissible project tag hint', () => {
    renderCreateTask()

    expect(screen.getByText(projectTagHint)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.queryByText(projectTagHint)).not.toBeInTheDocument()
  })

  it('shows one project progress note when any task row is tagged', () => {
    renderCreateTask()

    expect(screen.queryByText(projectProgressNote)).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(taskPlaceholder), {
      target: { value: 'Prepare gantt chart for @active' },
    })
    fireEvent.click(screen.getByRole('option', { name: 'Active Project' }))

    expect(screen.getByText(projectProgressNote)).toBeInTheDocument()
  })

  it('does not count a project-only tag as a saveable task', () => {
    renderCreateTask({
      initialTask: {
        id: 'a',
        title: '',
        dueDate: '2026-05-14',
        projectId: '',
        taskCategory: 'uncategorised',
        taskCategoryLabel: 'General Task',
        effortScore: 1,
        classificationConfidence: 'low',
        classificationSource: 'system',
        userOverride: false,
        matchedPattern: null,
        classificationStatus: 'idle',
      },
    })

    fireEvent.change(screen.getByPlaceholderText(taskPlaceholder), {
      target: { value: '@sec' },
    })
    fireEvent.click(screen.getByRole('option', { name: 'Second Project' }))

    expect(screen.getByRole('button', { name: /Save\s+Tasks/i })).toBeDisabled()
  })
})

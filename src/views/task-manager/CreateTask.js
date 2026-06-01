// src/components/tasks/CreateTask.js
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash, cilX } from '@coreui/icons'
import { stripExactProjectMention } from '../../utils/projectMentionText'

const PROJECT_TRIGGER_PATTERN = /(^|\s)([@/])([^@/]*)$/
const TASK_PLACEHOLDER = 'E.g. Prepare gantt chart...'
const PROJECT_TAG_HINT = 'New: type @ in the task field to tag an active project linked to you.'
const PROJECT_PROGRESS_NOTE =
  'Tagged tasks will be inserted as project progress tracking in Manage Project as "Ongoing" tasks.'

const taskTypeDisplayMode = (task) =>
  task.taskCategory === 'unclear_unrated'
    ? 'Unclear'
    : task.taskCategory === 'non_work'
      ? 'Non-rated'
      : task.taskCategory === 'uncategorised' || !task.matchedPattern
        ? 'Default'
        : 'Suggested'

const taskTypeLabel = (task) => task.taskCategoryLabel || 'General Task'
const workTypeLabel = (task) => task.workTypeLabel || 'Unclear'

const isNonRatedTask = (task) => task.taskCategory === 'non_work'
const isUnclearTask = (task) => task.taskCategory === 'unclear_unrated'
const isZeroRatedTask = (task) => isNonRatedTask(task) || isUnclearTask(task)

const taskTypeEffortScore = (task) => {
  const effortScore = Number(task.effortScore)
  return Number.isFinite(effortScore) ? effortScore : 1
}

const getProjectMention = (project) => (project?.label ? `@${project.label}` : '')

const splitTitleByMention = (title, mention) => {
  if (!mention) return { before: title, after: '', hasMention: false }

  const index = title.indexOf(mention)
  if (index < 0) return { before: title, after: '', hasMention: false }

  return {
    before: title.slice(0, index),
    after: title.slice(index + mention.length),
    hasMention: true,
  }
}

const removeMentionFromTitle = (title, mention) =>
  title
    .replace(mention, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

const InlineProjectTaskInput = ({
  id,
  title,
  projectId,
  projectLabel,
  options = [],
  disabled,
  onTitleChange,
  onProjectChange,
}) => {
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const beforeMeasureRef = useRef(null)
  const optionRefs = useRef([])
  const selectedProject = useMemo(() => {
    const option = options.find((project) => String(project.value) === String(projectId || ''))
    if (option) return option

    const fallbackLabel = String(projectLabel || '').trim()
    return projectId && fallbackLabel ? { value: String(projectId), label: fallbackLabel } : null
  }, [options, projectId, projectLabel])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [cursorIndex, setCursorIndex] = useState(String(title || '').length)
  const [beforeInputWidth, setBeforeInputWidth] = useState(16)
  const mention = getProjectMention(selectedProject)
  const titleParts = splitTitleByMention(String(title || ''), mention)

  useLayoutEffect(() => {
    if (!selectedProject) return

    const measuredWidth = beforeMeasureRef.current?.offsetWidth || 0
    setBeforeInputWidth(Math.max(16, Math.ceil(measuredWidth) + 4))
  }, [selectedProject, titleParts.before])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const triggerInfo = useMemo(() => {
    if (selectedProject) return null

    const text = String(title || '')
    const index = Math.max(0, Math.min(cursorIndex, text.length))
    const beforeCursor = text.slice(0, index)
    const match = beforeCursor.match(PROJECT_TRIGGER_PATTERN)
    if (!match) return null

    return {
      start: beforeCursor.length - match[0].length + match[1].length,
      end: index,
      query: match[3].trim().toLowerCase(),
    }
  }, [cursorIndex, selectedProject, title])

  const filteredOptions = useMemo(() => {
    if (!triggerInfo) return []

    return options
      .filter((project) =>
        String(project.label || '')
          .toLowerCase()
          .includes(triggerInfo.query),
      )
      .slice(0, 8)
  }, [options, triggerInfo])

  const showMenu = isOpen && triggerInfo && filteredOptions.length > 0 && !disabled
  const activeOptionId = showMenu ? `${id}-project-option-${highlightedIndex}` : undefined

  useEffect(() => {
    if (filteredOptions.length === 0) {
      setHighlightedIndex(0)
      return
    }

    setHighlightedIndex((index) => Math.min(index, filteredOptions.length - 1))
  }, [filteredOptions.length])

  useEffect(() => {
    if (!showMenu) return
    const activeOption = optionRefs.current[highlightedIndex]
    if (typeof activeOption?.scrollIntoView === 'function') {
      activeOption.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, showMenu])

  const selectProject = (project) => {
    if (!triggerInfo) return

    const text = String(title || '')
    const nextTitle = `${text.slice(0, triggerInfo.start)}${getProjectMention(project)}${text.slice(
      triggerInfo.end,
    )}`
    setIsOpen(false)
    setHighlightedIndex(0)
    onTitleChange(nextTitle)
    onProjectChange(project.value, project.label)
  }

  const clearProject = () => {
    onTitleChange(removeMentionFromTitle(String(title || ''), mention))
    onProjectChange('', '')
    setIsOpen(false)
    setHighlightedIndex(0)
  }

  const handlePlainTitleChange = (event) => {
    const nextValue = event.target.value
    const nextCursor = event.target.selectionStart ?? nextValue.length
    setCursorIndex(nextCursor)
    onTitleChange(nextValue)
    setIsOpen(PROJECT_TRIGGER_PATTERN.test(nextValue.slice(0, nextCursor)))
    setHighlightedIndex(0)
  }

  const handlePlainTitleFocus = (event) => {
    const nextCursor = event.target.selectionStart ?? String(title || '').length
    setCursorIndex(nextCursor)
    setIsOpen(PROJECT_TRIGGER_PATTERN.test(String(title || '').slice(0, nextCursor)))
  }

  const handleKeyDown = (event) => {
    const hasSelectableOptions = triggerInfo && filteredOptions.length > 0 && !disabled
    if (!hasSelectableOptions) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((index) => (index + 1) % filteredOptions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((index) => (index - 1 + filteredOptions.length) % filteredOptions.length)
    } else if (event.key === 'Enter') {
      if (!showMenu) return
      event.preventDefault()
      selectProject(filteredOptions[highlightedIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
    }
  }

  const updateMentionTitlePart = (part, value) => {
    const before = part === 'before' ? value : titleParts.before
    const after = part === 'after' ? value : titleParts.after
    onTitleChange(`${before}${mention}${after}`)
  }

  const inputStyles = {
    border: 0,
    boxShadow: 'none',
    outline: 0,
    padding: 0,
  }

  return (
    <div ref={wrapperRef} className="position-relative">
      {selectedProject ? (
        <div
          className={`form-control d-flex align-items-center gap-1 flex-wrap ${
            disabled ? 'bg-light' : ''
          }`}
          style={{ minHeight: '38px' }}
        >
          <span
            ref={beforeMeasureRef}
            aria-hidden="true"
            className="position-absolute invisible"
            style={{ whiteSpace: 'pre' }}
          >
            {titleParts.before || ' '}
          </span>
          <input
            id={id}
            className="bg-transparent"
            value={titleParts.before}
            disabled={disabled}
            placeholder="E.g. Prepare gantt chart for "
            spellCheck
            style={{
              ...inputStyles,
              flex: '0 1 auto',
              width: `${beforeInputWidth}px`,
              minWidth: '1rem',
              maxWidth: '100%',
            }}
            onChange={(event) => updateMentionTitlePart('before', event.target.value)}
          />
          <CBadge color="primary" className="d-inline-flex align-items-center gap-1 px-2 py-0">
            {mention}
            {!disabled ? (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 lh-1 text-reset d-inline-flex align-items-center"
                aria-label="Remove project tag"
                onClick={clearProject}
              >
                <CIcon icon={cilX} size="sm" />
              </button>
            ) : null}
          </CBadge>
          <input
            className="flex-grow-1 bg-transparent"
            value={titleParts.hasMention ? titleParts.after : ''}
            disabled={disabled}
            aria-label="Task text after project tag"
            spellCheck
            style={{ ...inputStyles, minWidth: '8rem' }}
            onChange={(event) => updateMentionTitlePart('after', event.target.value)}
          />
        </div>
      ) : (
        <CFormInput
          ref={inputRef}
          id={id}
          value={title}
          disabled={disabled}
          placeholder={TASK_PLACEHOLDER}
          autoComplete="off"
          spellCheck
          role="combobox"
          aria-expanded={Boolean(showMenu)}
          aria-controls={`${id}-project-options`}
          aria-activedescendant={activeOptionId}
          onChange={handlePlainTitleChange}
          onClick={handlePlainTitleFocus}
          onFocus={handlePlainTitleFocus}
          onKeyDown={handleKeyDown}
        />
      )}
      {showMenu ? (
        <div
          id={`${id}-project-options`}
          role="listbox"
          className="position-absolute start-0 end-0 mt-1 bg-body border rounded shadow-sm overflow-auto"
          style={{ zIndex: 1080, maxHeight: '220px' }}
        >
          {filteredOptions.map((project, index) => (
            <button
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              id={`${id}-project-option-${index}`}
              key={project.value}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              className={`dropdown-item text-wrap py-2 ${
                index === highlightedIndex ? 'active' : ''
              }`}
              style={
                index === highlightedIndex
                  ? { backgroundColor: 'var(--cui-primary)', color: 'var(--cui-white)' }
                  : undefined
              }
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectProject(project)}
            >
              {project.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const CreateTask = ({
  taskDrafts = [],
  projectOptions = [],
  onDraftChange,
  onAddDraft,
  onRemoveDraft,
  onSaveTasks,
  onReset,
  onBack,
  onCancel,
  saving = false,
  embedded = false,
}) => {
  const [showProjectTagHint, setShowProjectTagHint] = useState(true)
  const projectLabelById = useMemo(
    () =>
      new Map(
        projectOptions.map((project) => [
          String(project.value || ''),
          String(project.label || '').trim(),
        ]),
      ),
    [projectOptions],
  )
  const validTaskCount = taskDrafts.filter((task) =>
    stripExactProjectMention(
      task.title,
      projectLabelById.get(String(task.projectId || '')) || task.projectLabel,
    ).trim(),
  ).length
  const hasTaggedProject = taskDrafts.some((task) => task.projectId)
  const saveLabel = saving
    ? 'Saving...'
    : `Save ${validTaskCount || ''} Task${validTaskCount === 1 ? '' : 's'}`

  const content = (
    <>
      {showProjectTagHint ? (
        <CAlert
          color="primary"
          dismissible
          onClose={() => setShowProjectTagHint(false)}
          className="create-task-project-tag-alert mb-3 py-2"
        >
          {PROJECT_TAG_HINT}
        </CAlert>
      ) : null}

      <div className="d-grid gap-3">
        {taskDrafts.map((task, index) => (
          <div key={task.id}>
            <CRow className="align-items-start g-3 flex-md-nowrap">
              <CCol xs={12} md={embedded ? true : 8} className={embedded ? 'min-w-0' : undefined}>
                {index === 0 ? (
                  <CFormLabel htmlFor={`task-title-${task.id}`}>Task</CFormLabel>
                ) : null}
                <InlineProjectTaskInput
                  id={`task-title-${task.id}`}
                  title={task.title}
                  projectId={task.projectId || ''}
                  projectLabel={task.projectLabel || ''}
                  options={projectOptions}
                  disabled={saving}
                  onTitleChange={(title) => onDraftChange(task.id, 'title', title)}
                  onProjectChange={(projectId, projectLabel = '') => {
                    onDraftChange(task.id, 'projectId', projectId)
                    onDraftChange(task.id, 'projectLabel', projectId ? projectLabel : '')
                  }}
                />
                {task.title.trim() && task.classificationStatus === 'pending' ? (
                  <div className="small text-body-secondary mt-1">Deciding task type...</div>
                ) : null}
                {task.title.trim() && task.classificationStatus !== 'pending' ? (
                  <div className="small text-body-secondary mt-1">
                    {taskTypeDisplayMode(task)}:{' '}
                    <span
                      className={`fw-semibold ${isZeroRatedTask(task) ? 'text-warning' : 'text-body'}`}
                    >
                      {taskTypeLabel(task)} ({taskTypeEffortScore(task)})
                    </span>
                    <span className="text-muted"> &bull; {workTypeLabel(task)}</span>
                  </div>
                ) : null}
                {task.title.trim() &&
                task.classificationStatus !== 'pending' &&
                isNonRatedTask(task) ? (
                  <div className="small text-warning mt-1">
                    Are you sure you want to include this task? It will be saved as non-rated and
                    will not add workload score.
                  </div>
                ) : null}
                {task.title.trim() &&
                task.classificationStatus !== 'pending' &&
                isUnclearTask(task) ? (
                  <div className="small text-warning mt-1">
                    Task is too vague. Add a work action such as prepare, review, follow up, submit,
                    develop, reconcile, or audit for fair workload grading. It can still be saved
                    but will not add workload score.
                  </div>
                ) : null}
              </CCol>

              <CCol xs={9} md={embedded ? 'auto' : 3} style={embedded ? { width: '190px' } : null}>
                {index === 0 ? (
                  <CFormLabel htmlFor={`task-due-${task.id}`}>Due Date</CFormLabel>
                ) : null}
                <CFormInput
                  id={`task-due-${task.id}`}
                  type="date"
                  value={task.dueDate}
                  disabled={saving}
                  onChange={(event) => onDraftChange(task.id, 'dueDate', event.target.value)}
                />
              </CCol>

              <CCol xs={3} md="auto" className="d-flex justify-content-end ps-md-1 pt-md-4">
                <CTooltip content="Remove task" placement="top">
                  <span className="d-inline-flex">
                    <CButton
                      color="danger"
                      variant="ghost"
                      aria-label={`Remove task ${index + 1}`}
                      disabled={saving || taskDrafts.length === 1}
                      onClick={() => onRemoveDraft(task.id)}
                    >
                      <CIcon icon={cilTrash} className="text-danger" />
                    </CButton>
                  </span>
                </CTooltip>
              </CCol>
            </CRow>
          </div>
        ))}
      </div>

      {hasTaggedProject ? (
        <div className="small text-body-secondary fst-italic mt-2">{PROJECT_PROGRESS_NOTE}</div>
      ) : null}

      <CRow className="mt-3">
        <CCol className="d-flex flex-wrap gap-2">
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            onClick={onAddDraft}
            disabled={saving}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Add Row
          </CButton>
          {onBack ? (
            <CButton
              color="secondary"
              size="sm"
              variant="outline"
              onClick={onBack}
              disabled={saving}
            >
              Back
            </CButton>
          ) : null}
          {onCancel ? (
            <CButton
              color="secondary"
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </CButton>
          ) : null}
          <CButton color="danger" size="sm" variant="outline" onClick={onReset} disabled={saving}>
            Reset
          </CButton>
          <CButton
            color="primary"
            size="sm"
            className="ms-sm-auto"
            onClick={onSaveTasks}
            disabled={saving || validTaskCount === 0}
          >
            {saveLabel}
          </CButton>
        </CCol>
      </CRow>
    </>
  )

  if (embedded) return content

  return (
    <CCol md={12}>
      <CCard>
        <CCardHeader>
          <strong>Create Task</strong>
        </CCardHeader>
        <CCardBody>{content}</CCardBody>
      </CCard>
    </CCol>
  )
}

export default CreateTask

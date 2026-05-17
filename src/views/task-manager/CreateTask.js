// src/components/tasks/CreateTask.js
import React from 'react'
import {
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
import { cilPlus, cilTrash } from '@coreui/icons'

const CreateTask = ({
  taskDrafts = [],
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
  const validTaskCount = taskDrafts.filter((task) => task.title.trim()).length
  const saveLabel = saving
    ? 'Saving...'
    : `Save ${validTaskCount || ''} Task${validTaskCount === 1 ? '' : 's'}`

  const content = (
    <>
      <div className="d-grid gap-3">
        {taskDrafts.map((task, index) => (
          <CRow key={task.id} className="align-items-end g-3 flex-md-nowrap">
            <CCol xs={12} md={embedded ? true : 8} className={embedded ? 'min-w-0' : undefined}>
              {index === 0 ? <CFormLabel htmlFor={`task-title-${task.id}`}>Task</CFormLabel> : null}
              <CFormInput
                id={`task-title-${task.id}`}
                placeholder="E.g. Prepare quotation and follow up client..."
                value={task.title}
                disabled={saving}
                onChange={(event) => onDraftChange(task.id, 'title', event.target.value)}
              />
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

            <CCol xs={3} md="auto" className="d-flex justify-content-end ps-md-1">
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
        ))}
      </div>

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

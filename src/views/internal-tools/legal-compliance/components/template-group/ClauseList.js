import React, { useMemo } from 'react'
import { CButton, CListGroup } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilMove, cilPencil, cilPlus, cilTrash } from '@coreui/icons'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const InsertClauseControl = ({
  index,
  isSaving,
  disabled,
  isActiveInsert,
  renderClauseForm,
  onInsertClause,
}) => {
  if (disabled && !isActiveInsert) return null

  return (
    <div
      className={`list-group-item legal-compliance-insert-row${isActiveInsert ? ' legal-compliance-insert-row--active' : ''}`}
    >
      {isActiveInsert ? (
        <div className="w-100 p-3">{renderClauseForm()}</div>
      ) : (
        <CButton
          type="button"
          color="primary"
          size="sm"
          variant="ghost"
          className="legal-compliance-insert-button"
          onClick={(event) => {
            event.currentTarget.blur()
            onInsertClause(index)
          }}
          disabled={isSaving}
        >
          <CIcon icon={cilPlus} size="sm" />
          Add Clause Here
        </CButton>
      )}
    </div>
  )
}

const ClauseRow = ({
  clause,
  clauseIndex,
  clauseCount,
  activeClauseForm,
  isSaving,
  isRearranging,
  renderClauseForm,
  onEditClause,
  onClauseKeyDown,
  onRemoveClause,
  onMoveClause,
}) => {
  const rowBoundaryClass = `${clauseIndex === 0 ? ' legal-compliance-list-row--first' : ''}${
    clauseIndex === clauseCount - 1 ? ' legal-compliance-list-row--last' : ''
  }`
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: clause.id,
    disabled: !isRearranging || isSaving || activeClauseForm !== null,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      className={`list-group-item legal-compliance-list-row p-0${rowBoundaryClass}${isDragging ? ' legal-compliance-sortable-row--dragging' : ''}`}
      key={clause.id}
      ref={setNodeRef}
      style={style}
    >
      {activeClauseForm === clauseIndex ? (
        <div className="p-3">{renderClauseForm()}</div>
      ) : (
        <div
          className="legal-compliance-clause-tile p-3"
          role={isRearranging ? undefined : 'button'}
          tabIndex={isRearranging ? undefined : 0}
          onClick={
            isRearranging
              ? undefined
              : () => {
                  if (isSaving) return
                  onEditClause(clauseIndex)
                }
          }
          onKeyDown={isRearranging ? undefined : (event) => onClauseKeyDown(event, clauseIndex)}
        >
          <div
            className={`legal-compliance-clause-row${isRearranging ? ' legal-compliance-clause-row--rearranging' : ''}`}
          >
            {isRearranging && (
              <CButton
                type="button"
                color="transparent"
                size="sm"
                className="legal-compliance-icon-action legal-compliance-drag-handle"
                disabled={isSaving || activeClauseForm !== null}
                aria-label={`Drag ${clause.title || `clause ${clauseIndex + 1}`}`}
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
              >
                <CIcon icon={cilMove} size="sm" />
              </CButton>
            )}
            <div className="legal-compliance-clause-main">
              <strong
                className="legal-compliance-clause-title"
                title={clause.title || 'Clause title not set'}
              >
                {clause.title || 'Clause title not set'}
              </strong>
              {clause.excerpt && (
                <div className="legal-compliance-clause-excerpt text-body-secondary mt-1">
                  {clause.excerpt}
                </div>
              )}
            </div>
            <div
              className="legal-compliance-clause-actions"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {isRearranging ? (
                <>
                  <CButton
                    type="button"
                    color="transparent"
                    size="sm"
                    className="legal-compliance-icon-action"
                    onClick={() => onMoveClause(clauseIndex, clauseIndex - 1)}
                    disabled={isSaving || clauseIndex === 0}
                    aria-label={`Move ${clause.title || `clause ${clauseIndex + 1}`} up`}
                  >
                    <CIcon icon={cilArrowTop} size="sm" />
                  </CButton>
                  <CButton
                    type="button"
                    color="transparent"
                    size="sm"
                    className="legal-compliance-icon-action"
                    onClick={() => onMoveClause(clauseIndex, clauseIndex + 1)}
                    disabled={isSaving || clauseIndex === clauseCount - 1}
                    aria-label={`Move ${clause.title || `clause ${clauseIndex + 1}`} down`}
                  >
                    <CIcon icon={cilArrowBottom} size="sm" />
                  </CButton>
                </>
              ) : (
                <>
                  <CButton
                    type="button"
                    color="transparent"
                    size="sm"
                    className="legal-compliance-icon-action"
                    onClick={() => onEditClause(clauseIndex)}
                    disabled={isSaving}
                    aria-label={`Edit ${clause.title || `clause ${clauseIndex + 1}`}`}
                  >
                    <CIcon icon={cilPencil} size="sm" />
                  </CButton>
                  <CButton
                    type="button"
                    color="transparent"
                    size="sm"
                    className="legal-compliance-icon-action text-danger"
                    onClick={() => onRemoveClause(clauseIndex)}
                    disabled={isSaving || activeClauseForm !== null}
                    aria-label={`Remove ${clause.title || `clause ${clauseIndex + 1}`}`}
                  >
                    <CIcon icon={cilTrash} size="sm" />
                  </CButton>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ClauseList = ({
  clauses,
  activeClauseForm,
  newClauseInsertIndex,
  isSaving,
  isRearranging,
  renderClauseForm,
  onEditClause,
  onClauseKeyDown,
  onRemoveClause,
  onInsertClause,
  onMoveClause,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const clauseIds = useMemo(() => clauses.map((clause) => clause.id), [clauses])
  const isInsertDisabled = activeClauseForm !== null || isRearranging
  const activeInsertIndex =
    activeClauseForm === 'new'
      ? Math.min(newClauseInsertIndex ?? clauses.length, clauses.length)
      : null

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = clauses.findIndex((clause) => clause.id === active.id)
    const newIndex = clauses.findIndex((clause) => clause.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onMoveClause(oldIndex, newIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={clauseIds} strategy={verticalListSortingStrategy}>
        <CListGroup as="div">
          {clauses.map((clause, clauseIndex) => (
            <React.Fragment key={clause.id}>
              <InsertClauseControl
                index={clauseIndex}
                isSaving={isSaving}
                disabled={isInsertDisabled}
                isActiveInsert={activeInsertIndex === clauseIndex}
                renderClauseForm={renderClauseForm}
                onInsertClause={onInsertClause}
              />
              <ClauseRow
                clause={clause}
                clauseIndex={clauseIndex}
                clauseCount={clauses.length}
                activeClauseForm={activeClauseForm}
                isSaving={isSaving}
                isRearranging={isRearranging}
                renderClauseForm={renderClauseForm}
                onEditClause={onEditClause}
                onClauseKeyDown={onClauseKeyDown}
                onRemoveClause={onRemoveClause}
                onMoveClause={onMoveClause}
              />
            </React.Fragment>
          ))}
          <InsertClauseControl
            index={clauses.length}
            isSaving={isSaving}
            disabled={isInsertDisabled}
            isActiveInsert={activeInsertIndex === clauses.length}
            renderClauseForm={renderClauseForm}
            onInsertClause={onInsertClause}
          />
        </CListGroup>
      </SortableContext>
    </DndContext>
  )
}

export default ClauseList

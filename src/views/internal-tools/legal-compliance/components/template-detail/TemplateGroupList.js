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
import { formatLegalGroupTitle } from '../../utils/templateContent'

const InsertGroupControl = ({ index, isSaving, isRearranging, onInsertGroup }) => {
  if (isRearranging) return null

  return (
    <div className="list-group-item legal-compliance-insert-row">
      <CButton
        type="button"
        color="primary"
        size="sm"
        variant="ghost"
        className="legal-compliance-insert-button"
        onClick={(event) => {
          event.currentTarget.blur()
          onInsertGroup(index)
        }}
        disabled={isSaving}
      >
        <CIcon icon={cilPlus} size="sm" />
        Add Legislation Here
      </CButton>
    </div>
  )
}

const TemplateGroupRow = ({
  group,
  groupIndex,
  groupCount,
  isSaving,
  isRearranging,
  onOpenGroup,
  onGroupKeyDown,
  onEditGroup,
  onDeleteGroup,
  onMoveGroup,
}) => {
  const clauseCount = group.clauses?.length || 0
  const groupTitle = formatLegalGroupTitle(group, groupIndex)
  const rowBoundaryClass = `${groupIndex === 0 ? ' legal-compliance-list-row--first' : ''}${
    groupIndex === groupCount - 1 ? ' legal-compliance-list-row--last' : ''
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
    id: group.id,
    disabled: !isRearranging || isSaving,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`list-group-item legal-compliance-list-row legal-compliance-group-tile p-0${rowBoundaryClass}${isDragging ? ' legal-compliance-sortable-row--dragging' : ''}`}
      key={group.id}
      role={isRearranging ? undefined : 'button'}
      tabIndex={isRearranging ? undefined : 0}
      onClick={isRearranging ? undefined : () => onOpenGroup(groupIndex)}
      onKeyDown={isRearranging ? undefined : (event) => onGroupKeyDown(event, groupIndex)}
    >
      <div
        className={`legal-compliance-group-row${isRearranging ? ' legal-compliance-group-row--rearranging' : ''} p-3`}
      >
        {isRearranging && (
          <CButton
            type="button"
            color="transparent"
            size="sm"
            className="legal-compliance-icon-action legal-compliance-drag-handle"
            disabled={isSaving}
            aria-label={`Drag ${group.title || `legal group ${groupIndex + 1}`}`}
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
          >
            <CIcon icon={cilMove} size="sm" />
          </CButton>
        )}
        <div className="legal-compliance-group-main">
          <strong className="legal-compliance-group-title" title={groupTitle}>
            {groupTitle}
          </strong>
          <div className="text-body-secondary">
            {clauseCount} {clauseCount === 1 ? 'clause' : 'clauses'}
          </div>
        </div>
        <div
          className="legal-compliance-group-actions"
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
                onClick={() => onMoveGroup(groupIndex, groupIndex - 1)}
                disabled={isSaving || groupIndex === 0}
                aria-label={`Move ${group.title || `legal group ${groupIndex + 1}`} up`}
              >
                <CIcon icon={cilArrowTop} size="sm" />
              </CButton>
              <CButton
                type="button"
                color="transparent"
                size="sm"
                className="legal-compliance-icon-action"
                onClick={() => onMoveGroup(groupIndex, groupIndex + 1)}
                disabled={isSaving || groupIndex === groupCount - 1}
                aria-label={`Move ${group.title || `legal group ${groupIndex + 1}`} down`}
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
                onClick={() => onEditGroup(groupIndex)}
                disabled={isSaving}
                aria-label={`Edit ${group.title || `legal group ${groupIndex + 1}`}`}
              >
                <CIcon icon={cilPencil} size="sm" />
              </CButton>
              <CButton
                type="button"
                color="transparent"
                size="sm"
                className="legal-compliance-icon-action text-danger"
                onClick={() => onDeleteGroup(groupIndex)}
                disabled={isSaving}
                aria-label={`Remove ${group.title || `legal group ${groupIndex + 1}`}`}
              >
                <CIcon icon={cilTrash} size="sm" />
              </CButton>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const TemplateGroupList = ({
  groups,
  isSaving,
  isRearranging,
  onOpenGroup,
  onGroupKeyDown,
  onEditGroup,
  onDeleteGroup,
  onInsertGroup,
  onMoveGroup,
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
  const groupIds = useMemo(() => groups.map((group) => group.id), [groups])

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = groups.findIndex((group) => group.id === active.id)
    const newIndex = groups.findIndex((group) => group.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onMoveGroup(oldIndex, newIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
        <CListGroup as="div">
          {groups.map((group, groupIndex) => (
            <React.Fragment key={group.id}>
              <InsertGroupControl
                index={groupIndex}
                isSaving={isSaving}
                isRearranging={isRearranging}
                onInsertGroup={onInsertGroup}
              />
              <TemplateGroupRow
                group={group}
                groupIndex={groupIndex}
                groupCount={groups.length}
                isSaving={isSaving}
                isRearranging={isRearranging}
                onOpenGroup={onOpenGroup}
                onGroupKeyDown={onGroupKeyDown}
                onEditGroup={onEditGroup}
                onDeleteGroup={onDeleteGroup}
                onMoveGroup={onMoveGroup}
              />
            </React.Fragment>
          ))}
          <InsertGroupControl
            index={groups.length}
            isSaving={isSaving}
            isRearranging={isRearranging}
            onInsertGroup={onInsertGroup}
          />
        </CListGroup>
      </SortableContext>
    </DndContext>
  )
}

export default TemplateGroupList

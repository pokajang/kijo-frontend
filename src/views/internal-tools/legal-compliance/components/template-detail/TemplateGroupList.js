import React from 'react'
import { CButton, CListGroup, CListGroupItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash } from '@coreui/icons'

const TemplateGroupList = ({
  groups,
  isSaving,
  onOpenGroup,
  onGroupKeyDown,
  onEditGroup,
  onDeleteGroup,
}) => (
  <CListGroup>
    {groups.map((group, groupIndex) => {
      const clauseCount = group.clauses?.length || 0

      return (
        <CListGroupItem
          className="legal-compliance-group-tile p-0"
          key={group.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpenGroup(groupIndex)}
          onKeyDown={(event) => onGroupKeyDown(event, groupIndex)}
        >
          <div className="legal-compliance-group-row p-3">
            <div className="legal-compliance-group-main">
              <strong
                className="legal-compliance-group-title"
                title={group.title || 'Legislation name not set'}
              >
                {group.title || 'Legislation name not set'}
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
              <CButton
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
                color="transparent"
                size="sm"
                className="legal-compliance-icon-action text-danger"
                onClick={() => onDeleteGroup(groupIndex)}
                disabled={isSaving}
                aria-label={`Remove ${group.title || `legal group ${groupIndex + 1}`}`}
              >
                <CIcon icon={cilTrash} size="sm" />
              </CButton>
            </div>
          </div>
        </CListGroupItem>
      )
    })}
  </CListGroup>
)

export default TemplateGroupList

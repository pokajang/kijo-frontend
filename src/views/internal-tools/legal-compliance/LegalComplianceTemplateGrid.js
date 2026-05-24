import React from 'react'
import { CBadge, CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import { getAssessmentTierMeta } from './legalComplianceTemplateUtils'

const handleCardKeyDown = (event, action) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

const LegalComplianceTemplateGrid = ({
  templates = [],
  onTemplateClick,
  getTemplateActions,
  showCreateCard = false,
  onCreate,
  isCreateDisabled = false,
}) => (
  <div className="legal-compliance-template-grid">
    {templates.map((template) => {
      const actions = getTemplateActions ? getTemplateActions(template) : []
      const tierMeta = getAssessmentTierMeta(template.assessment_tier)

      return (
        <div
          className="legal-compliance-template-tile border rounded p-3 d-flex align-items-start justify-content-between gap-3"
          key={template.id}
          role="button"
          tabIndex={0}
          onClick={() => onTemplateClick(template)}
          onKeyDown={(event) => handleCardKeyDown(event, () => onTemplateClick(template))}
          style={{ cursor: 'pointer' }}
        >
          <div className="legal-compliance-template-tile-content">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <strong>{template.name}</strong>
              <CBadge color={tierMeta.value === 'paid' ? 'warning' : 'success'}>
                {tierMeta.badge}
              </CBadge>
            </div>
            <div className="text-body-secondary">{template.description || 'No description'}</div>
          </div>
          {actions.length > 0 && (
            <CDropdown
              alignment="end"
              className="legal-compliance-template-actions"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <CDropdownToggle
                color="transparent"
                size="sm"
                caret={false}
                className="legal-compliance-template-action-toggle"
                aria-label={`Actions for ${template.name}`}
              >
                <CIcon icon={cilOptions} />
              </CDropdownToggle>
              <CDropdownMenu>
                {actions.map((action) => (
                  <CDropdownItem
                    className={action.className}
                    disabled={action.disabled}
                    key={action.label}
                    title={action.title}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (action.disabled) return
                      action.onClick(template)
                    }}
                  >
                    {action.label}
                  </CDropdownItem>
                ))}
              </CDropdownMenu>
            </CDropdown>
          )}
        </div>
      )
    })}
    {showCreateCard && (
      <div
        className="legal-compliance-template-tile legal-compliance-template-tile--create border rounded p-3 d-flex align-items-start justify-content-between gap-3"
        role="button"
        tabIndex={isCreateDisabled ? -1 : 0}
        aria-disabled={isCreateDisabled}
        onClick={onCreate}
        onKeyDown={(event) => handleCardKeyDown(event, onCreate)}
        style={{
          cursor: isCreateDisabled ? 'default' : 'pointer',
          opacity: isCreateDisabled ? 0.75 : 1,
        }}
      >
        <div className="legal-compliance-template-tile-content">
          <strong>New Template</strong>
          <div className="text-body-secondary">
            {isCreateDisabled ? 'Creating...' : 'Create a legal compliance template from scratch.'}
          </div>
        </div>
      </div>
    )}
  </div>
)

export default LegalComplianceTemplateGrid

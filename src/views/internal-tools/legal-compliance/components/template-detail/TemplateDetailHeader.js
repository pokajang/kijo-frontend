import React from 'react'
import { CBadge, CButton, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil } from '@coreui/icons'

const TemplateDetailHeader = ({
  template,
  isEditMode,
  groupCount,
  isSaving,
  statusText,
  onEditDetails,
  onEditTemplate,
  onBack,
}) => (
  <CCardHeader className="legal-compliance-template-detail-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
    <div className="legal-compliance-header-main">
      <div className="legal-compliance-breadcrumb">
        <span
          className="legal-compliance-breadcrumb-item legal-compliance-breadcrumb-item--active"
          title={template?.name || 'Legal Compliance Template'}
        >
          {template?.name || 'Legal Compliance Template'}
        </span>
        {!isEditMode && (
          <CBadge color="secondary">
            {groupCount} legal {groupCount === 1 ? 'group' : 'groups'}
          </CBadge>
        )}
        {template && isEditMode && (
          <CButton
            color="transparent"
            size="sm"
            className="legal-compliance-template-detail-edit p-0"
            onClick={onEditDetails}
            disabled={isSaving}
            aria-label="Edit template details"
          >
            <CIcon icon={cilPencil} size="sm" />
          </CButton>
        )}
      </div>
      {template?.description && (
        <div className="legal-compliance-breadcrumb-description" title={template.description}>
          {template.description}
        </div>
      )}
      {template && isEditMode && statusText && (
        <div className="d-flex align-items-center gap-2 flex-wrap small text-body-secondary">
          <span>{statusText}</span>
        </div>
      )}
    </div>
    <div className="d-flex align-items-center gap-2 flex-wrap">
      {!isEditMode && template && (
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={onEditTemplate}
          disabled={isSaving}
        >
          Edit Template
        </CButton>
      )}
      <CButton color="secondary" variant="outline" size="sm" onClick={onBack} disabled={isSaving}>
        Back
      </CButton>
    </div>
  </CCardHeader>
)

export default TemplateDetailHeader

import React from 'react'
import { CButton } from '@coreui/react'

const KnowledgeArticleFormActions = ({
  editRemarksMissing,
  isArchived,
  navigate,
  processingImages,
  saveArticle,
  saving,
}) => (
  <div className="d-flex justify-content-end flex-wrap gap-2">
    <CButton
      color="secondary"
      variant="outline"
      size="sm"
      onClick={() => navigate('/knowledge')}
      disabled={saving}
    >
      Cancel
    </CButton>
    <CButton
      color="secondary"
      variant="outline"
      size="sm"
      onClick={() => saveArticle('draft')}
      disabled={saving || processingImages || isArchived || editRemarksMissing}
    >
      {saving ? 'Saving...' : 'Save Draft'}
    </CButton>
    <CButton
      color="primary"
      size="sm"
      onClick={() => saveArticle('published')}
      disabled={saving || processingImages || isArchived || editRemarksMissing}
    >
      {saving ? 'Saving...' : 'Publish'}
    </CButton>
  </div>
)

export default KnowledgeArticleFormActions

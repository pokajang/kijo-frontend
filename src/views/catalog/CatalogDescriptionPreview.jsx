import React from 'react'
import PropTypes from 'prop-types'

import { compactCatalogDescription } from '../../utils/catalogDescription'

const CatalogDescriptionPreview = ({ value }) => {
  const preview = compactCatalogDescription(value)

  return (
    <div className="mt-1">
      <small className="text-muted">
        Use commas, semicolons, or numbered entries for compact quotation wording. Pasted bullet
        lists are accepted and normalized when displayed.
      </small>
      {preview && (
        <div className="small text-muted border rounded p-2 mt-1" data-testid="catalog-pdf-preview">
          <strong>Quotation preview:</strong> {preview}
        </div>
      )}
    </div>
  )
}

CatalogDescriptionPreview.propTypes = {
  value: PropTypes.string,
}

export default CatalogDescriptionPreview

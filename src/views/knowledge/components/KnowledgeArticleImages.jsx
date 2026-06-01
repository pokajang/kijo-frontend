import React from 'react'
import { CCol, CRow } from '@coreui/react'

const KnowledgeArticleImages = ({ images = [], variant = 'detail' }) => {
  if (!Array.isArray(images) || images.length === 0) return null

  if (variant === 'side-panel') {
    return (
      <div className="knowledge-side-panel-images">
        {images.map((image) => (
          <figure key={image.id}>
            <img src={image.url} alt={image.description} />
            <figcaption>{image.description}</figcaption>
          </figure>
        ))}
      </div>
    )
  }

  return (
    <CRow className="g-3 mb-4">
      {images.map((image) => (
        <CCol md={4} key={image.id}>
          <img
            src={image.url}
            alt={image.description}
            className="w-100 rounded border"
            style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
          />
          <div className="small text-body-secondary mt-1">{image.description}</div>
        </CCol>
      ))}
    </CRow>
  )
}

export default KnowledgeArticleImages

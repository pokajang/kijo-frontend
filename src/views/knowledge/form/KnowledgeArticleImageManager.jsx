import React from 'react'
import { CButton, CCol, CFormInput, CFormLabel, CRow } from '@coreui/react'
import { MAX_KNOWLEDGE_IMAGES } from '../constants'

const ImageCard = ({ image, isNew = false, onRemove, onUpdateDescription }) => (
  <CCol md={4}>
    <div className="border rounded p-2 h-100">
      <img
        src={isNew ? image.previewUrl : image.url}
        alt={image.description || (isNew ? image.file.name : 'Knowledge screenshot')}
        className="w-100 rounded mb-2"
        style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
      />
      <CFormInput
        value={image.description || ''}
        placeholder="Image description"
        onChange={(event) =>
          onUpdateDescription(isNew ? image.localId : image.id, event.target.value)
        }
      />
      <CButton color="danger" variant="outline" size="sm" className="mt-2" onClick={onRemove}>
        Remove
      </CButton>
    </div>
  </CCol>
)

const KnowledgeArticleImageManager = ({
  addImages,
  form,
  isArchived,
  processingImages,
  removeExistingImage,
  removeNewImage,
  updateExistingImageDescription,
  updateNewImageDescription,
}) => (
  <>
    <div className="mb-3">
      <CFormLabel>Screenshots</CFormLabel>
      <CFormInput
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => {
          addImages(event.target.files)
          event.target.value = ''
        }}
        disabled={
          isArchived ||
          processingImages ||
          form.images.length + form.newImages.length >= MAX_KNOWLEDGE_IMAGES
        }
      />
      <div className="form-text">
        Optional. Attach up to 10 JPG, PNG, or WebP images. New images are compressed below 500 KB
        when possible. You can also paste a copied screenshot into this form.
      </div>
    </div>

    {(form.images.length > 0 || form.newImages.length > 0) && (
      <CRow className="g-3 mb-4">
        {form.images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onRemove={() => removeExistingImage(image.id)}
            onUpdateDescription={updateExistingImageDescription}
          />
        ))}
        {form.newImages.map((image) => (
          <ImageCard
            key={image.localId}
            image={image}
            isNew
            onRemove={() => removeNewImage(image.localId)}
            onUpdateDescription={updateNewImageDescription}
          />
        ))}
      </CRow>
    )}
  </>
)

export default KnowledgeArticleImageManager

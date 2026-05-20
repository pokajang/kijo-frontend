import React, { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CAlert,
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil } from '@coreui/icons'
import Editor from '../../../components/forms/ThemedTinyMCEEditor'
import dialog from '../../../components/dialog/dialogService'
import { saveHandbookDraftSection } from '../api/handbookApi'
import { handbookEditorInit } from '../utils/handbookEditorConfig'
import { normalizeHandbookContent, normalizeHandbookHtml } from '../utils/handbookContentUtils'
import { sanitizeDisplayHtml } from '../../templates/shared/templateUtils'
import {
  buildChangeSummary,
  makeChangeSummaryPlaceholder,
  normalizeDraftText,
  splitSectionTitle,
} from '../utils/handbookEditUtils'

const HandbookContent = ({
  content,
  canManage = false,
  baseVersionId = null,
  onDraftSaved = () => {},
  onStaleVersion = () => {},
}) => {
  const normalizedContent = useMemo(() => normalizeHandbookContent(content), [content])
  const [accordionKey, setAccordionKey] = useState('view')
  const [expandedSectionId, setExpandedSectionId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBodyHtml, setDraftBodyHtml] = useState('')
  const [changeSummaryDetail, setChangeSummaryDetail] = useState('')
  const [hasUserEdited, setHasUserEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const editingChapter = normalizedContent.chapters.find((chapter) => chapter.id === editingId)
  const isDirty =
    hasUserEdited &&
    editingChapter &&
    (normalizeDraftText(draftTitle) !== editingChapter.title ||
      normalizeHandbookHtml(draftBodyHtml) !== normalizeHandbookHtml(editingChapter.bodyHtml) ||
      normalizeDraftText(changeSummaryDetail) !== '')

  const beginEdit = async (chapter) => {
    if (saving) {
      return
    }

    if (editingId && editingId !== chapter.id && isDirty) {
      const discard = await dialog.confirm('Discard the unsaved handbook section changes?')
      if (!discard) {
        return
      }
    }

    setEditingId(chapter.id)
    setDraftTitle(chapter.title)
    setDraftBodyHtml(chapter.bodyHtml)
    setChangeSummaryDetail('')
    setHasUserEdited(false)
    setError(null)
    setExpandedSectionId(chapter.id)
    setAccordionKey(`editing-${chapter.id}`)
  }

  const exitEdit = async ({ nextExpandedSectionId, nextAccordionKey }) => {
    if (saving) {
      return false
    }

    if (isDirty) {
      const discard = await dialog.confirm('Discard the unsaved handbook section changes?')
      if (!discard) {
        return false
      }
    }

    setEditingId(null)
    setDraftTitle('')
    setDraftBodyHtml('')
    setChangeSummaryDetail('')
    setHasUserEdited(false)
    setError(null)
    setExpandedSectionId(nextExpandedSectionId)
    setAccordionKey(nextAccordionKey)

    return true
  }

  const cancelEdit = async () => {
    const sectionId = editingId

    await exitEdit({
      nextExpandedSectionId: sectionId,
      nextAccordionKey: `view-${sectionId}`,
    })
  }

  const handleHeaderToggleAttempt = (event, chapter, isEditing) => {
    if (!editingId || saving) {
      return
    }

    if (event.target.closest?.('.handbook-section-edit-btn')) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (isEditing) {
      exitEdit({
        nextExpandedSectionId: null,
        nextAccordionKey: `collapsed-${chapter.id}`,
      })
      return
    }

    exitEdit({
      nextExpandedSectionId: chapter.id,
      nextAccordionKey: `view-${chapter.id}`,
    })
  }

  const handleHeaderKeyDown = (event, chapter, isEditing) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    handleHeaderToggleAttempt(event, chapter, isEditing)
  }

  const saveSection = async (chapter) => {
    if (saving) {
      return
    }

    const nextTitle = normalizeDraftText(draftTitle)
    const nextBodyHtml = normalizeHandbookHtml(draftBodyHtml)
    const nextSummaryDetail = normalizeDraftText(changeSummaryDetail)

    if (!nextTitle || !nextBodyHtml) {
      setError('Section title and content are required.')
      return
    }

    const titleChanged = nextTitle !== chapter.title
    const bodyChanged = nextBodyHtml !== normalizeHandbookHtml(chapter.bodyHtml)
    if (!titleChanged && !bodyChanged) {
      setError('No changes detected for this section.')
      return
    }

    if (!nextSummaryDetail) {
      setError('Explain what changed in this section.')
      return
    }

    const nextSummary = buildChangeSummary({
      chapterTitle: chapter.title,
      titleChanged,
      bodyChanged,
      detail: nextSummaryDetail,
    })

    setSaving(true)
    setError(null)

    try {
      if (!baseVersionId) {
        setError('Reload the handbook before editing this section.')
        return
      }

      const json = await saveHandbookDraftSection({
        baseHandbookVersionId: baseVersionId,
        changeSummary: nextSummary,
        sectionId: chapter.id,
        sectionTitle: nextTitle,
        bodyHtml: nextBodyHtml,
      })

      if (json.success) {
        dialog.alert(json.message || 'Handbook section saved to draft.')
        setEditingId(null)
        setDraftTitle('')
        setDraftBodyHtml('')
        setChangeSummaryDetail('')
        setHasUserEdited(false)
        setExpandedSectionId(chapter.id)
        setAccordionKey(`view-${chapter.id}`)
        onDraftSaved(json.data)
      } else {
        if (json.status === 409) {
          onStaleVersion(json.message)
        }
        setError(json.message || 'Failed to save handbook draft section.')
      }
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CAccordion
      key={accordionKey}
      className="handbook-accordion"
      activeItemKey={editingId || expandedSectionId || undefined}
    >
      <div className="handbook">
        {normalizedContent.chapters.map((chapter, index) => {
          const isEditing = editingId === chapter.id
          const itemKey = chapter.id || String(index + 1)
          const sectionTitle = splitSectionTitle(
            isEditing ? draftTitle || chapter.title : chapter.title,
          )
          const titleChanged = normalizeDraftText(draftTitle) !== chapter.title
          const bodyChanged =
            normalizeHandbookHtml(draftBodyHtml) !== normalizeHandbookHtml(chapter.bodyHtml)
          const changeSummaryPlaceholder = makeChangeSummaryPlaceholder({
            titleChanged,
            bodyChanged,
          })

          return (
            <CAccordionItem
              itemKey={itemKey}
              key={itemKey}
              className={`handbook-section${isEditing ? ' handbook-section--editing' : ''}`}
            >
              <CAccordionHeader
                className="handbook-section-header-wrap"
                onClickCapture={(event) => handleHeaderToggleAttempt(event, chapter, isEditing)}
                onKeyDownCapture={(event) => handleHeaderKeyDown(event, chapter, isEditing)}
              >
                <span className="handbook-section-title-row">
                  <strong className="handbook-section-title-text">
                    {sectionTitle.number && (
                      <span className="handbook-section-title-number">{sectionTitle.number}</span>
                    )}
                    <span>{sectionTitle.title}</span>
                  </strong>
                  {canManage && !isEditing && (
                    <span
                      role="button"
                      tabIndex={saving ? -1 : 0}
                      className={`handbook-section-edit-btn${saving ? ' disabled' : ''}`}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        if (!saving) beginEdit(chapter)
                      }}
                      onKeyDown={(event) => {
                        if (saving || (event.key !== 'Enter' && event.key !== ' ')) return
                        event.preventDefault()
                        event.stopPropagation()
                        beginEdit(chapter)
                      }}
                      title={`Edit ${chapter.title}`}
                      aria-label={`Edit ${chapter.title}`}
                      aria-disabled={saving}
                    >
                      <CIcon icon={cilPencil} size="sm" />
                    </span>
                  )}
                </span>
              </CAccordionHeader>
              <CAccordionBody>
                {isEditing ? (
                  <div className="handbook-section-editor">
                    {error && <CAlert color="danger">{error}</CAlert>}

                    <div className="mb-3">
                      <CFormLabel htmlFor={`handbook-section-title-${chapter.id}`}>
                        Section Title
                      </CFormLabel>
                      <CFormInput
                        id={`handbook-section-title-${chapter.id}`}
                        value={draftTitle}
                        onChange={(event) => {
                          setHasUserEdited(true)
                          setDraftTitle(event.target.value)
                        }}
                        disabled={saving}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <CFormLabel>Section Content</CFormLabel>
                      <Editor
                        tinymceScriptSrc="/tinymce/tinymce.min.js"
                        value={draftBodyHtml}
                        init={handbookEditorInit}
                        disabled={saving}
                        onEditorChange={(value) => setDraftBodyHtml(value)}
                        onDirty={() => setHasUserEdited(true)}
                      />
                    </div>

                    <div className="mb-3">
                      <CFormLabel>Change Summary</CFormLabel>
                      <CFormTextarea
                        id={`handbook-section-summary-${chapter.id}`}
                        rows={2}
                        value={changeSummaryDetail}
                        placeholder={changeSummaryPlaceholder}
                        onChange={(event) => {
                          setHasUserEdited(true)
                          setChangeSummaryDetail(event.target.value)
                        }}
                        disabled={saving || (!titleChanged && !bodyChanged)}
                        required={titleChanged || bodyChanged}
                      />
                    </div>

                    <div className="d-flex justify-content-end gap-2 flex-wrap">
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </CButton>
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={() => saveSection(chapter)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Draft Section'}
                      </CButton>
                    </div>
                  </div>
                ) : (
                  <div
                    className="handbook-section-document"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeDisplayHtml(chapter.bodyHtml) || '<p>-</p>',
                    }}
                  />
                )}
              </CAccordionBody>
            </CAccordionItem>
          )
        })}
      </div>
    </CAccordion>
  )
}

HandbookContent.propTypes = {
  content: PropTypes.shape({
    title: PropTypes.string,
    chapters: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string.isRequired,
        bodyHtml: PropTypes.string.isRequired,
      }),
    ),
  }).isRequired,
  canManage: PropTypes.bool,
  baseVersionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onDraftSaved: PropTypes.func,
  onStaleVersion: PropTypes.func,
}

export default HandbookContent

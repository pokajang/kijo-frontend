import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { apiFetch } from '../../api/apiClient'

const PDF = 'application/pdf'
const IMAGES = new Set(['image/jpeg', 'image/png'])

const AuthenticatedDocumentPreviewModal = ({
  visible,
  onClose,
  url,
  title,
  originalName,
  allowImages = false,
}) => {
  const documentLabel = title === 'Invoice Preview' ? 'invoice' : 'document'
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({ status: 'idle', objectUrl: '', mimeType: '', error: '' })

  useEffect(() => {
    if (!visible) {
      setState({ status: 'idle', objectUrl: '', mimeType: '', error: '' })
      return undefined
    }
    if (!url) {
      setState({ status: 'error', objectUrl: '', mimeType: '', error: `${title} is unavailable.` })
      return undefined
    }

    const controller = new AbortController()
    let objectUrl = ''
    setState({ status: 'loading', objectUrl: '', mimeType: '', error: '' })
    const load = async () => {
      try {
        const response = await apiFetch(url, {
          credentials: 'include',
          headers: { Accept: allowImages ? 'application/pdf, image/jpeg, image/png' : PDF },
          signal: controller.signal,
          silentError: true,
        })
        if (!response.ok) {
          const payload = await response
            .clone()
            .json()
            .catch(() => ({}))
          const fallback =
            response.status === 404
              ? `The ${documentLabel} attachment could not be found.`
              : `The ${documentLabel} could not be loaded. Please try again.`
          throw new Error(payload?.message || fallback)
        }
        const mimeType = String(response.headers.get('content-type') || '')
          .split(';')[0]
          .trim()
          .toLowerCase()
        if (mimeType !== PDF && !(allowImages && IMAGES.has(mimeType))) {
          throw new Error(`${title} has an unsupported file type.`)
        }
        const blob = await response.blob()
        if (mimeType === PDF && (await blob.slice(0, 5).text()) !== '%PDF-') {
          throw new Error(`${title} is not a valid PDF file.`)
        }
        objectUrl = URL.createObjectURL(blob)
        setState({ status: 'ready', objectUrl, mimeType, error: '' })
      } catch (error) {
        if (error?.name === 'AbortError') return
        setState({
          status: 'error',
          objectUrl: '',
          mimeType: '',
          error: error?.message || `${title} could not be loaded.`,
        })
      }
    }
    load()

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [allowImages, documentLabel, reloadKey, title, url, visible])

  const isImage = state.mimeType.startsWith('image/')

  return (
    <CModal size="xl" visible={visible} onClose={onClose} aria-labelledby="document-preview-title">
      <CModalHeader>
        <CModalTitle id="document-preview-title">{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div aria-live="polite" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && (
            <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-body-secondary">
              <CSpinner size="sm" /> <span>Loading {documentLabel}…</span>
            </div>
          )}
          {state.status === 'error' && <CAlert color="danger">{state.error}</CAlert>}
          {state.status === 'ready' && isImage && (
            <div className="text-center bg-body-tertiary rounded p-2">
              <img
                src={state.objectUrl}
                alt={`${title}: ${originalName}`}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
          )}
          {state.status === 'ready' && !isImage && (
            <div>
              <p className="small text-body-secondary mb-2">
                PDF loaded. If the preview does not appear in your browser, use Download below.
              </p>
              <iframe
                src={state.objectUrl}
                className="authenticated-document-preview__frame"
                title={`${title} Document`}
              />
            </div>
          )}
        </div>
      </CModalBody>
      <CModalFooter>
        {state.status === 'error' && url && (
          <CButton size="sm" color="primary" onClick={() => setReloadKey((value) => value + 1)}>
            Retry
          </CButton>
        )}
        {state.status === 'ready' && (
          <CButton size="sm" color="primary" as="a" href={state.objectUrl} download={originalName}>
            Download
          </CButton>
        )}
        <CButton size="sm" color="secondary" variant="outline" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

AuthenticatedDocumentPreviewModal.propTypes = {
  allowImages: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  originalName: PropTypes.string,
  title: PropTypes.string.isRequired,
  url: PropTypes.string,
  visible: PropTypes.bool,
}

export default AuthenticatedDocumentPreviewModal

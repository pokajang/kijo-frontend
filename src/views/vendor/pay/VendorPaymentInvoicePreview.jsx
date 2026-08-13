import React, { useEffect, useState } from 'react'
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
import { apiFetch } from '../../../api/apiClient'

const SUPPORTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

const responseErrorMessage = async (response) => {
  const payload = await response
    .clone()
    .json()
    .catch(() => ({}))
  if (response.status === 401)
    return 'Your session has expired. Sign in again to view this invoice.'
  if (response.status === 403) return 'You do not have permission to view this invoice.'
  if (response.status === 404) return 'The invoice attachment could not be found.'
  if (response.status === 409) {
    return payload?.message || 'The invoice failed its integrity check and cannot be previewed.'
  }
  return payload?.message || 'The invoice could not be loaded. Please try again.'
}

const validateBlob = async (blob, mimeType) => {
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new Error('This invoice file type cannot be previewed safely.')
  }
  if (mimeType === 'application/pdf') {
    const signature = await blob.slice(0, 5).text()
    if (signature !== '%PDF-') {
      throw new Error('The invoice is not a valid PDF file.')
    }
  }
}

const VendorPaymentInvoicePreview = ({ visible, onClose, url, originalName = 'invoice' }) => {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({ status: 'idle', objectUrl: '', mimeType: '', error: '' })

  useEffect(() => {
    if (!visible) {
      setState({ status: 'idle', objectUrl: '', mimeType: '', error: '' })
      return undefined
    }
    if (!url) {
      setState({
        status: 'error',
        objectUrl: '',
        mimeType: '',
        error: 'No invoice attachment is available for this payment.',
      })
      return undefined
    }

    const controller = new AbortController()
    let generatedObjectUrl = ''
    setState({ status: 'loading', objectUrl: '', mimeType: '', error: '' })

    const load = async () => {
      try {
        const response = await apiFetch(url, {
          credentials: 'include',
          headers: { Accept: 'application/pdf, image/jpeg, image/png' },
          signal: controller.signal,
          silentError: true,
        })
        if (!response.ok) {
          throw new Error(await responseErrorMessage(response))
        }

        const mimeType = String(response.headers.get('content-type') || '')
          .split(';')[0]
          .trim()
          .toLowerCase()
        const blob = await response.blob()
        await validateBlob(blob, mimeType)
        generatedObjectUrl = URL.createObjectURL(blob)
        setState({ status: 'ready', objectUrl: generatedObjectUrl, mimeType, error: '' })
      } catch (error) {
        if (error?.name === 'AbortError') return
        setState({
          status: 'error',
          objectUrl: '',
          mimeType: '',
          error: error?.message || 'The invoice could not be loaded. Please try again.',
        })
      }
    }

    load()

    return () => {
      controller.abort()
      if (generatedObjectUrl) URL.revokeObjectURL(generatedObjectUrl)
    }
  }, [reloadKey, url, visible])

  const isImage = state.mimeType.startsWith('image/')

  return (
    <CModal size="lg" visible={visible} onClose={onClose} aria-labelledby="invoice-preview-title">
      <CModalHeader>
        <CModalTitle id="invoice-preview-title">Invoice Preview</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div aria-live="polite" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' ? (
            <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-body-secondary">
              <CSpinner size="sm" />
              <span>Loading invoice…</span>
            </div>
          ) : null}

          {state.status === 'error' ? (
            <CAlert color="danger" className="mb-0">
              {state.error}
            </CAlert>
          ) : null}

          {state.status === 'ready' && isImage ? (
            <div className="text-center bg-body-tertiary rounded p-2">
              <img
                src={state.objectUrl}
                alt={`Invoice attachment: ${originalName}`}
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
              />
            </div>
          ) : null}

          {state.status === 'ready' && !isImage ? (
            <div>
              <p className="small text-body-secondary mb-2">
                PDF loaded. If the preview does not appear in your browser, use Download below.
              </p>
              <iframe
                src={state.objectUrl}
                style={{ width: '100%', height: 'min(65vh, 600px)', border: 'none' }}
                title="Invoice Preview Document"
              />
            </div>
          ) : null}
        </div>
      </CModalBody>
      <CModalFooter>
        {state.status === 'error' && url ? (
          <CButton color="primary" onClick={() => setReloadKey((value) => value + 1)}>
            Retry
          </CButton>
        ) : null}
        {state.status === 'ready' ? (
          <CButton
            color="primary"
            as="a"
            href={state.objectUrl}
            download={originalName || 'invoice'}
          >
            Download
          </CButton>
        ) : null}
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default VendorPaymentInvoicePreview

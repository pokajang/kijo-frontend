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
import { loadQuotationPdf } from '../../services/quotationPdfService'

const initialState = {
  status: 'idle',
  objectUrl: '',
  filename: '',
  error: '',
}

const QuotationPdfPreviewModal = ({ visible, request, onClose, loadPdf = loadQuotationPdf }) => {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState(initialState)
  const record = request?.record
  const quotationReference = record?.quotationId || record?.quoteRefNo || record?.quote_ref_no || ''

  useEffect(() => {
    if (!visible) {
      setState(initialState)
      return undefined
    }

    if (!request?.url) {
      setState({
        ...initialState,
        status: 'error',
        error: 'The quotation PDF is not available.',
      })
      return undefined
    }

    const controller = new AbortController()
    let active = true
    let generatedObjectUrl = ''
    setState({ ...initialState, status: 'loading' })

    const load = async () => {
      try {
        const result = await loadPdf({
          url: request.url,
          record,
          signal: controller.signal,
        })
        if (!active) return

        generatedObjectUrl = URL.createObjectURL(result.blob)
        setState({
          status: 'ready',
          objectUrl: generatedObjectUrl,
          filename: result.filename,
          error: '',
        })
        request.onLoadSuccess?.(result)
      } catch (error) {
        if (!active || error?.name === 'AbortError') return
        if (error?.status === 409 && (error?.data?.approval || error?.data?.issuance_context)) {
          try {
            await request.onApprovalStateChanged?.(error.data)
          } catch {
            // The PDF error remains actionable even if the background approval refresh fails.
          }
        }
        if (!active) return
        setState({
          ...initialState,
          status: 'error',
          error: error?.message || 'The quotation PDF could not be generated. Please try again.',
        })
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
      if (generatedObjectUrl) URL.revokeObjectURL(generatedObjectUrl)
    }
  }, [loadPdf, record, reloadKey, request, visible])

  return (
    <CModal
      size="xl"
      scrollable
      visible={visible}
      onClose={onClose}
      aria-labelledby="quotation-pdf-preview-title"
    >
      <CModalHeader>
        <CModalTitle id="quotation-pdf-preview-title">
          Quotation PDF{quotationReference ? ` — ${quotationReference}` : ''}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div aria-live="polite" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' ? (
            <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-body-secondary">
              <CSpinner size="sm" />
              <span>Generating quotation PDF…</span>
            </div>
          ) : null}

          {state.status === 'error' ? (
            <CAlert color="danger" className="mb-0">
              <div>{state.error}</div>
              <div className="small mt-1">
                The quotation remains saved and unchanged. Retry when the issue is resolved.
              </div>
            </CAlert>
          ) : null}

          {state.status === 'ready' ? (
            <div>
              <div className="d-flex flex-wrap justify-content-between gap-2 mb-2 small text-body-secondary">
                <span>PDF ready. Use Download PDF to preserve the quotation filename.</span>
                <span className="text-break">{state.filename}</span>
              </div>
              <iframe
                src={state.objectUrl}
                style={{ width: '100%', height: 'min(70vh, 720px)', border: 'none' }}
                title="Quotation PDF preview"
              />
            </div>
          ) : null}
        </div>
      </CModalBody>
      <CModalFooter>
        {state.status === 'error' && request?.url ? (
          <CButton color="primary" onClick={() => setReloadKey((value) => value + 1)}>
            Retry
          </CButton>
        ) : null}
        {state.status === 'ready' ? (
          <CButton color="primary" as="a" href={state.objectUrl} download={state.filename}>
            Download PDF
          </CButton>
        ) : null}
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default QuotationPdfPreviewModal

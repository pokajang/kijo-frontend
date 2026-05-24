import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CAlert,
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { registerDialogImpl } from './dialogService'

const AppDialogProvider = ({ children }) => {
  const navigate = useNavigate()
  const queueRef = useRef([])
  const currentRef = useRef(null)

  const [current, setCurrent] = useState(null)
  const [promptValue, setPromptValue] = useState('')
  const [promptError, setPromptError] = useState('')
  const [selectValue, setSelectValue] = useState('')
  const [checklistSelection, setChecklistSelection] = useState({})
  const [ackChecked, setAckChecked] = useState(false)
  const [asyncAction, setAsyncAction] = useState({ status: 'idle', message: '' })

  const showNext = useCallback(() => {
    if (currentRef.current) return
    const next = queueRef.current.shift()
    if (!next) return

    currentRef.current = next
    setCurrent(next)
    setPromptError('')
    setPromptValue(String(next.options?.defaultValue ?? ''))
    setAckChecked(false)
    setAsyncAction({ status: 'idle', message: '' })
    const selectOptions = Array.isArray(next.options?.select?.options)
      ? next.options.select.options
      : []
    const defaultSelect =
      next.options?.select?.defaultValue ?? (selectOptions.length ? selectOptions[0].value : '')
    setSelectValue(String(defaultSelect ?? ''))

    const checklistGroups = Array.isArray(next.options?.checklist?.groups)
      ? next.options.checklist.groups
      : []
    const defaultSelected = next.options?.checklist?.defaultSelected || {}
    const initialSelection = {}
    checklistGroups.forEach((group) => {
      const key = group.key
      const defaults = Array.isArray(defaultSelected[key]) ? defaultSelected[key] : []
      initialSelection[key] = new Set(defaults.map((val) => String(val)))
    })
    setChecklistSelection(initialSelection)
  }, [])

  const enqueue = useCallback(
    (type, message, options = {}) =>
      new Promise((resolve) => {
        queueRef.current.push({
          type,
          message: String(message ?? ''),
          options: options || {},
          resolve,
        })
        showNext()
      }),
    [showNext],
  )

  const closeWithResult = useCallback(
    (result) => {
      const active = currentRef.current
      if (!active) return

      currentRef.current = null
      setCurrent(null)
      active.resolve(result)
      window.setTimeout(showNext, 0)
    },
    [showNext],
  )

  const handleClose = useCallback(() => {
    if (!currentRef.current) return
    if (asyncAction.status === 'loading' || asyncAction.status === 'success') return
    if (currentRef.current.type === 'confirm') {
      const options = currentRef.current.options || {}
      const hasChecklist =
        Array.isArray(options.checklist?.groups) && options.checklist.groups.length > 0
      const hasExtended =
        Boolean(options.select) || Boolean(options.acknowledge) || Boolean(hasChecklist)
      if (hasExtended) {
        const serialized = {}
        Object.keys(checklistSelection).forEach((key) => {
          serialized[key] = Array.from(checklistSelection[key] || [])
        })
        closeWithResult({
          confirmed: false,
          value: selectValue,
          checklist: serialized,
          acknowledged: ackChecked,
        })
        return
      }
      closeWithResult(false)
      return
    }
    if (currentRef.current.type === 'prompt') {
      closeWithResult(null)
      return
    }
    closeWithResult(undefined)
  }, [ackChecked, asyncAction.status, checklistSelection, closeWithResult, selectValue])

  const submitPrompt = useCallback(() => {
    if (!currentRef.current || currentRef.current.type !== 'prompt') return
    const required = Boolean(currentRef.current.options?.required)
    if (required && !String(promptValue || '').trim()) {
      setPromptError('This field is required.')
      return
    }
    closeWithResult(promptValue)
  }, [closeWithResult, promptValue])

  const dialogApi = useMemo(
    () => ({
      alert: (message, options) => enqueue('alert', message, options),
      confirm: (message, options) => enqueue('confirm', message, options),
      prompt: (message, options) => enqueue('prompt', message, options),
    }),
    [enqueue],
  )

  useEffect(() => {
    registerDialogImpl(dialogApi)
    return () => registerDialogImpl(null)
  }, [dialogApi])

  const currentType = current?.type || 'alert'
  const currentOptions = current?.options || {}
  const title =
    currentOptions.title ||
    (currentType === 'confirm'
      ? 'Confirmation'
      : currentType === 'prompt'
        ? 'Input Required'
        : 'Notification')
  const cancelText = currentOptions.cancelText || 'Cancel'
  const confirmText =
    currentOptions.confirmText || (currentType === 'prompt' ? 'Submit' : 'Confirm')
  const okText = currentOptions.okText || 'OK'
  const confirmColor = currentOptions.confirmColor || 'primary'
  const resolvedSize =
    currentOptions.size && currentOptions.size !== 'sm' ? currentOptions.size : undefined
  const multilinePrompt = Boolean(currentOptions.multiline)
  const alertPayload = currentOptions.alert
  const alertMessage = typeof alertPayload === 'string' ? alertPayload : alertPayload?.message || ''
  const alertColor =
    typeof alertPayload === 'object' && alertPayload?.color ? alertPayload.color : 'warning'
  const selectOptions = Array.isArray(currentOptions.select?.options)
    ? currentOptions.select.options
    : []
  const showSelect = currentType === 'confirm' && selectOptions.length > 0
  const selectLabel = currentOptions.select?.label || 'Select'
  const selectMode = currentOptions.select?.mode || 'select'
  const selectHelper = currentOptions.select?.helperText || ''
  const checklistGroups = Array.isArray(currentOptions.checklist?.groups)
    ? currentOptions.checklist.groups
    : []
  const relatedRecordGroups = Array.isArray(currentOptions.relatedRecords?.groups)
    ? currentOptions.relatedRecords.groups
    : []
  const showChecklist = currentType === 'confirm' && checklistGroups.length > 0
  const showRelatedRecords = relatedRecordGroups.some(
    (group) => Array.isArray(group?.items) && group.items.length > 0,
  )
  const checklistLabel = currentOptions.checklist?.label || 'Select documents'
  const acknowledgeLabel = currentOptions.acknowledge?.label || ''
  const acknowledgeRequired = Boolean(currentOptions.acknowledge?.required)
  const disableConfirm =
    currentType === 'confirm' &&
    ((acknowledgeRequired && !ackChecked) || Boolean(currentOptions.confirmDisabled))
  const hasAsyncConfirm =
    currentType === 'confirm' && typeof currentOptions.onConfirm === 'function'
  const asyncActionActive = asyncAction.status === 'loading' || asyncAction.status === 'success'

  const serializeConfirmPayload = useCallback(
    (confirmed, actionResult) => {
      const hasExtended = showSelect || showChecklist || acknowledgeLabel
      if (!hasExtended) return actionResult ?? confirmed

      return {
        confirmed,
        value: selectValue,
        checklist: Object.keys(checklistSelection).reduce((acc, key) => {
          acc[key] = Array.from(checklistSelection[key] || [])
          return acc
        }, {}),
        acknowledged: ackChecked,
        actionResult,
      }
    },
    [ackChecked, acknowledgeLabel, checklistSelection, selectValue, showChecklist, showSelect],
  )

  const submitConfirm = useCallback(async () => {
    if (!currentRef.current || currentRef.current.type !== 'confirm') return

    const options = currentRef.current.options || {}
    if (typeof options.onConfirm !== 'function') {
      closeWithResult(serializeConfirmPayload(true))
      return
    }

    setAsyncAction({
      status: 'loading',
      message: options.loadingMessage || 'Processing request...',
    })

    try {
      const actionResult = await options.onConfirm()
      setAsyncAction({
        status: 'success',
        message: options.successMessage || 'Done.',
      })

      window.setTimeout(
        () => {
          closeWithResult(serializeConfirmPayload(true, actionResult))
        },
        Number(options.successDelayMs ?? 1000),
      )
    } catch (err) {
      setAsyncAction({
        status: 'error',
        message: err?.message || options.errorMessage || 'Request failed. Please try again.',
      })
    }
  }, [closeWithResult, serializeConfirmPayload])

  const openRelatedRecord = useCallback(
    (event, href) => {
      if (!href) return
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      event.preventDefault()
      closeWithResult(undefined)
      if (String(href).startsWith('/')) {
        navigate(href)
        return
      }
      window.location.assign(href)
    },
    [closeWithResult, navigate],
  )

  return (
    <>
      {children}

      <CModal
        visible={Boolean(current)}
        onClose={handleClose}
        alignment="center"
        backdrop={currentOptions.backdrop || 'static'}
        keyboard={false}
        size={resolvedSize}
      >
        <CModalHeader closeButton={!asyncActionActive}>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div style={{ whiteSpace: 'pre-wrap' }}>{current?.message || ''}</div>

          {alertMessage ? (
            <CAlert color={alertColor} className="mt-3 mb-0">
              {alertMessage}
            </CAlert>
          ) : null}

          {asyncAction.status !== 'idle' ? (
            <CAlert
              color={
                asyncAction.status === 'error'
                  ? 'danger'
                  : asyncAction.status === 'success'
                    ? 'success'
                    : 'info'
              }
              className="mt-3 mb-0"
            >
              <div className="d-flex align-items-center gap-2">
                {asyncAction.status === 'loading' ? <CSpinner size="sm" /> : null}
                <span>{asyncAction.message}</span>
              </div>
            </CAlert>
          ) : null}

          {showRelatedRecords ? (
            <div className="mt-3 d-flex flex-column gap-2">
              {relatedRecordGroups.map((group) => {
                const items = Array.isArray(group.items) ? group.items : []
                if (!items.length) return null
                return (
                  <div key={group.key || group.label} className="small text-break">
                    <span className="fw-semibold">{group.label}: </span>
                    {items.map((item, index) => (
                      <React.Fragment
                        key={`${group.key || group.label}-${item.key || item.href || item.label}`}
                      >
                        {index > 0 ? <span>, </span> : null}
                        {item.href ? (
                          <a
                            href={item.href}
                            onClick={(event) => openRelatedRecord(event, item.href)}
                          >
                            {item.label || item.href}
                          </a>
                        ) : (
                          <span>{item.label || '-'}</span>
                        )}
                        {item.secondary ? (
                          <span className="text-muted"> - {item.secondary}</span>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                )
              })}
            </div>
          ) : null}

          {showSelect && selectMode === 'card' ? (
            <div className="mt-3">
              {selectHelper ? <div className="mb-2">{selectHelper}</div> : null}
              <CFormLabel>{selectLabel}</CFormLabel>
              <div className="d-flex flex-column gap-2">
                {selectOptions.map((opt) => {
                  const value = String(opt.value)
                  const isSelected = value === String(selectValue)
                  const title = opt.title || opt.name || opt.label || '-'
                  const position = opt.position ? ` (${opt.position})` : ''
                  const email = opt.email || ''
                  const phone = opt.phone || opt.mobile_number || ''
                  const isCurrent = Boolean(opt.isCurrent)

                  return (
                    <label
                      key={value}
                      className={`border rounded p-2 d-flex align-items-start gap-2 app-selectable-card ${
                        isSelected ? 'app-selectable-card--selected' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      <CFormCheck
                        type="radio"
                        name="dialogSelect"
                        checked={isSelected}
                        onChange={() => setSelectValue(value)}
                      />
                      <div>
                        <strong>
                          {title}
                          {position}
                          {isCurrent ? ' ' : null}
                          {isCurrent ? <small className="text-muted">(Current)</small> : null}
                        </strong>
                        <br />
                        {email || '-'} <small className="text-muted">({phone || '-'})</small>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}

          {showSelect && selectMode !== 'card' ? (
            <div className="mt-3">
              {selectHelper ? <div className="mb-2">{selectHelper}</div> : null}
              <CFormLabel>{selectLabel}</CFormLabel>
              <CFormSelect
                value={selectValue}
                onChange={(event) => setSelectValue(event.target.value)}
              >
                {selectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </div>
          ) : null}

          {showChecklist ? (
            <div className="mt-3">
              <CFormLabel>{checklistLabel}</CFormLabel>
              <div className="d-flex flex-column gap-3">
                {checklistGroups.map((group) => {
                  const items = Array.isArray(group.items) ? group.items : []
                  if (!items.length) return null
                  return (
                    <div key={group.key}>
                      <div className="fw-semibold mb-2">{group.label}</div>
                      <div className="d-flex flex-column gap-2">
                        {items.map((item) => {
                          const value = String(item.value)
                          const isChecked = Boolean(checklistSelection[group.key]?.has(value))
                          return (
                            <label
                              key={`${group.key}-${value}`}
                              className={`border rounded p-2 d-flex align-items-start gap-2 app-selectable-card ${
                                isChecked ? 'app-selectable-card--selected' : ''
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <CFormCheck
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setChecklistSelection((prev) => {
                                    const next = { ...prev }
                                    const set = new Set(next[group.key] || [])
                                    if (set.has(value)) {
                                      set.delete(value)
                                    } else {
                                      set.add(value)
                                    }
                                    next[group.key] = set
                                    return next
                                  })
                                }}
                              />
                              <div>
                                <strong>{item.label}</strong>
                                {item.secondary ? (
                                  <div className="text-muted small">{item.secondary}</div>
                                ) : null}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {acknowledgeLabel ? (
            <div className="mt-3">
              <label className="d-flex align-items-start gap-2">
                <CFormCheck
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(event) => setAckChecked(event.target.checked)}
                />
                <div>{acknowledgeLabel}</div>
              </label>
            </div>
          ) : null}

          {currentType === 'prompt' ? (
            <div className="mt-3">
              {multilinePrompt ? (
                <CFormTextarea
                  rows={currentOptions.rows || 4}
                  value={promptValue}
                  onChange={(event) => setPromptValue(event.target.value)}
                  placeholder={currentOptions.placeholder || ''}
                  autoFocus
                />
              ) : (
                <CFormInput
                  type={currentOptions.inputType || 'text'}
                  value={promptValue}
                  onChange={(event) => setPromptValue(event.target.value)}
                  placeholder={currentOptions.placeholder || ''}
                  autoFocus
                />
              )}
              {promptError ? <div className="text-danger small mt-2">{promptError}</div> : null}
            </div>
          ) : null}
        </CModalBody>
        <CModalFooter>
          {currentType === 'alert' ? (
            <CButton color={confirmColor} onClick={() => closeWithResult(undefined)}>
              {okText}
            </CButton>
          ) : null}

          {currentType === 'confirm' ? (
            <>
              <CButton
                color="secondary"
                variant="outline"
                disabled={asyncActionActive}
                onClick={() =>
                  showSelect || showChecklist || acknowledgeLabel
                    ? closeWithResult({
                        confirmed: false,
                        value: selectValue,
                        checklist: Object.keys(checklistSelection).reduce((acc, key) => {
                          acc[key] = Array.from(checklistSelection[key] || [])
                          return acc
                        }, {}),
                        acknowledged: ackChecked,
                      })
                    : closeWithResult(false)
                }
              >
                {cancelText}
              </CButton>
              <CButton
                color={confirmColor}
                disabled={disableConfirm || asyncActionActive}
                onClick={submitConfirm}
                title={currentOptions.confirmDisabledReason || undefined}
              >
                {hasAsyncConfirm && asyncAction.status === 'loading' ? 'Working...' : confirmText}
              </CButton>
            </>
          ) : null}

          {currentType === 'prompt' ? (
            <>
              <CButton color="secondary" variant="outline" onClick={() => closeWithResult(null)}>
                {cancelText}
              </CButton>
              <CButton color={confirmColor} onClick={submitPrompt}>
                {confirmText}
              </CButton>
            </>
          ) : null}
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AppDialogProvider

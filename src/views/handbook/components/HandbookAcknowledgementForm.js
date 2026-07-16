import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'
import { signHandbook } from '../api/handbookApi'

const formatSignedAt = (value) => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const HandbookAcknowledgementForm = ({
  signature = {},
  version = null,
  canSign = true,
  disabledMessage = '',
  onSigned = () => {},
}) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [fullName, setFullName] = useState('')
  const [icNumber, setIcNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const isSigned = signature.signed === true
  const signedAt = formatSignedAt(signature.signed_at)
  const effectiveCanSign = canSign && Boolean(version?.id)
  const effectiveDisabledMessage =
    disabledMessage || 'The current handbook version must load before signing.'

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (loading) {
      return
    }

    const payload = {
      fullName: fullName.trim(),
      icNumber: icNumber.trim(),
      versionId: version?.id,
    }

    if (!effectiveCanSign) {
      dialog.alert(effectiveDisabledMessage)
      return
    }

    if (!payload.fullName || !payload.icNumber) {
      dialog.alert('Full name and IC number are required.')
      return
    }

    setLoading(true)
    setFullName(payload.fullName)
    setIcNumber(payload.icNumber)

    try {
      if (
        !(await dialog.confirm(
          `Are you sure you want to sign ${version?.version_label || 'this handbook version'}?`,
        ))
      ) {
        return
      }

      const json = await signHandbook(payload)

      if (json.success) {
        dialog.alert('Acknowledgment recorded successfully.')
        setModalVisible(false)
        setFullName('')
        setIcNumber('')
        window.dispatchEvent(new Event('kijo:handbook-signed'))
        await onSigned({
          ...(json.data || {}),
          full_name: payload.fullName,
        })
      } else {
        dialog.alert(`Error: ${json.message}`)
      }
    } catch (err) {
      console.error(err)
      dialog.alert('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <CCard className="my-4">
        <CCardBody className="text-center">
          {isSigned ? (
            <p className="mb-0 text-success fw-semibold">
              Signed{signature.full_name ? ` by ${signature.full_name}` : ''}
              {signedAt ? ` on ${signedAt}` : ''}.
            </p>
          ) : (
            <>
              <p>
                <strong>
                  I hereby acknowledge that I have read, understood, and agree to comply with all
                  terms, policies, and expectations set forth in the AMIOSH Employee Handbook.
                </strong>
              </p>
              {version?.version_label && (
                <p className="text-muted mb-2">Version: {version.version_label}</p>
              )}
              {!effectiveCanSign && <p className="text-warning mb-2">{effectiveDisabledMessage}</p>}
              <CButton
                color="primary"
                size="sm"
                onClick={() => setModalVisible(true)}
                disabled={!effectiveCanSign}
              >
                Acknowledge & Sign
              </CButton>
            </>
          )}
        </CCardBody>
      </CCard>

      <CModal
        visible={modalVisible && !isSigned && effectiveCanSign}
        onClose={() => setModalVisible(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Sign Acknowledgement</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm id="handbook-acknowledgement-form" onSubmit={handleSubmit}>
            {version?.version_label && (
              <div className="mb-3">
                <CFormLabel>Handbook Version</CFormLabel>
                <CFormInput type="text" value={version.version_label} disabled readOnly />
              </div>
            )}
            <div className="mb-3">
              <CFormLabel htmlFor="fullName">Full Name</CFormLabel>
              <CFormInput
                type="text"
                id="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="icNumber">IC Number</CFormLabel>
              <CFormInput
                type="text"
                id="icNumber"
                autoComplete="off"
                value={icNumber}
                onChange={(e) => setIcNumber(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setModalVisible(false)}
            disabled={loading}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            size="sm"
            type="submit"
            form="handbook-acknowledgement-form"
            disabled={loading}
          >
            {loading ? 'Signing...' : 'Submit'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

HandbookAcknowledgementForm.propTypes = {
  signature: PropTypes.shape({
    signed: PropTypes.bool,
    signed_at: PropTypes.string,
    full_name: PropTypes.string,
  }),
  version: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    version_label: PropTypes.string,
  }),
  canSign: PropTypes.bool,
  disabledMessage: PropTypes.string,
  onSigned: PropTypes.func,
}

export default HandbookAcknowledgementForm

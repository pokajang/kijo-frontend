import React, { useMemo, useState } from 'react'
import { CButton, CTooltip } from '@coreui/react'
import { serviceRecordTableConfigs } from '../../config/serviceRecordTableConfigs'
import ServiceConfiguredRecordsTable from './ServiceConfiguredRecordsTable'
import ManpowerServiceDetailsModal from './ManpowerServiceDetailsModal'

const decodeHtmlEntities = (value = '') =>
  String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

const ManpowerRecordsTable = ({
  records = [],
  loading = false,
  onOpen,
  onView,
  onDelete,
  onRevise,
  onEdit,
  onChangeToFail,
  onChangeToSuccess,
  onGenerate,
  onReAward,
  onUnAward,
  onFollowUp,
  onSyncClientDetails,
  onEmail,
  onSharePdf,
  onNegotiate,
}) => {
  const tableConfig = serviceRecordTableConfigs.manpower
  const getAmountSecondaryText = tableConfig.getAmountSecondaryText
  const [showServiceDetailsModal, setShowServiceDetailsModal] = useState(false)
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null)

  const openServiceDetails = (record) => {
    setSelectedServiceDetails({
      quotationId: record?.quotationId || '-',
      serviceTitle: decodeHtmlEntities(record?.formData?.serviceTitle || '-'),
      natureOfWork: decodeHtmlEntities(record?.formData?.natureOfWork || '-'),
      siteLocation: decodeHtmlEntities(record?.formData?.siteLocation || '-'),
      durationMonths: record?.formData?.durationMonths,
      durationHours: record?.formData?.durationHours,
      billingUnit: record?.formData?.billingUnit,
      noOfPax: record?.formData?.noOfPax,
      inquiryRemarks: decodeHtmlEntities(record?.formData?.inquiryRemarks || '-'),
    })
    setShowServiceDetailsModal(true)
  }

  const closeServiceDetails = () => {
    setShowServiceDetailsModal(false)
    setSelectedServiceDetails(null)
  }

  const subjectTextArgs = useMemo(() => ({ decodeHtmlEntities }), [])

  const renderSubjectCell = ({ record, subjectText, truncateStyle }) => (
    <div className="d-flex flex-column">
      <CTooltip content={subjectText} placement="top">
        <span style={{ ...truncateStyle, maxWidth: '230px' }}>{subjectText}</span>
      </CTooltip>
      <CButton
        color="link"
        size="sm"
        className="p-0 align-self-start text-decoration-none small"
        style={{ color: 'var(--cui-primary)' }}
        onClick={() => openServiceDetails(record)}
      >
        See more
      </CButton>
    </div>
  )

  const renderAmountCell = ({ record, amountValue, formatAmount }) => (
    <>
      {amountValue != null ? formatAmount(amountValue) : '-'}
      <br />
      <small className="text-muted">{getAmountSecondaryText(record)}</small>
    </>
  )

  const renderMobileSubjectExtra = (record) => (
    <CButton
      color="link"
      size="sm"
      className="p-0 text-decoration-none small"
      style={{ color: 'var(--cui-primary)' }}
      onClick={(event) => {
        event.stopPropagation()
        openServiceDetails(record)
      }}
    >
      See more
    </CButton>
  )

  return (
    <>
      <ServiceConfiguredRecordsTable
        serviceKey="manpower"
        getRowKey={(record, idx) => record?.id ?? `${record?.quotationId}-${idx}`}
        getSubjectTextArgs={() => subjectTextArgs}
        renderSubjectCell={renderSubjectCell}
        renderAmountCell={renderAmountCell}
        renderMobileSubjectExtra={renderMobileSubjectExtra}
        renderMobileAmountSecondary={getAmountSecondaryText}
        records={records}
        loading={loading}
        onOpen={onOpen}
        onView={onView}
        onDelete={onDelete}
        onRevise={onRevise}
        onEdit={onEdit}
        onChangeToFail={onChangeToFail}
        onChangeToSuccess={onChangeToSuccess}
        onGenerate={onGenerate}
        onReAward={onReAward}
        onUnAward={onUnAward}
        onFollowUp={onFollowUp}
        onSyncClientDetails={onSyncClientDetails}
        onEmail={onEmail}
        onSharePdf={onSharePdf}
        onNegotiate={onNegotiate}
      />
      <ManpowerServiceDetailsModal
        visible={showServiceDetailsModal}
        selectedServiceDetails={selectedServiceDetails}
        onClose={closeServiceDetails}
      />
    </>
  )
}

export default ManpowerRecordsTable

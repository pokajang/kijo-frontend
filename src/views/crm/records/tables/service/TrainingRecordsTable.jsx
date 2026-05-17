import React from 'react'
import ServiceConfiguredRecordsTable from './ServiceConfiguredRecordsTable'

const TrainingRecordsTable = ({
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
  return (
    <ServiceConfiguredRecordsTable
      serviceKey="training"
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
  )
}

export default TrainingRecordsTable

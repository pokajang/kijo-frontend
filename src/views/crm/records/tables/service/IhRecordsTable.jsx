import React from 'react'
import ServiceConfiguredRecordsTable from './ServiceConfiguredRecordsTable'

const IhRecordsTable = ({
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
  onStatsScopeLabelChange,
  statsVisible = true,
  controlsVisible = true,
}) => {
  return (
    <ServiceConfiguredRecordsTable
      serviceKey="ih"
      searchInputId="ih-search"
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
      onStatsScopeLabelChange={onStatsScopeLabelChange}
      statsVisible={statsVisible}
      controlsVisible={controlsVisible}
    />
  )
}

export default IhRecordsTable

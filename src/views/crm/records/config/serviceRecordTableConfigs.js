const joinParts = (parts = []) => parts.filter(Boolean).join(' ')

const formatEquipmentLineItem = (item) =>
  item?.itemName
    ? item.itemName
    : item?.description
      ? item.description
      : `#${item?.itemId ?? item?.id}`

const formatSpecialLineItem = (item) => `${item?.title || ''} ${item?.description || ''}`.trim()

const formatHygieneLineItem = (item) =>
  `${item?.itemName || item?.item_description || ''} ${item?.description || ''}`.trim()

const getManpowerDurationMeta = (formData = {}) => {
  const isHourly = formData.billingUnit === 'hour'
  const durationValue = Number(isHourly ? formData.durationHours : formData.durationMonths)
  if (!Number.isFinite(durationValue) || durationValue <= 0) return ''
  return isHourly ? `${durationValue} hr` : `${durationValue} mth`
}

const getEquipmentSubjectText = (record) =>
  Array.isArray(record?.lineItems) && record.lineItems.length
    ? record.lineItems.map(formatEquipmentLineItem).join(', ')
    : '-'

const getManpowerSubjectMeta = (record) => {
  const noOfPax = Number(record?.formData?.noOfPax)
  const durationMeta = getManpowerDurationMeta(record?.formData)
  const metaParts = []

  if (Number.isFinite(noOfPax) && noOfPax > 0) {
    metaParts.push(`${noOfPax} pax`)
  }
  if (durationMeta) {
    metaParts.push(durationMeta)
  }

  return metaParts
}

export const serviceRecordTableConfigs = {
  training: {
    getSearchText: (record) => record?.formData?.trainingTopic || '',
    getSubjectText: (record) => record?.formData?.trainingTopic || '-',
    getSubjectTooltip: (record) => record?.formData?.trainingTopic || '-',
    getAmountValue: (record) => record?.amount,
  },
  ih: {
    getSearchText: (record) =>
      joinParts([
        record?.formData?.serviceTitle,
        record?.formData?.inquiryRemarks,
        record?.formData?.quotationRemarks,
        ...(Array.isArray(record?.lineItems) ? record.lineItems.map(formatHygieneLineItem) : []),
      ]),
    getSubjectText: (record) => record?.formData?.serviceTitle || '-',
    getSubjectTooltip: (record) =>
      joinParts([
        record?.formData?.serviceTitle || '-',
        ...(Array.isArray(record?.lineItems) ? record.lineItems.map(formatHygieneLineItem) : []),
      ]),
    getAmountValue: (record) => record?.amount,
  },
  special: {
    getSearchText: (record) =>
      joinParts([
        record?.formData?.serviceTitle,
        record?.formData?.generalRemarks,
        ...(Array.isArray(record?.lineItems) ? record.lineItems.map(formatSpecialLineItem) : []),
      ]),
    getSubjectText: (record) => record?.formData?.serviceTitle || '-',
    getSubjectTooltip: (record) => record?.formData?.serviceTitle || '-',
    getAmountValue: (record) => record?.amount,
  },
  equipment: {
    getSearchText: (record) =>
      joinParts([
        record?.formData?.inquiryRemarks,
        ...(Array.isArray(record?.lineItems)
          ? record.lineItems.map((item) =>
              `${item?.itemName || ''} ${item?.description || ''} ${item?.itemRemarks || ''}`.trim(),
            )
          : []),
      ]),
    getSubjectText: getEquipmentSubjectText,
    getSubjectTooltip: getEquipmentSubjectText,
    getAmountValue: (record) =>
      typeof record?.grandTotal === 'number'
        ? record.grandTotal
        : Number(record?.grandTotal ?? record?.amount ?? 0),
  },
  manpower: {
    getSearchText: (record) =>
      joinParts([
        record?.formData?.serviceTitle,
        record?.formData?.natureOfWork,
        record?.formData?.siteLocation,
        record?.formData?.durationMonths != null
          ? `duration:${record.formData.durationMonths}`
          : '',
        record?.formData?.durationHours != null ? `hours:${record.formData.durationHours}` : '',
        record?.formData?.billingUnit,
        record?.formData?.noOfPax != null ? `pax:${record.formData.noOfPax}` : '',
        record?.formData?.inquiryRemarks,
      ]),
    getSubjectText: (record, { decodeHtmlEntities } = {}) => {
      const decode =
        typeof decodeHtmlEntities === 'function' ? decodeHtmlEntities : (value) => value
      const serviceTitle = decode(record?.formData?.serviceTitle || '')
      return [serviceTitle || '-', ...getManpowerSubjectMeta(record)].join(' - ')
    },
    getSubjectTooltip: (record, utils) =>
      serviceRecordTableConfigs.manpower.getSubjectText(record, utils),
    getAmountValue: (record) => record?.amount,
    getAmountSecondaryText: (record) =>
      record?.formData?.unitCost != null
        ? `${Number(record.formData.unitCost).toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}/pax/${record?.formData?.billingUnit === 'hour' ? 'hr' : 'mth'}`
        : '-',
  },
}

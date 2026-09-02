import { getDateOnly, getLatestProgressUpdate, getProjectLeaderCode } from './projectFilters'
import { getCurrentProjectValue } from './projectApi'
import { formatNumber } from '../../../utils/formatters/numberFormatters'
import { getProjectServiceCategory } from './projectServiceCategory'

export const emptyProjectTableValue = '-'

const getValueNumber = (project = {}) => {
  const value = getCurrentProjectValue(project, NaN)
  return Number.isFinite(value) ? value : null
}

const formatProjectValue = (valueNumber) =>
  valueNumber !== null && Number.isFinite(valueNumber)
    ? formatNumber(valueNumber, { minimumFractionDigits: 2 })
    : emptyProjectTableValue

const joinVendorField = (vendors = [], field) =>
  vendors
    .map((vendor) => String(vendor?.[field] || '').trim())
    .filter(Boolean)
    .join(', ') || emptyProjectTableValue

export const normalizeProjectTableRows = (projects = []) =>
  projects.map((project) => {
    const latest = getLatestProgressUpdate(project)
    const ownerCode = getProjectLeaderCode(project)
    const valueNumber = getValueNumber(project)
    const vendors = Array.isArray(project.vendors) ? project.vendors : []
    const updateDisplay =
      getDateOnly(latest?.progress_date || latest?.updated_on) || emptyProjectTableValue
    const updateText = String(latest?.progress_text || '').trim()
    const updateFullText =
      [updateDisplay !== emptyProjectTableValue ? updateDisplay : '', updateText]
        .filter(Boolean)
        .join(' ') || emptyProjectTableValue

    return {
      ...project,
      client: project.client_name || emptyProjectTableValue,
      project: project.project_name || emptyProjectTableValue,
      serviceCategory: getProjectServiceCategory(project),
      inquirySource: project.inquiry_source || project.inquirySource || '',
      inquirySourceRemarks:
        project.inquiry_source_remarks || project.inquirySourceRemarks || emptyProjectTableValue,
      value: valueNumber,
      valueDisplay: formatProjectValue(valueNumber),
      update: latest?.progress_date || latest?.updated_on || '',
      updateDisplay,
      updateText: updateText || emptyProjectTableValue,
      updateFullText,
      owner: ownerCode || emptyProjectTableValue,
      vendor: joinVendorField(vendors, 'vendor_name'),
      vendorContactName: joinVendorField(vendors, 'contact_person_name'),
      vendorMobile: joinVendorField(vendors, 'mobile_number'),
      vendorEmail: joinVendorField(vendors, 'email'),
      award: project.award_date || '',
      awardDisplay: getDateOnly(project.award_date) || emptyProjectTableValue,
      status: project.status || emptyProjectTableValue,
      closed: project.closing_details?.close_date || '',
      closedDisplay: getDateOnly(project.closing_details?.close_date) || emptyProjectTableValue,
    }
  })

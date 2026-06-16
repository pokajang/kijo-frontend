import { normalizeProjectStatus } from './projectStatus'
import { getCurrentProjectValue } from './projectApi'

const toDateOnly = (value) => {
  if (!value) return ''
  const text = String(value)
  if (text.includes('T')) return text.split('T')[0]
  if (text.includes(' ')) return text.split(' ')[0]
  return text
}

export const getDateOnly = toDateOnly

const getUpdateTimestamp = (update = {}) => {
  const rawDate = update?.updated_on || update?.progress_date || ''
  const timestamp = Date.parse(rawDate)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const getLatestProgressUpdate = (project = {}) => {
  const updates = Array.isArray(project?.progress_updates) ? project.progress_updates : []
  if (!updates.length) return null

  return updates.reduce((latest, update) => {
    if (!latest) return update
    return getUpdateTimestamp(update) > getUpdateTimestamp(latest) ? update : latest
  }, null)
}

export const getProjectLeaderCode = (project = {}) =>
  String(
    project?.assigned_staff?.find((staff) => staff?.project_role === 'Leader')?.name_code || '',
  ).trim()

const normalizeToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const isProjectOwnedByUser = (project = {}, user = {}) => {
  const collaborators = Array.isArray(project?.assigned_staff) ? project.assigned_staff : []
  if (!collaborators.length) return false

  const userStaffId = String(user?.staff_id || '').trim()
  const userNameCode = normalizeToken(user?.name_code)
  if (!userStaffId && !userNameCode) return false

  return collaborators.some((staff) => {
    const staffId = String(staff?.staff_id || '').trim()
    const staffNameCode = normalizeToken(staff?.name_code)

    if (userStaffId && staffId && userStaffId === staffId) return true
    if (userNameCode && staffNameCode && userNameCode === staffNameCode) return true
    return false
  })
}

const getAllStaffText = (project = {}) => {
  const staff = Array.isArray(project?.assigned_staff) ? project.assigned_staff : []
  return staff
    .map((member) => `${member?.full_name || ''} ${member?.name_code || ''}`.trim())
    .join(' ')
}

const getVendorsText = (project = {}) => {
  const vendors = Array.isArray(project?.vendors) ? project.vendors : []
  return vendors
    .map((vendor) =>
      [vendor?.vendor_name, vendor?.contact_person_name, vendor?.mobile_number, vendor?.email]
        .filter(Boolean)
        .join(' '),
    )
    .join(' ')
}

const getProgressText = (project = {}) => {
  const updates = Array.isArray(project?.progress_updates) ? project.progress_updates : []
  return updates
    .map((update) =>
      [update?.progress_date, update?.progress_text, update?.updated_by].filter(Boolean).join(' '),
    )
    .join(' ')
}

export const getProjectTypeOptions = (projects = []) => {
  const types = new Set()

  projects.forEach((project) => {
    const type = String(project?.project_type || '').trim()
    if (!type) return
    types.add(type)
  })

  return Array.from(types).sort((a, b) => a.localeCompare(b))
}

export const getOwnerOptions = (projects = []) => {
  const owners = new Set()

  projects.forEach((project) => {
    const ownerCode = getProjectLeaderCode(project)
    if (!ownerCode) return
    owners.add(ownerCode)
  })

  return Array.from(owners).sort((a, b) => a.localeCompare(b))
}

export const getYearOptions = (projects = [], currentYear) => {
  const years = new Set([String(currentYear)])

  projects.forEach((project) => {
    const awardDate = toDateOnly(project?.award_date)
    const year = awardDate.slice(0, 4)
    if (/^\d{4}$/.test(year)) years.add(year)
  })

  return Array.from(years).sort((a, b) => Number(b) - Number(a))
}

export const applyProjectFilters = ({ projects = [], filters = {} }) => {
  const term = String(filters?.searchTerm || '')
    .trim()
    .toLowerCase()
  const parsedMin = filters?.minAmount === '' ? null : Number(filters?.minAmount)
  const parsedMax = filters?.maxAmount === '' ? null : Number(filters?.maxAmount)

  return projects.filter((project) => {
    const awardYear = toDateOnly(project?.award_date).slice(0, 4)
    if (filters?.yearFilter !== 'all' && awardYear !== filters?.yearFilter) return false

    if (
      filters?.statusFilter !== 'all' &&
      normalizeProjectStatus(project?.status) !== normalizeProjectStatus(filters?.statusFilter)
    ) {
      return false
    }
    if (
      filters?.projectTypeFilter !== 'all' &&
      project?.project_type !== filters?.projectTypeFilter
    ) {
      return false
    }

    const ownerCode = getProjectLeaderCode(project)
    if (filters?.ownerFilter !== 'all' && ownerCode !== filters?.ownerFilter) return false

    const hasUpdates =
      Array.isArray(project?.progress_updates) && project.progress_updates.length > 0
    if (filters?.hasUpdateFilter === 'yes' && !hasUpdates) return false
    if (filters?.hasUpdateFilter === 'no' && hasUpdates) return false

    const hasVendors = Array.isArray(project?.vendors) && project.vendors.length > 0
    if (filters?.hasVendorFilter === 'yes' && !hasVendors) return false
    if (filters?.hasVendorFilter === 'no' && hasVendors) return false

    const amount = getCurrentProjectValue(project, 0)
    if (parsedMin != null && !Number.isNaN(parsedMin) && amount < parsedMin) return false
    if (parsedMax != null && !Number.isNaN(parsedMax) && amount > parsedMax) return false

    const latestUpdate = getLatestProgressUpdate(project)
    const searchText = [
      project?.client_name,
      project?.project_name,
      project?.project_type,
      project?.status,
      project?.po_loa_number,
      ownerCode,
      getAllStaffText(project),
      getVendorsText(project),
      getProgressText(project),
      latestUpdate?.progress_text,
      latestUpdate?.progress_date,
      latestUpdate?.updated_by,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (term && !searchText.includes(term)) return false

    return true
  })
}

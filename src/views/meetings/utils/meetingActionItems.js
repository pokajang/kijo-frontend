import { toDateOnlyValue } from './meetingDateUtils'

export const normalizeActionStatus = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (raw === 'in progress' || raw === 'in_progress' || raw === 'progress') return 'In Progress'
  if (raw === 'done' || raw === 'completed' || raw === 'complete') return 'Done'
  return 'Pending'
}

const statusColorMap = {
  Pending: 'secondary',
  'In Progress': 'warning',
  Done: 'success',
}

export const getActionStatusColor = (status) =>
  statusColorMap[normalizeActionStatus(status)] || 'secondary'

export const createEmptyActionItem = () => ({
  itemId: '',
  actionText: '',
  picStaffId: '',
  picName: '',
  picCode: '',
  dueDate: '',
  status: 'Pending',
  createdBy: '',
  createdName: '',
  createdCode: '',
  createdAt: '',
  updatedBy: '',
  updatedName: '',
  updatedCode: '',
  updatedAt: '',
  completedBy: '',
  completedName: '',
  completedCode: '',
  completedAt: '',
})

const normalizeParsedActionItem = (item, index) => ({
  key: String(item?.item_id ?? item?.itemId ?? '').trim() || `idx-${index}`,
  itemId: String(item?.item_id ?? item?.itemId ?? '').trim(),
  itemIndex: index,
  actionText: String(item?.action_text ?? item?.actionText ?? item?.action ?? '').trim(),
  picStaffId: String(item?.pic_staff_id ?? item?.picStaffId ?? '').trim(),
  picName: String(item?.pic_name ?? item?.picName ?? '').trim(),
  picCode: String(item?.pic_code ?? item?.picCode ?? '').trim(),
  dueDate: toDateOnlyValue(item?.due_date ?? item?.dueDate ?? ''),
  status: normalizeActionStatus(item?.status ?? 'Pending'),
  createdBy: String(item?.created_by ?? item?.createdBy ?? '').trim(),
  createdName: String(item?.created_name ?? item?.createdName ?? '').trim(),
  createdCode: String(item?.created_code ?? item?.createdCode ?? '').trim(),
  createdAt: String(item?.created_at ?? item?.createdAt ?? '').trim(),
  updatedBy: String(item?.updated_by ?? item?.updatedBy ?? '').trim(),
  updatedName: String(item?.updated_name ?? item?.updatedName ?? '').trim(),
  updatedCode: String(item?.updated_code ?? item?.updatedCode ?? '').trim(),
  updatedAt: String(item?.updated_at ?? item?.updatedAt ?? '').trim(),
  completedBy: String(item?.completed_by ?? item?.completedBy ?? '').trim(),
  completedName: String(item?.completed_name ?? item?.completedName ?? '').trim(),
  completedCode: String(item?.completed_code ?? item?.completedCode ?? '').trim(),
  completedAt: String(item?.completed_at ?? item?.completedAt ?? '').trim(),
})

const hasActionItemContent = (item, includeAssigneeOnly = true) =>
  Boolean(
    item.actionText ||
      item.picStaffId ||
      item.dueDate ||
      (includeAssigneeOnly && (item.picName || item.picCode)),
  )

export const parseActionItems = (value, { includeAssigneeOnly = true } = {}) => {
  const raw = String(value || '').trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
        .map(normalizeParsedActionItem)
        .filter((item) => hasActionItemContent(item, includeAssigneeOnly))
    }
  } catch {
    // Fallback for legacy plain text action items.
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      ...createEmptyActionItem(),
      key: `idx-${index}`,
      itemIndex: index,
      actionText: line,
    }))
}

export const serializeActionItems = (items, staffList) => {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => ({
      itemId: String(item?.itemId || '').trim(),
      actionText: String(item?.actionText || '').trim(),
      picStaffId: String(item?.picStaffId || '').trim(),
      picName: String(item?.picName || '').trim(),
      picCode: String(item?.picCode || '').trim(),
      dueDate: toDateOnlyValue(item?.dueDate || ''),
      status: normalizeActionStatus(item?.status || 'Pending'),
      createdBy: String(item?.createdBy || '').trim(),
      createdName: String(item?.createdName || '').trim(),
      createdCode: String(item?.createdCode || '').trim(),
      createdAt: String(item?.createdAt || '').trim(),
      updatedBy: String(item?.updatedBy || '').trim(),
      updatedName: String(item?.updatedName || '').trim(),
      updatedCode: String(item?.updatedCode || '').trim(),
      updatedAt: String(item?.updatedAt || '').trim(),
      completedBy: String(item?.completedBy || '').trim(),
      completedName: String(item?.completedName || '').trim(),
      completedCode: String(item?.completedCode || '').trim(),
      completedAt: String(item?.completedAt || '').trim(),
    }))
    .filter(hasActionItemContent)
    .map((item) => {
      const picId = Number(item.picStaffId)
      const matched = (staffList || []).find((staff) => Number(staff.staff_id) === picId)
      return {
        item_id: item.itemId || '',
        action_text: item.actionText,
        pic_staff_id: Number.isFinite(picId) && picId > 0 ? picId : null,
        pic_name: matched?.full_name || item.picName || '',
        pic_code: matched?.name_code || item.picCode || '',
        due_date: item.dueDate || '',
        status: item.status,
        created_by: Number(item.createdBy) > 0 ? Number(item.createdBy) : null,
        created_name: item.createdName,
        created_code: item.createdCode,
        created_at: item.createdAt || '',
        updated_by: Number(item.updatedBy) > 0 ? Number(item.updatedBy) : null,
        updated_name: item.updatedName,
        updated_code: item.updatedCode,
        updated_at: item.updatedAt || '',
        completed_by: Number(item.completedBy) > 0 ? Number(item.completedBy) : null,
        completed_name: item.completedName,
        completed_code: item.completedCode,
        completed_at: item.completedAt || '',
      }
    })

  return normalized.length > 0 ? JSON.stringify(normalized) : ''
}

export const getPendingItemsCount = (value) =>
  parseActionItems(value).filter((item) => normalizeActionStatus(item.status) !== 'Done').length

export const getPendingPicCounts = (value) => {
  const countsByCode = parseActionItems(value)
    .filter((item) => normalizeActionStatus(item.status) !== 'Done')
    .reduce((acc, item) => {
      const code = String(item.picCode || '')
        .trim()
        .toUpperCase()
      const key = code || 'Unassigned'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

  return Object.entries(countsByCode)
    .sort(([a], [b]) => {
      if (a === 'Unassigned') return 1
      if (b === 'Unassigned') return -1
      return a.localeCompare(b)
    })
    .map(([code, count]) => ({ code, count }))
}

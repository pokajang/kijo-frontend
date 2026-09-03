export const SPECIAL_CATEGORY_TAB_PREFIX = 'special-category:'

const toPositiveId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const getCategoryData = (record = {}) => record?.formData || record || {}
const toBoolean = (value) => value === true || value === 1 || value === '1'

export const getSpecialCategoryTabKey = (categoryId) => {
  const id = toPositiveId(categoryId)
  return id ? `${SPECIAL_CATEGORY_TAB_PREFIX}${id}` : 'special-tab'
}

export const getSpecialCategoryIdFromTabKey = (tabKey = '') => {
  if (!String(tabKey).startsWith(SPECIAL_CATEGORY_TAB_PREFIX)) return null
  return toPositiveId(String(tabKey).slice(SPECIAL_CATEGORY_TAB_PREFIX.length))
}

export const getRecordSpecialCategoryId = (record = {}) =>
  toPositiveId(getCategoryData(record)?.categoryId ?? getCategoryData(record)?.category_id)

export const getRecordSpecialCategoryCode = (record = {}) =>
  String(getCategoryData(record)?.categoryCode ?? getCategoryData(record)?.category_code ?? '')
    .trim()
    .toUpperCase()

export const getRecordSpecialCategoryName = (record = {}) =>
  String(
    getCategoryData(record)?.categoryName ?? getCategoryData(record)?.category_name ?? '',
  ).trim()

export const normalizeSpecialCategoryFacets = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      categoryId: toPositiveId(row?.categoryId ?? row?.category_id),
      name: String(row?.name || '').trim(),
      code: String(row?.code || '')
        .trim()
        .toUpperCase(),
      quoteCount: Math.max(0, Number(row?.quoteCount ?? row?.quote_count) || 0),
      isSystem: toBoolean(row?.isSystem ?? row?.is_system),
      isActive: toBoolean(row?.isActive ?? row?.is_active),
      displayOrder: Number(row?.displayOrder ?? row?.display_order) || 0,
    }))
    .filter((row) => row.quoteCount > 0 && (row.code === 'SPECIAL' || row.categoryId))

export const getDefaultSpecialCategoryId = (facets = []) =>
  normalizeSpecialCategoryFacets(facets).find((facet) => facet.code === 'SPECIAL' || facet.isSystem)
    ?.categoryId || null

export const buildRecordNavigationTabs = (baseTabs = [], facets = []) => {
  const customTabs = normalizeSpecialCategoryFacets(facets)
    .filter((facet) => facet.categoryId && facet.code !== 'SPECIAL' && !facet.isSystem)
    .map((facet) => ({
      key: getSpecialCategoryTabKey(facet.categoryId),
      label: facet.name || facet.code,
      title: facet.name || facet.code,
      categoryId: facet.categoryId,
      slug: 'special',
    }))

  const specialIndex = baseTabs.findIndex((tab) => tab.key === 'special-tab')
  if (specialIndex < 0) return [...baseTabs, ...customTabs]
  return [
    ...baseTabs.slice(0, specialIndex + 1),
    ...customTabs,
    ...baseTabs.slice(specialIndex + 1),
  ]
}

export const isDefaultSpecialRecord = (record, defaultCategoryId = null) => {
  const categoryId = getRecordSpecialCategoryId(record)
  const code = getRecordSpecialCategoryCode(record)
  return !categoryId || code === 'SPECIAL' || categoryId === defaultCategoryId
}

export const matchesSpecialCategory = (record, categoryId, defaultCategoryId = null) => {
  const targetId = toPositiveId(categoryId)
  return targetId
    ? getRecordSpecialCategoryId(record) === targetId
    : isDefaultSpecialRecord(record, defaultCategoryId)
}

export const getSpecialRecordServiceLabel = (record = {}) => {
  const code = getRecordSpecialCategoryCode(record)
  if (code === 'SPECIAL') return 'Special Service'
  return getRecordSpecialCategoryName(record) || code || 'Special Service'
}

export const matchesRecordServiceFilter = (record, serviceFilter) => {
  const categoryId = getSpecialCategoryIdFromTabKey(serviceFilter)
  if (categoryId) {
    return record?.serviceTab === 'special-tab' && getRecordSpecialCategoryId(record) === categoryId
  }
  if (serviceFilter === 'special-tab') {
    return record?.serviceTab === 'special-tab' && isDefaultSpecialRecord(record)
  }
  return record?.serviceTab === serviceFilter
}

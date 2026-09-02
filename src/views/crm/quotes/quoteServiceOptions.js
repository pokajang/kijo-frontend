const SPECIAL_CATEGORY_PREFIX = 'special-category:'

const positiveId = (value) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export const specialCategoryOptionValue = (categoryId) =>
  `${SPECIAL_CATEGORY_PREFIX}${positiveId(categoryId) || ''}`

export const parseQuoteServiceOption = (value) => {
  if (String(value || '').startsWith(SPECIAL_CATEGORY_PREFIX)) {
    return {
      serviceKey: 'special',
      categoryId: positiveId(String(value).slice(SPECIAL_CATEGORY_PREFIX.length)),
    }
  }

  return { serviceKey: String(value || ''), categoryId: null }
}

export const buildQuoteServiceOptions = (fixedServices, categories) => [
  ...fixedServices.filter(({ key }) => key !== 'special'),
  ...categories
    .filter((category) => category.isActive !== false && Number(category.templateCount) > 0)
    .map((category) => ({
      key: specialCategoryOptionValue(category.id),
      label: category.name,
      serviceKey: 'special',
      categoryId: Number(category.id),
    })),
]

export const findSpecialCategory = (categories, categoryId) =>
  categories.find((category) => Number(category.id) === Number(categoryId)) || null

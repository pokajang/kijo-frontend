// /vendor/create/utils/vendorValidation.js

export const formatCompanyList = (companies) => {
  if (companies.length === 1) return companies[0]
  if (companies.length === 2) return `${companies[0]} and ${companies[1]}`
  return `${companies.slice(0, -1).join(', ')}, and ${companies[companies.length - 1]}`
}

export const checkDuplicateCompany = (inputName, vendorList = []) => {
  if (!inputName.trim()) return { isDuplicate: false, exact: '', partial: '' }

  const inputLower = inputName.toLowerCase()

  const exactMatch = vendorList.find((v) => v.name.toLowerCase() === inputLower)
  if (exactMatch) return { isDuplicate: true, exact: exactMatch.name, partial: '' }

  const similar = vendorList
    .filter((v) => v.name.toLowerCase().includes(inputLower))
    .map((v) => v.name)

  return {
    isDuplicate: false,
    exact: '',
    partial: similar.length > 0 ? formatCompanyList(similar) : '',
  }
}

export const validateRequiredFields = (formData, requiredFields) => {
  return Object.entries(requiredFields)
    .filter(([key]) => !formData[key]?.trim())
    .map(([, label]) => `- ${label}`)
}

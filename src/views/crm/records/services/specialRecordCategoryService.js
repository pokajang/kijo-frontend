import { apiUrl } from '../../../../api/apiUrl'
import { fetchJsonCompat } from './compatApi'
import { normalizeSpecialCategoryFacets } from '../utils/specialRecordCategories'

export const fetchSpecialRecordCategories = async () => {
  const payload = await fetchJsonCompat(apiUrl('quote-records/special/categories'))
  return normalizeSpecialCategoryFacets(payload?.data)
}

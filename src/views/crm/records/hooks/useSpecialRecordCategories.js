import { useCallback, useEffect, useState } from 'react'
import { fetchSpecialRecordCategories } from '../services/specialRecordCategoryService'

export const useSpecialRecordCategories = () => {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const nextCategories = await fetchSpecialRecordCategories()
      setCategories(nextCategories)
      return nextCategories
    } catch (nextError) {
      console.error('Failed to load quotation category navigation:', nextError)
      setError(nextError)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { categories, isLoading, error, reload }
}

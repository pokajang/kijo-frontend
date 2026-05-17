import { useEffect, useState } from 'react'

export const useDebouncedSearch = (initialValue = '', delay = 220) => {
  const [searchInput, setSearchInput] = useState(initialValue)
  const [searchTerm, setSearchTerm] = useState(initialValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(String(searchInput || '').trim())
    }, delay)

    return () => clearTimeout(timer)
  }, [delay, searchInput])

  return {
    searchInput,
    setSearchInput,
    searchTerm,
    setSearchTerm,
  }
}

export default useDebouncedSearch

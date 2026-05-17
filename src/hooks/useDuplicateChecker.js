import { useEffect, useState } from 'react'

const useDuplicateChecker = ({
  valueToCheck,
  key,
  dataset,
  excludeId = null,
  idField = 'id',
  matchType = 'exact',
}) => {
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [matchedValue, setMatchedValue] = useState('')
  const [partialMatch, setPartialMatch] = useState('')

  useEffect(() => {
    if (!valueToCheck?.trim()) {
      setIsDuplicate(false)
      setMatchedValue('')
      setPartialMatch('')
      return
    }

    const input = valueToCheck.toLowerCase()

    let foundExact = null
    let foundPartial = null

    for (const item of dataset) {
      const fieldValue = item[key]?.toLowerCase() || ''
      const isSameItem = excludeId && item[idField] === excludeId

      if (isSameItem) continue

      // Check for exact match
      if (!foundExact && fieldValue === input) {
        foundExact = item
      }

      // Check for partial match (only if not exact)
      if (!foundPartial && fieldValue.includes(input) && fieldValue !== input) {
        foundPartial = item
      }

      // Early exit if both found
      if (foundExact && foundPartial) break
    }

    if (foundExact) {
      setIsDuplicate(true)
      setMatchedValue(foundExact[key])
    } else {
      setIsDuplicate(false)
      setMatchedValue('')
    }

    if (matchType === 'partial') {
      setPartialMatch(foundPartial ? foundPartial[key] : '')
    } else {
      setPartialMatch('')
    }
  }, [valueToCheck, dataset, key, excludeId, idField, matchType])

  return {
    isDuplicate,
    matchedValue,
    partialMatch,
  }
}

export default useDuplicateChecker

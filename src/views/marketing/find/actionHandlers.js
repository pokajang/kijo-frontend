// actionHandlers.js
import { fetchApi } from './fetchApi'

export const actionHandlers = ({
  setRows,
  setLoading,
  setError,
  setInfo,
  setDetails,
  setGenerating,
  setSaving,
  setShowRegister,
  setRegisterForm,
  setRegisterNotice,
  setRegisterError,

  // browse
  q,
  stateFilter,
  limit,
  details = {},

  // generate (if present)
  genQ,
  genRegion,
  genLimit,

  // optional setters
  setQ,
  setStateFilter,
  defaultStateFilter = '',
}) => {
  const loadGrid = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchApi.loadGrid()
      const rows = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : []
      setRows(rows)
    } catch (e) {
      setError(e?.message || 'Unexpected error while loading.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const payload = {
        q: typeof genQ === 'string' ? genQ : q || '',
        stateFilter: typeof genRegion === 'string' ? genRegion : stateFilter || '',
        limit: typeof genLimit === 'number' ? genLimit : typeof limit === 'number' ? limit : 10,
      }

      const data = await fetchApi.generatePlaces(payload)
      setInfo(`Inserted ${data?.inserted ?? 0} new records.`)

      await loadGrid()

      if (typeof setQ === 'function') setQ('')
      if (typeof setStateFilter === 'function') setStateFilter(defaultStateFilter)
    } catch (e) {
      setError(e?.message || 'Unexpected error while generating.')
    } finally {
      setGenerating(false)
    }
  }

  const handleFetchPhone = async (place_id) => {
    if (!place_id) return
    const existingDetails = details?.[place_id] || {}
    if (existingDetails.detailsFailed) {
      setError(existingDetails.detailsError || 'Phone details are unavailable for this place.')
      return
    }

    try {
      const d = await fetchApi.fetchPlaceDetails(place_id)
      setDetails((prev) => ({ ...(prev || {}), [place_id]: d }))
    } catch (e) {
      const message = e?.message || 'Phone details are unavailable for this place.'
      setDetails((prev) => ({
        ...(prev || {}),
        [place_id]: {
          ...(prev?.[place_id] || {}),
          detailsFailed: true,
          detailsError: message,
        },
      }))
      setError(message)
    }
  }

  const handleOpenRegister = async (row) => {
    if (!row?.place_id) return
    setRegisterNotice('')
    setRegisterError('')
    let d = details?.[row.place_id] || {}

    if (!d.phone && !d.detailsFailed) {
      try {
        d = await fetchApi.fetchPlaceDetails(row.place_id)
        setDetails((prev) => ({ ...(prev || {}), [row.place_id]: d }))
      } catch (e) {
        const message = e?.message || 'Phone details are unavailable for this place.'
        d = { detailsFailed: true, detailsError: message }
        setDetails((prev) => ({
          ...(prev || {}),
          [row.place_id]: {
            ...(prev?.[row.place_id] || {}),
            ...d,
          },
        }))
        setRegisterError(message)
      }
    } else if (d.detailsFailed) {
      setRegisterError(d.detailsError || 'Phone details are unavailable for this place.')
    }

    setRegisterForm({
      name: d?.name || row?.name || '',
      phone: d?.phone || '',
      address: d?.address || row?.address || row?.address_full || '',
      place_id: row.place_id,
      website: d?.website || '',
    })

    setShowRegister(true)
  }

  const handleSaveRegister = async (form) => {
    setSaving(true)
    setRegisterError('')
    try {
      await fetchApi.registerContact(form || {})
      const name = String(form?.name || '').trim()
      const phone = String(form?.phone || '').trim()
      const contactDetails = name && phone ? `${name} (${phone})` : name || phone || 'This contact'
      setRegisterNotice(
        `${contactDetails} has been registered to Call Records. You can start phone call marketing now.`,
      )
      await loadGrid()
    } catch (e) {
      setRegisterError(e?.message || 'Unexpected error while saving.')
    } finally {
      setSaving(false)
    }
  }

  return {
    loadGrid,
    handleGenerate,
    handleFetchPhone,
    handleOpenRegister,
    handleSaveRegister,
  }
}

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTableLoadingState } from '../../../components/datatable'
import { fetchJson, fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import MonitoringSheetCard from './MonitoringSheetCard'
import MonitoringPipelineToolsContent from './MonitoringPipelineToolsContent'
import ManualPipelineEntryModal from './ManualPipelineEntryModal'
import {
  API_BASE,
  MAX_PROOF_IMAGE_BYTES,
  compressProofImage,
  defaultEntrySource,
  entryTypeAllowsEstimatedRm,
} from '../../marketing/pipeline/pipelineEntryUtils'
import {
  buildManualEntryRow,
  createBlankManualEntryRow,
  getDefaultManualEntryDate,
} from './monitoringPipelineToolFormUtils'

const createInitialManualForm = (startDate, endDate) => ({
  entry_type: 'lead',
  entry_date: getDefaultManualEntryDate(startDate, endDate),
  source: defaultEntrySource,
  segment_type: '',
  draft: createBlankManualEntryRow(),
  batch: [],
  editingBatchIndex: null,
})

const manualDraftHasContent = (draft) =>
  draft.prospect_name.trim() !== '' ||
  draft.notes.trim() !== '' ||
  Boolean(draft.service_category) ||
  String(draft.estimated_rm ?? '').trim() !== '' ||
  Boolean(draft.photoFile)

const manualFormHasContent = (form, startDate, endDate) => {
  const initialForm = createInitialManualForm(startDate, endDate)

  return (
    form.batch.length > 0 ||
    manualDraftHasContent(form.draft) ||
    form.editingBatchIndex !== null ||
    form.entry_type !== initialForm.entry_type ||
    form.entry_date !== initialForm.entry_date ||
    form.source !== initialForm.source ||
    form.segment_type !== initialForm.segment_type
  )
}

const hasInvalidEstimatedRm = (entry) =>
  entry.estimated_rm !== '' &&
  entry.estimated_rm !== null &&
  (!Number.isFinite(Number(entry.estimated_rm)) || Number(entry.estimated_rm) < 0)

const getManualEntryValidationError = (entry) => {
  if (hasInvalidEstimatedRm(entry)) {
    return 'Estimated RM must be zero or more.'
  }

  if (entry.entry_type !== 'closed') {
    return ''
  }

  if (!entry.service_category) {
    return 'Closed manual entries require a service category.'
  }

  const estimatedRm = Number(entry.estimated_rm)
  if (!Number.isFinite(estimatedRm) || estimatedRm <= 0) {
    return 'Closed manual entries require Estimated RM greater than zero.'
  }

  return ''
}

const normalizeDraftStaffCode = (staffCode) =>
  String(staffCode || 'all')
    .trim()
    .toUpperCase() || 'all'

const getManualFormDraftStorageKey = (startDate, endDate, staffCode) =>
  `dashboard.monitoring.manualPipelineEntryDraft.v2:${startDate || 'none'}:${endDate || 'none'}:${normalizeDraftStaffCode(staffCode)}`

const getStorage = () => {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage || null
  } catch (err) {
    return null
  }
}

const serializeManualDraft = (draft) => ({
  rowId: draft.rowId || '',
  prospect_name: draft.prospect_name || '',
  service_category: draft.service_category || '',
  estimated_rm:
    draft.estimated_rm === null || draft.estimated_rm === undefined ? '' : draft.estimated_rm,
  notes: draft.notes || '',
})

const serializeManualBatchEntry = (entry) => ({
  entry_type: entry.entry_type || 'lead',
  entry_date: entry.entry_date || '',
  source: entry.source || defaultEntrySource,
  segment_type: entry.segment_type || '',
  ...serializeManualDraft(entry),
})

const serializeManualForm = (form) => ({
  entry_type: form.entry_type,
  entry_date: form.entry_date,
  source: form.source,
  segment_type: form.segment_type,
  draft: serializeManualDraft(form.draft),
  batch: form.batch.slice(0, 5).map(serializeManualBatchEntry),
  editingBatchIndex: Number.isInteger(form.editingBatchIndex) ? form.editingBatchIndex : null,
})

const sanitizeStoredDraft = (draft) => {
  const blankDraft = createBlankManualEntryRow()

  return {
    ...blankDraft,
    rowId: typeof draft?.rowId === 'string' && draft.rowId ? draft.rowId : blankDraft.rowId,
    prospect_name: typeof draft?.prospect_name === 'string' ? draft.prospect_name : '',
    service_category: typeof draft?.service_category === 'string' ? draft.service_category : '',
    estimated_rm:
      draft?.estimated_rm === null || draft?.estimated_rm === undefined
        ? ''
        : String(draft.estimated_rm),
    notes: typeof draft?.notes === 'string' ? draft.notes : '',
    photoFile: null,
  }
}

const sanitizeStoredBatchEntry = (entry, fallbackForm) => {
  const draft = sanitizeStoredDraft(entry)
  const entryType =
    typeof entry?.entry_type === 'string' ? entry.entry_type : fallbackForm.entry_type

  return {
    rowId: draft.rowId,
    entry_type: entryType,
    entry_date: typeof entry?.entry_date === 'string' ? entry.entry_date : fallbackForm.entry_date,
    source: typeof entry?.source === 'string' ? entry.source : fallbackForm.source,
    segment_type: typeof entry?.segment_type === 'string' ? entry.segment_type : '',
    service_category: draft.service_category,
    estimated_rm: entryTypeAllowsEstimatedRm(entryType) ? draft.estimated_rm : '',
    prospect_name: draft.prospect_name.trim(),
    notes: draft.notes.trim(),
    photoFile: null,
  }
}

const sanitizeStoredManualForm = (storedForm, startDate, endDate) => {
  const initialForm = createInitialManualForm(startDate, endDate)
  const nextForm = {
    ...initialForm,
    entry_type:
      typeof storedForm?.entry_type === 'string' ? storedForm.entry_type : initialForm.entry_type,
    entry_date:
      typeof storedForm?.entry_date === 'string' ? storedForm.entry_date : initialForm.entry_date,
    source: typeof storedForm?.source === 'string' ? storedForm.source : initialForm.source,
    segment_type: typeof storedForm?.segment_type === 'string' ? storedForm.segment_type : '',
    draft: sanitizeStoredDraft(storedForm?.draft),
    batch: Array.isArray(storedForm?.batch)
      ? storedForm.batch
          .slice(0, 5)
          .map((entry) => sanitizeStoredBatchEntry(entry, initialForm))
          .filter((entry) => entry.prospect_name !== '')
      : [],
    editingBatchIndex: null,
  }

  if (
    Number.isInteger(storedForm?.editingBatchIndex) &&
    storedForm.editingBatchIndex >= 0 &&
    storedForm.editingBatchIndex < nextForm.batch.length
  ) {
    nextForm.editingBatchIndex = storedForm.editingBatchIndex
  }

  if (!entryTypeAllowsEstimatedRm(nextForm.entry_type)) {
    nextForm.draft.estimated_rm = ''
  }

  return nextForm
}

const readStoredManualForm = (startDate, endDate, staffCode) => {
  const storage = getStorage()
  if (!storage) return null

  try {
    const storedValue = storage.getItem(getManualFormDraftStorageKey(startDate, endDate, staffCode))
    if (!storedValue) return null

    return sanitizeStoredManualForm(JSON.parse(storedValue), startDate, endDate)
  } catch (err) {
    storage.removeItem(getManualFormDraftStorageKey(startDate, endDate, staffCode))
    return null
  }
}

const writeStoredManualForm = (startDate, endDate, staffCode, form) => {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(
      getManualFormDraftStorageKey(startDate, endDate, staffCode),
      JSON.stringify(serializeManualForm(form)),
    )
  } catch (err) {
    // Ignore storage failures; the modal remains usable without draft recovery.
  }
}

const clearStoredManualForm = (startDate, endDate, staffCode) => {
  const storage = getStorage()
  if (!storage) return

  storage.removeItem(getManualFormDraftStorageKey(startDate, endDate, staffCode))
}

const MonitoringPipelineTools = ({
  startDate,
  endDate,
  selectedStaffCode,
  selectedStaffLabel,
  manualEntryOpenRequestKey = 0,
  onManualEntrySaved,
}) => {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [manualModalVisible, setManualModalVisible] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [proofCompressing, setProofCompressing] = useState(false)
  const [proofInputKey, setProofInputKey] = useState(0)
  const [manualError, setManualError] = useState('')
  const [manualForm, setManualForm] = useState(() => createInitialManualForm(startDate, endDate))
  const lastManualEntryOpenRequestKeyRef = useRef(manualEntryOpenRequestKey)

  useEffect(() => {
    const controller = new AbortController()

    const loadMonitoringPipelineTools = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetchJsonGet(
          `${API_BASE}stats/monitoring-pipeline-tools`,
          {
            start_date: startDate,
            end_date: endDate,
            staff_code: selectedStaffCode,
          },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (response?.status === 'success') {
          setData(response)
        } else {
          setData(null)
          setError('Unable to load pipeline tools monitoring data.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData(null)
        setError('Unable to load pipeline tools monitoring data.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadMonitoringPipelineTools()

    return () => controller.abort()
  }, [startDate, endDate, selectedStaffCode, reloadKey])

  useEffect(() => {
    if (!manualModalVisible) return

    if (manualFormHasContent(manualForm, startDate, endDate)) {
      writeStoredManualForm(startDate, endDate, selectedStaffCode, manualForm)
    } else {
      clearStoredManualForm(startDate, endDate, selectedStaffCode)
    }
  }, [endDate, manualForm, manualModalVisible, selectedStaffCode, startDate])

  const discardManualForm = () => {
    clearStoredManualForm(startDate, endDate, selectedStaffCode)
    setManualForm(createInitialManualForm(startDate, endDate))
    setProofInputKey((key) => key + 1)
    setManualError('')
  }

  const openManualModal = useCallback(() => {
    setManualForm(
      readStoredManualForm(startDate, endDate, selectedStaffCode) ||
        createInitialManualForm(startDate, endDate),
    )
    setProofInputKey((key) => key + 1)
    setManualError('')
    setManualModalVisible(true)
  }, [endDate, selectedStaffCode, startDate])

  useEffect(() => {
    if (manualEntryOpenRequestKey <= 0) return
    if (manualEntryOpenRequestKey === lastManualEntryOpenRequestKeyRef.current) return
    lastManualEntryOpenRequestKeyRef.current = manualEntryOpenRequestKey
    openManualModal()
  }, [manualEntryOpenRequestKey, openManualModal])

  const closeManualModal = () => {
    if (manualSaving) return
    if (
      manualFormHasContent(manualForm, startDate, endDate) &&
      !window.confirm('Discard unsaved manual pipeline entries?')
    ) {
      return
    }
    discardManualForm()
    setManualModalVisible(false)
  }

  const updateManualForm = (updates) => {
    setManualForm((current) => ({
      ...current,
      ...updates,
      ...(Object.prototype.hasOwnProperty.call(updates, 'entry_type') &&
      !entryTypeAllowsEstimatedRm(updates.entry_type)
        ? { draft: { ...current.draft, estimated_rm: '' } }
        : {}),
    }))
  }

  const updateManualDraft = (updates) => {
    setManualForm((current) => ({
      ...current,
      draft: { ...current.draft, ...updates },
    }))
  }

  const buildPendingManualEntries = () =>
    [
      ...manualForm.batch,
      ...(manualForm.editingBatchIndex === null && manualForm.draft.prospect_name.trim()
        ? [buildManualEntryRow(manualForm.draft, manualForm)]
        : []),
    ].filter((entry) => entry.prospect_name !== '')

  const saveManualEntry = async () => {
    if (proofCompressing) {
      setManualError('Please wait for screenshot proof processing to finish.')
      return
    }

    if (manualForm.editingBatchIndex !== null) {
      setManualError('Update or cancel the batch edit before saving entries.')
      return
    }

    const entries = buildPendingManualEntries()

    if (entries.length === 0) {
      setManualError('Prospect name is required.')
      return
    }

    if (entries.some((entry) => !entry.source.trim())) {
      setManualError('Source is required.')
      return
    }

    const entryValidationError = entries.map(getManualEntryValidationError).find(Boolean)
    if (entryValidationError) {
      setManualError(entryValidationError)
      return
    }

    if (entries.length > 5) {
      setManualError('Quick add supports up to 5 entries.')
      return
    }

    setManualSaving(true)
    setManualError('')

    try {
      const response = await saveManualEntryGroup(entries)

      if (response?.status !== 'success') {
        setManualError(response?.message || 'Unable to save manual entry.')
        setManualSaving(false)
        return
      }

      clearStoredManualForm(startDate, endDate, selectedStaffCode)
      setManualForm(createInitialManualForm(startDate, endDate))
      setProofInputKey((key) => key + 1)
      setManualModalVisible(false)
      setReloadKey((key) => key + 1)
      onManualEntrySaved?.()
    } catch (err) {
      setManualError(err?.message || 'Unable to save manual entry.')
    } finally {
      setManualSaving(false)
    }
  }

  const saveManualEntryGroup = (groupRows) => {
    const firstEntry = groupRows[0]
    const formData = new FormData()

    formData.append('entry_type', firstEntry.entry_type)
    formData.append('entry_date', firstEntry.entry_date)
    formData.append('source', firstEntry.source.trim())
    formData.append('segment_type', firstEntry.segment_type || '')
    if (selectedStaffCode) {
      formData.append('owner_staff_code', selectedStaffCode)
    }
    formData.append(
      'entries',
      JSON.stringify(
        groupRows.map((entry) => ({
          entry_type: entry.entry_type,
          entry_date: entry.entry_date,
          source: entry.source.trim(),
          prospect_name: entry.prospect_name,
          notes: entry.notes,
          segment_type: entry.segment_type || '',
          service_category: entry.service_category || '',
          estimated_rm:
            entryTypeAllowsEstimatedRm(entry.entry_type) && entry.estimated_rm !== ''
              ? entry.estimated_rm
              : null,
        })),
      ),
    )
    groupRows.forEach((entry, index) => {
      if (entry.photoFile) {
        formData.append(`photos[${index}]`, entry.photoFile)
      }
    })

    return fetchJson(`${API_BASE}stats/monitoring-manual-pipeline-entry`, {
      method: 'POST',
      body: formData,
    })
  }

  const addManualDraftToBatch = () => {
    const nextDraft = buildManualEntryRow(manualForm.draft, manualForm)
    if (nextDraft.prospect_name === '') return
    if (!nextDraft.source.trim()) {
      setManualError('Source is required.')
      return
    }
    const draftValidationError = getManualEntryValidationError(nextDraft)
    if (draftValidationError) {
      setManualError(draftValidationError)
      return
    }

    setManualForm((current) => {
      const draft = buildManualEntryRow(current.draft, current)
      if (draft.prospect_name === '' || !draft.source.trim()) return current

      if (current.editingBatchIndex !== null) {
        if (!current.batch[current.editingBatchIndex]) return current

        return {
          ...current,
          draft: createBlankManualEntryRow(),
          batch: current.batch.map((entry, index) =>
            index === current.editingBatchIndex ? draft : entry,
          ),
          editingBatchIndex: null,
        }
      }

      if (current.batch.length >= 5) return current

      return {
        ...current,
        draft: createBlankManualEntryRow(),
        batch: [...current.batch, draft],
      }
    })
    setProofInputKey((key) => key + 1)
    setManualError('')
  }

  const editManualBatchRow = (index) => {
    if (proofCompressing) {
      setManualError('Please wait for screenshot proof processing to finish.')
      return
    }

    setManualForm((current) => {
      const entry = current.batch[index]
      if (!entry) return current

      if (current.editingBatchIndex === index) {
        return current
      }

      if (
        current.editingBatchIndex !== null &&
        !window.confirm('Discard the current batch edit and edit another row?')
      ) {
        return current
      }

      if (
        current.editingBatchIndex === null &&
        manualDraftHasContent(current.draft) &&
        !window.confirm('Discard the current draft and edit this batch row?')
      ) {
        return current
      }

      return {
        ...current,
        entry_type: entry.entry_type,
        entry_date: entry.entry_date,
        source: entry.source,
        segment_type: entry.segment_type,
        draft: {
          rowId: entry.rowId,
          prospect_name: entry.prospect_name,
          service_category: entry.service_category || '',
          estimated_rm:
            entryTypeAllowsEstimatedRm(entry.entry_type) &&
            entry.estimated_rm !== '' &&
            entry.estimated_rm !== null
              ? entry.estimated_rm
              : '',
          notes: entry.notes,
          photoFile: entry.photoFile || null,
        },
        editingBatchIndex: index,
      }
    })
    setProofInputKey((key) => key + 1)
    setManualError('')
  }

  const cancelManualBatchEdit = () => {
    setManualForm((current) => ({
      ...current,
      entry_type: 'lead',
      entry_date: getDefaultManualEntryDate(startDate, endDate),
      source: defaultEntrySource,
      segment_type: '',
      draft: createBlankManualEntryRow(),
      editingBatchIndex: null,
    }))
    setProofInputKey((key) => key + 1)
    setManualError('')
  }

  const removeManualBatchRow = (index) => {
    setManualForm((current) => {
      const nextBatch = current.batch.filter((_, entryIndex) => entryIndex !== index)
      let nextEditingBatchIndex = current.editingBatchIndex
      let nextDraft = current.draft

      if (nextEditingBatchIndex === index) {
        nextEditingBatchIndex = null
        nextDraft = createBlankManualEntryRow()
      } else if (nextEditingBatchIndex !== null && index < nextEditingBatchIndex) {
        nextEditingBatchIndex -= 1
      }

      return {
        ...current,
        batch: nextBatch,
        draft: nextDraft,
        editingBatchIndex: nextEditingBatchIndex,
      }
    })
    setProofInputKey((key) => key + 1)
  }

  const handleProofFileChange = async (file) => {
    if (!file) {
      updateManualDraft({ photoFile: null })
      return
    }

    setProofCompressing(true)
    setManualError('')

    try {
      const compressedFile = await compressProofImage(file)
      if (compressedFile.size > MAX_PROOF_IMAGE_BYTES) {
        setManualError('Screenshot proof must be 500KB or less.')
        updateManualDraft({ photoFile: null })
        setProofInputKey((key) => key + 1)
        return
      }

      updateManualDraft({ photoFile: compressedFile })
    } catch (err) {
      setManualError('Unable to process screenshot proof.')
      updateManualDraft({ photoFile: null })
    } finally {
      setProofCompressing(false)
    }
  }

  const clearManualDraftProof = () => {
    updateManualDraft({ photoFile: null })
    setProofInputKey((key) => key + 1)
  }

  const openBulkEntries = () => {
    if (
      manualFormHasContent(manualForm, startDate, endDate) &&
      !window.confirm('Discard unsaved manual pipeline entries and open bulk entries?')
    ) {
      return
    }

    discardManualForm()
    setManualModalVisible(false)
    navigate('/pipeline/entries/bulk-add')
  }

  const pendingManualEntryCount =
    manualForm.batch.length +
    (manualForm.editingBatchIndex === null && manualForm.draft.prospect_name.trim() ? 1 : 0)
  const segmentDataTitle = data?.monthLabel
    ? `${String(data.monthLabel).toLowerCase()} Aggregated Segment Data`
    : 'Selected Month Aggregated Segment Data'
  const maxManualEntryDate = getDefaultManualEntryDate(startDate, endDate)

  return (
    <>
      <MonitoringSheetCard
        title="Pipeline Tools"
        scopeLabel={selectedStaffCode ? `Staff: ${selectedStaffLabel}` : 'All staff'}
        tourTarget="monitoring-pipeline-tools"
      >
        {loading ? (
          <DataTableLoadingState message="Loading data..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : !Array.isArray(data?.rows) || !Array.isArray(data?.weeks) ? (
          <div className="text-center text-muted py-4">No monitoring data available.</div>
        ) : (
          <MonitoringPipelineToolsContent data={data} segmentDataTitle={segmentDataTitle} />
        )}
      </MonitoringSheetCard>

      <ManualPipelineEntryModal
        visible={manualModalVisible}
        manualError={manualError}
        manualForm={manualForm}
        manualSaving={manualSaving}
        proofCompressing={proofCompressing}
        proofInputKey={proofInputKey}
        maxManualEntryDate={maxManualEntryDate}
        startDate={startDate}
        pendingManualEntryCount={pendingManualEntryCount}
        editingBatchIndex={manualForm.editingBatchIndex}
        onAddDraftToBatch={addManualDraftToBatch}
        onBulkEntries={openBulkEntries}
        onCancelBatchEdit={cancelManualBatchEdit}
        onClearProofFile={clearManualDraftProof}
        onClose={closeManualModal}
        onDraftChange={updateManualDraft}
        onEditBatchRow={editManualBatchRow}
        onFormChange={updateManualForm}
        onProofFileChange={handleProofFileChange}
        onRemoveBatchRow={removeManualBatchRow}
        onSave={saveManualEntry}
      />
    </>
  )
}

export default MonitoringPipelineTools

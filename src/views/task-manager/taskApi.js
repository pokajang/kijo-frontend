import { apiJson } from '../../api/apiClient'

export const DEFAULT_PREVIEW_CLASSIFICATION = {
  taskCategory: 'uncategorised',
  taskCategoryLabel: 'General Task',
  effortScore: 1,
  classificationConfidence: 'low',
  classificationSource: 'system',
  userOverride: false,
  matchedPattern: null,
  workType: 'unclear',
  workTypeLabel: 'Unclear',
  workTypeConfidence: 'low',
  workTypeMatchedPattern: null,
  aiClassificationStatus: 'not_applicable',
  aiClassificationQueuedAt: null,
  aiClassificationStartedAt: null,
  aiClassificationCompletedAt: null,
  aiClassificationError: null,
  classificationStatus: 'idle',
}

export const normalizeTaskClassification = (classification = {}, status = 'resolved') => ({
  taskCategory: classification.taskCategory || 'uncategorised',
  taskCategoryLabel: classification.taskCategoryLabel || 'General Task',
  effortScore: Number.isFinite(Number(classification.effortScore))
    ? Number(classification.effortScore)
    : 1,
  classificationConfidence: classification.classificationConfidence || 'low',
  classificationSource: classification.classificationSource || 'system',
  userOverride: Boolean(classification.userOverride),
  matchedPattern: classification.matchedPattern || null,
  workType: classification.workType || 'unclear',
  workTypeLabel: classification.workTypeLabel || 'Unclear',
  workTypeConfidence: classification.workTypeConfidence || 'low',
  workTypeMatchedPattern: classification.workTypeMatchedPattern || null,
  aiClassificationStatus: classification.aiClassificationStatus || 'not_applicable',
  aiClassificationQueuedAt: classification.aiClassificationQueuedAt || null,
  aiClassificationStartedAt: classification.aiClassificationStartedAt || null,
  aiClassificationCompletedAt: classification.aiClassificationCompletedAt || null,
  aiClassificationError: classification.aiClassificationError || null,
  classificationStatus: status,
})

export const defaultTaskPreview = (status = 'idle') => ({
  ...DEFAULT_PREVIEW_CLASSIFICATION,
  classificationStatus: status,
})

export const previewTaskClassification = async (title, { signal } = {}) => {
  const payload = await apiJson(`${import.meta.env.VITE_API_BASE}tasks/classify`, {
    method: 'POST',
    signal,
    silentError: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })

  if (payload?.status !== 'success') {
    throw new Error(payload?.message || 'Failed to classify task')
  }

  return normalizeTaskClassification(payload.classification)
}

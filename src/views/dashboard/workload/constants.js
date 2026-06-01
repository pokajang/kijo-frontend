export const WORKLOAD_SCORE_WEIGHTS = {
  activeTasks: 2,
  overdueTasks: 4,
  dueSoonTasks: 2,
  projectTaggedActiveTasks: 1,
}

export const WORKLOAD_TONE_THRESHOLDS = {
  danger: { score: 20, activeTasks: 5, overdueTasks: 3 },
  warning: { score: 10, activeTasks: 3, overdueTasks: 1, dueSoonTasks: 2 },
}

export const WORKLOAD_SCORE_MATRIX_THRESHOLDS = {
  moderate: 10,
  high: 20,
  extreme: 35,
}

export const WORKLOAD_PROJECT_ACTIVITY_PREVIEW = 3
export const WORKLOAD_OTHER_TASK_PREVIEW = 3

export const CURRENCY_PREFIX = 'RM '
export const CURRENCY_FRACTION_DIGITS = 2

export const WORKLOAD_LOAD_ERROR_MESSAGE =
  'Unable to load workload data. Please try again or contact support if this persists.'

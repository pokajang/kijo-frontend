import { WORKLOAD_SCORE_MATRIX_THRESHOLDS } from '../constants'

const { moderate, high, extreme } = WORKLOAD_SCORE_MATRIX_THRESHOLDS

export const workloadScoreMatrixBands = [
  {
    key: 'low',
    level: 'Low',
    range: `0 - ${moderate - 0.01}`,
    meaning: 'Normal workload. Monitor only.',
  },
  {
    key: 'moderate',
    level: 'Moderate',
    range: `${moderate} - ${high - 0.01}`,
    meaning: 'Noticeable workload. Watch due-soon and overdue items.',
  },
  {
    key: 'high',
    level: 'High',
    range: `${high} - ${extreme - 0.01}`,
    meaning: 'Heavy workload. Review assignment balance and blockers.',
  },
  {
    key: 'extreme',
    level: 'Extreme',
    range: `${extreme}+`,
    meaning: 'Critical concentration. Prioritize delegation, escalation, or deadline changes.',
  },
]

export const getWorkloadScoreLevelBand = (score) => {
  const value = Number(score || 0)

  if (value >= extreme) return workloadScoreMatrixBands[3]
  if (value >= high) return workloadScoreMatrixBands[2]
  if (value >= moderate) return workloadScoreMatrixBands[1]
  return workloadScoreMatrixBands[0]
}

export const getWorkloadScoreLevel = (score) => getWorkloadScoreLevelBand(score).level

export const taskEffortMarks = [
  {
    category: 'Non-rated / Not graded',
    points: '0',
    detail:
      'Clearly non-work, personal Bahasa Melayu/English entries, or unreadable trash input such as watching TV, makan, games, shopping, personal errands, symbols, or keyboard-smash text. The task can still be saved, but it does not add workload score.',
  },
  {
    category: 'Unclear / Not graded',
    points: '0',
    detail:
      'Unknown or vague task titles with no recognizable company work action. Add context such as prepare, review, follow up, submit, develop, reconcile, or audit to receive workload grading.',
  },
  {
    category: 'Pending / Waiting',
    points: '0.5',
    detail:
      'Waiting states such as approval, client reply, vendor quotation, signoff, or confirmation.',
  },
  {
    category: 'Administrative / General',
    points: '1',
    detail:
      'Data entry, upload, filing, printing, record updates, or vague but plausible work tasks with recognizable company/work context.',
  },
  {
    category: 'Coordination / Follow-up',
    points: '2',
    detail:
      'Follow-ups, arranging schedules, chasing parties, liaison, reminders, and coordination work.',
  },
  {
    category: 'Real Effort',
    points: '3',
    detail:
      'Preparing reports, quotations, training material, SOPs, analysis, payroll, audits, or site work.',
  },
  {
    category: 'Critical / Escalation',
    points: '4',
    detail:
      'Urgent blockers, escalations, complaint handling, critical fixes, or high-impact recovery work.',
  },
  {
    category: 'Deep / Complex Work',
    points: '5',
    detail:
      'Sustained technical, finance, HR, management, compliance, or operations work such as feature development, architecture, migration, month-end closing, workforce planning, or KPI framework design.',
  },
]

export const projectValueBands = [
  ['No value', '0'],
  ['RM 0.01 - RM 10,000', '1'],
  ['RM 10,000.01 - RM 50,000', '2'],
  ['RM 50,000.01 - RM 150,000', '3'],
  ['RM 150,000.01 - RM 500,000', '4'],
  ['Above RM 500,000', '5'],
]

export const projectRoleWeights = [
  ['Leader / PIC / Owner', '1.00'],
  ['Assistant', '0.65'],
  ['Collaborator', '0.45'],
  ['Other or unset role', '0.35'],
]

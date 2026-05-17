import React from 'react'
import { CPopover, CTooltip } from '@coreui/react'
import { formatScoreNumber } from '../utils/kpiScore'

const WeightedScoreBar = ({ summary }) => {
  if (!summary || summary.totalWeight <= 0 || summary.segments.length === 0) return null

  const configuredWeightage = formatScoreNumber(summary.totalWeight)
  const earnedScore = formatScoreNumber(summary.totalEarned)
  const overallPct = formatScoreNumber(summary.overallPct)
  const calculationContent = (
    <div className="kpi-score-calculation-popover">
      <div className="fw-semibold mb-2">Score calculation</div>
      <div className="kpi-score-calculation-total">
        {earnedScore} = sum of earned KPI weights / {configuredWeightage} total weight
      </div>
      <div className="kpi-score-calculation-list">
        {summary.segments.map((segment) => (
          <div key={segment.id} className="kpi-score-calculation-item">
            <div className="fw-semibold">{segment.label}</div>
            {segment.target > 0 ? (
              <div>
                min({formatScoreNumber(segment.current)} / {formatScoreNumber(segment.target)}, 1) x{' '}
                {formatScoreNumber(segment.weightage)} = {formatScoreNumber(segment.earnedWeight)}
              </div>
            ) : (
              <div>Target is 0, so earned score is {formatScoreNumber(segment.earnedWeight)}.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="kpi-weighted-score-panel">
      <div className="kpi-weighted-score-header">
        <div className="kpi-weighted-score-label">Total Live Score</div>
        <div className="kpi-weighted-score-metrics">
          <CPopover trigger="hover" placement="bottom" content={calculationContent}>
            <button type="button" className="kpi-weighted-score-value">
              {earnedScore} / {configuredWeightage}
            </button>
          </CPopover>
          <span className="kpi-weighted-score-separator">OR</span>
          <div className="kpi-weighted-score-percent">{overallPct}%</div>
        </div>
      </div>

      <div
        className="kpi-weighted-bar"
        aria-label={`Weighted KPI score ${earnedScore} out of ${configuredWeightage}`}
      >
        {summary.segments.map((segment) => {
          const segmentLabel = `${segment.label}: ${formatScoreNumber(
            segment.earnedWeight,
          )} / ${formatScoreNumber(segment.weightage)} earned, ${formatScoreNumber(
            segment.achievementPct,
          )}% achieved`

          return (
            <CTooltip
              key={segment.id}
              placement="top"
              content={
                <div className="text-start">
                  <div className="fw-semibold">{segment.label}</div>
                  <div>
                    Score {formatScoreNumber(segment.earnedWeight)} /{' '}
                    {formatScoreNumber(segment.weightage)}
                  </div>
                  <div>
                    Achieved {formatScoreNumber(segment.current)} /{' '}
                    {formatScoreNumber(segment.target)} {segment.unit}
                  </div>
                </div>
              }
            >
              <div
                className="kpi-weighted-segment"
                role="img"
                tabIndex={0}
                aria-label={segmentLabel}
                style={{ flexGrow: segment.weightage }}
              >
                <div
                  className={`kpi-weighted-segment-fill bg-${segment.color}`}
                  style={{ width: `${segment.cappedRatio * 100}%` }}
                />
              </div>
            </CTooltip>
          )
        })}
      </div>
    </div>
  )
}

export default WeightedScoreBar

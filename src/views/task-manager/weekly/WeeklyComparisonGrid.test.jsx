import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WeeklyComparisonGrid from './WeeklyComparisonGrid'

describe('WeeklyComparisonGrid', () => {
  it('keeps the comparison frame visible when neither week has activity', () => {
    render(
      <WeeklyComparisonGrid
        previousWeekStart="2026-08-17"
        selectedWeekStart="2026-08-24"
        previousSummary={{ achievements: [], hiccups: [], nextWeek: [] }}
        selectedSummary={{ achievements: [], hiccups: [], nextWeek: [] }}
      />,
    )

    expect(screen.getByLabelText('Two week task comparison')).toBeInTheDocument()
    expect(screen.getAllByText('Achievements')).toHaveLength(3)
    expect(screen.getAllByText('No achievements recorded for this week.')).toHaveLength(3)
  })
})

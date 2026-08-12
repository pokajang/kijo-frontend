import { describe, expect, it } from 'vitest'
import {
  getSalespersonContributionRows,
  hasFirstTouchEvidenceHistory,
} from '../salespersonContribution'

describe('salesperson contribution', () => {
  it('groups project collection by credited salesperson and keeps unassigned work separate', () => {
    expect(
      getSalespersonContributionRows([
        { id: 1, salesOwner: 'Nurul Najwa', salesOwnerCode: 'NND', collected: 1200 },
        { id: 2, salesOwner: 'Daniel Lee', salesOwnerCode: 'DL', collected: 700 },
        { id: 3, salesOwner: 'Nurul Najwa', salesOwnerCode: 'NND', collected: 800 },
        { id: 4, collected: 300 },
      ]),
    ).toEqual([
      {
        key: 'salesperson:NND',
        salesOwner: 'Nurul Najwa',
        salesOwnerCode: 'NND',
        projectCount: 2,
        collected: 2000,
        isUnassigned: false,
      },
      {
        key: 'salesperson:DL',
        salesOwner: 'Daniel Lee',
        salesOwnerCode: 'DL',
        projectCount: 1,
        collected: 700,
        isUnassigned: false,
      },
      {
        key: 'unassigned',
        salesOwner: 'Unassigned',
        salesOwnerCode: '',
        projectCount: 1,
        collected: 300,
        isUnassigned: true,
      },
    ])
  })

  it('only exposes evidence history when there is more than a simple current claim', () => {
    expect(hasFirstTouchEvidenceHistory({ claims: [{ id: 1, revisions: [] }] })).toBe(false)
    expect(hasFirstTouchEvidenceHistory({ claims: [{ id: 1, revisions: [{ id: 11 }] }] })).toBe(
      true,
    )
    expect(hasFirstTouchEvidenceHistory({ disputes: [{ id: 1 }] })).toBe(true)
  })
})

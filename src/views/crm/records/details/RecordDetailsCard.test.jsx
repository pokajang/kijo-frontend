import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import RecordDetailsCard from './RecordDetailsCard'

afterEach(cleanup)

describe('RecordDetailsCard', () => {
  it('shows revision, update, and creator metadata in the quotation overview', () => {
    render(
      <RecordDetailsCard
        loading={false}
        error=""
        serviceLabel="Training"
        serviceTab="training-tab"
        record={{
          quotationId: 'QTR26-0011 Rev 02',
          status: 'Open',
          dateCreated: '2026-07-01',
          dateUpdated: '2026-07-15',
          revisionNo: 2,
          createdByName: 'Nur Aisyah',
          createdByCode: 'NA',
        }}
        subject="Working at Height"
        amountDisplay="RM 23,073.00"
        quotationAgeDays={26}
        getDateOnly={(value) => value || ''}
        statusColor={() => 'info'}
        showContactSummary={false}
      />,
    )

    expect(screen.getAllByText('Rev 02')).toHaveLength(2)
    expect(screen.getAllByText('2026-07-15')).toHaveLength(2)
    expect(screen.getByText('Nur Aisyah (NA)')).toBeInTheDocument()
  })
})

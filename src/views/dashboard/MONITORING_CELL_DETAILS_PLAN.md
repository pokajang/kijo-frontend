# Monitoring Cell Details Hover Plan

## Goal

Add a reliable way for users to inspect what forms each Monitoring dashboard aggregate cell.

Example:

- Hover or click `Leads / W1 / 1` and see the one lead record behind the value.
- Hover or click `Proposal / W1 / 6` and see the quote/manual records behind the value.
- Hover or click service rows such as `Training / W1 / QTY 1 / RM 3,000` and see the exact quote/manual entries behind the quantity and value.

This must be accurate: the details shown must be produced by the same source events used to compute the visible aggregate number.

## Current State

The frontend currently receives aggregate values only.

Dashboard files:

- `frontend/src/views/dashboard/monitoring/MonitoringPipelineToolsContent.js`
- `frontend/src/views/dashboard/monitoring/MonitoringPipelineStatus.js`

Backend endpoints:

- `stats/monitoring-pipeline-tools`
- `stats/monitoring-pipeline-status`

Backend file:

- `backend-laravel/app/Http/Controllers/Api/StatsController.php`

Current aggregate shape:

```js
row.weekly.W1
row.total
row.individualQty
row.individualRm
row.specialProjectQty
row.specialProjectRm
row.tenderQty
row.tenderRm
```

The API does not currently return the row-level contributors that produced those values.

## Important Finding

This should not be implemented as a frontend-only tooltip. The backend currently discards contributor metadata during aggregation. The correct implementation is:

1. Build normalized contributor records in the backend.
2. Aggregate from those contributors.
3. Return both the aggregate number and the bounded contributor list for each cell.
4. Render the contributor list in a popover/details UI.

## Backend Data Contract

Add normalized contributor objects.

```js
{
  sourceType: 'manual' | 'quote' | 'call',
  sourceId: 'quote:Training:123',
  date: '2026-05-08',
  clientName: 'ABC Manufacturing Sdn Bhd',
  serviceType: 'Training',
  subject: 'OSH Coordinator Training',
  value: 3000,
  source: 'WhatsApp Personal',
  notes: 'Followed up with client',
  ownerStaffCode: 'AZA',
  ownerStaffName: 'Azam Bin Husain',
  segment: 'individual'
}
```

Fields can be nullable, but `sourceType`, `sourceId`, and `date` should always be present where possible.

## Pipeline Tools Response Shape

Each row should keep the existing aggregate fields and add `details`.

```js
{
  label: 'PROPOSAL',
  weekly: {
    W1: 6,
    W2: 0
  },
  total: 6,
  individualQty: 6,
  individualRm: 7620,
  specialProjectQty: null,
  specialProjectRm: null,
  tenderQty: null,
  tenderRm: null,
  details: {
    weekly: {
      W1: {
        count: 6,
        items: []
      }
    },
    total: {
      count: 6,
      items: []
    },
    segments: {
      individual: {
        qty: {
          count: 6,
          items: []
        },
        rm: {
          count: 6,
          value: 7620,
          items: []
        }
      },
      specialProject: {
        qty: {
          count: 0,
          items: []
        },
        rm: {
          count: 0,
          value: 0,
          items: []
        }
      },
      tender: {
        qty: {
          count: 0,
          items: []
        },
        rm: {
          count: 0,
          value: 0,
          items: []
        }
      }
    }
  }
}
```

For `Not tracked` cells, keep the aggregate value as `null` and omit details or return an empty details object.

## Pipeline Status Response Shape

Each service row should keep the existing aggregate fields and add details for weekly and segment cells.

```js
{
  label: 'TRAINING',
  weekly: {
    W1: {
      qty: 1,
      rm: 3000
    }
  },
  totalQty: 1,
  totalRm: 3000,
  individualQty: 1,
  individualRm: 3000,
  details: {
    weekly: {
      W1: {
        qty: {
          count: 1,
          items: []
        },
        rm: {
          count: 1,
          value: 3000,
          items: []
        }
      }
    },
    total: {
      qty: {
        count: 1,
        items: []
      },
      rm: {
        count: 1,
        value: 3000,
        items: []
      }
    },
    segments: {
      individual: {
        qty: {
          count: 1,
          items: []
        },
        rm: {
          count: 1,
          value: 3000,
          items: []
        }
      }
    }
  }
}
```

## Source Mapping

### Leads

Sources:

- `google_call_records`
- `monitoring_manual_pipeline_entries`

Manual entries already have:

- prospect name
- date
- source
- classification
- service category
- estimated RM
- notes
- owner
- screenshot proof

Call records currently select only:

- id
- called date
- created date
- caller staff code

Improve this by selecting/joining available call/contact fields:

- call note
- outcome
- duration
- next action date
- contact name
- contact phone
- contact address

If no contact name exists, fallback label should be `Call record #id`.

### Qualified

Sources:

- quote lifecycle records
- manual qualified entries

Current logic treats every quote created in the month as qualified.

Need to enrich quote lifecycle records with:

- client name
- service group
- service title
- quote value
- quote status
- owner staff code/name
- created date
- remarks where available

### Meeting / Pitching

Sources:

- manual entries only

Do not infer system meetings unless a formal source is agreed later.

### Proposal

Sources:

- quote lifecycle records
- manual proposal entries

Current logic treats every quote created in the month as proposal activity.

Need to show:

- client name
- service type/group
- service title/subject
- quote value
- quote status
- quote created date
- owner

Do not use `attach_proposal` as a filter until the business rule is confirmed.

### Negotiation

Sources:

- manual entries only for MVP

There is a possible future source from `quote_followups`, but it should not be included until the business rule defines which follow-up records count as negotiation.

### Closed

Sources:

- awarded/won quote lifecycle records
- manual closed entries

Use `award_date` for system closed events.

Need to show:

- client name
- service type/group
- service title/subject
- quote value
- award date
- quote status
- owner

## Backend Implementation Steps

### 1. Add Contributor Builder Helpers

In `StatsController.php`, add helpers that normalize records into contributor objects:

- `monitoringManualContributor($entry)`
- `monitoringQuoteContributor($quote, $eventDate, $sourceType)`
- `monitoringCallContributor($call)`

These should return consistent keys for frontend rendering.

### 2. Expand Quote Lifecycle Query

Update `baseQuoteLifecycleQuery()` to include nullable display fields across all quote unions.

Recommended fields:

- `client_name`
- `remarks`
- `inquiry_remarks`
- `status_remarks`

Every union branch must select the same columns, using `NULL AS field_name` if a table does not have that field.

### 3. Expand Lead Call Query

Update `monitoringSystemLeadEvents()` so call events contain contributor details, not only dates and keys.

Potential joins:

- `google_call_records.contact_id`
- `google_contacts.id`

Guard with schema checks if column/table availability is uncertain.

### 4. Update Event Shape

Current events:

```php
[
    'date' => '2026-05-08',
    'key' => 'proposal-quote:Training:123',
    'segment' => 'individual',
    'value' => 3000,
]
```

Target events:

```php
[
    'date' => '2026-05-08',
    'key' => 'proposal-quote:Training:123',
    'segment' => 'individual',
    'value' => 3000,
    'contributor' => [...],
]
```

### 5. Preserve Contributors In `monitoringToolsDistinctRow`

Current helper counts distinct keys by week and segment. Keep that behavior, but store the first contributor for each distinct key.

Important:

- Counts must continue to use distinct keys.
- Details must use the same distinct keys.
- If two events share the same key, only one contributor appears.

### 6. Preserve Contributors In `monitoringToolsTotalRow`

Merge child row detail collections into the total row.

The total cell should explain all contributors across all pipeline rows for that week.

### 7. Preserve Contributors In `monitoringPipelineStatus`

When looping quote/manual events, append contributor objects into:

- `details.weekly[weekKey].qty.items`
- `details.weekly[weekKey].rm.items`
- `details.total.qty.items`
- `details.total.rm.items`
- `details.segments[segment].qty.items`
- `details.segments[segment].rm.items`

For RM details, use the same contributor list as QTY, but include `value`.

### 8. Bound The Payload

Do not return unlimited arrays in every cell.

Recommended backend helper:

```php
private function monitoringBoundDetails(array $items, int $limit = 10): array
{
    return [
        'count' => count($items),
        'items' => array_slice($items, 0, $limit),
        'truncated' => count($items) > $limit,
    ];
}
```

For RM cells:

```php
[
    'count' => count($items),
    'value' => $sum,
    'items' => array_slice($items, 0, 10),
    'truncated' => count($items) > 10,
]
```

## Frontend Implementation Steps

### 1. Add Shared Detail Popover Component

Create:

```txt
frontend/src/views/dashboard/monitoring/MonitoringCellDetailsPopover.js
```

Props:

```js
{
  value,
  details,
  title,
  metricLabel,
  formatter,
  muted
}
```

Behavior:

- If `details.count` is missing or zero, render plain value.
- If value is `0`, render plain value.
- If value is `Not tracked`, render plain value.
- Otherwise render an interactive value with a CoreUI popover.

Use CoreUI styles to match the dashboard:

- small text
- white popover
- subtle border
- max width around `420px`
- max height around `320px`
- scroll inside popover body if needed

### 2. Use Click/Focus As Primary Interaction

Hover-only is not reliable on mobile and can be flaky inside scrollable tables.

Recommended interaction:

- Desktop: hover and focus may show the popover if CoreUI behaves well.
- Mobile: click/tap must work.
- Keyboard: focus and Enter/Space should work.

If CoreUI `CPopover` hover is unstable inside the table, use `trigger="focus"` and make the cell value a small button.

### 3. Render Contributor Rows

Create display formats by source type.

Manual contributor:

```txt
ABC Sdn Bhd - 8 May 2026 - WhatsApp Personal
Notes: Followed up with client
```

Quote contributor:

```txt
ABC Sdn Bhd - Training - OSH Coordinator Training
8 May 2026 - RM 3,000 - AZA
```

Call contributor:

```txt
ABC Sdn Bhd - 8 May 2026 - Call
Notes: Interested, follow up next week
```

Fallback:

```txt
Record #123 - 8 May 2026
```

### 4. Wire Weekly Pipeline Tools Table

File:

```txt
frontend/src/views/dashboard/monitoring/MonitoringPipelineToolsContent.js
```

Replace:

```js
formatNumber(row.weekly?.[week.key])
```

With:

```jsx
<MonitoringCellDetailsPopover
  value={row.weekly?.[week.key]}
  details={row.details?.weekly?.[week.key]}
  title={`${formatPipelineToolLabel(row.label)} - ${week.label}`}
  formatter={formatNumber}
/>
```

Also wire:

- row total cells
- mobile weekly cells
- mobile total cells

### 5. Wire Pipeline Tools Segment Table

For segment cells, map the column and metric:

- Individual QTY -> `row.details.segments.individual.qty`
- Individual RM -> `row.details.segments.individual.rm`
- Special Project QTY -> `row.details.segments.specialProject.qty`
- Special Project RM -> `row.details.segments.specialProject.rm`
- Tender QTY -> `row.details.segments.tender.qty`
- Tender RM -> `row.details.segments.tender.rm`

Do not wrap `Not tracked` cells.

### 6. Wire Weekly Pipeline Status Table

File:

```txt
frontend/src/views/dashboard/monitoring/MonitoringPipelineStatus.js
```

Replace weekly QTY and RM rendering:

```js
renderMetric(row.weekly?.[week.key]?.qty)
renderMetric(row.weekly?.[week.key]?.rm)
```

With details-aware cells:

```jsx
<MonitoringCellDetailsPopover
  value={row.weekly?.[week.key]?.qty}
  details={row.details?.weekly?.[week.key]?.qty}
  title={`${formatPipelineStatusLabel(row.label)} - ${week.label} QTY`}
  formatter={renderMetric}
/>
```

RM equivalent:

```jsx
<MonitoringCellDetailsPopover
  value={row.weekly?.[week.key]?.rm}
  details={row.details?.weekly?.[week.key]?.rm}
  title={`${formatPipelineStatusLabel(row.label)} - ${week.label} RM`}
  formatter={renderMetric}
/>
```

Also wire:

- row total QTY/RM
- table footer totals
- mobile weekly cards
- mobile total cards

### 7. Wire Pipeline Status Segment Table

Map service segment cells:

- Individual QTY -> `row.details.segments.individual.qty`
- Individual RM -> `row.details.segments.individual.rm`
- Special Project QTY -> `row.details.segments.specialProject.qty`
- Special Project RM -> `row.details.segments.specialProject.rm`
- Tender QTY -> `row.details.segments.tender.qty`
- Tender RM -> `row.details.segments.tender.rm`

Do not wrap nullable `Not tracked` values.

### 8. Fix Overflow And Z-Index

Current desktop tables are wrapped in:

```txt
rounded-4 overflow-hidden bg-light
```

Popover content may be clipped.

Options:

1. Prefer CoreUI/Popper portal rendering to `document.body` if supported.
2. If portal is unavailable, remove `overflow-hidden` from the wrapper and apply rounding through table/container styles instead.
3. Set popover z-index below Joyride but above dashboard cards.

Recommended z-index:

```css
.monitoring-cell-details-popover {
  z-index: 2100;
}
```

Joyride is currently `2200`, so the tour remains on top.

## UX Rules

- `0` cells stay plain unless the backend reports contributors. A zero should normally have no popover.
- `Not tracked` cells stay plain.
- Non-zero cells with details should look interactive but subtle.
- Suggested style: dotted underline or small `cursor: pointer` pill with no border.
- Popover should show at most 10 records.
- If more records exist, footer should show `+N more`.
- Long notes should clamp to two lines.
- Avoid making every cell visually noisy.
- The table must remain readable as a dashboard first, drilldown second.

## Accessibility Rules

- Interactive cells must be keyboard focusable.
- Use `button` for interactive cell values, not a bare `span`.
- Add an `aria-label`, for example:

```txt
View details for Proposal W1, 6 records
```

- Popover should open on focus or click.
- The visible number must remain readable without relying on hover.

## Performance Rules

- Avoid loading unbounded details for every cell.
- Return a maximum of 10 visible contributors per cell.
- Keep a full `count` so the frontend can show `+N more`.
- If payload size becomes too large, move to a lazy endpoint:

```txt
POST stats/monitoring-cell-details
```

Suggested request:

```js
{
  start_date,
  end_date,
  staff_code,
  dashboard: 'pipeline-tools' | 'pipeline-status',
  row_label: 'PROPOSAL',
  week_key: 'W1',
  metric: 'qty' | 'rm' | 'total',
  segment: 'individual' | 'specialProject' | 'tender'
}
```

For MVP, inline bounded details are simpler and should be acceptable.

## Testing Plan

### Backend

Test these cases:

- `Leads / W1` count equals contributor count.
- Manual lead appears under `Leads`.
- Quote created in selected month appears under both `Qualified` and `Proposal`.
- Awarded/won quote appears under `Closed` by `award_date`.
- Manual meeting appears only under `Meeting / Pitching`.
- Manual negotiation appears only under `Negotiation`.
- Staff filter limits contributors and aggregates consistently.
- All Staff includes all allowed contributors.
- Segment details match Individual, Special Project, and Tender totals.
- `Not tracked` cells remain `null` and do not get misleading details.

### Frontend

Test these cases:

- Non-zero weekly Pipeline Tools cell opens details.
- Non-zero weekly Pipeline Status QTY cell opens details.
- Non-zero weekly Pipeline Status RM cell opens details.
- Segment QTY/RM cells open details when tracked.
- `0` cells do not look clickable.
- `Not tracked` cells do not look clickable.
- Popover is not clipped by table wrapper.
- Popover works in horizontal scroll.
- Mobile tap opens details.
- Keyboard focus opens details.

### Commands

Frontend:

```bash
cd frontend
npm run lint -- src/views/dashboard/monitoring
npm run build
```

Backend:

```bash
cd backend-laravel
php artisan test
```

If there are no existing backend tests for `StatsController`, add focused feature tests for the two monitoring endpoints.

## Rollout Order

1. Backend: add contributor builder helpers.
2. Backend: enrich quote/call source queries.
3. Backend: attach bounded details to `monitoring-pipeline-tools`.
4. Backend: attach bounded details to `monitoring-pipeline-status`.
5. Frontend: add `MonitoringCellDetailsPopover`.
6. Frontend: wire Pipeline Tools weekly cells.
7. Frontend: wire Pipeline Tools segment cells.
8. Frontend: wire Pipeline Status weekly QTY/RM cells.
9. Frontend: wire Pipeline Status segment cells.
10. Fix clipping/z-index.
11. Run QA against All Staff and selected staff scopes.

## Open Decisions

- Should `Proposal` count every quote creation, or only quotes with attached proposal files?
- Should `Negotiation` include `quote_followups`, and if yes, which follow-up types count?
- Should call records without contact names show phone numbers, call IDs, or both?
- Should popovers include screenshot thumbnails for manual entries, or keep screenshots only in pipeline entry records?
- Should totals show all mixed contributors or only a count with a `View records` action later?

## Recommended MVP

Implement inline bounded details with click/focus popovers.

Do not add a new detail endpoint yet.

Do not include `quote_followups` in Negotiation yet.

Do not change the existing aggregate definitions while adding details. The first release should only make the current numbers explainable.

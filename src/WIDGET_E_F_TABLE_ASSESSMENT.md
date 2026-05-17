# Widget E/F Assessment For Record Tables

## Summary

This assessment covers production record/list table surfaces found by searching `StatsStrip`, `DataTableRecordList`, `DataTableEmbeddedList`, and `DataTableMatrix` under `frontend/src`.

Recommendation:

- Use **Widget E** only per stat card when the card can draw a real ordered series from the same visible or filtered rows.
- Keep **Widget F** for snapshot stats: totals, status counts, missing data, user/owner leaders, active/inactive, pending, overdue, unpaid, and compliance counts.
- Do not switch a whole `StatsStrip` globally to Widget E. The right architecture is per-card widget selection.
- Do not create fake chart data. If a table only has snapshot stats today, keep Widget F even when date fields exist.

## Assessment Table

| Module | Table/File | Current Stats? | Date/Time Field Available | Value Field Available | User/Owner Field Available | Recommended Default Widget | Widget E Candidate Cards | Widget F Cards | Reason |
|---|---|---:|---|---|---|---|---|---|---|
| Commercial | `views/commercial/invoice/InvoiceTable.jsx` | Yes | `issued` | `total` | `pic` | Mixed | `Invoices` by issued month, `Total Amount` by issued month | `Unpaid`, `Top PIC` | Invoice volume/value is meaningful over time; unpaid and PIC ranking are snapshots. |
| Commercial | `views/commercial/delivery-order/DeliveryOrder.js` | Yes | `issued`, service period | No stable row amount | `issuer` / PIC filter | Widget F | None for current 4-card set | `Delivery Orders`, `Issued`, `Upcoming`, `Top PIC` | Time data exists, but current stats are issue-status and ownership snapshots, not trend-shaped. |
| Commercial | `views/commercial/jd14/JD14Table.jsx` | Yes | `commenced`, `ended` | No | No clear owner in table | Widget F | None for current 4-card set | `JD14 Forms`, `Completed`, `Ongoing`, `Upcoming` | Course dates support status buckets, but the useful stats are current schedule state. |
| Commercial | `views/commercial/supplier-po/PoList.js` | Yes | `issued` | `total` | creator/PIC fields | Mixed | `POs` by issued month, `Total Value` by issued month | `Pending`, `Top Creator` | PO count/value trend is real from visible rows; pending and top creator are snapshot/user-aware cards. |
| Commercial | `views/commercial/vendor-loa/VendorLoaTable.jsx` | Yes | `award`, `requested`, `approved` | `value` | `awardBy` | Mixed | `LOAs` by award month, `Total Value` by award month | `Pending`, `Top Award By` | Award date plus award value can produce a valid trend; payment state and award-by leader stay snapshot. |
| Vendor | `views/vendor/payment-records/PaymentTable.jsx` | Yes | `requested`, `approved` | `amount` | `created_by_name_code`, approver | Mixed | `Requests` by requested date, `Total Amount` by requested month | `Pending`, `Top Requester` | Request volume/value over time is useful; approval status and requester leader are current-state stats. |
| Vendor | `views/vendor/pay/PaymentHistoryTable.jsx` | Yes | `requested`, `approved` | `amount` | requester | Mixed | `Payments` by approved/requested date, `Total Paid` by approved month | `Pending`, `Top Requester` | Paid amount by approval date is a true financial trend; pending/top requester are snapshots. |
| Vendor | `views/vendor/manage/VendorListTable.js` | No | Not visible in table | No | No | Needs stats first, likely Widget F | None | Future: `Vendors`, `Categories`, `Missing Bank`, `Missing Contact` | Vendor master data is mostly completeness/category state, not time-series. |
| Vendor | `views/vendor/manage/FrozenVendorTable.jsx` | No | Not visible in table | No | No | Needs stats first, likely Widget F | None | Future: `Frozen Vendors`, `Categories`, `Missing Reason`, `Top Category` | Frozen vendor table is a state/compliance list; Widget E would be noise without freeze dates. |
| Marketing | `views/marketing/pipeline/PipelineEntriesRecords.jsx` | Yes | `entryDate` | `estimatedRm` | `ownerStaffCode` | Mixed | `Estimated Value` by entry date/month | `Qualified/Proposal`, `Closed`, `Top Owner` | Pipeline value trend is meaningful; status stages and owner leader are snapshot/user-aware. |
| Marketing | `views/marketing/inquiries/InquiryRecords.jsx` | Yes | `inquiryDate` | No | `ownerStaffName`, assigned-by | Mixed | `Total Inquiries` by inquiry date | `Open`, `Quote Created`, `Top PIC` | Inquiry arrival trend is useful; open/converted/PIC cards stay snapshots. |
| Marketing | `views/marketing/records/CallTable.jsx` | Yes | `lastCalledAt`, call log `called_at` | `callCount` | `caller` | Mixed | `Total Calls` by call date | `Contacts`, `Follow-up Needed`, `Top Caller` | Call logs are naturally time-series; contact count, follow-up count, and caller leader are snapshots. |
| Marketing | `views/marketing/find/FactoryTable.jsx` | No | No | No | No | Needs stats first, likely Widget F | None | Future: `Factories Found`, `With Phone`, `Registered`, `Missing Phone` | Search result table has no durable time/value/owner fields in visible rows. |
| CRM | `views/crm/records/tables/all/AllRecordsTable.jsx` | Yes | `created` | `amount` | `pic` / creator meta | Mixed | `Total Value` by created month, quote count by created date | `Awarded`, `Pending Follow-up`, `Top Creator` | Quotation value over time is valid; awarded/follow-up/top creator are snapshot/user-aware. |
| Project | `views/project/manage/ProjectTable.jsx` | Yes | `award`, latest update date | `value` | `owner` / project leader | Mixed | `Total Value` by award month | `Active`, `Needs Update`, `Top Leader` | Award value trend is useful; active state, missing update, and top leader remain snapshot stats. |
| Catalog | `views/catalog/manage/CatalogTable.jsx` | Yes | `priceDate` | `latestPrice` | `createdBy` | Widget F | None for current 4-card set | `Items`, `Categories`, `Missing Supplier`, `Top Creator` | Catalog is master/completeness data; price date exists but current cards are not trend-shaped. |
| Staff | `views/staff/manage/StaffTable.js` | Yes | Not visible in table | No | Department/status fields | Widget F | None | `Staff`, `Active`, `Inactive`, `Top Department` | Staff roster stats are headcount/status snapshots. |
| Staff | `views/staff/manage/managestaff.js` | No | Not visible in table | No | Department/status fields | Needs stats first, likely Widget F | None | Future: same as `StaffTable.js` if this legacy table remains used | Same roster domain; do not add Widget E without hire/termination dates. |
| Staff | `views/staff/leaves/SectionAllLeaves.js` | Yes | `appliedAt`, leave period | `duration` days | `staff` | Mixed | `Leave Requests` by applied date, `Approved Days` by period/applied date | `Pending`, `Top Staff` | Request volume and approved leave days can be trended; pending and top staff are snapshots. |
| Staff | `views/staff/leaves/SectionViewAssignments.js` | No | `year` only | `totalDays`, `usedDays`, `remaining` | selected staff | Needs stats first, likely Widget F | None | Future: `Total Days`, `Used Days`, `Remaining`, `Leave Types` | Assignment rows are allocation snapshots by year, not event series. |
| Staff | `components/leave/LeaveRecordTable.js` | No | `appliedAt` | `duration` days | Current staff context only | Needs stats first, likely Mixed | `Leave Requests` by applied date, `Used Days` by applied/period date | Future: `Pending`, `Approved`, `Rejected`, `Used Days` | Personal leave history can support a small trend, but needs stats added first. |
| Staff | `views/staff/appraise/ViewAppraisal.js` | Yes | `createdAt`, `eventDate` | No score field in table | `staff`, `appraisalBy` | Widget F | None for current 4-card set | `Appraisals`, `Staff Covered`, current-year records, `Types` | Appraisal rows have dates, but existing useful cards are coverage/category snapshots. |
| Staff | `components/appraisal/AppraisalRecords.js` | No | `createdAt`, `eventDate` | No score field in table | `appraisedBy`, staff context | Needs stats first, likely Widget F | None until a score/rating metric exists | Future: `Records`, `Current Year`, `Types`, `Top Appraiser` | Feedback text records are not a good micro-chart target without a numeric measure. |
| Staff | `views/task-manager/TaskTable.js` | Yes | `createdAt`, `dueDate`, completion date meta | `daysLapsed` | Personal staff context only | Widget F | None for current 4-card set | `Tasks`, `Completed`, `Overdue`, `Avg Days Lapsed` | Dates exist, but current four cards are workload/status/aging snapshots. |
| Staff | `views/staff/tasks/AllTasks.js` | No | `createdAt`, `dueDate`, completion badge meta | `daysLapsed` | `staffName` | Needs stats first, likely Mixed | `Tasks` by created date if stats are added | Future: `Tasks`, `Completed`, `Overdue`, `Top Staff` | Cross-staff task table should be user-aware; only the volume card would justify Widget E. |
| Staff | `views/staff/activities/ActivityTable.jsx` | No | `date` timestamp | No | `user_code` | Needs stats first, likely Mixed | `Activities` by date/time | Future: `Activities`, `Top User`, `Latest Activity`, `Users Active` | Activity log is inherently time-series, but stats do not exist yet. |
| Request Tool | `views/request-tool/RequestTable.jsx` | Yes | `startDate`, `endDate` | `duration` days | `staff` | Widget F | None for current 4-card set | `Requests`, `Active Loans`, `Completed`, `Top Staff` | Dates are rental periods; current stats are utilization/status/user snapshots. |
| Feedback | `views/feedback/FeedbackTable.js` | Yes | `dateReported`, `actionDate` | No | `reportedBy` | Mixed | `Feedback` by reported date | `Pending`, `Fixed`, `Top Reporter` | Report arrival trend is useful; fix status and reporter leader are snapshots. |
| Users | `views/users/Users.js` | Yes | `created` | No | User/role/department fields | Widget F | None for current 4-card set | `Users`, `Active`, `Inactive`, `Without Role` | Admin user table is account-state data; created date exists but current stats are snapshots. |
| Client | `views/client/manage/components/ClientListTableCard.jsx` | No | Not visible in table | No | PIC fields | Needs stats first, likely Widget F | None | Future: `Clients`, `Active`, `With Branches`, `Missing PIC` | Client master table is completeness/status-oriented. |
| Client | `views/client/manage/components/PastPicCard.jsx` | No | Not visible in table | No | PIC/contact fields | Needs stats first, likely Widget F | None | Future: `Past PICs`, `With Email`, `With Mobile`, `Positions` | Past PIC records have no useful visible time/value series. |
| Client | `views/client/manage/ClientCompanyDetailPage.jsx` embedded branches/PICs | No | Not visible in embedded tables | No | PIC/contact fields | Needs stats first, likely Widget F | None | Future: `Branches`, `PICs`, `Missing Email`, `Missing Mobile` | Embedded client record sections are master data, not trends. |
| Templates | `views/templates/shared/TemplateProposalTable.jsx` | No | `dateCreated` | No | `createdBy` | Needs stats first, likely Widget F | None for initial stats | Future: `Templates`, `Languages`, `With Attachments`, `Top Creator` | Date exists, but template library value is coverage/completeness, not time-series. |
| Templates | `views/templates/list-training/TemplateTable.jsx` | No | `dateCreated` | duration field | `editedBy` | Needs stats first, likely Widget F | None for initial stats | Future: `Templates`, `Languages`, `HRD Programs`, `Top Editor` | Training templates are reusable master records; date trend would be low-value noise. |
| Templates | `views/templates/shared/TemplateProposalDetailPage.jsx` remarks/history section | No | `created_at` | No | `created_by_code` | Needs stats first, likely Widget F | None | Future: `Remarks`, `Authors`, `Latest Update`, `Attachments` | Embedded detail history can show recency, but four-card dashboard stats are probably overkill. |
| Templates | `views/templates/list-training/TrainingProposalDetailPage.jsx` remarks/schedule sections | No | `created_at`, schedule time | No | `created_by_code` | Needs stats first, likely Widget F | None | Future: `Remarks`, `Schedule Items`, `Authors`, `Latest Update` | Detail sections are supporting records; avoid micro-charts. |
| Meetings | `views/meetings/Meetings.jsx` | No | `meetingDate` | `pendingItems` count | No row owner | Needs stats first, likely Mixed | `Meetings` by meeting date | Future: `Meetings`, `Pending Items`, `Overdue Items`, `Meeting Types` | Meeting volume can trend; action risk/type cards are snapshots. |
| Meetings | `views/meetings/components/MeetingMinuteViewMode.jsx` action items | No | `dueDate`, `updated` | No | `pic` | Needs stats first, likely Widget F | None for initial stats | Future: `Action Items`, `Pending`, `Overdue`, `Top PIC` | Action item health is status/user-aware; trend is less important than due-state. |
| Procedure | `views/procedure/ProceduresList.jsx` | No | `date` | No | `createdBy` | Needs stats first, likely Widget F | None | Future: `Procedures`, `Categories`, `Top Creator`, `Recently Updated` | Procedure library is coverage/compliance data; date trend is not a primary dashboard stat. |
| Handbook | `views/handbook/components/HandbookAcknowledgementRecords.js` | No | `signedAt` | No | `fullName` | Needs stats first, likely Mixed | `Acknowledgements` by signed date | Future: `Acknowledgements`, `Unsigned`, `Latest Version`, `Recent Signatures` | Signatures over time are useful only if unsigned/expected-user data is also available. |
| System Admin | `views/system-admin/SystemAdminDashboard.jsx` schema scripts table | No | `lastRun` | No | No | Needs stats first, likely Widget F | None | Future: `Scripts`, `Synced`, `Changed`, `Failed` | Script list is current sync state; last run date alone should not force Widget E. |
| System Admin | `views/system-admin/SystemAdminDashboard.jsx` schema runs table | No | `started`, `finished` | `checked`, `changed` | `requestedBy` | Needs stats first, likely Mixed | `Runs` by started date, `Changed` by run date | Future: `Runs`, `Failed`, `Changed`, `Top Requester` | Run history is a real time-series if stats are added; status/requester cards stay Widget F. |

## Use Widget E Now

These can use Widget E immediately because the current filtered rows already expose the date and measure needed for a real series:

- `InvoiceTable.jsx`: `Invoices`, `Total Amount`
- `PoList.js`: `POs`, `Total Value`
- `VendorLoaTable.jsx`: `LOAs`, `Total Value`
- `PaymentTable.jsx`: `Requests`, `Total Amount`
- `PaymentHistoryTable.jsx`: `Payments`, `Total Paid`
- `PipelineEntriesRecords.jsx`: `Estimated Value`
- `InquiryRecords.jsx`: `Total Inquiries`
- `CallTable.jsx`: `Total Calls`
- `AllRecordsTable.jsx`: `Total Value`
- `ProjectTable.jsx`: `Total Value`
- `SectionAllLeaves.js`: `Leave Requests`, `Approved Days`
- `FeedbackTable.js`: `Feedback`

## Mixed E/F

Use Widget E only for the trend card(s), and Widget F for the remaining snapshot cards:

- Commercial: Invoice, Supplier PO, Vendor LOA
- Vendor: Payment Records, Payment History
- Marketing: Pipeline Entries, Inquiries, Call Records
- CRM: All Records
- Project: Project Table
- Staff: All Leaves
- Feedback

Future mixed candidates after stats are added:

- Staff: All Tasks, Activities, personal `LeaveRecordTable`
- Meetings: Meetings list
- Handbook: Acknowledgement Records, if expected unsigned users are available
- System Admin: schema runs table

## Use Widget F Only

Keep all current stats as Widget F:

- Commercial: Delivery Order, JD14
- Catalog: Catalog Table
- Staff: Manage Staff, Appraisal View, Task Manager personal table
- Request Tool
- Users

Use Widget F for initial future stats:

- Vendor List, Frozen Vendor
- Client List, Past PIC, Client Detail branches/PICs
- Templates tables and detail record sections
- Meeting action items
- Procedures
- System Admin schema scripts

## Needs Data Or Stats Added First

These tables currently do not have `StatsStrip` and should not be converted to Widget E/F until four important cards are defined:

- Vendor: Vendor List, Frozen Vendor
- Client: Client List, Past PIC, Client Detail embedded branches/PICs
- Marketing: Factory Table
- Templates: Proposal templates, training templates, detail remark/schedule sections
- Staff: All Tasks, Activities, personal LeaveRecordTable, AppraisalRecords
- Meetings: Meetings list, meeting action items
- Procedure: ProceduresList
- Handbook: Acknowledgement Records
- System Admin: schema scripts and schema runs

## Architecture Recommendation

Add widget selection at the stat item level:

```js
{
  key: 'total-calls',
  label: 'Total Calls',
  value: '124',
  sublabel: 'Visible call logs',
  widget: 'E',
  chart: {
    type: 'line',
    points: [{ label: '2026-05-01', value: 8 }],
  },
}
```

Then let `StatCard` dispatch:

- `widget === 'E'` and `chart.points.length >= 2`: render `CWidgetStatsE`.
- Everything else: render `CWidgetStatsF`.

This keeps the four-card rules intact and avoids making user/owner/status cards look like fake trends.

## Validation Notes

- Inventory was verified with `rg` for `StatsStrip`, `DataTableRecordList`, `DataTableEmbeddedList`, and `DataTableMatrix`.
- Production `DataTableMatrix` usage was not found outside component internals/tests.
- Widget E candidates listed above can be derived from visible/filtered row data.
- No backend endpoint or broader fetch is required for the current Widget E candidates.
- Existing four-card stats remain intact; only card rendering would change in a later implementation pass.
- This assessment intentionally excludes invoice/detail/form line-item tables and modal pricing/review tables.

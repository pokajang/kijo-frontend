# Dashboard Stats Above Data Tables

## Goal

Add compact, high-signal dashboard stats above table-heavy modules. Each strip must answer:

- How much work/value is in the current table scope?
- What needs attention?
- Which staff/user owns or produced the most important share, where the table has a reliable staff/user field?

The stats stay in the module page above the data table. They are not a replacement for full dashboard pages, trend charts, or cross-module executive reporting.

## Current Architecture

The shared stats UI already exists:

```text
frontend/src/components/stats/StatsStrip.jsx
frontend/src/components/stats/StatCard.jsx
frontend/src/components/stats/index.js
frontend/src/utils/stats/formatStats.js
frontend/src/scss/custom/_stats.scss
```

`StatCard` renders CoreUI native `CWidgetStatsF`. Keep that. Do not reintroduce custom card markup.

Current helper coverage:

- `formatCount(value)`
- `formatMoney(value)`
- `formatPercent(value)`
- `parseMoneyValue(value)`
- `countByPredicate(rows, predicate)`
- `sumBy(rows, getter)`
- `getMostCommonValue(rows, getter)`

Add these helper utilities before the user-aware pass:

```text
getTopGroupByCount(rows, groupGetter)
getTopGroupBySum(rows, groupGetter, valueGetter)
normalizeGroupLabel(value)
```

Expected return shape:

```js
{
  value: 'AB',
  count: 12,
  total: 12500,
}
```

For count-only modules, use `count`. For money/value modules, prefer `total` and include `count` in the sublabel.

## Strict Card Rules

Every stats strip should render exactly 4 cards.

Card order:

1. `Scope`: total count or total value of the current row set.
2. `Business Value`: money total, closed/won value, or completed work.
3. `Attention`: pending, overdue, open, rejected, low stock, missing owner, or similar operational risk.
4. `User-Aware`: top staff/user/PIC/owner/requester/approver/creator by the most important measure.

If a module has no reliable staff/user field, do not invent one. Use the fourth card for the next strongest business metric and write the module note as `No reliable user field in current rows`.

Avoid noise stats:

- Do not use cards for weak data-quality facts unless the module itself is master data/compliance, such as vendor, staff, client, catalog, users, or handbook.
- Do not show both `Open` and `Pending` unless they mean clearly different work states.
- Do not show both total count and this-month count unless time scope is central to the module.
- Do not show `Top Source`, `Top Service`, `Categories`, `Roles`, or `Departments` when a reliable user-aware metric is available and more useful.
- Do not show `Unknown` as the top user unless unknown ownership itself is the risk. Prefer `Unassigned` only for assignment/ownership modules.

## Data Scope Rules

- Derive stats from the same filtered rows rendered by the table.
- If the table is server-paginated and only has one page, mark the metric as page-scoped unless an existing summary payload is available.
- Stats must respect search, filters, active tab, role visibility, and row ownership rules.
- Never fetch broader data just to make a stat more impressive.
- Never expose staff/user totals for rows hidden from the current user.

## User-Aware Metric Rules

Use the field already present in the normalized/table row whenever possible.

Preferred field order by concept:

- Creator/issuer: `createdByCode`, `created_by_name_code`, `created_by_code`, `created_by`, `issuedBy`, `preparedBy`.
- Owner/PIC: `ownerStaffCode`, `ownerStaffDisplay`, `owner`, `projectLeader`, `award_by`, `pic`, `personInCharge`.
- Requester/approver: `requestedBy`, `created_by_name_code`, `approved_by`, `approvedByCode`.
- Staff records: `staffName`, `staff_code`, `name_code`, `full_name`.

Metric priority:

- Money/value modules: top user by summed value, sublabel includes count.
- Workload modules: top user by count, sublabel includes count and context.
- Approval modules: top requester/approver by amount when amount exists; otherwise by count.
- Ownership modules: top owner by count, or unassigned count if missing ownership is the main risk.

Label examples:

- `Top Issuer`
- `Top Creator`
- `Top Owner`
- `Top PIC`
- `Top Requester`
- `Top Approver`
- `Top Caller`
- `Top Reporter`

Sublabel examples:

- `RM 42,000.00 across 8 invoices`
- `14 projects`
- `37 calls`
- `6 pending actions`

## Implementation Template

For each affected module:

1. Locate the final filtered rows passed to `DataTableRecordList`, `DataTableEmbeddedList`, `DataTableMatrix`, or `CTable`.
2. Keep one `useMemo` named `statsItems` near the row normalization/filtering code.
3. Return exactly four stat items.
4. Replace low-value cards from the earlier pass with a user-aware card when a reliable user field exists.
5. Prefer existing local formatters and status helpers.
6. Guard all numeric parsing with `Number.isFinite`.
7. Use `formatMoney`, `formatCount`, and the new group helpers for consistency.
8. Do not change filtering, sorting, pagination, exports, row actions, access control, or API payload contracts.
9. Do not add backend endpoints in this pass.
10. Do not add chart libraries or new dependencies.

## Module Card Plan

### Commercial: Invoice

Files:

- `frontend/src/views/commercial/invoice/InvoiceTable.jsx`

Cards:

- `Invoices`: count of filtered invoices.
- `Total Amount`: sum of `total`.
- `Unpaid`: count with unpaid/pending status, sublabel unpaid amount.
- `Top PIC`: top `pic` by invoice amount, sublabel count of invoices.

Notes:

- Current rows expose client PIC, not a clear internal issuer. Use `pic` only if it represents the accountable person in this table. If backend exposes issuer/creator later, switch this card to `Top Issuer`.
- Drop the separate `Paid` card from the earlier pass.
- Drop `Overdue` only if unpaid is the stronger attention metric for this module; otherwise replace `Unpaid` with `Overdue`.

### Commercial: Delivery Order

Files:

- `frontend/src/views/commercial/delivery-order/DeliveryOrder.js`

Cards:

- `Delivery Orders`: count of filtered orders.
- `Issued`: count issued/completed.
- `Upcoming`: count future/upcoming deliveries.
- `Top PIC`: top staff/PIC/creator field available in the normalized row.

Notes:

- If no staff/PIC/creator field exists, use `Cancelled` as the fourth card and record `No reliable user field in current rows`.
- Do not keep both `Cancelled` and `This Month` unless the user-aware field is unavailable.

### Commercial: JD14

Files:

- `frontend/src/views/commercial/jd14/JD14Table.jsx`

Cards:

- `JD14 Forms`: count of filtered forms.
- `Completed`: count completed.
- `Ongoing`: count ongoing/current.
- `Top PIC`: top trainer/PIC/creator field available in the row.

Notes:

- If no staff/user field exists, use `Upcoming` as the fourth card.
- Drop `This Month` unless the date filter makes it more useful than `Upcoming`.

### Commercial: Vendor LOA

Files:

- `frontend/src/views/commercial/vendor-loa/VendorLoaTable.jsx`

Cards:

- `LOAs`: count of filtered LOA/payment rows.
- `Total Value`: sum amount.
- `Pending`: count pending/unpaid/approval-needed rows, sublabel pending amount.
- `Top Award By`: top `award_by` by amount, sublabel count of LOAs.

Notes:

- `VendorLoa.js` already filters by `award_by`, so use that as the user-aware field.
- Do not keep separate rejected/failed card unless it is more important than pending in live data.

### Commercial: Supplier PO

Files:

- `frontend/src/views/commercial/supplier-po/PoList.js`

Cards:

- `POs`: count of filtered POs.
- `Total Value`: sum PO amount.
- `Pending`: count open/pending, sublabel pending amount if available.
- `Top Creator`: top creator/requester/user field by PO amount.

Notes:

- If creator/requester is unavailable, use `Top Supplier` by amount as the fourth card.

### Vendor: Payment Records

Files:

- `frontend/src/views/vendor/payment-records/PaymentTable.jsx`

Cards:

- `Requests`: count of filtered payment requests.
- `Total Amount`: sum `amount`.
- `Pending Approval`: count pending, sublabel pending amount.
- `Top Requester`: top `created_by_name_code` by amount, sublabel count of requests.

Notes:

- Current rows include `created_by_name_code` in requested display/search. Use that.
- Drop average approval time from this strip. It is useful but less actionable than requester/value ownership in four cards.

### Vendor: Pay Vendors

Files:

- `frontend/src/views/vendor/pay/PaymentHistoryTable.jsx`

Cards:

- `Payments`: count of visible payment history rows.
- `Total Paid`: sum paid/approved amount.
- `Pending`: count pending, sublabel pending amount.
- `Top Vendor`: vendor with highest paid/approved amount.

Notes:

- If requester/approver fields exist in the row, replace `Top Vendor` with `Top Approver` or `Top Requester`.
- If the page is scoped to one vendor, the top vendor card is redundant; use `Rejected` or `Top Requester`.

### Vendor: Manage Vendors

Files:

- `frontend/src/views/vendor/manage/ManageVendor.js`
- `frontend/src/views/vendor/manage/VendorListTable.js`
- `frontend/src/views/vendor/manage/FrozenVendorTable.jsx`

Cards:

- `Vendors`: count active/current vendors.
- `Frozen`: count frozen vendors.
- `Missing Contact`: count missing phone/email/contact person.
- `Top Category`: most common vendor category.

Notes:

- This is master-data/compliance, so data-quality stats are allowed.
- No user-aware card unless rows expose creator/owner reliably.

### Marketing: Pipeline Entries

Files:

- `frontend/src/views/marketing/pipeline/PipelineEntriesRecords.jsx`

Cards:

- `Estimated Value`: sum `estimatedRm`.
- `Qualified/Proposal`: count qualified/proposal, sublabel estimated value.
- `Closed`: count closed, sublabel estimated value.
- `Top Owner`: top `ownerStaffCode` by estimated value, sublabel entry count.

Notes:

- Replace `Entries` with `Estimated Value` as the first card. Value is more important than raw volume here.
- Current code already has `ownerStaffCode`; upgrade `Top Owner` from count-based to value-based.

### Marketing: Inquiries

Files:

- `frontend/src/views/marketing/inquiries/InquiryRecords.jsx`

Cards:

- `Inquiries`: count of filtered inquiries.
- `Open`: count not converted/lost/closed.
- `Quote Created`: count with quote-created/converted status.
- `Top PIC`: top `ownerStaffDisplay` by inquiry count.

Notes:

- Replace `Top Source` and `Top Service` from the earlier pass; those are filter dimensions, not primary stats.
- If no owner exists, use `Unassigned` count as the attention card and keep `Top Source` only as fallback.

### Marketing: Call Records

Files:

- `frontend/src/views/marketing/records/CallTable.jsx`

Cards:

- `Contacts`: count visible contacts.
- `Total Calls`: sum calls across visible contacts.
- `Follow-up Needed`: count follow-up/open outcome rows.
- `Top Caller`: top caller by total call count, not just contact count.

Notes:

- Remove the legacy `CallStatistics` block from this page. The table now owns the inline four-card stats strip.
- Do not keep `Latest Outcome` as a card if only four cards are allowed.

### Marketing: Find Clients

Files:

- `frontend/src/views/marketing/find/CallList.jsx`
- `frontend/src/views/marketing/find/FactoryTable.jsx`

Cards:

- `Prospects`: count current filtered factories.
- `Callable`: count with usable phone/mobile.
- `With Email`: count with email.
- `Top Owner`: top assigned staff/caller/creator if row exposes one.

Notes:

- If there is no reliable user field, use `With Phone` and record `No reliable user field in current rows`.
- This module is prospecting-focused, so contactability is not noise.

### CRM: Quotation Records

Files:

- `frontend/src/views/crm/records/tables/all/AllRecordsTable.jsx`
- `frontend/src/views/crm/records/tables/service/ServiceConfiguredRecordsTable.jsx`

Cards:

- `Total Value`: sum `__tableMeta.amountValue`.
- `Awarded`: count awarded/success, sublabel awarded value.
- `Pending Follow-up`: count open records without follow-up.
- `Top Creator`: top `createdByCode` by quotation value, sublabel quote count.

Notes:

- Replace `Quotes` and `Average Age` from the current strip. Count and age are available in the table/filter UI, but the four-card strip should prioritize value, outcome, attention, and creator ownership.
- For service-specific server-paginated tables, use page-scoped stats unless an existing full summary exists.

### Proposal Templates

Files:

- `frontend/src/views/templates/shared/TemplateProposalTable.jsx`
- `frontend/src/views/templates/list-training/TemplateTable.jsx`
- `frontend/src/views/templates/list-ih/IhProposals.jsx`
- `frontend/src/views/templates/list-manpower/ManpowerProposals.jsx`
- `frontend/src/views/templates/list-special/SpecialProposals.jsx`

Cards:

- `Proposals`: count filtered proposals.
- `Approved/Sent`: count approved/sent/completed.
- `Draft/Pending`: count draft/pending.
- `Top Creator`: top created-by staff code by proposal count.

Notes:

- Implement in the shared table where possible.
- Avoid service-specific duplicate stats unless the shared row shape differs.

### Client Management

Files:

- `frontend/src/views/client/manage/ClientsList.js`
- `frontend/src/views/client/manage/components/ClientListTableCard.jsx`

Cards:

- `Companies`: count filtered clients.
- `Active`: count active clients.
- `Missing Contact`: count missing usable PIC/email/phone.
- `Top Owner`: top account owner/creator/PIC if reliable.

Notes:

- If no user ownership exists, use `PICs` as the fourth card.
- Data-quality stats are acceptable here because this is master data.

### Project Management

Files:

- `frontend/src/views/project/manage/ProjectTable.jsx`

Cards:

- `Total Value`: sum quote/project value.
- `Active`: count active/open projects.
- `Needs Update`: count missing/stale progress update.
- `Top Leader`: top `owner`/project leader by project value, sublabel project count.

Notes:

- Current rows expose `owner` through `getProjectLeaderCode(project)`.
- Replace the current `Projects` and `Closed` cards. They are less important than value, active workload, update risk, and leader ownership.
- Respect `my-tab`; stats must reflect only the tab rows.

### Project Detail: Profit/Loss

Files:

- `frontend/src/views/project/manage/ManageProjectModal/profit-loss/ProfitLossCard.jsx`
- `frontend/src/views/project/manage/ManageProjectModal/profit-loss/ProfitLossTable.jsx`

Cards:

- `Revenue`: project quote value.
- `Approved Cost`: approved/paid vendor payments plus approved expenses.
- `Projected Profit`: revenue minus costs.
- `Top Expense By`: top `created_by_name_code` by manual expense amount.

Notes:

- This is detail-scoped, so stats summarize only the current project.
- If expenses do not have creator data, use `Pending Cost` as the fourth card.

### Project Detail: Progress

Files:

- `frontend/src/views/project/manage/ManageProjectModal/ProgressTrackerCard.jsx`

Cards:

- `Progress Items`: count progress tracker rows.
- `Completed`: count completed rows.
- `Open`: count not completed.
- `Top Owner`: top progress owner/PIC/creator if available.

Notes:

- If no owner/creator exists, use `Overdue` if due dates exist; otherwise skip stats for this detail section.

### Catalog: Equipment List

Files:

- `frontend/src/views/catalog/manage/CatalogTable.jsx`

Cards:

- `Items`: count catalog items.
- `Available`: count available/active items.
- `Low Stock`: count below reorder/minimum quantity, if quantity exists.
- `Top Supplier`: supplier with highest item count.

Notes:

- Catalog is master data, so supplier/category/data-quality cards are acceptable.
- If item creator/owner exists, use `Top Owner` instead of `Top Supplier`.

### Catalog: Supplier PO

Files:

- `frontend/src/views/catalog/supplier-po/SupplierPo.js`

Cards:

- `Supplier POs`: count rows.
- `Total Value`: sum PO value.
- `Pending`: count pending/open.
- `Top Requester`: top requester/creator by PO value.

Notes:

- If requester/creator is unavailable, use `Top Supplier` by PO value.

### Staff: Manage Staff

Files:

- `frontend/src/views/staff/manage/StaffTable.js`

Cards:

- `Staff`: count filtered staff.
- `Active`: count active staff.
- `Inactive`: count inactive/resigned staff.
- `Top Department`: department with highest active staff count.

Notes:

- This module is the staff master list; a user-aware `Top User` card is not meaningful.
- Drop `Missing Profile Data` unless profile completeness is a known workflow requirement.

### Staff: Tasks

Files:

- `frontend/src/views/task-manager/TaskTable.js`
- `frontend/src/views/staff/tasks/AllTasks.js`

Cards:

- `Tasks`: count filtered tasks.
- `Completed`: count completed.
- `Overdue`: count where `getStatusText` returns overdue.
- `Top Assignee`: top assigned staff/user by open task count.

Notes:

- If assignment field is unavailable, use `Average Days Lapsed` as the fourth card.
- Use existing `getStatusText` and `calculateDaysLapsed` definitions.

### Staff: KPI

Files:

- `frontend/src/features/kpi/self/KpiTracker.js`
- `frontend/src/features/kpi/self/KpiParametersManager.js`
- `frontend/src/features/kpi/staff/ManageKpi.jsx`

Cards:

- `KPIs`: count KPI rows.
- `Completed`: count at/above target.
- `Behind`: count below expected progress.
- `Top Staff`: in staff/admin KPI views, top staff by average achievement or completed KPI count.

Notes:

- For self KPI pages, the user-aware card is redundant; use `Average Achievement` instead.
- Do not overload `KpiWorkspace` header.

### Staff: Leaves

Files:

- `frontend/src/views/staff/leaves/SectionAllLeaves.js`
- `frontend/src/components/leave/LeaveRecordTable.js`

Cards:

- `Leave Requests`: count filtered records.
- `Pending`: count pending approval/review.
- `Approved Days`: sum approved leave days.
- `Top Staff`: staff with highest approved/requested days, sublabel request count.

Notes:

- Respect leave type/status filters and role visibility.
- If only the current user's leaves are visible, use `Remaining Days` or `Rejected/Cancelled` instead of `Top Staff`.

### Staff: Activities

Files:

- `frontend/src/views/staff/activities/ActivityTable.jsx`

Cards:

- `Activities`: count filtered rows.
- `Today`: count today.
- `This Week`: count this week.
- `Top Staff`: staff with highest activity count.

Notes:

- This is monitoring-oriented; top action is less important than top staff.

### Staff: Appraisal

Files:

- `frontend/src/components/appraisal/AppraisalRecords.js`
- `frontend/src/views/staff/appraise/ViewAppraisal.js`

Cards:

- `Appraisals`: count records.
- `Completed`: count finalized/completed.
- `Pending`: count pending review/submission.
- `Top Staff`: staff with highest completed count or highest visible average score.

Notes:

- Only show score-based stats when scores are already visible to the current role.

### Meetings

Files:

- `frontend/src/views/meetings/Meetings.jsx`
- `frontend/src/views/meetings/components/MeetingMinuteViewMode.jsx`

Cards:

- `Meetings`: count filtered meetings.
- `Pending Actions`: sum pending action items.
- `Overdue Actions`: count overdue action items.
- `Top PIC`: PIC with highest pending action count.

Notes:

- Current meeting action rows include `picCode`/`picName` in several paths; use that when available.

### Procedure

Files:

- `frontend/src/views/procedure/ProceduresList.jsx`

Cards:

- `Procedures`: count filtered procedures.
- `Active`: count active/current.
- `Review Due`: count past/near review date.
- `Top Owner`: top owner/department/PIC by procedure count.

Notes:

- If owner/PIC is not reliable, use `Draft` as the fourth card.

### Request Tool

Files:

- `frontend/src/views/request-tool/RequestTable.jsx`

Cards:

- `Requests`: count filtered requests.
- `Active Loans`: count currently active loans.
- `Returned`: count returned/completed.
- `Top Staff`: staff with highest active/request count.

Notes:

- Request rows have staff context; use that for the user-aware card.
- Do not keep `Total Duration` in the four-card strip unless staff is unavailable.

### Feedback

Files:

- `frontend/src/views/feedback/FeedbackTable.js`

Cards:

- `Feedback`: count filtered feedback.
- `Pending`: count pending/unfixed.
- `Fixed`: count fixed/resolved.
- `Top Reporter`: reporter with highest feedback count.

Notes:

- Non-admin users must only see stats from rows they are allowed to view.
- Drop `Average Resolution Time` from the four-card strip unless reporter is unavailable.

### Handbook

Files:

- `frontend/src/views/handbook/components/HandbookAcknowledgementRecords.js`
- `frontend/src/views/handbook/components/HandbookChangeLog.js`

Cards:

- `Staff`: count acknowledgement rows.
- `Acknowledged`: count signed/acknowledged.
- `Pending`: count not acknowledged.
- `Completion Rate`: acknowledged divided by total.

Notes:

- This is compliance tracking. A top-user card is not useful on acknowledgement rows because each row is a user.
- For change log tables, use `Changes`, `Recent Changes`, `Top Editor`, and `Latest Change` if editor data exists.

### Users

Files:

- `frontend/src/views/users/Users.js`

Cards:

- `Users`: count system users.
- `Active`: count active users.
- `Inactive`: count inactive/disabled users.
- `Without Role`: count missing role assignment.

Notes:

- This is access-control master data. A user-aware top-user card is not meaningful.
- Keep role visibility consistent with access control.

### System Admin

Files:

- `frontend/src/views/system-admin/SystemAdminDashboard.jsx`

Cards:

- `Scripts`: count script rows.
- `Enabled`: count enabled scripts.
- `Failures`: count failed runs.
- `Top Requester`: top `requestedBy` by run count.

Notes:

- Use section-level stats above each table, not one global strip unless the data scope matches.
- Current run rows expose `requestedBy`.

## Implementation Order

1. Add group helper utilities in `frontend/src/utils/stats/formatStats.js`.
2. Update the already-touched high-value modules to exactly four cards:
   - `InvoiceTable.jsx`
   - `PaymentTable.jsx`
   - `PipelineEntriesRecords.jsx`
   - `InquiryRecords.jsx`
   - `AllRecordsTable.jsx`
   - `ProjectTable.jsx`
   - `SectionAllLeaves.js`
   - `TaskTable.js`
   - `FeedbackTable.js`
3. Update remaining commercial/vendor/support modules.
4. Add stats to skipped modules only when rows and placement are clear.

## Verification

Run from `frontend`:

```text
npx eslint src/components/stats src/utils/stats
npm run test:run
npm run build
npm run datatable:audit
npm run qa:tables
```

If full `npm run lint` still fails on unrelated pre-existing formatting issues, record the exact files and keep focused lint clean for touched files.

## Final Pass Notes To Record

At the end of implementation, record:

- Modules completed.
- Modules skipped and exact reason.
- Cards changed from the earlier generic-stat pass.
- Which modules are page-scoped.
- Which modules have no reliable user-aware field.
- Verification commands and results.

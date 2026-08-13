# IH Invoice Calculation Metadata and Vendor-Payment Lifecycle

Use this note only for the coordinated release that introduces authoritative
IH invoice totals, typed invoice lines, advisory invoice editing, and the
expanded vendor-payment lifecycle. This is a financial release with two
migrations and is not eligible for the routine deployment path.

## Compatibility and deployment order

Deploy the backend first, run and verify both migrations, then publish the
committed frontend build immediately afterward.

The backend remains compatible during rollout:

- Previous invoice clients that omit `sst_percent` retain SST because the
  backend derives the rate from their submitted SST amount and grand total and
  rejects inconsistent totals.
- Previous invoice clients that cannot display the new over-project prompt may
  submit successfully; the backend records an explicit compatibility reason,
  the acting staff member, and the acknowledgement time.
- Cached clients that already submit `sst_percent` remain on the current
  contract and still receive the guided over-project prompt even if they omit
  `calculation_version`.
- Previous vendor-payment clients that omit `idempotency_key` receive a unique
  server-generated key. Current clients retain retry deduplication through
  their stable client-generated key.

Keep the backend-first/frontend-immediately-after window short and ask active
commercial users to reload after the frontend is published.

## Backup and preflight

Take a restorable full database backup using the approved hosting procedure.
At minimum it must cover:

- `migrations`
- `invoices`
- `invoice_breakdown`
- `vendor_payments`
- `vendor_payment_transactions`, if it already exists
- `vendor_payment_events`, if it already exists

Store the backup outside both Git working copies. Record the production commit
SHAs, backup location, table counts, and the following financial fingerprints:

```sql
SELECT COUNT(*) AS invoices,
       ROUND(COALESCE(SUM(amount), 0), 2) AS gross_total,
       ROUND(COALESCE(SUM(sst_amount), 0), 2) AS sst_total,
       ROUND(COALESCE(SUM(grand_total), 0), 2) AS grand_total
FROM invoices;

SELECT COUNT(*) AS breakdown_rows,
       ROUND(COALESCE(SUM(subtotal), 0), 2) AS breakdown_total
FROM invoice_breakdown;

SELECT COUNT(*) AS vendor_payments,
       ROUND(COALESCE(SUM(amount), 0), 2) AS requested_total
FROM vendor_payments;
```

Review `php artisan migrate:status` and stop if any unrelated migration is
pending. Do not replace the targeted migration commands with an unrestricted
migration command unless every pending migration is deliberately approved.

## Targeted migrations

```bash
cd ~/kijo-laravel

php artisan migrate \
  --path=database/migrations/2026_08_13_090000_expand_vendor_payment_lifecycle.php \
  --force

php artisan migrate \
  --path=database/migrations/2026_08_13_120000_add_invoice_calculation_metadata.php \
  --force

php artisan migrate:status | grep 2026_08_13
```

The vendor-payment migration adds lifecycle/audit columns and the transaction
and event tables. It does not rewrite existing payment amounts or statuses.

The invoice migration adds calculation metadata and classifies existing
breakdown lines in chunks of 500. It changes only new metadata columns:

- negative lines or labels containing `discount`/`less` become `discount`;
- SST and percentage-HRD labels become `tax`;
- travel and mobilization labels become `travel`;
- remaining historical lines become `custom`;
- existing invoices receive `calculation_version = legacy_snapshot`.

It does not change quantities, unit prices, subtotals, SST amounts, grand
totals, invoice status, or payment values.

## Post-migration verification

Re-run the three fingerprints above and require exact equality. Then verify:

```sql
SELECT calculation_version, COUNT(*) AS invoices
FROM invoices
GROUP BY calculation_version
ORDER BY calculation_version;

SELECT line_type, COUNT(*) AS rows_count
FROM invoice_breakdown
GROUP BY line_type
ORDER BY line_type;

SELECT COUNT(*) AS missing_invoice_versions
FROM invoices
WHERE calculation_version IS NULL;

SELECT COUNT(*) AS missing_line_types
FROM invoice_breakdown
WHERE line_type IS NULL OR TRIM(line_type) = '';
```

Both missing counts must be zero. Investigate unexpected classifications; do
not rewrite financial fields to make a classification appear consistent.

After publishing the frontend, verify with approved disposable records:

1. Current and legacy IH quote -> project -> invoice totals reconcile.
2. Discount is deducted once and SST is calculated after discount.
3. An unpaid invoice can be edited; a paid invoice clearly locks financials.
4. Invoice and receipt PDFs match stored totals.
5. Vendor-payment create, edit, return/resubmit, approval, partial/full
   payment, reversal, and audit history follow the configured permissions.
6. Browser console and authenticated API requests remain error-free.

## Cache rebuild

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Rollback

Prefer reverting the frontend and backend application commits while retaining
the additive columns and lifecycle tables. The previous applications ignore
the new metadata.

Do not run migration rollback after any new vendor-payment transaction,
reversal, resubmission, invoice creation, or invoice edit: rolling back would
delete audit/lifecycle data and typed-line metadata. A database restore is safe
only for an immediate full-release rollback when it is confirmed that no
affected write occurred after the backup. Otherwise, preserve the data and use
a reviewed forward correction.

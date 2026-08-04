# Receivable Payment Ledger and Legacy Payment Backfill

Use this note only for the release that introduces partial debtor payments,
payment reversals, and structured receivable audit events. This is a coordinated
backend/frontend financial release and is not eligible for the routine
deployment path.

## Deployment order

1. Record the current frontend and backend production commits.
2. Take the required database backup.
3. Deploy the backend, run the two targeted migrations, and complete the
   guarded legacy-payment backfill.
4. Verify the backend and then publish the frontend build.
5. Run the authenticated Debtors payment smoke test.

Deploy the backend first because the new frontend calls the receivable payment
ledger endpoints. The backend retains compatibility for the previous paid/open
actions while the frontend release is in progress.

## Backup and preflight

Take a restorable full database backup using the approved cPanel/hosting
procedure. At minimum, the backup must cover `migrations`, `invoices`, and
`manual_debtors`. Record where the backup is stored and verify that it is not
inside either Git working copy.

Before migrating, confirm that production has no unexpected pending migration:

```bash
cd ~/kijo-laravel
git rev-parse HEAD
php artisan migrate:status
```

Stop if unrelated migrations are pending. Do not replace the targeted commands
below with an unrestricted `php artisan migrate --force` unless every pending
migration has been deliberately approved for the same release.

## Targeted migrations

```bash
php artisan migrate \
  --path=database/migrations/2026_08_04_000000_create_receivable_payments_table.php \
  --force
php artisan migrate \
  --path=database/migrations/2026_08_04_001000_create_receivable_audit_events_table.php \
  --force
php artisan migrate:status
```

Confirm both migrations report `Ran` before continuing.

## Legacy-payment backfill

The command reads legacy `paid_amount` and `paid_date` values from `invoices`
and `manual_debtors`. Its default mode is read-only.

```bash
php artisan app:backfill-receivable-payments
```

Review and record every count:

- `candidates`: legacy records containing a positive paid amount.
- `existing`: candidates already represented in the ledger.
- `invalid`, `overpaid`, or `cancelled`: unsafe records; stop and investigate.
- `mismatched`: valid partial legacy payments; review the listed records before
  approving the write.
- `inserted`: remains zero during a dry run.

Do not use `--commit` if any unsafe count is non-zero or if a listed record is
not understood. After approval, run:

```bash
php artisan app:backfill-receivable-payments --commit
php artisan app:backfill-receivable-payments
```

On the final dry run, `inserted`, `invalid`, `overpaid`, `cancelled`, and
`mismatched` should be zero, and every valid candidate should be counted as
`existing`.

## Cache rebuild and verification

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Before publishing the frontend, confirm:

- `https://api.amiosh.com/auth/session` responds without a server error.
- An authenticated Debtors list request succeeds.
- A known legacy paid receivable shows the same paid and outstanding totals as
  before deployment.
- The application log contains no migration, ledger, or backfill exception.

After publishing the committed frontend `build/`, use a disposable manual
debtor to verify partial payment, final settlement, payment history, and
cleanup. Confirm there are no browser console errors or failed API requests.

## Rollback

Prefer reverting the frontend and backend application commits while retaining
the ledger tables and their financial history. Do not run migration rollback or
drop either ledger table after users have recorded payments.

A database restore is appropriate only for an immediate full-release rollback
when it has been confirmed that no receivable payment, reversal, debtor edit,
or deletion occurred after the backup. Otherwise, stop and prepare a reviewed
forward correction that preserves the audit trail.

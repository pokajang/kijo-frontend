# Salary Declaration History and Email Delivery Tracking

Use this note only for the coordinated release that introduces immutable salary
declarations, snapshots existing salary applications, and tracks salary workflow
email delivery through the queue and mail transport.

## Release Contents

Backend migrations, in this order:

```text
database/migrations/2026_09_04_090000_create_salary_profile_declaration_history.php
database/migrations/2026_09_04_140000_backfill_legacy_salary_application_profile_snapshots.php
database/migrations/2026_09_04_150000_add_delivery_status_to_hr_salary_email_deliveries.php
```

The first migration creates append-only salary declaration tables, adds the
application snapshot column, and copies each current legacy profile and its
recurring allowances into an initial declaration. The second migration fills
only missing application snapshots from the values stored on each historical
salary application; it does not infer an old declaration from the employee's
current salary setting. The third migration adds delivery lifecycle fields and
marks earlier email reservation rows as `untracked`, because those rows prove
queueing but not SMTP acceptance.

This release also includes the matching Salary frontend and backend behavior.
Deploy the backend and migrations before publishing the frontend build.

## Preconditions

- Enable frontend maintenance mode.
- Record the frontend and backend commit IDs used for rollback.
- Back up `hr_salary_profiles`, `hr_salary_recurring_allowances`,
  `hr_salary_applications`, and `hr_salary_email_deliveries` together with the
  Laravel migrations table.
- Confirm the production queue worker is supervised and consumes the queue in
  `SALARY_EMAIL_QUEUE` (`default` unless intentionally changed).
- Confirm the server-owned mail configuration uses a delivering SMTP transport.
  Do not copy a local `.env` or the example environment file to production.

Before restarting a stopped worker, inspect the `jobs` and `failed_jobs` tables.
Do not start it blindly when historical mail is queued; doing so can deliver
every stale message. Resolve whether those jobs should be processed or removed
through an approved operational decision.

## Deployment

Review all pending migrations first, then apply only this release's migrations
if it is being deployed independently:

```bash
cd ~/kijo-laravel

php artisan migrate:status
php artisan migrate \
  --path=database/migrations/2026_09_04_090000_create_salary_profile_declaration_history.php \
  --force
php artisan migrate \
  --path=database/migrations/2026_09_04_140000_backfill_legacy_salary_application_profile_snapshots.php \
  --force
php artisan migrate \
  --path=database/migrations/2026_09_04_150000_add_delivery_status_to_hr_salary_email_deliveries.php \
  --force

php artisan migrate:status | grep -E '2026_09_04_(090000|140000|150000)'
```

Install backend dependencies and rebuild Laravel caches using the comprehensive
runbook. After the queue backlog has been reviewed, restart the worker and run:

```bash
php artisan queue:restart
php artisan queue:failed
php artisan salary:email-health
```

`salary:email-health` may warn about legacy `untracked` reservations. That
warning is expected after the migration. A failed or stale delivery, missing
tracking schema, invalid mail configuration, unreachable SMTP endpoint, or
stale queued mail is a deployment stop.

Build and deploy the frontend using an explicit production API base. The
production workflow expects the fresh `build/` output to be committed unless a
verified server-side Node build is used.

## Verification

- Open Salary Settings and confirm historical declarations remain visible after
  saving a newer effective-month declaration.
- Select a past salary month and confirm the latest declaration effective on or
  before that month is used.
- Open a pre-release salary application and confirm it shows a legacy record
  snapshot based on that record's stored salary values, not today's setting.
- Create a disposable draft and submitted salary application, then confirm each
  stores the declaration snapshot used for its salary month.
- Withdraw a non-draft application with a reason and confirm the record and its
  workflow history remain viewable as Cancelled. Confirm a Draft can still be
  deleted permanently through the guarded delete action.
- Confirm a workflow email progresses from `queued` to `processing` and `sent`
  after SMTP accepts it. Force a disposable transport failure and confirm the
  delivery becomes `retrying` and finally `failed` according to the worker
  retry policy.
- If an approved recipient is available, run
  `php artisan salary:email-health --probe-to=<controlled-address>` and confirm
  receipt. The command proves transport handoff only; recipient confirmation is
  still required.

## Rollback

Prefer reverting the frontend and backend application commits while retaining
the additive declaration, snapshot, and delivery-audit data. Earlier
applications ignore the new tables and columns.

Do not run these migrations down after users have saved declarations or after
new applications have stored snapshots. Rolling them back deletes declaration
history and clears legacy snapshot data. A database rollback therefore requires
the pre-deployment backup and an explicit retention decision. If application
rollback is required, clear Laravel caches, restart the queue worker on the
rolled-back code, deploy the matching previous frontend build, and repeat the
Salary read-only smoke checks before leaving maintenance mode.

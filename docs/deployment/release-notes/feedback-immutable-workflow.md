# Feedback Immutable Workflow and History Backfill

Use this note only for the coordinated release that introduces the two-way
feedback workflow and this backend migration:

```text
database/migrations/2026_08_06_000000_create_system_feedback_history.php
```

The release adds immutable feedback activity, reporter/developer comments,
reporter-only resolution confirmation, stored notification badges, and queued
email notifications. It is a coordinated backend/frontend release. Deploy the
backend and complete the migration verification before publishing the frontend
build.

## Preconditions and backup

1. Put the approved backend and frontend commits in the deployment record.
2. Confirm no unrelated production migration is being bundled accidentally.
3. Take and verify a production database backup containing at minimum:
   - `system_feedbacks`;
   - `migrations`;
   - `in_app_notifications`.
4. Record the backup location and restore procedure outside the repository.
5. Confirm the existing database queue worker or approved cPanel queue runner is
   healthy. Feedback emails use `QUEUE_CONNECTION=database`.

Do not proceed without the backup. The migration backfills every existing
feedback ticket and the migration rollback drops the new audit history.

## Read-only production preflight

From `~/kijo-laravel`:

```bash
git status --short
git rev-parse HEAD
php artisan migrate:status | grep 2026_08_06_000000_create_system_feedback_history

php artisan tinker --execute="dump([
    'feedbacks' => DB::table('system_feedbacks')->count(),
]);"
```

Record the feedback count. The new migration must be `Pending`. Review the full
`php artisan migrate:status` output and stop if an unrelated migration would be
applied by the standard migration command.

## Backend deployment and exact migration

```bash
cd ~/kijo-laravel
git pull --ff-only origin main
php ~/composer.phar install --no-dev --optimize-autoloader

php artisan migrate \
  --path=database/migrations/2026_08_06_000000_create_system_feedback_history.php \
  --force
```

Run the migration only once. It performs this intentional automatic baseline:

- one `report_received` event for every existing feedback;
- one additional `legacy_state_imported` event when the current record contains
  later state that cannot be reconstructed accurately;
- no invented transition dates or actors.

## Mandatory post-migration verification

```bash
php artisan migrate:status | grep 2026_08_06_000000_create_system_feedback_history

php artisan tinker --execute="dump([
    'feedbacks' => DB::table('system_feedbacks')->count(),
    'history_rows' => DB::table('system_feedback_history')->count(),
    'feedbacks_with_history' => DB::table('system_feedback_history')->distinct()->count('feedback_id'),
    'missing_history' => DB::table('system_feedbacks as f')
        ->leftJoin('system_feedback_history as h', 'h.feedback_id', '=', 'f.id')
        ->whereNull('h.id')
        ->count(),
    'report_received' => DB::table('system_feedback_history')->where('event_type', 'report_received')->count(),
    'legacy_state_imported' => DB::table('system_feedback_history')->where('event_type', 'legacy_state_imported')->count(),
]);"
```

Required results:

- migration status is `Ran`;
- the feedback count matches the recorded pre-migration count;
- `feedbacks_with_history` equals the feedback count;
- `missing_history` is `0`;
- `report_received` equals the feedback count;
- `history_rows` equals `report_received + legacy_state_imported`.

Stop deployment if any invariant fails. Preserve the backup and investigate;
do not insert guessed repair history directly in production.

After verification:

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
```

Confirm a queue worker resumes and processes database jobs without failures.

## Frontend deployment

Deploy the committed production build immediately after the backend is healthy:

```bash
cd ~/kijo-frontend
git pull --ff-only origin main

FRONTEND_DOCROOT=~/public_html/kijo.amiosh.com
test "$FRONTEND_DOCROOT" = "$HOME/public_html/kijo.amiosh.com"
rm -rf "$FRONTEND_DOCROOT"/*
cp -a ~/kijo-frontend/build/. "$FRONTEND_DOCROOT"/
```

The path equality check must succeed before removing existing document-root
contents.

## Post-deploy smoke

Use an approved reporter and System Admin account:

1. Reporter submits a clearly labelled production smoke ticket.
2. Confirm the System Admin receives the bell, Support sidebar, Feedback tab,
   and email notification.
3. Admin comments, changes triage, and marks the ticket `Fixed Completed`.
4. Confirm the reporter receives notifications and can reject with a reason.
5. Admin submits a second fix; reporter confirms it as `Resolved`.
6. Confirm the timeline remains chronological, the ticket cannot be deleted,
   and the accepted `fixed_at` remains populated.
7. Confirm queued mail jobs are processed and no new failed job is present.

Do not run `npm run e2e:feedback-workflow` against production. The committed
Playwright gate has a hard loopback-only guard and is intended for an isolated
local database.

## Rollback

Prefer application rollback while retaining the additive feedback history
table and columns. The previous application ignores them.

Do not run `migrate:rollback` after users have created workflow activity: the
migration `down()` drops `system_feedback_history` and would destroy the audit
trail. If the migration fails before the frontend is published and before any
new activity exists, restore the verified pre-release database backup and roll
back both application commits. Clear/rebuild Laravel caches and restore the
previous frontend build after any application rollback.

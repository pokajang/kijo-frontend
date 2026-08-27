# Production Deployment Runbook

Operational notes for deploying KijoV2 from GitHub to the current shared cPanel hosting setup.

This is the comprehensive path for normal and high-risk releases. For an
isolated, low-risk UI adjustment or narrowly scoped correction, begin with
[ROUTINE_DEPLOYMENT.md](ROUTINE_DEPLOYMENT.md). Its eligibility gate determines
whether the fast path is appropriate.

Use this comprehensive runbook whenever a release includes migrations,
backfills, dependencies, routes, production configuration, authentication,
authorization, queues, scheduled work, sensitive data, or a broad impact.

## Current Hosting Shape

Production is on shared cPanel hosting with jailed SSH. cPanel creates subdomain document roots under `public_html/`, while the Git working copies live directly under the account home/root area.

Public domains:

- Frontend app: `https://kijo.amiosh.com`
- Laravel API: `https://api.amiosh.com`

Server working copies:

- Frontend repo working copy: `~/kijo-frontend`
- Backend Laravel repo working copy: `~/kijo-laravel`

Local working copies:

- Frontend repo: `C:\laragon\www\kijoV2\frontend`
- Backend repo: `C:\laragon\www\kijoV2\backend-laravel`

Git repositories:

- Frontend: `https://github.com/pokajang/kijo-frontend.git`
- Backend: `https://github.com/pokajang/kijo-backend.git`
- Production branch: `main`

The workspace root `C:\laragon\www\kijoV2` is not a Git repo. Treat `frontend/` and `backend-laravel/` as separate repos.

## Document Roots

Frontend:

- `kijo.amiosh.com` currently serves from the cPanel document root `~/public_html/kijo.amiosh.com`.
- The frontend repo working copy remains `~/kijo-frontend`.
- Production frontend deployment should pull `~/kijo-frontend`, then sync the committed `~/kijo-frontend/build/` contents into `~/public_html/kijo.amiosh.com/`.

Backend:

- `api.amiosh.com` must serve Laravel from `~/kijo-laravel/public`.
- If cPanel requires the API subdomain folder to live under `public_html/`, route or symlink that document root to `~/kijo-laravel/public`.
- Do not point the API domain at the Laravel project root.

Do not deploy `archive/backend-legacy/` as an active runtime.

## Shared Hosting SSH Notes

The cPanel terminal is jailed SSH. Composer may not be available as a normal global `composer` command. On this host, Composer may need to be run through a PHAR file.

Common pattern:

```bash
php ~/composer.phar install --no-dev --optimize-autoloader
```

Before deployment, confirm the host-specific commands:

```bash
which php
which composer
find ~ -maxdepth 3 -name 'composer*.phar' 2>/dev/null
```

Use the PHP binary and Composer PHAR supported by the hosting account. The current host has Composer at `~/composer.phar`, so use the full PHAR path from any project directory. Do not commit `composer.phar` into either repo unless that workflow is intentionally approved.

## Frontend Release Workflow

Because the live server pulls the full `kijo-frontend` repo and production serves `~/kijo-frontend/build`, the build output must be available on the server after pull.

Use one of these two workflows consistently:

- Preferred if Node is reliable on the server: pull source on the server, run `npm ci`, then `npm run build` on the server.
- Preferred if Node is not reliable on shared hosting: build locally, commit the updated `build/` output, push, then pull on the server.

Current setup expects the frontend repo to include `build/`, so production frontend releases should include a fresh local build unless the server build workflow is confirmed.

Local frontend release steps:

```bash
cd C:\laragon\www\kijoV2\frontend
npm ci
npm run lint
npm run test:run
npm run guard:api-routes
npm run build
npm run guard:api-routes
git status --short
git add README.md docs src scripts build public/meta.json package.json package-lock.json vite.config.mjs
git commit -m "Describe frontend release"
git push origin main
```

Only add the files intentionally changed for the release. If `build/` is committed, expect hashed asset filename churn.

Server frontend pull/deploy template:

```bash
cd ~/kijo-frontend
git pull --ff-only origin main

FRONTEND_DOCROOT=~/public_html/kijo.amiosh.com
rm -rf "$FRONTEND_DOCROOT"/*
cp -a ~/kijo-frontend/build/. "$FRONTEND_DOCROOT"/
```

Confirm `FRONTEND_DOCROOT` is exactly the intended cPanel document root before
running the removal command.

If the server builds the frontend instead of using committed build artifacts:

```bash
cd ~/kijo-frontend
npm ci
npm run build
FRONTEND_DOCROOT=~/public_html/kijo.amiosh.com
rm -rf "$FRONTEND_DOCROOT"/*
cp -a ~/kijo-frontend/build/. "$FRONTEND_DOCROOT"/
```

Confirm:

- `https://kijo.amiosh.com` loads the latest SPA.
- Browser DevTools console has no runtime errors.
- Network tab has no failed app/API requests during login and dashboard load.

## Backend Release Workflow

The Laravel app lives in `~/kijo-laravel` and is served through `https://api.amiosh.com`.

The production `.env` is server-only. Never overwrite it from local. Never commit secrets, database credentials, SMTP credentials, API keys, or production `.env` values.

Local backend preflight:

```bash
cd C:\laragon\www\kijoV2\backend-laravel
composer install
composer audit
php artisan test
php artisan route:list
git status --short
git add app config database routes resources composer.json composer.lock
git commit -m "Describe backend release"
git push origin main
```

Adjust `git add` to the actual changed files. Do not add `.env`, logs, local cache files, SQL dumps, or local uploads.

Server backend pull/deploy template:

```bash
cd ~/kijo-laravel
git pull --ff-only origin main

php ~/composer.phar install --no-dev --optimize-autoloader

# Take the release's required database backup and review pending migrations.
php artisan migrate:status
php artisan migrate --force

# Run release-specific backfills here. Always dry-run first, then commit/run.
# Use only the release note explicitly linked for this deployment.

php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache
```

The workload dashboard depends on task classification metadata. Run `tasks:reclassify` after migrations on releases that add or change task scoring/classification fields. The command defaults to `--limit=500`, so use an explicit limit high enough for the production task table or repeat it until the dry run reports no remaining changes. Add `--ai` only when production intentionally enables workload AI classification and has a queue worker/process available.

## Backend Scheduler

Production must run the Laravel scheduler for daily workload snapshots, workload snapshot health checks, monthly dashboard report scheduling, salary/other-claim workflow digests, notification pruning, and reminder jobs.

Confirm the cPanel cron entry after backend deployment:

```bash
* * * * * cd ~/kijo-laravel && php artisan schedule:run >> /dev/null 2>&1
```

If the host requires a specific PHP binary, use that binary instead of the generic `php`. Do not schedule individual workload commands separately unless temporarily repairing production; let `schedule:run` own the recurring jobs.

Current scheduler-dependent release jobs:

- `dashboard:monthly-report --scheduled` every five minutes.
- `salary:send-workflow-digest` daily at 09:00.
- `workload:capture-daily` daily at 23:55.
- `workload:check-daily-capture` daily at 00:30.
- `workload:prune-snapshot-payloads` weekly on Monday at 03:40.

## Release-Specific Migrations and Backfills

Backfills are not part of the reusable deployment checklist unless the release
explicitly requires one. Identify them during local review and link the exact
release note before pushing.

The coordinated IH invoice calculation and vendor-payment lifecycle release
must follow
[its release-specific migration and rollback note](deployment/release-notes/ih-invoice-and-vendor-payment-lifecycle.md).

The archived procedures and their prerequisites live in
[deployment/release-notes/README.md](deployment/release-notes/README.md). Do not
run an archived command solely because it is documented there.

For every applicable data operation:

- Take the required production backup before an irreversible schema or data change.
- Run migration status, read-only checks, or dry runs first.
- Review counts and output before the write or `--commit` command.
- Repeat the dry run or verification query afterward.
- Record unexpected or unresolved rows instead of silently ignoring them.
- Keep repair/inference backfills out of migrations unless the release design
  intentionally requires an automatic transactional transformation.

### Quotation and Equipment Commercial-Cycle DOCX Export

The DOCX export is a coordinated backend and frontend release. It adds the
`phpoffice/phpword` Composer dependency and authenticated Word routes for all
quotation services plus the Equipment commercial documents:

- `GET quote-records/{training|equipment|ih|manpower|special}/{id}/word`
- `GET catalog/purchase-orders/{poId}/word`
- `GET delivery-orders/{id}/word`
- `GET invoices/{id}/word`
- `GET invoices/{id}/receipt-word`

The invoice and receipt Word routes are intentionally limited to records whose
service type is `Equipment` or `Equipment Supply`; unsupported service types
return HTTP 422 and the frontend does not expose those Word actions. PDF
invoice and receipt behavior remains unchanged for every service type.

It adds no migration, backfill, queue, scheduler entry, or special Artisan
command. Receipt PDF and Word generation use the same transactional receipt
number allocator; test paid-receipt generation on a production-safe record.

Before deployment, confirm the production PHP CLI used by Composer and Laravel
has the extensions required by PHPWord, including XMLWriter:

```bash
cd ~/kijo-laravel
php -r "foreach (['dom','gd','zip','xml','xmlwriter'] as \$extension) { echo \$extension.': '.(extension_loaded(\$extension) ? 'yes' : 'NO').PHP_EOL; }"
php -r "echo 'temp directory: '.sys_get_temp_dir().PHP_EOL.'writable: '.(is_writable(sys_get_temp_dir()) ? 'yes' : 'NO').PHP_EOL;"
php ~/composer.phar check-platform-reqs
```

Any `NO` result is a release stop. Enable the missing extension for the same
PHP runtime that serves `api.amiosh.com`, and confirm the temporary directory is
writable before deploying.

Deploy the backend first, run the normal cache-clear/cache-rebuild commands,
and verify the new route is present:

```bash
php ~/composer.phar install --no-dev --optimize-autoloader
php artisan route:list --path=word --method=GET
```

Then deploy a fresh frontend production build. With authorized test records,
verify each quotation service and Supplier PO, Delivery Order, Invoice, and paid
Receipt download a non-empty `.docx` whose filename uses its commercial
reference and which opens without a repair warning. Confirm client/vendor data,
line items, totals, terms, header, footer, language variants, and quotation
approval behavior. Also confirm Generate PDF still works for the same records.

Special proposals created in Write mode are emitted as native Word content.
Special proposals supplied as uploaded PDFs remain external PDF sources: the
DOCX includes an explicit attachment notice and captured filenames because
embedding PDF/OLE content is not reliably portable across Microsoft Word,
LibreOffice, WPS, macOS, mobile, and browser processors.

The automated browser UAT intercepts API responses and does not replace this
integrated post-deploy smoke. Microsoft Word rendering is part of the local
release gate. LibreOffice and WPS rendering should be recorded separately when
those applications are available.

Rollback requires reverting the coordinated frontend and backend application
commits, running Composer install for the restored lock file, rebuilding the
frontend, and clearing/rebuilding Laravel caches. No database rollback is
required.

### Legacy Quotation Estimated-Cost Compatibility (2026-08-14)

This coordinated backend and frontend release prevents the current cost policy
from retroactively blocking genuine legacy Training, Equipment, and Manpower
quotations. Eligibility is deliberately narrow: the service must be one of
those three, the stored traffic-light version and estimated total cost must both
be blank, and the quotation must predate the configured service cutoff.
Independent commercial triggers still apply, including Training discounts or
special pricing and Manpower management approval.

Quotation users continue to own the cost field. New/current quotation forms
require a positive cost as ordinary form input. Saving a valid quotation is not
blocked by its resulting traffic-light outcome: yellow/red quotations save and
then enter the existing approval workflow. Approval blocks issuance only.

For a normal grandfathered quotation, Generate PDF presents one decision with
**Generate PDF**, **Edit quotation**, and **Cancel**. Editing requires a
positive cost and moves the quote to the current policy. A malformed
current-policy quote offers **Edit quotation** and **Cancel**, with no staged
cost-request workflow. This release does not alter Generate Word behavior.

There is no migration, dependency, scheduler entry, or recurring command. The
release adds a read-only audit command and a guarded reconciliation command.
Reconciliation preserves superseded approval history and commercially
unchanged valid approval decisions, and requires an exact fingerprint from a
fresh per-service preview before it writes.

Before deployment:

- Back up `quotes_training`, `quotes_equipment`, `quotes_manpower`,
  `quote_approval_requests`, and `in_app_notifications`.
- Confirm the backend and frontend commits belong to the same release.
- Record current approval state for known affected quotations.
- Deploy the backend first and the fresh frontend build immediately afterward.

After pulling the backend and installing production dependencies, refresh the
Laravel caches and confirm both commands are registered:

```bash
cd ~/kijo-laravel

php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache

php artisan list --raw | grep -E \
  '^quotes:(audit-legacy-cost-policy|reconcile-legacy-cost-approvals)'
```

Retain the complete read-only audit, then preview each service separately. Each
preview prints the service-specific confirmation fingerprint needed for its
write:

```bash
php artisan quotes:audit-legacy-cost-policy \
  | tee "$HOME/legacy-cost-policy-audit.txt"

php artisan quotes:reconcile-legacy-cost-approvals --service=training \
  | tee "$HOME/legacy-cost-training-preview.txt"
php artisan quotes:reconcile-legacy-cost-approvals --service=equipment \
  | tee "$HOME/legacy-cost-equipment-preview.txt"
php artisan quotes:reconcile-legacy-cost-approvals --service=manpower \
  | tee "$HOME/legacy-cost-manpower-preview.txt"
```

Stop if a preview contains unexpected quotations, omits a known affected
quotation, removes a genuine approval trigger, or classifies a normal legacy
quotation as requiring approval. Never enter or infer historical costs during
deployment.

After review, copy each fresh fingerprint exactly into its matching command:

```bash
php artisan quotes:reconcile-legacy-cost-approvals \
  --service=training --commit --confirm='<TRAINING_FINGERPRINT>'
php artisan quotes:reconcile-legacy-cost-approvals \
  --service=equipment --commit --confirm='<EQUIPMENT_FINGERPRINT>'
php artisan quotes:reconcile-legacy-cost-approvals \
  --service=manpower --commit --confirm='<MANPOWER_FINGERPRINT>'
```

A changed candidate set makes the fingerprint stale and the write fails closed;
run a new preview instead of reusing it. An unchanged approval fingerprint is
idempotent and does not create a duplicate. Previous incorrect approval rows
remain non-current and auditable.

Deploy the frontend production build, then smoke-check all three services:

- Create a green, yellow, and red current quotation. Confirm each valid quote
  saves, and only yellow/red issuance waits for the correct approval.
- Generate a normal grandfathered PDF. Confirm Cancel is harmless, Edit opens
  the quote, and Generate PDF succeeds after the single acknowledgement.
- Edit a grandfathered quote. Confirm the migration explanation appears and the
  form requires a positive cost before saving.
- Confirm a grandfathered quote with a genuine independent trigger stays
  blocked for the correct HOD/BD approval and does not offer legacy generation.
- Confirm a malformed current-policy quote offers Edit and Cancel directly,
  without a Generate PDF action or another recovery stage.
- Confirm one failed PDF action produces one error surface.

There is no destructive data rollback command. Roll back frontend and backend
together and repeat normal cache/build deployment steps if required. Do not
delete reconciled approval rows because they are audit history. The older
backend may classify an unedited legacy quote as missing-cost red on its next
evaluation, so coordinate rollback with quotation and approval owners. Restore
the backup only for a verified data-integrity problem.

### Receivable Payment Lifecycle Navigation and Audit History

The debtor lifecycle release adds Outstanding, Partially Paid, Paid,
Cancelled, and All views; keeps settled records discoverable; and exposes the
existing payment and reversal audit history. It is a coordinated frontend and
backend release because the frontend relies on the backend's lifecycle filters
and `hasPaymentHistory` response.

This change adds no migration, dependency, backfill, queue, scheduler, or
special Artisan command. It relies on the existing receivable-ledger migrations
introduced by the preceding payment-ledger release:

```text
database/migrations/2026_08_04_000000_create_receivable_payments_table.php
database/migrations/2026_08_04_001000_create_receivable_audit_events_table.php
```

Confirm both migrations are marked `Ran`, then use the standard
`php artisan migrate --force` and cache-clear/cache-rebuild sequence from the
backend release workflow. Deploy the backend first and the fresh frontend build
immediately afterward. No receivable data rewrite is required.

Post-deploy, verify that a partially paid record appears under Partially Paid,
a fully settled record moves to Paid, its complete payment history remains
available, and reversing a settlement returns it to Outstanding. Perform any
write-path smoke only with an approved disposable record; the committed debtor
lifecycle E2E creates and removes its own local fixture and must not be pointed
at production.

### React Router Security Audit Applicability (2026-08-05)

This release pins `react-router-dom` to `7.18.2`. `npm audit` may still report
`GHSA-qwww-vcr4-c8h2` using registry metadata that marks React Router 7.12.0
through 8.2.0 as affected. The upstream maintainer's
[security advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2)
now lists `7.18.2` and `8.3.0` as patched versions.

The advisory applies only to applications using React Router's unstable React
Server Components APIs. Kijo is a browser-rendered Vite SPA and contains none
of those RSC APIs, so the affected request path is not present in this
deployment. Do not force the audit's suggested downgrade to 7.11.0 solely to
silence stale registry metadata. Recheck the installed version and upstream
advisory on each release.

This dependency adjustment requires the normal fresh `npm ci` and committed
frontend build. It adds no backend command or environment change.

### Vendor Payment Workflow Visibility and Stage Actions

The vendor-payment workflow visibility release is a coordinated backend and
frontend deployment. The backend returns the saved Review, Approval, and
Finance flow plus record-specific action permissions; the frontend uses that
contract for the table summary, workflow dialog, detail timeline, and action
buttons.

This release adds no migration, backfill, dependency, scheduler entry, queue
command, or special Artisan command. The required vendor-payment columns and
workflow tables already belong to these existing migrations:

```text
database/migrations/2026_05_28_220000_harden_vendor_payment_workflow.php
database/migrations/2026_05_28_230000_create_vendor_payment_workflow_settings.php
```

Use the normal backend deployment commands. Confirm both migrations are marked
`Ran`; if either is pending, the standard forced migration applies it:

```bash
cd ~/kijo-laravel
php artisan migrate:status | grep -E '2026_05_28_(220000|230000)'
php artisan migrate --force

php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Deploy the backend first, then immediately deploy a fresh frontend build. No
workflow data rewrite is required: saved workflow snapshots remain authoritative
for submitted payments, while legacy records without snapshots use the current
workflow configuration.

The committed Playwright smoke is read-only. It logs in through the real UI,
selects an existing payment in the current table period, verifies the table,
dialog, responsive layout, action visibility, and detail route, and does not
click Review, Approve, Return, Reject, Mark Paid, or Delete:

```bash
cd ~/kijo-frontend
read -rsp "Smoke password: " SMOKE_PASSWORD
export SMOKE_PASSWORD
echo
FRONTEND_URL=https://kijo.amiosh.com \
SMOKE_EMAIL='authorized-smoke-account@example.com' \
npm run smoke:vendor-payment-workflow
unset SMOKE_PASSWORD
```

The smoke requires at least one vendor payment with workflow data in the
current table period. Evidence is written under
`test-results/vendor-payment-workflow-*` and must not be committed. A successful
release shows the current stage directly in the table, the complete configured
flow in the dialog and detail page, and only the actions authorized by the API.

There is no database rollback for this release. If application rollback is
needed, revert the frontend and backend application commits together and use
the standard cache-clear and frontend-build rollback procedures.

### IH Legacy Complexity Pricing Compatibility

The IH legacy-pricing compatibility release includes:

```text
database/migrations/2026_07_24_010000_version_ih_quote_pricing_rules.php
```

This is a financial-calculation migration and must use this comprehensive
runbook. It adds `quotes_ih.pricing_rule_version`, classifies existing records,
and defaults future quotations to `ih_standard_v2`. It does not rewrite unit
prices, discounts, SST, subtotals, grand totals, or complexity values.

Before deploying:

- Back up `quotes_ih`, `quotes_ih_items`, and the migration table.
- Review every pending migration. Do not unintentionally combine this release
  with unrelated pending migrations.
- Confirm the backend and frontend compatibility changes are in the same
  release. Deploying only one side can display or calculate legacy quotations
  incorrectly.

Production migration and audit:

```bash
cd ~/kijo-laravel

php artisan migrate:status
php artisan migrate \
  --path=database/migrations/2026_07_24_010000_version_ih_quote_pricing_rules.php \
  --force
php artisan migrate:status | grep 2026_07_24_010000_version_ih_quote_pricing_rules

# Read-only: compares stored legacy totals with the archived complexity formula.
php artisan quotes:audit-ih-legacy-pricing
```

Expected classification:

- Definite complexity records (`complexity_rating > 1` or non-zero
  `complexity_markup`) remain `ih_complexity_v1`.
- Records with V2 estimated-cost data or IH additional-fee rows become
  `ih_standard_v2`, unless already identified as definite legacy records.
- Remaining pre-existing records with legacy complexity columns remain
  `ih_complexity_v1`.
- Every quotation created after the migration defaults to `ih_standard_v2`.

The audit is read-only. A zero exit status means all audited rows match within
the default RM0.01 tolerance. A non-zero status with `review` rows is a release
stop: do not automatically rewrite contractual totals. Compare each row with
its issued quotation/PDF and archived inputs, record the decision, and correct
only a verified pricing-rule classification or restore the database backup.

Post-deploy smoke checks:

- Open and revise a legacy IH quote and confirm its complexity rating is shown
  read-only with the original multiplier.
- Save a non-pricing legacy revision and confirm its financial totals remain
  exactly unchanged.
- Change a pricing input on a test legacy revision and confirm the archived
  complexity formula is used.
- Regenerate its PDF and confirm the final total matches the stored contractual
  amount without exposing the internal calculation formula.
- Create a new IH quote and confirm complexity is absent while additional fees
  and the current V2 calculation remain available.
- Confirm a legacy quote without estimated cost follows its grandfathered
  approval basis, while new V2 quotes retain the current traffic-light policy.

For rollback, prefer reverting application commits while retaining the
additive `pricing_rule_version` column; the previous application ignores it.
Do not drop the column after new or revised quotations have used versioned
pricing. A database rollback requires the pre-migration backup and verification
that no quotation was created or revised after migration.

### IH Intermediate Standard-V1 Classification Follow-up

The follow-up release recognizes the unversioned intermediate IH flow as
`ih_standard_v1`. That rule ignores the retained complexity rating, excludes
additional-fee rows, and stores `sub_total` after discount. The repair changes
only `pricing_rule_version`; stored contractual amounts remain authoritative.

This is a coordinated frontend, backend, and financial-data release:

1. Back up `quotes_ih`, `quotes_ih_items`, and the migration table.
2. Deploy the backend compatibility code.
3. Deploy the frontend compatibility code and production build.
4. Run smoke checks before changing any classification.
5. Run the multi-rule audit and repair dry run.
6. Apply the repair only with the fingerprint from that fresh dry run.

Do not run the classification while either live application is still on code
that does not understand `ih_standard_v1`.

Read-only preflight:

```bash
cd ~/kijo-laravel

php artisan quotes:audit-ih-pricing-rules \
  | tee "$HOME/ih-pricing-rules-before.txt"

php artisan quotes:classify-ih-standard-v1 \
  | tee "$HOME/ih-standard-v1-dry-run.txt"

KIJO_IH_FINGERPRINT="$(
  sed -n "s/^Confirmation fingerprint: //p" \
    "$HOME/ih-standard-v1-dry-run.txt" \
    | tail -n 1
)"

test "${#KIJO_IH_FINGERPRINT}" -eq 64
```

Review all 28 dry-run rows, their expected rules, their unchanged grand totals,
and quote 68's documented RM0.40 precision variance before proceeding.

Commit:

```bash
php artisan quotes:classify-ih-standard-v1 \
  --commit \
  --confirm="$KIJO_IH_FINGERPRINT" \
  | tee "$HOME/ih-standard-v1-commit.txt"
```

The command:

- validates exactly 28 manifest records;
- checks IDs, references, stored subtotals, stored grand totals, and formula
  variance;
- confirms there are no additional-fee rows;
- locks all records in one transaction;
- requires the SHA-256 fingerprint of all relevant current pricing inputs;
- aborts the whole batch on any mismatch;
- updates only `pricing_rule_version`;
- explicitly preserves `updated_at`;
- is safe to rerun after a new dry run.

Post-repair verification:

```bash
php artisan quotes:audit-ih-pricing-rules \
  | tee "$HOME/ih-pricing-rules-after.txt"

php artisan quotes:audit-ih-legacy-pricing \
  | tee "$HOME/ih-legacy-after-standard-v1.txt"
```

Expected results:

- 71 quotes remain `ih_complexity_v1` and pass the legacy audit.
- 28 quotes are `ih_standard_v1`.
- Quote 68 remains exactly RM9,300.00 and is reported only as a documented
  historical variance.
- New quotations remain `ih_standard_v2`.

Smoke-test all three rule generations:

- Open and save non-pricing changes on one quote from each rule.
- Confirm all stored financial amounts remain exactly unchanged.
- Confirm complexity is applied only to `ih_complexity_v1`.
- Confirm additional fees are available only to `ih_standard_v2`.
- Generate representative PDFs and reconcile them to stored totals.
- Confirm invoice creation preserves historical precision variance as a
  contractual lump-sum line.

The browser lifecycle smoke now covers V2, legacy-complexity, and the
intermediate RM9,300 precision fixture. It also verifies that an unsaved V2
upgrade can be cancelled, a form save remains available after an external row
update and persists the submitted values, PDFs generate, and disposable
fixtures are removed. It intentionally refuses every non-loopback URL because
its fixture command operates on the locally configured backend.
Run it against an isolated backend and the production frontend build:

```bash
# Terminal 1: isolated backend with APP_ENV=local or testing
cd ~/kijo-laravel
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2: build and serve the production frontend bundle
cd ~/kijo-frontend
VITE_API_BASE=/proxy/ npm run build
VITE_PROXY_TARGET=http://127.0.0.1:8000 npm run serve

# Terminal 3: execute the destructive, self-cleaning fixture smoke
cd ~/kijo-frontend
read -rsp "Smoke password: " SMOKE_PASSWORD
export SMOKE_PASSWORD
echo
FRONTEND_URL=http://127.0.0.1:4173 \
SMOKE_EMAIL='authorized-smoke-account@example.com' \
npm run smoke:ih-pricing
unset SMOKE_PASSWORD
```

Do not place smoke credentials in Git, shell history, or the deployment
document. Never point this fixture smoke at production. Run it only with a
dedicated authorized account on disposable/anonymized data and review the
screenshots, PDFs, source revisions, and result JSON in the generated
`test-results/ih-pricing-flow-smoke-*` evidence.

The pricing audit has a machine-readable mode for release evidence:

```bash
php artisan quotes:audit-ih-pricing-rules --format=json \
  > "$HOME/ih-pricing-audit.json"
```

After classification, `summary.require_action` must be `0`. Any other value is
an active stop condition; inspect the listed quote IDs and resolve or document
them before deployment.

Run the combined automated release checks from the frontend repo:

```bash
npm run release:ih-readiness -- --automated-only
```

For the actual release gate, copy
`docs/ih-release-evidence.example.json` outside the repository, record an
evidence reference for every manual lifecycle gate, and run:

Follow [IH_RELEASE_VALIDATION.md](IH_RELEASE_VALIDATION.md) for the isolated
environment, PDF reconciliation, lifecycle, compatibility, and rollback
evidence procedure.

```bash
npm run release:ih-readiness -- \
  --with-database-audit \
  --with-smoke \
  --manual-evidence="$HOME/ih-release-evidence.json"
```

The database audit and browser smoke are opt-in so routine developer runs
cannot silently read the wrong database or create fixtures. A failed check
stops subsequent automated checks and names the remediation. Missing manual
evidence returns exit code 3 and is not release approval.

Lifecycle compatibility and remediation expectations:

- Deploy the backend first, followed immediately by the frontend.
- Create, edit, and revise remain normal form actions. They must not be blocked
  by quotation-version or row-timestamp comparisons.
- Older cached frontends remain compatible during rollout; obsolete extra
  fields are ignored and the submitted update is processed normally.
- A historical pricing-input change keeps stored totals until the user chooses
  `Continue and Recalculate`; `Restore Original Pricing` remains available.
- A V2 upgrade remains a browser preview until a successful save and provides
  `Cancel Upgrade`.
- If the quotation changes while a form is open, the subsequent valid save or
  revision remains allowed and the submitted form values become the latest
  saved state.
- `ESTIMATED_COST_REQUIRED` must focus the estimated-cost field and allow a
  return to historical pricing.
- PDF failure must not roll back a saved quote and must offer one active retry.
- An unknown pricing rule remains viewable and printable, but financial update
  is disabled until administrator repair.
- After deployment, clear application/config caches and ask active quotation
  users to reload once.

Rollback must reverse the data classification before rolling back either
application:

```bash
php artisan quotes:classify-ih-standard-v1 \
  --rollback \
  | tee "$HOME/ih-standard-v1-rollback-dry-run.txt"

KIJO_IH_ROLLBACK_FINGERPRINT="$(
  sed -n "s/^Confirmation fingerprint: //p" \
    "$HOME/ih-standard-v1-rollback-dry-run.txt" \
    | tail -n 1
)"

test "${#KIJO_IH_ROLLBACK_FINGERPRINT}" -eq 64

php artisan quotes:classify-ih-standard-v1 \
  --rollback \
  --commit \
  --confirm="$KIJO_IH_ROLLBACK_FINGERPRINT"
```

After verifying that all 28 records are back on `ih_complexity_v1` and their
financial fingerprints are unchanged, roll back the frontend and backend
commits and clear application caches. Restore the database backup only if the
guarded rollback cannot complete and after checking for quotations created
since the backup.

## Backend Post-Deploy Checks

Select checks based on the release impact. For a comprehensive backend release,
confirm at minimum:

- `https://api.amiosh.com/auth/session` gives the expected unauthenticated
  response rather than a server error.
- Login from `https://kijo.amiosh.com` succeeds.
- Authenticated requests use `https://api.amiosh.com`.
- Private files are available only through authenticated Laravel routes.
- Every release-specific migration or backfill verification has the expected result.
- The affected authenticated API and UI workflows succeed.

## Production Environment Notes

Frontend production API base should target the API subdomain, for example:

```ini
VITE_API_BASE=https://api.amiosh.com/
```

Backend production `.env` should be server-only and use production-safe values:

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.amiosh.com
APP_FRONTEND_URL=https://kijo.amiosh.com
SESSION_DRIVER=database
SESSION_HTTP_ONLY=true
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
MAIL_MAILER=smtp
MAIL_FROM_ADDRESS=kijo@work.amiosh.com
MAIL_FROM_NAME="Kijo Alert"
QUEUE_CONNECTION=database
WORKLOAD_AI_CLASSIFICATION_ENABLED=false
OPENAI_API_KEY=
WORKLOAD_AI_CLASSIFICATION_MODEL=gpt-5-nano
WORKLOAD_AI_CLASSIFICATION_TIMEOUT_MS=30000
```

Use the default system sender (`MAIL_FROM_ADDRESS`) for application emails such as password reset, reminders, and alerts. Keep `info.admin@amiosh.com` only in the dedicated `QUOTE_MAIL_*` settings for quotation/PDF emails.

Workload AI classification is optional. Leave `WORKLOAD_AI_CLASSIFICATION_ENABLED=false` unless the production account has an approved OpenAI API key and a reliable Laravel queue worker or scheduled queue runner; otherwise the local rules and `tasks:reclassify` backfill are sufficient.

Do not place real secret values in this document.

## Files Not To Commit Or Deploy

Do not commit or deploy:

- `.env` files containing real secrets
- SQL dumps or database backups
- local logs
- local `tmp/` files
- generated smoke-test reports
- root `uploads/`
- `archive/backend-legacy/` as active production runtime
- cPanel-generated private account files

The production server should own:

- `~/kijo-laravel/.env`
- Laravel `storage/`
- production upload/private-file contents
- cPanel subdomain configuration

## Smoke Test Checklist

After frontend and backend pulls:

- Open `https://kijo.amiosh.com`.
- Log in with an authorized test account.
- Check DevTools Console: no red runtime errors.
- Check DevTools Network: no failed app/API requests.
- Visit dashboard, Sport Time, proposal template detail, project detail, invoice list, staff tasks, and system admin dashboard.
- Confirm API requests go to `https://api.amiosh.com`.
- Confirm private file/image links load only while authenticated.

For local smoke testing, use:

```bash
cd C:\laragon\www\kijoV2\backend-laravel
php artisan serve --host=127.0.0.1 --port=8000

cd C:\laragon\www\kijoV2\frontend
$env:VITE_API_BASE = '/proxy/'
npm run build
$env:VITE_PROXY_TARGET = 'http://127.0.0.1:8000'
npm run serve

# In a third terminal, after both servers are ready:
$smokeCredential = Get-Credential -UserName 'authorized-local-account@example.com'
$env:SMOKE_EMAIL = $smokeCredential.UserName
$env:SMOKE_PASSWORD = $smokeCredential.GetNetworkCredential().Password
$env:FRONTEND_URL = 'http://127.0.0.1:4173'
npm run smoke:ih-pricing
Remove-Item Env:SMOKE_EMAIL, Env:SMOKE_PASSWORD, Env:FRONTEND_URL
```

The `/proxy/` build above is only for isolated local smoke testing. After the
smoke passes, clear `VITE_API_BASE` and `VITE_PROXY_TARGET`, then run the normal
production build again so committed assets target `https://api.amiosh.com/`.

Local `.env` can keep:

```ini
VITE_API_BASE=/proxy/
```

Production should not use `/proxy/`.

## Rollback

Frontend rollback:

- Revert or reset `~/kijo-frontend` to the previous known-good commit.
- If the build is committed, the previous `build/` output returns with that commit.
- If the server builds, rerun `npm ci` and `npm run build` after checkout.

Backend rollback:

- Revert or reset `~/kijo-laravel` to the previous known-good commit.
- Preserve the server `.env`.
- Run:

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
```

Database rollback requires the database backup taken before `php artisan migrate --force`.

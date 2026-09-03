# Routine Production Deployment

Fast path for isolated, low-risk KijoV2 changes. This is still a production
deployment: review the diff, publish only intended files, and verify the
affected behavior.

For infrastructure details, high-risk releases, recovery, or troubleshooting,
use [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

## Eligibility Gate

Use this routine only when every answer below is **no**:

- Does the release add or change a database migration, schema, seed, or backfill?
- Does it change a dependency or lockfile (`package-lock.json`, `composer.lock`)?
- Does it change authentication, authorization, permissions, sessions, or private files?
- Does it change routes, production environment values, configuration, queues, cron, or the scheduler?
- Does it affect payments, financial calculations, destructive operations, or sensitive data?
- Does it alter shared application behavior across several unrelated workflows?
- Is the change difficult to reverse or impossible to verify with a focused smoke test?

If any answer is **yes**, or the impact is uncertain, stop and use
[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

The IH legacy complexity-pricing compatibility release is explicitly not a
routine deployment. It includes
`2026_07_24_010000_version_ih_quote_pricing_rules.php`, changes financial
calculation routing, and requires a database backup plus the read-only
`quotes:audit-ih-legacy-pricing` verification. Follow
[IH Legacy Complexity Pricing Compatibility](PRODUCTION_DEPLOYMENT.md#ih-legacy-complexity-pricing-compatibility)
in the comprehensive runbook.

## Before Every Routine Deployment

- Confirm whether the change belongs to `frontend/` or `backend-laravel/`; they
  are separate Git repositories.
- Review the diff and repository status. Do not include unrelated local work.
- Add only the intended files. Never commit `.env`, secrets, logs, SQL dumps,
  uploads, caches, or temporary files.
- Note the current production commit before pulling so that the release can be
  reversed quickly.

## Routine Frontend Deployment

Use this for copy, styling, layout, and isolated frontend behavior corrections.

### Local verification and release

```bash
cd C:\laragon\www\kijoV2\frontend

# Run the focused test when the changed component or behavior has one.
npm run lint
npm run build

git status --short
git diff --check
git add <changed-source-files> build
git diff --cached
git commit -m "Describe the routine frontend change"
git push origin main
```

Also run `npm run guard:api-routes` when API URLs, request construction, proxy
behavior, or API-facing code changed. Run `npm run test:run` when shared frontend
logic changed or a focused test cannot provide enough confidence.

The current production workflow expects a fresh committed `build/`. Do not omit
it merely because the source change is small.

### Simple production pull + deploy

```bash
cd ~/kijo-frontend
git rev-parse HEAD
git pull --ff-only origin main

FRONTEND_DOCROOT=~/public_html/kijo.amiosh.com
bash scripts/deploy-frontend.sh
```

The deployment script validates that `FRONTEND_DOCROOT` is exactly
`~/public_html/kijo.amiosh.com`, enables the standalone maintenance page,
replaces the live files, and restores the production routing rules only after
the copy succeeds. If deployment stops after maintenance mode is enabled, the
maintenance page remains active; fix the error and rerun the command.

### Focused smoke test

- Open the affected page at `https://kijo.amiosh.com` and verify the change.
- Check the browser console for new runtime errors.
- Check the Network panel for failed page or API requests.
- If the change affects an authenticated view, test it while logged in.

## Routine Backend Deployment

Use this only for an isolated correction with no dependency, route,
configuration, migration, authorization, or sensitive-data impact. A small diff
is not automatically low risk.

### Local verification and release

```bash
cd C:\laragon\www\kijoV2\backend-laravel

# Run the narrowest relevant test; use the full suite if impact is not isolated.
php artisan test --filter=<RelevantTestOrFeature>

git status --short
git diff --check
git add <changed-files>
git diff --cached
git commit -m "Describe the routine backend correction"
git push origin main
```

For a changed PHP file that is not exercised by the focused test, run
`php -l path/to/ChangedFile.php` before committing. If no meaningful focused
test exists, run the relevant test file or the full `php artisan test` suite.

### Simple production pull + deploy

```bash
cd ~/kijo-frontend
FRONTEND_DOCROOT=~/public_html/kijo.amiosh.com \
  bash scripts/deploy-frontend.sh maintenance-on

cd ~/kijo-laravel
git rev-parse HEAD
git pull --ff-only origin main

php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

cd ~/kijo-frontend
FRONTEND_DOCROOT=~/public_html/kijo.amiosh.com \
  bash scripts/deploy-frontend.sh maintenance-off
```

If any backend step fails, do not run `maintenance-off`; leave the maintenance
page active until the failure is corrected or the release is rolled back.

Do not run Composer, migrations, or a backfill through this fast path. Their
presence means the release must use the comprehensive production runbook.
In particular, do not apply the IH pricing-rule migration or run any manual
legacy quote correction from this routine path.

### Focused smoke test

- Exercise the corrected endpoint or workflow.
- Confirm the response and relevant persisted data are correct.
- Check for a new server error or unexpected authorization response.
- If the correction is consumed by the frontend, verify the affected UI flow.

## Escalate During Deployment

Stop using the routine path and switch to the comprehensive runbook when:

- `git pull --ff-only` fails or production contains unexpected changes.
- The build, cache rebuild, or focused verification fails.
- Production behavior differs from local behavior.
- An unexpected migration, dependency, configuration, or data task is discovered.
- Rollback or manual data repair may be required.

Do not improvise a migration, backfill, force-push, hard reset, or production
data correction from this routine guide.

## Rollback

Use the recorded previous commit and follow the appropriate rollback procedure
in [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md#rollback). Database
rollback is outside the routine path.

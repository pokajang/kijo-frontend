# IH Quotation Release Validation

This runbook validates the coordinated frontend, backend, and IH pricing-rule
release without changing production data. The final release gate requires real
evidence; do not mark a check as passed based only on unit tests.

## 1. Isolated environment

Use a dedicated database and dedicated smoke users. Never reuse production
credentials or point the fixture smoke at a remote URL.

Before testing, record:

- environment name and database name;
- anonymized snapshot identifier and checksum;
- frontend and backend commit SHAs;
- validator and validation time;
- reset/restore command.

Disable outbound email, webhooks, payment integrations, and other external
side effects. Prove the reset procedure before starting lifecycle testing.

## 2. Install and automated preflight

```bash
cd backend-laravel
composer install
composer audit
php artisan test
php artisan route:list --except-vendor

cd ../frontend
npm ci
npm run release:ih-readiness -- --automated-only
```

The automated-only result must be `automated-passed`. It is not production
release approval.

## 3. Serve the production build

```bash
# Terminal 1
cd backend-laravel
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2
cd frontend
npm run build
VITE_PROXY_TARGET=http://127.0.0.1:8000 npm run serve

# Terminal 3
cd frontend
read -rsp "Smoke password: " SMOKE_PASSWORD
export SMOKE_PASSWORD
echo
FRONTEND_URL=http://127.0.0.1:4173 \
SMOKE_EMAIL='dedicated-smoke-account@example.com' \
npm run smoke:ih-pricing
unset SMOKE_PASSWORD
```

Review the smoke result JSON, screenshots, generated PDFs, source revisions,
and cleanup results. A failed cleanup requires restoring the isolated database
snapshot before another run.

## 4. PDF reconciliation

Visually inspect one PDF from each pricing rule:

| Rule | Required checks |
| --- | --- |
| `ih_complexity_v1` | Complexity basis, saved unit price, discount, SST, and contractual total |
| `ih_standard_v1` | No complexity calculation, saved unit price, documented precision variance, and contractual total |
| `ih_standard_v2` | No complexity calculation, additional-fee itemization, discount, SST, and contractual total |

Compare each PDF with the database record, review screen, and invoice
conversion. Generate PDFs before and after inspection and confirm that no
quotation field or timestamp changed.

## 5. Full lifecycle

Using disposable V2 data:

1. Create and reopen the quotation.
2. Save a non-pricing edit.
3. Create a pricing revision.
4. Trigger and complete the configured approval.
5. Confirm the official PDF is blocked before approval where required.
6. Generate the approved PDF.
7. Award the quotation and confirm project creation.
8. Create the invoice and verify pricing-rule metadata and line items.
9. Reconcile quote, project, invoice, discount, SST, and fee values.
10. Restore the isolated database snapshot after evidence is captured.

Also verify that a valid save after an external row update remains allowed and
persists the submitted form values. Verify missing estimated cost, cancelled V2
upgrade, PDF retry, unknown pricing rule, unauthorized approval, rejected
approval, network failure, and repeated submission. Each genuine failure must
preserve data, avoid duplicates, and present an actionable remediation control.

## 6. Deployment compatibility matrix

Record evidence for every cell:

| Frontend | Backend | Expected outcome |
| --- | --- | --- |
| Previous | New | Save remains compatible through the normal update contract |
| New | Previous | Save remains compatible and no unsupported rule is created |
| Cached previous tab | New | Valid edit or revision remains allowed and persists the submitted values |
| New after backend-first rollout | New | All three pricing rules load, save, print, and convert correctly |

Any incompatible cell is a stop condition.

## 7. Classification and rollback rehearsal

On the disposable snapshot:

1. Export financial fingerprints.
2. Run the standard-v1 classification dry run.
3. Apply it with the fresh SHA-256 confirmation fingerprint.
4. Run the JSON pricing audit.
5. Confirm only `pricing_rule_version` changed.
6. Dry-run and apply rollback.
7. Compare the final fingerprints with the original export.

The rehearsal fails if financial inputs, totals, fee rows, or `updated_at`
change, or if a stale fingerprint does not stop the operation.

## 8. Final evidence and gate

Copy `docs/ih-release-evidence.example.json` outside the repository. Replace
all placeholders, mark every nested check only after it is observed, and add a
durable evidence reference.

```bash
npm run release:ih-readiness -- \
  --with-database-audit \
  --with-smoke \
  --manual-evidence="$HOME/ih-release-evidence.json"
```

Only a result with status `passed` authorizes the production release. A result
of `automated-passed`, `not-ready`, or `crashed` does not.

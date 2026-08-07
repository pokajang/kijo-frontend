# Equipment Quotation Remarks

This coordinated backend/frontend release adds optional general quotation
remarks and per-item client specifications to QES Equipment Supply quotations.
The fields are pricing-neutral and do not modify registered catalogue items.

Backend migrations:

```text
database/migrations/2026_08_06_010000_add_remarks_to_equipment_quotes.php
database/migrations/2026_08_06_020000_add_equipment_remarks_to_commercial_documents.php
database/migrations/2026_08_07_000000_add_snapshot_fields_to_equipment_quote_items.php
```

The backend lockfile also upgrades `league/commonmark` from 2.8.2 to 2.9.0
and `nette/utils` from 4.1.4 to 4.1.5. The CommonMark update resolves the
current Composer security advisories; the standard Composer install below
applies both compatible transitive updates.

The frontend lockfile also updates the ESLint-only transitive `js-yaml`
dependency from 4.3.0 to 4.3.1, resolving its current denial-of-service
advisory. It does not change the production browser bundle's runtime API.

## Deployment

Back up `quotes_equipment`, `quotes_equipment_items`, `invoices`,
`invoice_breakdown`, `do_details`, `do_breakdown`, `supplier_po_main`,
`supplier_po_items`, `project_vendors`, and `migrations`. Deploy the backend
first, then run all three release migrations in order:

```bash
cd ~/kijo-laravel
git pull --ff-only origin main
php ~/composer.phar install --no-dev --optimize-autoloader
php artisan migrate \
  --path=database/migrations/2026_08_06_010000_add_remarks_to_equipment_quotes.php \
  --force
php artisan migrate \
  --path=database/migrations/2026_08_06_020000_add_equipment_remarks_to_commercial_documents.php \
  --force
php artisan migrate \
  --path=database/migrations/2026_08_07_000000_add_snapshot_fields_to_equipment_quote_items.php \
  --force
php artisan migrate:status | grep -E '2026_08_(06_(010000|020000)|07_000000)'

# Read-only legacy snapshot audit. Review candidates and every unmatched row.
php artisan quotes:backfill-equipment-item-snapshots

# Run only after the dry-run result is accepted.
php artisan quotes:backfill-equipment-item-snapshots --commit

# Verify that no candidates or unmatched rows remain.
php artisan quotes:backfill-equipment-item-snapshots
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

The migrations add nullable `quotation_remarks` and `item_remarks` columns to
equipment quotations and their commercial-document snapshots, widen delivery
order item names, allow longer LOA service descriptions, and add immutable
`item_name`, `description`, and `unit` snapshots to equipment quotation items.
The guarded command fills only null legacy snapshots from the current catalogue
and reports deleted or unmatched catalogue items. It never overwrites an
existing quotation snapshot. Existing approval fingerprints remain compatible
while substantive new remarks participate in the normal approval lifecycle.

After the backend migration is confirmed, deploy the committed frontend build.
Smoke-test catalogue descriptions containing pasted bullets and line endings,
then create, edit/revise, review, and generate the quotation, invoice/receipt,
delivery order, supplier PO, vendor LOA, and every affected PDF. Confirm that
item descriptions render as compact muted text, contain no replacement `?`
glyphs, retain their complete wording, and do not change after the catalogue
record is edited. Confirm totals remain unchanged when only remarks are edited.

For a disposable local create/edit/revision lifecycle using the account in
`SMOKE.md`:

```powershell
$env:SMOKE_EMAIL = '<smoke email>'
$env:SMOKE_PASSWORD = '<smoke password>'
npm run smoke:equipment-remarks
npm run smoke:equipment-commercial
```

Both commands are restricted to a loopback frontend, save screenshots and PDF
evidence under `test-results/`, and delete their temporary fixtures in cleanup.

Do not roll back the migrations after users enter remarks or new quotations
capture catalogue snapshots because `down()` drops those columns and their
data. Prefer an application rollback that retains the additive columns.

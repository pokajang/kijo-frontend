# Equipment Quotation Remarks

This coordinated backend/frontend release adds optional general quotation
remarks and per-item client specifications to QES Equipment Supply quotations.
The fields are pricing-neutral and do not modify registered catalogue items.

Backend migrations:

```text
database/migrations/2026_08_06_010000_add_remarks_to_equipment_quotes.php
database/migrations/2026_08_06_020000_add_equipment_remarks_to_commercial_documents.php
```

## Deployment

Back up `quotes_equipment`, `quotes_equipment_items`, `invoices`,
`invoice_breakdown`, `do_details`, `do_breakdown`, `supplier_po_main`,
`supplier_po_items`, `project_vendors`, and `migrations`. Deploy the backend
first, then run both release migrations in order:

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
php artisan migrate:status | grep -E '2026_08_06_(010000|020000)'
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
order item names, and allow longer LOA service descriptions. They do not
backfill or rewrite existing quotations or commercial records. Existing
approval fingerprints remain compatible while substantive new remarks
participate in the normal approval lifecycle.

After the backend migration is confirmed, deploy the committed frontend build.
Smoke-test create, edit/revision, review, records, invoice/receipt, delivery
order, supplier PO, vendor LOA, and every affected PDF. Confirm totals remain
unchanged when only remarks are edited.

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

Do not roll back the migrations after users enter remarks because `down()`
drops the snapshot columns and their data. Prefer an application rollback that
retains the additive columns.

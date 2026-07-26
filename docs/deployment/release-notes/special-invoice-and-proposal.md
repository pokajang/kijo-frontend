# Special Invoice and Proposal Release Operations

One-time checks for releases that allow quote-less Special invoices or add
explicit Special proposal modes, proposal snapshots, and decimal quantities.

## Manual Quote-Less Special Invoices

Required once before and after deploying the release that allows manual
Special/Special Service projects to invoice without a quotation.

```sql
SELECT COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'invoices'
  AND COLUMN_NAME = 'quote_id';
```

Expected result: `IS_NULLABLE` is `YES`.

If production reports `IS_NULLABLE = 'NO'`, take the normal pre-deploy database
backup, then run this type-preserving nullable alteration:

```sql
SELECT COLUMN_TYPE, IS_NULLABLE
INTO @quote_id_type, @quote_id_nullable
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'invoices'
  AND COLUMN_NAME = 'quote_id';

SET @sql = IF(
  @quote_id_nullable = 'NO',
  CONCAT('ALTER TABLE `invoices` MODIFY `quote_id` ', @quote_id_type, ' NULL'),
  'SELECT ''invoices.quote_id already nullable'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

Repeat the first query and confirm `IS_NULLABLE` is `YES`.

## Special Proposal Template and Quote Coherence

Required once after deploying the release that adds explicit special proposal
modes, default line items, quote proposal snapshots, and decimal special quote
quantities.

```bash
cd ~/kijo-laravel

# Confirm these migrations are pending before running them.
php artisan migrate:status | grep -E "harden_special_proposal_templates|make_special_quote_item_quantity_decimal"

php artisan migrate --force

# Confirm the release migrations are applied.
php artisan migrate:status | grep -E "harden_special_proposal_templates|make_special_quote_item_quantity_decimal"
```

The migrations:

- Backfill `proposal_template_special.proposal_mode`, `service_summary`, and
  `proposal_content` from legacy content and attachments.
- Backfill `proposal_template_special_items` from the latest related
  `quotes_special_items` per template.
- Create `quotes_special_proposal_snapshots` without historical quote snapshot
  backfill.
- Convert `quotes_special_items.quantity` to `decimal(12,2)`.

Post-migration checks:

```bash
php artisan tinker --execute='echo "special templates missing mode: ".DB::table("proposal_template_special")->whereNull("proposal_mode")->count().PHP_EOL; echo "special default line items: ".DB::table("proposal_template_special_items")->count().PHP_EOL; echo "special quote proposal snapshots: ".(\Illuminate\Support\Facades\Schema::hasTable("quotes_special_proposal_snapshots") ? "table exists" : "missing").PHP_EOL;'
```

Expected results:

- `special templates missing mode` is `0`.
- `special default line items` is greater than `0` when production has prior
  special quotes with line items.
- `special quote proposal snapshots` reports `table exists`.
- Existing quotes are not snapshot-backfilled by design.
- New or edited special quotes create snapshots.
- Existing special proposal records remain editable.

Optional MySQL column confirmation:

```bash
php artisan tinker --execute='$column = DB::selectOne("SHOW COLUMNS FROM quotes_special_items LIKE ?", ["quantity"]); echo "quotes_special_items.quantity: ".($column->Type ?? "missing").PHP_EOL;'
```

Expected result: `decimal(12,2)` or equivalent.

# Workload Classification and Snapshot Release Operations

Run only the operation explicitly required by the workload release being
deployed.

## Task Classification

Required after releases that add or change task scoring or classification
fields. The command defaults to `--limit=500`, so use an explicit production
limit or repeat it until no changes remain.

Add `--ai` only when production intentionally enables AI classification and has
a reliable queue worker or process.

```bash
cd ~/kijo-laravel
php artisan tasks:reclassify --dry-run --limit=100000
php artisan tasks:reclassify --limit=100000
php artisan tasks:reclassify --dry-run --limit=100000
```

Expected result: the final dry run reports no unexpected remaining changes.

## One-Month Daily Snapshot Replay

Required once after deploying the daily workload snapshot graph feature.

```bash
php artisan workload:capture-daily --start-date=YYYY-MM-DD --end-date=YYYY-MM-DD --repair-only
```

Use the latest one-month window, with a maximum of 31 calendar days. For a
May 31, 2026 deployment, the intended command was:

```bash
php artisan workload:capture-daily --start-date=2026-05-01 --end-date=2026-05-31 --repair-only
```

This controlled replay skips existing snapshot dates, writes new rows with
`capture_mode = reconstructed`, and must not be scheduled. Do not add `--force`.

Confirm afterward:

- The authenticated `/stats/workload/history` API returns daily points for the
  selected range.
- System Admin > AI Workload Governance shows current snapshot health and the
  reconstructed/captured counts.
- Dashboard > Workload Tracking > Graph displays bars for staff with replayed
  points.

## Current-Only Score Normalization

Required once after deploying the release that removes completed-work credit
from workload scoring.

```bash
php artisan workload:normalize-current-scores --dry-run
php artisan workload:normalize-current-scores
php artisan workload:normalize-current-scores --dry-run
```

Expected result: the final dry run reports `0 row(s) would be updated`.

This repair removes legacy `Completed work` points from stored daily workload
snapshots, recalculates snapshot totals, clears completed-work counters, and
must not be scheduled.

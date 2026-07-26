# Legal Compliance Assessment Snapshot Backfill

Required after deploying changes that add or change legacy `template_snapshot`
resolution.

```bash
cd ~/kijo-laravel
php artisan legal-compliance:backfill-assessment-snapshots
php artisan legal-compliance:backfill-assessment-snapshots --commit
php artisan legal-compliance:backfill-assessment-snapshots
```

The first and last commands are dry runs. Review counts before using `--commit`.

Expected final check: review every `unresolved` result. Some rows may be
legitimate bad legacy data, but they must not silently render from the current
active template.

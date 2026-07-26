# Dashboard Monthly Report Generation

Optional after deploying the monthly/YTD management report feature when
production should have an immediately available PDF for a historical month.

```bash
cd ~/kijo-laravel
php artisan dashboard:monthly-report --month=YYYY-MM --dry-run
php artisan dashboard:monthly-report --month=YYYY-MM --force
```

Use the report month being seeded, not a hardcoded sample month. For example, on
June 1, 2026 the latest completed month was May 2026:

```bash
php artisan dashboard:monthly-report --month=2026-05 --dry-run
php artisan dashboard:monthly-report --month=2026-05 --force
```

Add `--send` only when the production recipient list is configured and the
release explicitly intends to email the public report link immediately.

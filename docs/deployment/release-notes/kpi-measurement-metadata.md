# KPI Measurement Metadata Release Operation

Required once after deploying the release that distinguishes cumulative value
KPIs from monthly maintained rate KPIs.

Follow the comprehensive backend deployment process and run:

```bash
php artisan migrate --force
```

The metadata-only migration backfills older percentage/rate KPI parameters to:

- `value_type = percentage`
- `aggregation_type = rate`
- `target_cadence = monthly`

It applies when the existing unit, name, or description indicates a percentage
or rate. It does not modify KPI targets, weightages, monthly tracker actual
values, or monthly tracker remarks.

Expected scoring behavior: percentage/rate KPIs no longer sum monthly
percentages. They contribute to Total Live Score using the average maintained
monthly rate.

# Release-Specific Production Operations

This directory archives one-time or conditional production operations that do
not belong in the reusable deployment checklists.

For every applicable release:

1. Link the relevant note from the change description or deployment ticket.
2. Confirm prerequisites and take any required backup before deployment.
3. Run read-only or dry-run checks first.
4. Review counts and output before executing a write operation.
5. Repeat the check afterward and record the result.

Do not run an archived operation merely because it appears in this directory.
Use it only when the deployed release explicitly requires it.

## Current Notes

- [Special invoice and proposal schema](special-invoice-and-proposal.md)
- [KPI measurement metadata](kpi-measurement-metadata.md)
- [Legal compliance assessment snapshots](legal-compliance-snapshots.md)
- [Workload classification and snapshots](workload-classification-and-snapshots.md)
- [Dashboard monthly report generation](dashboard-monthly-report.md)

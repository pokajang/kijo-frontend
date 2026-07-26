export const requiredManualGates = [
  'isolated_environment',
  'pdf_visual_reconciliation',
  'full_quote_lifecycle',
  'deployment_compatibility',
  'rollback_rehearsal',
  'operations_handoff',
]

export const requiredGateChecks = {
  isolated_environment: [
    'production_build',
    'isolated_database',
    'anonymized_data',
    'outbound_email_disabled',
    'external_integrations_disabled',
    'reset_tested',
  ],
  pdf_visual_reconciliation: [
    'complexity_v1',
    'standard_v1',
    'standard_v2',
    'per_unit_price',
    'no_data_mutation',
  ],
  full_quote_lifecycle: [
    'create',
    'edit',
    'revise',
    'approve',
    'award',
    'project',
    'invoice',
    'failure_remediation',
    'reset_after_run',
  ],
  deployment_compatibility: [
    'old_frontend_new_backend',
    'new_frontend_old_backend',
    'cached_tab',
    'backend_first_rollout',
  ],
  rollback_rehearsal: [
    'backup',
    'classification_dry_run',
    'classification_commit',
    'post_audit',
    'rollback',
    'financial_fingerprint',
  ],
  operations_handoff: [
    'release_owner',
    'deployment_window',
    'rollback_authority',
    'monitoring',
    'user_notice',
  ],
}

export const validateManualEvidence = (evidence) => {
  const issues = []
  const release = evidence?.release || {}
  const gates = evidence?.gates || {}
  const commitPattern = /^[a-f0-9]{7,40}$/i

  if (!commitPattern.test(release.frontend_commit || '')) {
    issues.push('release.frontend_commit must be a Git commit SHA')
  }
  if (!commitPattern.test(release.backend_commit || '')) {
    issues.push('release.backend_commit must be a Git commit SHA')
  }
  if (
    typeof release.environment !== 'string' ||
    release.environment.trim() === '' ||
    /replace|isolated production-like staging/i.test(release.environment)
  ) {
    issues.push('release.environment must name the validated isolated environment')
  }
  if (Number.isNaN(Date.parse(release.validated_at || ''))) {
    issues.push('release.validated_at must be a valid timestamp')
  }
  if (
    typeof release.validated_by !== 'string' ||
    release.validated_by.trim() === '' ||
    release.validated_by.trim().toLowerCase() === 'name'
  ) {
    issues.push('release.validated_by must name the validator')
  }

  for (const gate of requiredManualGates) {
    if (gates[gate]?.status !== 'passed') {
      issues.push(`gates.${gate}.status must be passed`)
    }
    if (typeof gates[gate]?.evidence !== 'string' || gates[gate].evidence.trim() === '') {
      issues.push(`gates.${gate}.evidence is required`)
    }
    for (const check of requiredGateChecks[gate]) {
      if (gates[gate]?.checks?.[check] !== 'passed') {
        issues.push(`gates.${gate}.checks.${check} must be passed`)
      }
    }
  }

  return issues
}

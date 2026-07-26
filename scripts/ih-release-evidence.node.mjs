import assert from 'node:assert/strict'
import test from 'node:test'

import {
  requiredGateChecks,
  requiredManualGates,
  validateManualEvidence,
} from './ih-release-evidence.mjs'

const completeEvidence = () => ({
  release: {
    frontend_commit: '1234567890abcdef1234567890abcdef12345678',
    backend_commit: 'abcdef1234567890abcdef1234567890abcdef12',
    environment: 'ih-staging-2026-07-26',
    validated_at: '2026-07-26T10:00:00+08:00',
    validated_by: 'Release Owner',
  },
  gates: Object.fromEntries(
    requiredManualGates.map((gate) => [
      gate,
      {
        status: 'passed',
        evidence: `evidence/${gate}.json`,
        checks: Object.fromEntries(requiredGateChecks[gate].map((check) => [check, 'passed'])),
      },
    ]),
  ),
})

test('accepts complete, traceable release evidence', () => {
  assert.deepEqual(validateManualEvidence(completeEvidence()), [])
})

test('rejects placeholders and incomplete lifecycle checks', () => {
  const evidence = completeEvidence()
  evidence.release.frontend_commit = 'replace-with-tested-commit'
  evidence.gates.full_quote_lifecycle.checks.invoice = 'pending'
  evidence.gates.rollback_rehearsal.evidence = ''

  assert.deepEqual(validateManualEvidence(evidence), [
    'release.frontend_commit must be a Git commit SHA',
    'gates.full_quote_lifecycle.checks.invoice must be passed',
    'gates.rollback_rehearsal.evidence is required',
  ])
})

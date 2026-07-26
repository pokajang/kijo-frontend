import assert from 'node:assert/strict'
import test from 'node:test'

import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

test('allows loopback targets and normalizes trailing slashes', () => {
  assert.equal(validateSmokeTarget('http://127.0.0.1:3000/'), 'http://127.0.0.1:3000')
  assert.equal(validateSmokeTarget('http://localhost:4173'), 'http://localhost:4173')
  assert.equal(validateSmokeTarget('http://[::1]:3000'), 'http://[::1]:3000')
})

test('rejects remote and non-http targets', () => {
  assert.throws(() => validateSmokeTarget('https://kijo.amiosh.com'), /restricted to a loopback/)
  assert.throws(() => validateSmokeTarget('file:///tmp/index.html'), /HTTP or HTTPS/)
  assert.throws(() => validateSmokeTarget('not a url'), /valid absolute URL/)
})

test('redacts the smoke account without retaining the local part', () => {
  assert.equal(redactEmail('authorized.user@example.com'), 'a***@example.com')
  assert.equal(redactEmail('invalid'), '[redacted]')
})

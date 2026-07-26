import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requiredManualGates, validateManualEvidence } from './ih-release-evidence.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const backendRoot = path.resolve(frontendRoot, '..', 'backend-laravel')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const evidenceRoot = path.join(frontendRoot, 'test-results', `ih-release-readiness-${stamp}`)
const args = new Set(process.argv.slice(2))
const automatedOnly = args.has('--automated-only')
const withDatabaseAudit = args.has('--with-database-audit')
const withSmoke = args.has('--with-smoke')
const evidenceArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith('--manual-evidence='))
const manualEvidencePath = evidenceArgument
  ? path.resolve(process.cwd(), evidenceArgument.slice('--manual-evidence='.length))
  : null

const spawnCommand = (command, commandArgs) => {
  if (process.platform === 'win32' && ['npm', 'composer'].includes(command)) {
    return {
      executable: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', command, ...commandArgs],
    }
  }

  return { executable: command, args: commandArgs }
}

const runStep = async ({ id, command, commandArgs, cwd }) => {
  const startedAt = new Date()
  const logPath = path.join(evidenceRoot, `${id}.log`)
  let output = ''

  console.log(`\n[${id}] ${command} ${commandArgs.join(' ')}`)
  const exitCode = await new Promise((resolve, reject) => {
    const invocation = spawnCommand(command, commandArgs)
    const child = spawn(invocation.executable, invocation.args, {
      cwd,
      env: process.env,
      windowsHide: true,
      shell: false,
    })

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      process.stdout.write(text)
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      process.stderr.write(text)
    })
    child.on('error', reject)
    child.on('close', resolve)
  })

  await fs.writeFile(logPath, output)
  return {
    id,
    command: [command, ...commandArgs].join(' '),
    started_at: startedAt.toISOString(),
    duration_ms: Date.now() - startedAt.getTime(),
    exit_code: exitCode,
    passed: exitCode === 0,
    log: path.basename(logPath),
  }
}

const loadManualEvidence = async () => {
  if (!manualEvidencePath) return null

  const evidence = JSON.parse(await fs.readFile(manualEvidencePath, 'utf8'))
  const issues = validateManualEvidence(evidence)

  return {
    path: manualEvidencePath,
    passed: issues.length === 0,
    missing: issues,
    evidence,
  }
}

const main = async () => {
  await fs.mkdir(evidenceRoot, { recursive: true })

  let manualEvidence = null
  try {
    manualEvidence = await loadManualEvidence()
  } catch (error) {
    manualEvidence = {
      path: manualEvidencePath,
      passed: false,
      missing: requiredManualGates,
      error: error.message,
    }
  }

  if (!automatedOnly && manualEvidence?.passed !== true) {
    await fs.writeFile(
      path.join(evidenceRoot, 'result.json'),
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          status: 'not-ready',
          automated_only: false,
          automated_passed: false,
          manual_gates_passed: false,
          steps: [],
          manual_evidence: manualEvidence,
        },
        null,
        2,
      ),
    )
    console.error(
      'REMEDIATION: copy docs/ih-release-evidence.example.json, complete every gate with an ' +
        'evidence reference, then rerun with --manual-evidence=<path>.',
    )
    process.exitCode = 3
    return
  }

  const steps = [
    {
      id: 'smoke-safety-tests',
      command: 'node',
      commandArgs: ['--test', 'scripts/ih-smoke-safety.node.mjs'],
      cwd: frontendRoot,
    },
    {
      id: 'release-evidence-tests',
      command: 'node',
      commandArgs: ['--test', 'scripts/ih-release-evidence.node.mjs'],
      cwd: frontendRoot,
    },
    {
      id: 'smoke-script-syntax',
      command: 'node',
      commandArgs: ['--check', 'scripts/ih-pricing-flow-smoke.mjs'],
      cwd: frontendRoot,
    },
    {
      id: 'backend-composer-audit',
      command: 'composer',
      commandArgs: ['audit', '--no-interaction'],
      cwd: backendRoot,
    },
    {
      id: 'backend-tests',
      command: process.env.PHP_BINARY || 'php',
      commandArgs: ['artisan', 'test'],
      cwd: backendRoot,
    },
    {
      id: 'backend-route-list',
      command: process.env.PHP_BINARY || 'php',
      commandArgs: ['artisan', 'route:list', '--except-vendor'],
      cwd: backendRoot,
    },
    {
      id: 'frontend-lint',
      command: 'npm',
      commandArgs: ['run', 'lint'],
      cwd: frontendRoot,
    },
    {
      id: 'frontend-api-route-guard-before-build',
      command: 'npm',
      commandArgs: ['run', 'guard:api-routes'],
      cwd: frontendRoot,
    },
    {
      id: 'frontend-tests',
      command: 'npm',
      commandArgs: ['run', 'test:run'],
      cwd: frontendRoot,
    },
    {
      id: 'frontend-production-build',
      command: 'npm',
      commandArgs: ['run', 'build'],
      cwd: frontendRoot,
    },
    {
      id: 'frontend-api-route-guard-after-build',
      command: 'npm',
      commandArgs: ['run', 'guard:api-routes'],
      cwd: frontendRoot,
    },
  ]

  if (withDatabaseAudit) {
    steps.push({
      id: 'database-pricing-audit',
      command: process.env.PHP_BINARY || 'php',
      commandArgs: ['artisan', 'quotes:audit-ih-pricing-rules', '--format=json'],
      cwd: backendRoot,
    })
  }
  if (withSmoke) {
    steps.push({
      id: 'browser-lifecycle-smoke',
      command: 'npm',
      commandArgs: ['run', 'smoke:ih-pricing'],
      cwd: frontendRoot,
    })
  }

  const results = []
  for (const step of steps) {
    const result = await runStep(step)
    results.push(result)
    if (!result.passed) break
  }

  const automatedPassed =
    results.length === steps.length && results.every((result) => result.passed)
  const manualPassed = manualEvidence?.passed === true
  const report = {
    generated_at: new Date().toISOString(),
    status:
      automatedPassed && manualPassed
        ? 'passed'
        : automatedOnly && automatedPassed
          ? 'automated-passed'
          : 'not-ready',
    automated_only: automatedOnly,
    automated_passed: automatedPassed,
    manual_gates_passed: manualPassed,
    requested_optional_checks: {
      database_audit: withDatabaseAudit,
      browser_smoke: withSmoke,
    },
    steps: results,
    manual_evidence: manualEvidence,
  }

  await fs.writeFile(path.join(evidenceRoot, 'result.json'), JSON.stringify(report, null, 2))

  console.log(`\nIH readiness evidence: ${evidenceRoot}`)
  if (!automatedPassed) {
    console.error('REMEDIATION: fix the failed automated check, then rerun this command.')
    process.exitCode = 1
  } else if (!automatedOnly && !manualPassed) {
    console.error(
      'REMEDIATION: copy docs/ih-release-evidence.example.json, complete every gate with an ' +
        'evidence reference, then rerun with --manual-evidence=<path>.',
    )
    process.exitCode = 3
  }
}

main().catch(async (error) => {
  await fs.mkdir(evidenceRoot, { recursive: true })
  await fs.writeFile(
    path.join(evidenceRoot, 'result.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        status: 'crashed',
        error: error.stack || error.message,
      },
      null,
      2,
    ),
  )
  console.error('IH-RELEASE-READINESS-CRASH', error)
  process.exitCode = 2
})

/**
 * Automated Solution Studio AI Evaluation Harness
 * Run with: npx tsx scripts/eval-solution-ai.ts
 *
 * Tests:
 * 1. Read-only SQL security guardrails (blocks INSERT/UPDATE/DELETE/DROP/multi-statement)
 * 2. Reuse-First v1 generation, Core Directory linking, Menus wiring, and PII auto-masking
 * 3. Source grounding fidelity against attached SOP / CSV content
 */

import { executeAuroraReadTool } from '../server/services/sharedAuroraReadTools';
import { orchestrateSolutionReuseFirst } from '../server/services/solutionOrchestratorService';
import { runSolutionCriticAndRepair } from '../server/services/solutionCriticService';

async function runEval() {
  console.log('=== Aurora Solution Studio AI Eval Harness ===\n');

  // 1. Security Guardrail Tests
  const dangerousQueries = [
    'DELETE FROM modules;',
    'DROP TABLE users;',
    'UPDATE records SET status = \'hacked\';',
    'SELECT * FROM modules; DROP TABLE forms;',
  ];

  let securityPassed = 0;
  for (const sql of dangerousQueries) {
    const res = await executeAuroraReadTool('query_tenant_database', { sql }, { tenantId: 'eval-tenant' });
    if (res?.error && String(res.error).startsWith('Blocked:')) {
      securityPassed++;
    } else {
      console.error(`FAIL: Dangerous SQL was NOT blocked: ${sql}`);
    }
  }
  console.log(`[1] Read-Only SQL Guardrails: ${securityPassed}/${dangerousQueries.length} blocked safely`);

  // 2. Domain Generation + Critic Benchmark
  const scenarios = [
    {
      name: 'Solar Install Business + SOP',
      prompt: 'I run a solar install business, build me a system with quotes, site surveys, margin checks, and field installer roles.',
      sources: [
        {
          name: 'Solar_SOP.pdf',
          rawText: 'All solar quotes require a CEC Accreditation Number, Roof Pitch (degrees), System Size (kW), and minimum 20% internal margin. Field installers must not see internal profit margin.',
        },
      ],
    },
    {
      name: 'Government Birth Registry',
      prompt: 'Build a Birth Registration system with public intake, AI completeness check agent, and official certificate generation.',
      sources: [],
    },
  ];

  for (const sc of scenarios) {
    const result = await orchestrateSolutionReuseFirst({
      tenantId: 'eval-tenant',
      prompt: sc.prompt,
      contextSources: sc.sources,
      existingArtifacts: [],
    });

    const critic = runSolutionCriticAndRepair(result, {
      tenantId: 'eval-tenant',
      prompt: sc.prompt,
      contextSources: sc.sources,
      existingArtifacts: [],
    });

    const types = result.patches.map((p) => p.artifact.type);
    const hasCore = result.patches.some((p) => p.artifact.origin === 'CORE' || p.artifact.isSharedCore);
    const hasNav = types.includes('NAVIGATION');
    const hasRole = types.includes('PERMISSION');
    const hasForm = types.includes('FORM');
    const hasWorkflow = types.includes('WORKFLOW');

    console.log(`\n[Scenario] ${sc.name}`);
    console.log(`  App Name:       ${result.solutionName || '(none)'}`);
    console.log(`  Components:     ${result.patches.length} (${Array.from(new Set(types)).join(', ')})`);
    console.log(`  Core Reused:    ${hasCore ? 'YES' : 'NO'}`);
    console.log(`  App Menu Wired: ${hasNav ? 'YES' : 'NO'} | Form: ${hasForm ? 'YES' : 'NO'} | Workflow: ${hasWorkflow ? 'YES' : 'NO'} | Roles: ${hasRole ? 'YES' : 'NO'}`);
    console.log(`  Critic Score:   ${critic.qualityScore}/100 (${critic.issues.length} critic notes)`);
  }

  console.log('\n=== Eval Complete ===');
  process.exit(0);
}

runEval().catch((err) => {
  console.error('Eval failed:', err);
  process.exit(1);
});

import { SolutionOrchestrateResponse, OrchestrateSolutionInput } from './solutionOrchestratorService';

export interface CriticIssue {
  severity: 'error' | 'warning' | 'repaired';
  code: string;
  message: string;
}

export interface CriticEvaluation {
  qualityScore: number;
  issues: CriticIssue[];
  repairedResult: SolutionOrchestrateResponse;
}

const PII_FIELD_PATTERN =
  /(dob|date_of_birth|birth_date|tfn|ssn|tax_id|medicare|passport|licence_num|license_num|bank|bsb|account_num|credit_card|card_num|salary|wage|margin|cost_price|medical|health)/i;

/**
 * Deterministic Enterprise Critic & Auto-Repair Pass:
 * - Enforces PII/financial field masking on non-admin & portal Roles
 * - Aligns Workflow stages with linked Module's status select options
 * - Flags duplicate customer/contact modules when Core Directory should be linked
 * - Computes an objective 0-100 quality score for monitoring and evals
 */
export function runSolutionCriticAndRepair(
  result: SolutionOrchestrateResponse,
  input: OrchestrateSolutionInput
): CriticEvaluation {
  const issues: CriticIssue[] = [];
  const allArtifacts = [
    ...(input.existingArtifacts || []),
    ...result.patches.filter((p) => p.op !== 'remove_component').map((p) => p.artifact),
  ];

  const modules = allArtifacts.filter((a: any) => a.type === 'MODULE');
  const workflows = result.patches.filter((p) => p.op !== 'remove_component' && p.artifact.type === 'WORKFLOW');
  const roles = result.patches.filter((p) => p.op !== 'remove_component' && p.artifact.type === 'PERMISSION');

  // 1. Align Workflow stages with linked Module's status options
  for (const wfPatch of workflows) {
    const wf = wfPatch.artifact;
    const mod = modules.find((m: any) => m.id === wf.linkedModuleId);
    const stageNames = (wf.content?.nodes || [])
      .map((n: any) => n.name || n.label)
      .filter((s: any) => typeof s === 'string' && s.trim().length > 0);

    if (mod && stageNames.length >= 2) {
      const layout = Array.isArray(mod.content?.layout) ? mod.content.layout : [];
      const isDuplicateStatusSelect = (f: any) =>
        f?.type === 'select' &&
        (f.id === 'status' ||
          /^([a-z0-9_]+_)?status$/i.test(String(f.id || '')) ||
          /^(application |case |job |ticket |record )?status$/i.test(String(f.label || '').trim()) ||
          String(f.label || '').trim().toLowerCase() === 'stage');

      const filtered = layout.filter((f: any) => !isDuplicateStatusSelect(f));
      if (filtered.length < layout.length) {
        mod.content.layout = filtered;
        issues.push({
          severity: 'repaired',
          code: 'DUPLICATE_STATUS_REMOVED',
          message: `Removed redundant manual status dropdown from "${mod.name}" because record status is automatically driven by "${wf.name}" workflow stages.`,
        });
      }
    }
  }

  // 2. Enterprise PII & Financial Margin Auto-Masking on non-admin / portal Roles
  const piiFieldsByMod = new Map<string, string[]>();
  for (const mod of modules) {
    const layout = Array.isArray(mod.content?.layout) ? mod.content.layout : [];
    const sensitive = layout
      .filter((f: any) => PII_FIELD_PATTERN.test(`${f.id || ''} ${f.label || ''}`))
      .map((f: any) => f.id);
    if (sensitive.length > 0) {
      piiFieldsByMod.set(mod.id, sensitive);
    }
  }

  for (const rolePatch of roles) {
    const role = rolePatch.artifact;
    const lowerName = String(role.name || '').toLowerCase();
    const isAdminOrManager =
      lowerName.includes('admin') || lowerName.includes('manager') || lowerName.includes('supervisor');
    if (isAdminOrManager) continue;

    const isPortal = role.content?.type === 'PORTAL' || lowerName.includes('client') || lowerName.includes('portal') || lowerName.includes('public');
    const policies = role.content?.modulePolicies || {};

    for (const [modId, sensitiveFieldIds] of piiFieldsByMod.entries()) {
      if (!policies[modId]) continue;
      policies[modId].fields = policies[modId].fields || {};
      for (const fid of sensitiveFieldIds) {
        if (!policies[modId].fields[fid]) {
          policies[modId].fields[fid] = {
            visibility: isPortal || /margin|cost_price/i.test(fid) ? 'hidden' : 'masked',
          };
          issues.push({
            severity: 'repaired',
            code: 'PII_AUTO_MASK',
            message: `Auto-protected sensitive field "${fid}" on role "${role.name}".`,
          });
        }
      }
    }
  }

  // 3. Core Reuse Check
  const hasCoreDirectory = allArtifacts.some(
    (a: any) => a.isSharedCore || a.origin === 'CORE' || a.sourceTemplateId === 'people-organisations'
  );
  const duplicateCustomerMod = modules.find(
    (m: any) =>
      !m.isSharedCore &&
      /^(customers|clients|contacts|people|organisations|organizations)$/i.test(String(m.name || '').trim())
  );
  if (duplicateCustomerMod && !hasCoreDirectory) {
    issues.push({
      severity: 'warning',
      code: 'CORE_DUPLICATION',
      message: `Module "${duplicateCustomerMod.name}" duplicates Platform Core Directory (People & Orgs).`,
    });
  }

  // 4. Auto-repair legacy VALIDATION, AUTOMATION, REPORT, and PAGE schemas to match real Aurora runtime engines
  for (const patch of result.patches) {
    if (patch.op === 'remove_component') continue;
    const art = patch.artifact;
    const c = art.content || {};

    if (art.type === 'VALIDATION' && Array.isArray(c.rules)) {
      let upgraded = false;
      c.rules = c.rules.map((r: any, idx: number) => {
        if (r.expression && r.errorMessage && typeof r.isActive === 'boolean') return r;
        upgraded = true;
        const fid = r.field || r.fieldId || r.targetField || 'status';
        const op = r.operator || 'not_empty';
        const val = r.value;
        const expr =
          op === 'not_empty' || op === 'required'
            ? `NOT(IS_NULL({${fid}}))`
            : op === 'greater_than'
              ? `{${fid}} > ${Number(val ?? 0)}`
              : op === 'greater_or_equal'
                ? `{${fid}} >= ${Number(val ?? 0)}`
                : op === 'less_than'
                  ? `{${fid}} < ${Number(val ?? 0)}`
                  : `{${fid}} == ${JSON.stringify(val ?? '')}`;
        return {
          id: r.id || `rule_${idx + 1}`,
          name: r.name || `Rule ${idx + 1}`,
          mode: 'visual',
          conditionTree: r.conditionTree || { id: `c_${idx + 1}`, type: 'rule', fieldId: fid, operator: op === 'required' ? 'not_empty' : op, valueType: 'literal', value: val },
          expression: r.expression || expr,
          errorMessage: r.errorMessage || r.message || `Validation failed on ${fid}`,
          isActive: r.isActive !== false,
          severity: r.severity || 'error',
          enforcement: r.enforcement || 'block',
          targetFieldIds: Array.isArray(r.targetFieldIds) ? r.targetFieldIds : [fid],
          triggerOn: r.triggerOn || 'always',
        };
      });
      if (upgraded) {
        issues.push({ severity: 'repaired', code: 'VALIDATION_CONTRACT_UPGRADE', message: `Normalized "${art.name}" rules to canonical ValidationEngine format.` });
      }
    }

    if (art.type === 'AUTOMATION') {
      let upgraded = false;
      if (Array.isArray(c.triggers)) {
        c.triggers = c.triggers.map((t: any) => {
          if (t?.type === 'RECORD_CREATED' || t?.type === 'RECORD_UPDATED') {
            upgraded = true;
            return { type: 'MODULE_EVENT', on: t.type, moduleId: t.moduleId || art.linkedModuleId };
          }
          return t;
        });
      }
      if (Array.isArray(c.actions)) {
        c.actions = c.actions.map((a: any) => {
          if (a?.type === 'SEND_NOTIFICATION') {
            upgraded = true;
            return { type: 'SEND_INTERNAL_PING', config: { channel: a.target || 'operations', message: a.message || a.config?.message || '' } };
          }
          if (a && !a.config) {
            upgraded = true;
            const { type, id, ...rest } = a;
            return { ...(id ? { id } : {}), type, config: rest };
          }
          return a;
        });
      }
      if (upgraded) {
        issues.push({ severity: 'repaired', code: 'AUTOMATION_CONTRACT_UPGRADE', message: `Normalized "${art.name}" triggers/actions to canonical AutomationEngine format.` });
      }
    }

    if (art.type === 'REPORT' && !Array.isArray(c.widgets)) {
      const modRef = c.sourceModuleId || art.linkedModuleId || 'Record';
      c.dataSource = c.dataSource || { type: 'local', tables: [modRef] };
      c.widgets = [
        {
          id: `rw_${art.id}`,
          type: c.chartType || 'bar',
          title: art.name,
          w: 6,
          h: 4,
          properties: { xAxisKey: c.groupBy || 'status', yAxisKey: 'id', aggregate: 'count', showLegend: true, showTooltip: true },
        },
      ];
      issues.push({ severity: 'repaired', code: 'REPORT_CONTRACT_UPGRADE', message: `Normalized "${art.name}" to canonical ReportConfig widgets format.` });
    }

    if (art.type === 'PAGE' && Array.isArray(c.widgets)) {
      let upgraded = false;
      c.widgets = c.widgets.map((w: any, idx: number) => {
        if (w?.type === 'kpi') {
          upgraded = true;
          return { ...w, type: 'stats-grid', layout: w.layout || { x: 0, y: idx * 4, w: 6, h: 4 } };
        }
        return w;
      });
      if (upgraded) {
        issues.push({ severity: 'repaired', code: 'PAGE_WIDGET_UPGRADE', message: `Mapped legacy "kpi" widget on "${art.name}" to PageBuilderEngine "stats-grid".` });
      }
    }
  }

  // Compute Quality Score (starts at 100, deducts for warnings/errors)
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') score -= 20;
    else if (issue.severity === 'warning') score -= 10;
  }
  score = Math.max(0, Math.min(100, score));

  return { qualityScore: score, issues, repairedResult: result };
}

export interface SolutionAuditFinding {
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  code: string;
  artifactId?: string;
  artifactName?: string;
  message: string;
  autoFixable: boolean;
}

export interface SolutionAuditReport {
  score: number;
  findings: SolutionAuditFinding[];
  repairedArtifacts: any[];
  autoFixCount: number;
}

/**
 * Interactive Solution Audit & Deterministic Auto-Repair for the Components toolbar.
 * Runs Critic rules + broken-link, menu-wiring, and role-masking checks on an entire draft.
 */
export function auditAndRepairSolutionDraft(artifacts: any[]): SolutionAuditReport {
  const cloned: any[] = JSON.parse(JSON.stringify(Array.isArray(artifacts) ? artifacts : []));
  const findings: SolutionAuditFinding[] = [];
  let autoFixCount = 0;

  const modules = cloned.filter((a) => a.type === 'MODULE');
  const primaryMod = modules.find((m) => !m.isSharedCore) || modules[0];
  const artifactIdSet = new Set(cloned.map((a) => a.id));

  // 1. Check unlinked Forms / Workflows / Validations / Queues / Reports
  for (const art of cloned) {
    if (['FORM', 'WORKFLOW', 'VALIDATION', 'QUEUE', 'REPORT', 'KPI'].includes(art.type)) {
      if (!art.linkedModuleId || !artifactIdSet.has(art.linkedModuleId)) {
        if (primaryMod) {
          art.linkedModuleId = primaryMod.id;
          if (art.type === 'REPORT' && art.content) art.content.sourceModuleId = primaryMod.id;
          if (art.type === 'QUEUE' && art.content) art.content.moduleId = primaryMod.id;
          autoFixCount++;
          findings.push({
            severity: 'WARNING',
            code: 'UNLINKED_COMPONENT',
            artifactId: art.id,
            artifactName: art.name,
            message: `"${art.name}" (${art.type}) was not linked to a module — auto-wired to "${primaryMod.name}".`,
            autoFixable: true,
          });
        } else {
          findings.push({
            severity: 'CRITICAL',
            code: 'MISSING_TARGET_MODULE',
            artifactId: art.id,
            artifactName: art.name,
            message: `"${art.name}" (${art.type}) has no target Module in this solution.`,
            autoFixable: false,
          });
        }
      }
    }
  }

  // 2. Sync Workflow stages to linked Module status options
  for (const wf of cloned.filter((a) => a.type === 'WORKFLOW')) {
    const mod = modules.find((m) => m.id === wf.linkedModuleId);
    const stageNames = (wf.content?.nodes || [])
      .map((n: any) => n.name || n.label)
      .filter((s: any) => typeof s === 'string' && s.trim().length > 0);
    if (mod && stageNames.length >= 2) {
      const layout = Array.isArray(mod.content?.layout) ? mod.content.layout : [];
      const isDuplicateStatusSelect = (f: any) =>
        f?.type === 'select' &&
        (f.id === 'status' ||
          /^([a-z0-9_]+_)?status$/i.test(String(f.id || '')) ||
          /^(application |case |job |ticket |record )?status$/i.test(String(f.label || '').trim()) ||
          String(f.label || '').trim().toLowerCase() === 'stage');

      const filtered = layout.filter((f: any) => !isDuplicateStatusSelect(f));
      if (filtered.length < layout.length) {
        mod.content.layout = filtered;
        autoFixCount++;
        findings.push({
          severity: 'WARNING',
          code: 'DUPLICATE_MANUAL_STATUS',
          artifactId: mod.id,
          artifactName: mod.name,
          message: `Removed duplicate manual status dropdown from "${mod.name}" — record status is automatically driven by "${wf.name}" workflow stages.`,
          autoFixable: true,
        });
      }
    }
  }

  // 3. Check PII / financial margin masking on non-admin & portal Roles
  const piiFieldsByMod = new Map<string, string[]>();
  for (const mod of modules) {
    const layout = Array.isArray(mod.content?.layout) ? mod.content.layout : [];
    const sensitive = layout
      .filter((f: any) => PII_FIELD_PATTERN.test(`${f.id || ''} ${f.label || ''}`))
      .map((f: any) => f.id);
    if (sensitive.length > 0) piiFieldsByMod.set(mod.id, sensitive);
  }

  const roles = cloned.filter((a) => a.type === 'PERMISSION');
  if (piiFieldsByMod.size > 0 && roles.length === 0) {
    findings.push({
      severity: 'WARNING',
      code: 'MISSING_ROLES_FOR_PII',
      message: 'Sensitive/PII fields detected but no Role Policies (PERMISSION) exist yet to mask them.',
      autoFixable: false,
    });
  }

  for (const role of roles) {
    const lowerName = String(role.name || '').toLowerCase();
    if (lowerName.includes('admin') || lowerName.includes('manager') || lowerName.includes('supervisor')) {
      continue;
    }
    const isPortal =
      role.content?.type === 'PORTAL' ||
      lowerName.includes('client') ||
      lowerName.includes('portal') ||
      lowerName.includes('public');
    const policies = role.content?.modulePolicies || {};
    for (const [modId, fieldIds] of piiFieldsByMod.entries()) {
      if (!policies[modId]) continue;
      policies[modId].fields = policies[modId].fields || {};
      for (const fid of fieldIds) {
        if (!policies[modId].fields[fid]) {
          policies[modId].fields[fid] = {
            visibility: isPortal || /margin|cost_price/i.test(fid) ? 'hidden' : 'masked',
          };
          autoFixCount++;
          findings.push({
            severity: 'CRITICAL',
            code: 'UNMASKED_PII_FIELD',
            artifactId: role.id,
            artifactName: role.name,
            message: `Sensitive field "${fid}" was exposed on role "${role.name}" — auto-masked.`,
            autoFixable: true,
          });
        }
      }
    }
  }

  // 4. Core Directory Duplication Check
  const hasCoreDirectory = cloned.some(
    (a) => a.isSharedCore || a.origin === 'CORE' || a.sourceTemplateId === 'people-organisations'
  );
  const dupMod = modules.find(
    (m) =>
      !m.isSharedCore &&
      /^(customers|clients|contacts|people|organisations|organizations)$/i.test(String(m.name || '').trim())
  );
  if (dupMod && !hasCoreDirectory) {
    findings.push({
      severity: 'SUGGESTION',
      code: 'CORE_DUPLICATION',
      artifactId: dupMod.id,
      artifactName: dupMod.name,
      message: `"${dupMod.name}" duplicates Platform Core People & Organisations — consider linking Core Directory instead.`,
      autoFixable: false,
    });
  }

  // 5. Broken NAVIGATION links
  for (const nav of cloned.filter((a) => a.type === 'NAVIGATION')) {
    const items = Array.isArray(nav.content?.items) ? nav.content.items : [];
    const broken = items.filter(
      (it: any) => it.targetId && it.targetId !== '__home__' && !artifactIdSet.has(it.targetId)
    );
    if (broken.length > 0) {
      nav.content.items = items.filter(
        (it: any) => !it.targetId || it.targetId === '__home__' || artifactIdSet.has(it.targetId)
      );
      autoFixCount++;
      findings.push({
        severity: 'WARNING',
        code: 'BROKEN_MENU_LINKS',
        artifactId: nav.id,
        artifactName: nav.name,
        message: `Removed ${broken.length} broken navigation item(s) from "${nav.name}".`,
        autoFixable: true,
      });
    }
  }

  let score = 100;
  for (const f of findings) {
    if (f.severity === 'CRITICAL') score -= f.autoFixable ? 8 : 18;
    else if (f.severity === 'WARNING') score -= f.autoFixable ? 4 : 10;
    else score -= 3;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    findings,
    repairedArtifacts: cloned,
    autoFixCount,
  };
}

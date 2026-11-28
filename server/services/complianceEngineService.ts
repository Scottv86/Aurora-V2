import { globalPrisma } from '../lib/prisma';

export type ComplianceFrameworkId =
  | 'AU_PRIVACY_ACT'
  | 'GDPR'
  | 'SOC2_ISO27001'
  | 'GOV_LICENSING'
  | 'FINANCIAL_PCI';

export interface ComplianceFrameworkMeta {
  id: ComplianceFrameworkId;
  name: string;
  shortLabel: string;
  description: string;
  defaultRetentionYears: number;
}

export const COMPLIANCE_FRAMEWORKS: ComplianceFrameworkMeta[] = [
  {
    id: 'AU_PRIVACY_ACT',
    name: 'Australian Privacy Act (OAIC)',
    shortLabel: 'AU Privacy',
    description: 'Masks TFN, Medicare, ABN, DOB, and personal contact fields on non-admin roles; enforces consent on public forms and 7-year retention guidance.',
    defaultRetentionYears: 7,
  },
  {
    id: 'GDPR',
    name: 'GDPR (EU Data Protection)',
    shortLabel: 'GDPR',
    description: 'Enforces personal data masking, explicit consent checkboxes on public/portal forms, and disables bulk export on non-admin roles.',
    defaultRetentionYears: 5,
  },
  {
    id: 'SOC2_ISO27001',
    name: 'SOC 2 / ISO 27001',
    shortLabel: 'SOC 2 / ISO',
    description: 'Enforces least-privilege RBAC (no delete/export on non-admin roles) and approval guardrails on sensitive workflows.',
    defaultRetentionYears: 7,
  },
  {
    id: 'GOV_LICENSING',
    name: 'Government & Regulatory Licensing',
    shortLabel: 'Gov & Licensing',
    description: 'Verifies applicant identity/entity capture, statutory assessment/review stages, and mandatory evidence fields on approval transitions.',
    defaultRetentionYears: 7,
  },
  {
    id: 'FINANCIAL_PCI',
    name: 'Financial Controls & PCI-DSS',
    shortLabel: 'Financial / PCI',
    description: 'Masks bank/BSB/card/margin fields on non-admin roles and enforces monetary approval thresholds on non-admin workflow policies.',
    defaultRetentionYears: 7,
  },
];

export interface TenantComplianceProfile {
  frameworks: ComplianceFrameworkId[];
  approvalThresholdAmount: number;
  retentionYears: number;
  requirePublicFormConsent: boolean;
  customRules: string[];
}

export const DEFAULT_COMPLIANCE_PROFILE: TenantComplianceProfile = {
  frameworks: [],
  approvalThresholdAmount: 5000,
  retentionYears: 7,
  requirePublicFormConsent: false,
  customRules: [],
};

export interface ComplianceFinding {
  id: string;
  framework: ComplianceFrameworkId | 'BASELINE';
  severity: 'PASS' | 'WARNING' | 'ERROR';
  code: string;
  artifactId?: string;
  artifactName?: string;
  title: string;
  message: string;
  autoFixable: boolean;
  repaired?: boolean;
}

export interface ComplianceEvaluationResult {
  profile: TenantComplianceProfile;
  score: number;
  findings: ComplianceFinding[];
  autoFixCount: number;
  repairedArtifacts: any[];
}

const PII_PATTERN =
  /\b(ssn|tfn|tax_file|medicare|passport|licence_no|license_no|dob|date_of_birth|birth_date|bank|bsb|iban|account_number|credit_card|card_number|cvv|abn|salary|margin|cost_price|wholesale)\b/i;

const FINANCIAL_PATTERN =
  /\b(bank|bsb|iban|account_number|credit_card|card_number|cvv|margin|cost_price|wholesale|invoice_total|payment_amount|fee_amount|quote_total|budget|amount)\b/i;

function flattenModuleFields(layout: any[]): any[] {
  const out: any[] = [];
  if (!Array.isArray(layout)) return out;
  for (const f of layout) {
    if (!f || typeof f !== 'object') continue;
    out.push(f);
    if (Array.isArray(f.fields)) {
      out.push(...flattenModuleFields(f.fields));
    }
  }
  return out;
}

export async function getTenantComplianceProfile(tenantId: string): Promise<TenantComplianceProfile> {
  try {
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true },
    });
    const ws = (tenant?.workspaceSettings as any) || {};
    const raw = ws.complianceProfile || {};
    const validIds = new Set(COMPLIANCE_FRAMEWORKS.map((f) => f.id));
    const frameworks: ComplianceFrameworkId[] = Array.isArray(raw.frameworks)
      ? raw.frameworks.filter((id: any) => validIds.has(id))
      : [];
    return {
      frameworks,
      approvalThresholdAmount:
        typeof raw.approvalThresholdAmount === 'number' && raw.approvalThresholdAmount > 0
          ? raw.approvalThresholdAmount
          : DEFAULT_COMPLIANCE_PROFILE.approvalThresholdAmount,
      retentionYears:
        typeof raw.retentionYears === 'number' && raw.retentionYears > 0
          ? raw.retentionYears
          : DEFAULT_COMPLIANCE_PROFILE.retentionYears,
      requirePublicFormConsent: Boolean(raw.requirePublicFormConsent),
      customRules: Array.isArray(raw.customRules)
        ? raw.customRules.filter((r: any) => typeof r === 'string' && r.trim().length > 0)
        : [],
    };
  } catch {
    return { ...DEFAULT_COMPLIANCE_PROFILE };
  }
}

export async function saveTenantComplianceProfile(
  tenantId: string,
  input: Partial<TenantComplianceProfile>
): Promise<TenantComplianceProfile> {
  const existing = await globalPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { workspaceSettings: true },
  });
  const currentWs = (existing?.workspaceSettings as any) || {};
  const currentProfile = await getTenantComplianceProfile(tenantId);
  const validIds = new Set(COMPLIANCE_FRAMEWORKS.map((f) => f.id));

  const nextProfile: TenantComplianceProfile = {
    frameworks: Array.isArray(input.frameworks)
      ? input.frameworks.filter((id) => validIds.has(id))
      : currentProfile.frameworks,
    approvalThresholdAmount:
      typeof input.approvalThresholdAmount === 'number' && input.approvalThresholdAmount > 0
        ? input.approvalThresholdAmount
        : currentProfile.approvalThresholdAmount,
    retentionYears:
      typeof input.retentionYears === 'number' && input.retentionYears > 0
        ? input.retentionYears
        : currentProfile.retentionYears,
    requirePublicFormConsent:
      typeof input.requirePublicFormConsent === 'boolean'
        ? input.requirePublicFormConsent
        : currentProfile.requirePublicFormConsent,
    customRules: Array.isArray(input.customRules)
      ? input.customRules.map((r) => String(r).trim()).filter(Boolean)
      : currentProfile.customRules,
  };

  await globalPrisma.tenant.update({
    where: { id: tenantId },
    data: {
      workspaceSettings: {
        ...currentWs,
        complianceProfile: nextProfile,
      } as any,
    },
  });

  return nextProfile;
}

/**
 * Evaluates a Solution's artifacts against the tenant's active Compliance-as-Code profile.
 * When `autoFix` is true, mutates a cloned copy of artifacts to remediate fixable controls.
 */
export function evaluateSolutionCompliance(
  rawArtifacts: any[],
  profile: TenantComplianceProfile,
  options?: { autoFix?: boolean }
): ComplianceEvaluationResult {
  const autoFix = Boolean(options?.autoFix);
  const artifacts: any[] = JSON.parse(JSON.stringify(rawArtifacts || []));
  const findings: ComplianceFinding[] = [];
  let autoFixCount = 0;

  const active = new Set<ComplianceFrameworkId>(profile.frameworks || []);
  const enforcePrivacy = active.has('AU_PRIVACY_ACT') || active.has('GDPR');
  const enforceConsent = enforcePrivacy || profile.requirePublicFormConsent;
  const enforceLeastPriv = active.has('SOC2_ISO27001') || enforcePrivacy;
  const enforceGov = active.has('GOV_LICENSING');
  const enforceFinancial = active.has('FINANCIAL_PCI') || active.has('SOC2_ISO27001');

  const modules = artifacts.filter((a) => a.type === 'MODULE');
  const forms = artifacts.filter((a) => a.type === 'FORM');
  const workflows = artifacts.filter((a) => a.type === 'WORKFLOW');
  const roles = artifacts.filter((a) => a.type === 'PERMISSION');

  // 1. Sensitive PII & Financial Field Masking on Non-Admin / Portal Roles
  const sensitiveByMod = new Map<string, string[]>();
  let hasAnyFinancialField = false;

  for (const mod of modules) {
    const fields = flattenModuleFields(mod.content?.layout || []);
    const sensitiveIds = fields
      .filter((f) => {
        const text = `${f.id || ''} ${f.label || ''}`;
        if (FINANCIAL_PATTERN.test(text) || f.type === 'currency') hasAnyFinancialField = true;
        return PII_PATTERN.test(text) || (enforceFinancial && FINANCIAL_PATTERN.test(text));
      })
      .map((f) => f.id)
      .filter(Boolean);

    if (sensitiveIds.length > 0) {
      sensitiveByMod.set(mod.id, Array.from(new Set(sensitiveIds)));
    }
  }

  for (const role of roles) {
    const roleName = String(role.name || '').toLowerCase();
    const isAdminOrManager = /(admin|manager|director|owner|executive|finance|compliance)/i.test(roleName);
    const isPortal = role.content?.type === 'PORTAL' || /portal|customer|applicant|public|guest/i.test(roleName);

    if (!isAdminOrManager) {
      role.content = role.content || {};
      role.content.modulePolicies = role.content.modulePolicies || {};

      // 1a. Field-level PII / Financial masking
      for (const [modId, fieldIds] of sensitiveByMod.entries()) {
        const modPol = role.content.modulePolicies[modId];
        if (!modPol) continue;
        modPol.fields = modPol.fields || {};
        const unmasked = fieldIds.filter(
          (fid) => !modPol.fields[fid] || modPol.fields[fid].visibility === 'editable' || modPol.fields[fid].visibility === 'readonly'
        );
        if (unmasked.length > 0) {
          const fw: ComplianceFrameworkId | 'BASELINE' = active.has('AU_PRIVACY_ACT')
            ? 'AU_PRIVACY_ACT'
            : active.has('GDPR')
            ? 'GDPR'
            : active.has('FINANCIAL_PCI')
            ? 'FINANCIAL_PCI'
            : 'BASELINE';
          if (autoFix) {
            for (const fid of unmasked) {
              modPol.fields[fid] = { visibility: isPortal ? 'hidden' : 'masked' };
            }
            autoFixCount++;
          }
          findings.push({
            id: `comp_mask_${role.id}_${modId}`,
            framework: fw,
            severity: autoFix ? 'PASS' : 'ERROR',
            code: 'COMPLIANCE_PII_MASKING',
            artifactId: role.id,
            artifactName: role.name,
            title: `Sensitive field protection on "${role.name}"`,
            message: autoFix
              ? `Auto-masked ${unmasked.length} sensitive field(s) (${unmasked.slice(0, 4).join(', ')}) on "${role.name}".`
              : `"${role.name}" has unmasked access to sensitive field(s): ${unmasked.slice(0, 4).join(', ')}.`,
            autoFixable: true,
            repaired: autoFix,
          });
        }
      }

      // 1b. Least-Privilege RBAC: disable bulk export & delete on non-admin/portal roles
      if (enforceLeastPriv) {
        const fw: ComplianceFrameworkId = active.has('SOC2_ISO27001')
          ? 'SOC2_ISO27001'
          : active.has('GDPR')
          ? 'GDPR'
          : 'AU_PRIVACY_ACT';
        const overPrivMods: string[] = [];
        for (const [modId, modPol] of Object.entries<any>(role.content.modulePolicies)) {
          if (modPol?.export === true || (isPortal && modPol?.delete === true)) {
            overPrivMods.push(modId);
            if (autoFix) {
              modPol.export = false;
              if (isPortal) modPol.delete = false;
            }
          }
        }
        if (overPrivMods.length > 0) {
          if (autoFix) autoFixCount++;
          findings.push({
            id: `comp_rbac_${role.id}`,
            framework: fw,
            severity: autoFix ? 'PASS' : 'WARNING',
            code: 'COMPLIANCE_LEAST_PRIVILEGE',
            artifactId: role.id,
            artifactName: role.name,
            title: `Least-privilege export/delete guard on "${role.name}"`,
            message: autoFix
              ? `Restricted bulk export/delete on "${role.name}" across ${overPrivMods.length} module(s).`
              : `"${role.name}" allows bulk export or delete on ${overPrivMods.length} module(s), violating least-privilege policy.`,
            autoFixable: true,
            repaired: autoFix,
          });
        }
      }

      // 1c. Financial / SOC2 Approval Threshold on non-admin roles
      if (enforceFinancial && hasAnyFinancialField) {
        const wfPol = role.content.workflowPolicies || {};
        if (wfPol.canApprove && (wfPol.maxApprovalAmount === null || wfPol.maxApprovalAmount === undefined)) {
          const fw: ComplianceFrameworkId = active.has('FINANCIAL_PCI') ? 'FINANCIAL_PCI' : 'SOC2_ISO27001';
          if (autoFix) {
            role.content.workflowPolicies = {
              ...wfPol,
              maxApprovalAmount: profile.approvalThresholdAmount,
            };
            autoFixCount++;
          }
          findings.push({
            id: `comp_threshold_${role.id}`,
            framework: fw,
            severity: autoFix ? 'PASS' : 'WARNING',
            code: 'COMPLIANCE_APPROVAL_CAP',
            artifactId: role.id,
            artifactName: role.name,
            title: `Monetary approval cap on "${role.name}"`,
            message: autoFix
              ? `Set maxApprovalAmount to $${profile.approvalThresholdAmount.toLocaleString()} on "${role.name}".`
              : `"${role.name}" can approve financial records without a maxApprovalAmount cap (policy limit: $${profile.approvalThresholdAmount.toLocaleString()}).`,
            autoFixable: true,
            repaired: autoFix,
          });
        }
      }
    }
  }

  // 2. Public / Portal Form Consent Checkbox (AU Privacy Act / GDPR / Tenant Toggle)
  if (enforceConsent) {
    const fw: ComplianceFrameworkId = active.has('GDPR')
      ? 'GDPR'
      : active.has('AU_PRIVACY_ACT')
      ? 'AU_PRIVACY_ACT'
      : 'AU_PRIVACY_ACT';

    for (const form of forms) {
      const usage = String(form.content?.usage || '').toLowerCase();
      const isExternal = usage === 'public_link' || usage === 'portal_site' || /public|portal|intake|applicant/i.test(String(form.name || ''));
      if (!isExternal) continue;

      const fields: any[] = Array.isArray(form.content?.fields) ? form.content.fields : [];
      const hasConsent = fields.some((f) =>
        /consent|privacy|declaration|agree|terms/i.test(`${f.id || ''} ${f.label || ''}`)
      );

      if (!hasConsent) {
        if (autoFix) {
          form.content = form.content || {};
          form.content.fields = [
            ...fields,
            {
              id: 'privacy_consent',
              label: 'I acknowledge the Privacy Collection Notice and consent to the processing of this information.',
              type: 'checkbox',
              required: true,
              width: 'full',
            },
          ];
          form.content.customFields = form.content.fields;
          autoFixCount++;
        }
        findings.push({
          id: `comp_consent_${form.id}`,
          framework: fw,
          severity: autoFix ? 'PASS' : 'ERROR',
          code: 'COMPLIANCE_PUBLIC_CONSENT',
          artifactId: form.id,
          artifactName: form.name,
          title: `Privacy consent missing on "${form.name}"`,
          message: autoFix
            ? `Added required Privacy Collection Notice consent checkbox to "${form.name}".`
            : `External form "${form.name}" collects user data without a required privacy/consent checkbox.`,
          autoFixable: true,
          repaired: autoFix,
        });
      }
    }
  }

  // 3. Government & Licensing Statutory Review Stage Check
  if (enforceGov && workflows.length > 0) {
    for (const wf of workflows) {
      const nodes: any[] = Array.isArray(wf.content?.nodes) ? wf.content.nodes : [];
      const hasReviewStage = nodes.some((n) =>
        /review|assess|inspect|verif|approv|determin|compliance|audit/i.test(String(n.name || n.label || ''))
      );
      if (!hasReviewStage) {
        findings.push({
          id: `comp_gov_stage_${wf.id}`,
          framework: 'GOV_LICENSING',
          severity: 'WARNING',
          code: 'COMPLIANCE_GOV_REVIEW_STAGE',
          artifactId: wf.id,
          artifactName: wf.name,
          title: `Statutory assessment stage recommended on "${wf.name}"`,
          message: `Government & Licensing profile expects a formal Assessment / Review stage before final determination.`,
          autoFixable: false,
        });
      }
    }
  }

  // 4. Active Framework Pass Summary
  if (active.size > 0 && findings.filter((f) => f.severity !== 'PASS').length === 0) {
    const names = profile.frameworks
      .map((id) => COMPLIANCE_FRAMEWORKS.find((fw) => fw.id === id)?.shortLabel || id)
      .join(', ');
    findings.push({
      id: 'comp_all_pass',
      framework: profile.frameworks[0],
      severity: 'PASS',
      code: 'COMPLIANCE_VERIFIED',
      title: `Compliant with active profile (${names})`,
      message: `All ${artifacts.length} components passed automated compliance controls (retention target: ${profile.retentionYears} yrs).`,
      autoFixable: false,
    });
  }

  const errors = findings.filter((f) => f.severity === 'ERROR').length;
  const warnings = findings.filter((f) => f.severity === 'WARNING').length;
  const score = Math.max(0, 100 - errors * 20 - warnings * 8);

  return {
    profile,
    score,
    findings,
    autoFixCount,
    repairedArtifacts: artifacts,
  };
}

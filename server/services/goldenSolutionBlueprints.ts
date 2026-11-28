/**
 * Curated Golden Reference Blueprints (Few-Shot Exemplars) for Solution Studio AI.
 * On initial v1 builds, the closest matching Golden Blueprint is injected as an
 * exemplar so generated Solutions match production-grade depth, wiring, and security.
 */

export interface GoldenBlueprintExemplar {
  id: string;
  name: string;
  keywords: string[];
  summary: string;
  exemplarJson: Record<string, any>;
}

export const GOLDEN_SOLUTION_BLUEPRINTS: GoldenBlueprintExemplar[] = [
  {
    id: 'golden_solar_field_service',
    name: 'Solar & Field Service Operations',
    keywords: ['solar', 'install', 'field', 'service', 'hvac', 'electrical', 'plumbing', 'trade', 'quote', 'survey', 'maintenance', 'contractor'],
    summary: 'Links Core Directory + Pricing Catalog, custom Jobs & Site Surveys modules, Intake Form, Lead-to-Install Workflow, Margin Validation Rule, Manager/Installer/Client Roles with margin hiding, KPI, Report, and App Menu.',
    exemplarJson: {
      solutionName: 'Solar Ops Hub',
      coreLinks: ['people-organisations (Directory)', 'pricing-catalog (Pricing Catalog)'],
      modules: [
        {
          id: 'art_mod_jobs',
          name: 'Solar Jobs',
          recordKeyPrefix: 'SOL-',
          fields: [
            'client_name (text)',
            'client_party (party -> Directory)',
            'email (email)',
            'site_address (address)',
            'system_size_kw (number)',
            'unit_rate (currency)',
            'quote_total (calculation: ROUND({{system_size_kw}} * {{unit_rate}}, 2))',
            'internal_margin_pct (number, PII/financial)',
            'line_items (repeatableGroup: item, qty, unit_price)',
            'status (select: New, Site Survey, Quoted, Approved, Installed)',
          ],
          formattingRules: ['Row highlight success when quote_total > 25000'],
        },
        {
          id: 'art_mod_surveys',
          name: 'Site Surveys',
          fields: ['job_ref (lookup -> art_mod_jobs)', 'roof_type (select)', 'roof_pitch_deg (number)', 'switchboard_photo (file)', 'inspector_signoff (signature)', 'status (select: Scheduled, Completed, Issues Flagged)'],
        },
      ],
      roles: [
        'Solar Manager (full access, canApprove: true, maxApprovalAmount: 50000)',
        'Field Installer (rowScope: TEAM, internal_margin_pct: hidden, quote_total: readonly)',
        'Client Portal (type: PORTAL, rowScope: OWNED, internal_margin_pct: hidden)',
      ],
      validations: ['Minimum 1 kW system size', 'Minimum 20% internal margin check'],
      workflow: 'New -> Site Survey -> Quoted -> Approved -> Installed (matching Solar Jobs status options)',
      navigation: 'Home Overview, Solar Jobs, Site Surveys, Solar Quote Intake, Jobs by Stage Report',
    },
  },
  {
    id: 'golden_gov_registry',
    name: 'Government Registry & Licensing',
    keywords: ['birth', 'death', 'marriage', 'registry', 'licence', 'license', 'permit', 'government', 'council', 'citizen', 'statutory', 'certificate', 'registration', 'application'],
    summary: 'Links Core Directory, custom Registrations module with statutory fields, Public Registration Form, Assessment & Approval Workflow, AI Completeness Agent, Official Certificate Content Template, Public Portal Site, and Officer/Citizen Roles with DOB/ID masking.',
    exemplarJson: {
      solutionName: 'Registry Operations',
      coreLinks: ['people-organisations (Directory)'],
      modules: [
        {
          id: 'art_mod_registrations',
          name: 'Registrations',
          fields: ['reference_number (autonumber)', 'applicant_party (party)', 'subject_full_name (text)', 'date_of_birth (date, PII)', 'identity_doc_number (text, PII)', 'supporting_docs (file)', 'completeness_status (select: Pending Check, Complete, Action Required)', 'status (select: Submitted, AI Triage, Officer Review, Approved, Certificate Issued)'],
        },
      ],
      roles: [
        'Registry Officer (full review, canApprove: true)',
        'External Auditor (read-only, identity_doc_number: masked, date_of_birth: masked)',
        'Public Applicant (type: PORTAL, rowScope: OWNED)',
      ],
      agent: 'Completeness Assessment Copilot (validates mandatory fields and supporting docs on submission)',
      content: 'Official Certificate Notice (letter/PDF template with {{subject_full_name}}, {{reference_number}})',
      site: 'Public Registration Portal (Public access, embeds Registration Intake Form)',
    },
  },
  {
    id: 'golden_financial_disputes',
    name: 'Financial Disputes & Reconciliation',
    keywords: ['finance', 'dispute', 'billing', 'invoice', 'payment', 'refund', 'reconcil', 'accounting', 'xero', 'stripe', 'claim', 'insurance'],
    summary: 'Links Core Directory + Transactions, custom Disputes module, Dispute Intake Form, High-Value Approval Workflow (>$500), AI Dispute Auditor Agent, SLA Escalation Automation, and Finance Roles with bank/card masking.',
    exemplarJson: {
      solutionName: 'Dispute Resolution Hub',
      coreLinks: ['people-organisations (Directory)', 'transactions (Transactions)'],
      modules: [
        {
          id: 'art_mod_disputes',
          name: 'Payment Disputes',
          fields: ['transaction_ref (text)', 'client_party (party)', 'disputed_amount (currency)', 'bank_account (text, PII)', 'reason (select: Duplicate Charge, Unrecognized, Service Issue)', 'status (select: Lodged, Investigating, Supervisor Approval, Resolved, Refunded)'],
        },
      ],
      roles: [
        'Finance Supervisor (canApprove: true, maxApprovalAmount: 10000)',
        'Dispute Analyst (bank_account: masked, canApprove: false)',
      ],
      automations: ['48h SLA Breach Escalation to Finance Supervisor'],
      queues: ['High-Value Disputes Queue (disputed_amount > 500)'],
    },
  },
  {
    id: 'golden_client_onboarding',
    name: 'Client Onboarding & Engagement',
    keywords: ['onboard', 'client', 'crm', 'agency', 'consulting', 'legal', 'project', 'engagement', 'deal', 'sales', 'lead', 'pipeline'],
    summary: 'Links Core Directory, custom Engagements module, Client Onboarding Form, Kickoff Workflow, Welcome Email Content Template, Pipeline Report, and Account Manager/Client Roles.',
    exemplarJson: {
      solutionName: 'Client Onboarding Hub',
      coreLinks: ['people-organisations (Directory)', 'pricing-catalog (Pricing Catalog)'],
      modules: [
        {
          id: 'art_mod_engagements',
          name: 'Client Engagements',
          fields: ['engagement_name (text)', 'client_party (party)', 'primary_email (email)', 'contract_value (currency)', 'kickoff_date (date)', 'signed_agreement (file)', 'status (select: New Lead, Discovery, Proposal Sent, Signed, Onboarding, Active)'],
        },
      ],
      roles: ['Account Manager (full access, canApprove: true)', 'Client Stakeholder (type: PORTAL, rowScope: OWNED)'],
      content: 'Client Welcome Pack Email ({{engagement_name}}, {{kickoff_date}})',
      report: 'Engagements by Stage (bar chart grouped by status)',
    },
  },
  {
    id: 'golden_service_desk',
    name: 'Service Desk & Work Triage',
    keywords: ['support', 'ticket', 'helpdesk', 'service desk', 'incident', 'triage', 'it', 'ops', 'request', 'sla', 'queue'],
    summary: 'Links Core Directory + Service Desk, custom Support Tickets module, Ticket Intake Form, Escalation Workflow, Tier-1 AI Triage Agent, Priority Queue, and First-Response SLA KPI.',
    exemplarJson: {
      solutionName: 'Support Operations Hub',
      coreLinks: ['people-organisations (Directory)', 'service-desk (Service Desk)'],
      modules: [
        {
          id: 'art_mod_tickets',
          name: 'Support Tickets',
          fields: ['subject (text)', 'requester_party (party)', 'requester_email (email)', 'category (select: Billing, Technical, Access, Feature)', 'priority (select: Low, Medium, High, Urgent)', 'status (select: Open, Triaged, In Progress, Waiting on Customer, Resolved)'],
        },
      ],
      agent: 'Tier-1 Triage Copilot (classifies priority, drafts response, flags urgent incidents)',
      queues: ['Urgent Triage Queue'],
      kpi: 'First Response SLA Rate (target: 95%)',
    },
  },
];

export function selectClosestGoldenBlueprint(prompt: string): GoldenBlueprintExemplar {
  const lower = String(prompt || '').toLowerCase();
  let best = GOLDEN_SOLUTION_BLUEPRINTS[0];
  let bestScore = -1;

  for (const bp of GOLDEN_SOLUTION_BLUEPRINTS) {
    let score = 0;
    for (const kw of bp.keywords) {
      if (lower.includes(kw)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = bp;
    }
  }
  return best;
}

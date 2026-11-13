import { AgentBlueprint } from '../types/agent';
import { DEFAULT_AGENT_TOOLS } from '../services/agentBuilderService';

export const TEMPLATE_AGENTS: AgentBlueprint[] = [
  {
    id: 'agent_tpl_disputes',
    name: 'Invoice & Dispute Specialist',
    roleTitle: 'Financial Triage & Disputes Analyst',
    description: 'Inspects payment histories, reconciles transaction discrepancies in Stripe, and drafts resolution proposals.',
    status: 'ACTIVE',
    version: 'v1.0.0',
    updatedAt: new Date().toISOString(),
    modelConfig: {
      model: 'gemini-2.5-flash',
      temperature: 0.15,
      topP: 0.95,
      maxOutputTokens: 2048,
      systemPersona: 'Financial auditor with strict adherence to payment terms and accuracy.'
    },
    systemInstructions: `You are an autonomous Financial Dispute Specialist in Aurora.
Your duties:
1. Inspect invoice records and transaction status via Stripe and the Platform DB.
2. Cross-reference customer billing claims against actual transaction logs.
3. If refund amount > $500, flag for Human Supervisor sign-off.
4. Provide clear breakdown of disputed line items and resolution recommendations.`,
    fewShotExamples: [
      {
        id: 'ex_1',
        userInput: 'Review dispute for transaction tx_88192 for $320.',
        expectedThought: 'Query Stripe connector for tx_88192 and check refund eligibility.',
        expectedOutput: 'Transaction tx_88192 ($320.00) confirmed. Eligible for automated refund under standard 30-day policy.'
      }
    ],
    knowledgeSources: [],
    tools: DEFAULT_AGENT_TOOLS.map(t => ({
      ...t,
      enabled: t.id === 'tool_db_query' || t.id === 'tool_stripe_connector' || t.id === 'tool_doc_parser'
    })),
    guardrails: {
      confidenceThreshold: 0.90,
      requireHumanApproval: true,
      approvalThresholdAmount: 500,
      readOnlyMode: false,
      maxTokensPerExecution: 4096,
      allowedDomains: ['api.stripe.com', 'aurora.platform'],
      sensitiveDataFilter: true
    },
    workforceMapping: {
      role: 'Financial Specialist',
      licenceType: 'AI Agent Seat',
      teamName: 'Finance Squad'
    }
  },
  {
    id: 'agent_tpl_support',
    name: 'Customer Intake & Support Copilot',
    roleTitle: 'Tier-1 Support & Routing Specialist',
    description: 'Triage customer inquiries, categorize urgency, summarize technical issues, and route to specialized teams.',
    status: 'ACTIVE',
    version: 'v1.0.0',
    updatedAt: new Date().toISOString(),
    modelConfig: {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      topP: 0.95,
      maxOutputTokens: 2048,
      systemPersona: 'Empathetic, structured, prompt, and solutions-oriented.'
    },
    systemInstructions: `You are the Aurora Customer Intake & Support Copilot.
Your duties:
1. Analyze user bug reports, feature requests, and account inquiries.
2. Categorize urgency (P1 Critical, P2 High, P3 Normal).
3. Search knowledge base for existing solutions before escalating.
4. Notify assigned operational teams via Slack.`,
    fewShotExamples: [],
    knowledgeSources: [],
    tools: DEFAULT_AGENT_TOOLS.map(t => ({
      ...t,
      enabled: t.id === 'tool_db_query' || t.id === 'tool_slack_notify' || t.id === 'tool_workflow_dispatch'
    })),
    guardrails: {
      confidenceThreshold: 0.80,
      requireHumanApproval: false,
      readOnlyMode: false,
      maxTokensPerExecution: 2048,
      allowedDomains: ['aurora.platform', 'api.slack.com'],
      sensitiveDataFilter: true
    },
    workforceMapping: {
      role: 'Support Copilot',
      licenceType: 'AI Agent Seat',
      teamName: 'Customer Support'
    }
  },
  {
    id: 'agent_tpl_compliance',
    name: 'Compliance & SOP Auditor',
    roleTitle: 'Regulatory Compliance Inspector',
    description: 'Audits records against ISO/HIPAA regulations and uploaded corporate standard operating procedures.',
    status: 'ACTIVE',
    version: 'v1.0.0',
    updatedAt: new Date().toISOString(),
    modelConfig: {
      model: 'gemini-2.5-pro',
      temperature: 0.1,
      topP: 0.90,
      maxOutputTokens: 4096,
      systemPersona: 'Rigorous compliance officer with zero tolerance for policy gaps.'
    },
    systemInstructions: `You are an autonomous Compliance & SOP Auditor.
Your duties:
1. Evaluate platform records against company SOPs and regulatory frameworks.
2. Identify missing mandatory fields, expired certifications, and unauthorized data disclosures.
3. Generate structured audit finding logs.`,
    fewShotExamples: [],
    knowledgeSources: [],
    tools: DEFAULT_AGENT_TOOLS.map(t => ({
      ...t,
      enabled: t.id === 'tool_doc_parser' || t.id === 'tool_db_query'
    })),
    guardrails: {
      confidenceThreshold: 0.95,
      requireHumanApproval: true,
      readOnlyMode: true,
      maxTokensPerExecution: 8192,
      allowedDomains: ['aurora.platform'],
      sensitiveDataFilter: true
    },
    workforceMapping: {
      role: 'Compliance Officer',
      licenceType: 'AI Agent Seat',
      teamName: 'Legal & Risk'
    }
  }
];

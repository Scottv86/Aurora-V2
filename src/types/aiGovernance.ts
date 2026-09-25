export type AIFeatureKey =
  | 'ai:antigravity_agent'
  | 'ai:subagent_delegation'
  | 'ai:scheduled_tasks'
  | 'ai:agent_builder'
  | 'ai:solution_builder'
  | 'ai:form_builder'
  | 'ai:page_builder'
  | 'ai:connector_architect'
  | 'ai:report_generator'
  | 'ai:formula_assistant'
  | 'ai:record_summary'
  | 'ai:document_template'
  | 'ai:ask_aurora_filter'
  | 'ai:workforce_onboarding'
  | 'ai:digital_twin'
  | 'ai:workflow_actions'
  | 'ai:smart_inbox'
  | 'ai:vector_embeddings'
  | 'ai:public_portal_chat'
  | 'ai:document_ocr'
  | 'ai:document_copilot'
  | 'ai:document_magic_populate'
  | 'ai:document_classification_pii'
  | 'ai:brand_kit_generator'
  | 'ai:document_record_converter'
  | 'ai:document_redaction'
  | 'ai:document_version_diff'
  | 'ai:document_obligation_extractor';

export type AIPolicyState = 'ALLOW' | 'DENY' | 'INHERIT';

export type AIFeatureCategory =
  | 'agents_chat'
  | 'builders'
  | 'analytics'
  | 'tools_productivity'
  | 'documents_data'
  | 'automations'
  | 'communications'
  | 'core_search';

export interface AIFeatureDefinition {
  key: AIFeatureKey;
  name: string;
  category: AIFeatureCategory;
  description: string;
  icon: string;
  defaultEnabled: boolean;
}

export const AI_CATEGORY_LABELS: Record<AIFeatureCategory, { title: string; description: string }> = {
  agents_chat: {
    title: 'Agents & Autonomous Chat',
    description: 'Aurora Vibe conversational AI, subagents, and chat-based workspace operators'
  },
  builders: {
    title: 'Generative Builders & Architecture',
    description: 'Autonomous generation of forms, modules, pages, and complete solutions'
  },
  analytics: {
    title: 'Analytics & Reporting',
    description: 'Automated report dashboard compilation, data queries, and chart synthesizers'
  },
  tools_productivity: {
    title: 'Productivity & Helpers',
    description: 'Formula generators, validation expression fixers, and Digital Twin helpers'
  },
  documents_data: {
    title: 'Documents & Data Records',
    description: 'HTML document templates, record summaries, and natural language table filters'
  },
  automations: {
    title: 'Workflow & Scheduled Automations',
    description: 'Background cron AI runs and pipeline action steps'
  },
  communications: {
    title: 'Inbox & Public Support',
    description: 'Email triage, draft auto-generation, and portal live chat assistant'
  },
  core_search: {
    title: 'Core AI & Vector Embeddings',
    description: 'pgvector embeddings, semantic search, and document chunking'
  }
};

export const AI_FEATURES_CATALOG: AIFeatureDefinition[] = [
  {
    key: 'ai:antigravity_agent',
    name: 'Aurora Vibe / Antigravity Agent',
    category: 'agents_chat',
    description: 'Full autonomous conversational agent with multi-turn tool calling and workspace mutation capabilities.',
    icon: 'Sparkles',
    defaultEnabled: true
  },
  {
    key: 'ai:subagent_delegation',
    name: 'Subagent Worker Delegation',
    category: 'agents_chat',
    description: 'Ability for agents to spawn concurrent background subagents (Data Steward, Shadow Architect, Workflow).',
    icon: 'Users',
    defaultEnabled: true
  },
  {
    key: 'ai:scheduled_tasks',
    name: 'Scheduled Autonomous AI Tasks',
    category: 'automations',
    description: 'Automated background cron prompts executed by AI without user presence.',
    icon: 'Clock',
    defaultEnabled: true
  },
  {
    key: 'ai:agent_builder',
    name: 'Agent Studio & Coworker Architect',
    category: 'builders',
    description: 'Conversational agent builder, prompt tuner, sandbox simulation, and tool binding assistant.',
    icon: 'Bot',
    defaultEnabled: true
  },
  {
    key: 'ai:solution_builder',
    name: 'Solution Builder & Orchestrator',
    category: 'builders',
    description: 'Synthesis of end-to-end multi-module business systems from plain English prompts.',
    icon: 'Layers',
    defaultEnabled: true
  },
  {
    key: 'ai:form_builder',
    name: 'AI Form & Module Builder',
    category: 'builders',
    description: 'Generates form layouts, rows, columns, tabs, field types, and validation rules from text.',
    icon: 'FileSpreadsheet',
    defaultEnabled: true
  },
  {
    key: 'ai:page_builder',
    name: 'Page & Dashboard Layout AI',
    category: 'builders',
    description: 'Synthesizes custom dashboard widget grids for PAGE-type workspace modules.',
    icon: 'LayoutGrid',
    defaultEnabled: true
  },
  {
    key: 'ai:connector_architect',
    name: 'AI Connector Architect',
    category: 'builders',
    description: 'Generates REST API connector specifications, authentication headers, and JSON schemas.',
    icon: 'Cpu',
    defaultEnabled: true
  },
  {
    key: 'ai:brand_kit_generator',
    name: 'AI Brand Kit & Style Architect',
    category: 'builders',
    description: 'Generates company design systems, accessible UI color palettes, brand copy guidelines, boilerplate, and logo styling.',
    icon: 'Palette',
    defaultEnabled: true
  },
  {
    key: 'ai:report_generator',
    name: 'AI Report & Analytics Generator',
    category: 'analytics',
    description: 'Compiles analytics schemas, SQL aggregations, KPI tiles, and chart definitions.',
    icon: 'BarChart3',
    defaultEnabled: true
  },
  {
    key: 'ai:formula_assistant',
    name: 'Formula & Validation Assistant',
    category: 'tools_productivity',
    description: 'Generates and debugs JavaScript/Math calculation formulas and field validation rules.',
    icon: 'Calculator',
    defaultEnabled: true
  },
  {
    key: 'ai:record_summary',
    name: 'Record AI Summary Fields',
    category: 'documents_data',
    description: 'Generates dynamic executive summaries of data records upon creation or field updates.',
    icon: 'FileText',
    defaultEnabled: true
  },
  {
    key: 'ai:document_template',
    name: 'AI Document Template Generator',
    category: 'documents_data',
    description: 'Generates formatted HTML contracts, SOPs, proposals, and dynamic template tags.',
    icon: 'FileCode',
    defaultEnabled: true
  },
  {
    key: 'ai:document_ocr',
    name: 'Document & Image Multimodal OCR',
    category: 'documents_data',
    description: 'Extracts machine-readable text and structural layout from uploaded images, receipts, site photos, and PDF files using vision models.',
    icon: 'ScanText',
    defaultEnabled: true
  },
  {
    key: 'ai:document_copilot',
    name: 'File Copilot ("Ask this File")',
    category: 'documents_data',
    description: 'Conversational in-drawer AI assistant answering natural language questions directly against document text and raw binary file contents.',
    icon: 'MessageSquare',
    defaultEnabled: true
  },
  {
    key: 'ai:document_magic_populate',
    name: 'Document Magic Populate & Field Extraction',
    category: 'documents_data',
    description: 'Automatically extracts key business entities (invoices, vendors, dates, totals) from attached files with 1-click form auto-fill.',
    icon: 'Wand2',
    defaultEnabled: true
  },
  {
    key: 'ai:document_classification_pii',
    name: 'Document PII & Security Auto-Classification',
    category: 'documents_data',
    description: 'Scans uploaded documents for sensitive PII (tax identifiers, payment cards, banking info) and auto-escalates statutory security tiers.',
    icon: 'ShieldAlert',
    defaultEnabled: true
  },
  {
    key: 'ai:ask_aurora_filter',
    name: 'AskAurora Table Natural Language Filter',
    category: 'documents_data',
    description: 'Translates natural language questions into structured column filters and sorts.',
    icon: 'Search',
    defaultEnabled: true
  },
  {
    key: 'ai:workforce_onboarding',
    name: 'Synthetic Workforce Onboarding Wizard',
    category: 'agents_chat',
    description: 'Generates role training questions, compiles agent directives, and generates avatars.',
    icon: 'UserPlus',
    defaultEnabled: true
  },
  {
    key: 'ai:digital_twin',
    name: 'Digital Twin (User Shadow Agent)',
    category: 'tools_productivity',
    description: 'User digital twin auto-drafting, night-shift queue handling, and handover digests.',
    icon: 'Fingerprint',
    defaultEnabled: true
  },
  {
    key: 'ai:workflow_actions',
    name: 'Workflow & Automation AI Actions',
    category: 'automations',
    description: 'Execution of GEMINI_PROMPT, AI_AGENT, and AI_SUMMARIZE action nodes in pipelines.',
    icon: 'GitPullRequest',
    defaultEnabled: true
  },
  {
    key: 'ai:smart_inbox',
    name: 'Smart Inbox & Email Copilot',
    category: 'communications',
    description: 'Email sentiment analysis, priority tagging, smart draft replies, and rule generation.',
    icon: 'Mail',
    defaultEnabled: true
  },
  {
    key: 'ai:vector_embeddings',
    name: 'Vector Embeddings & Semantic Search',
    category: 'core_search',
    description: '768-dimensional pgvector embeddings for semantic entity matching and search.',
    icon: 'Database',
    defaultEnabled: true
  },
  {
    key: 'ai:public_portal_chat',
    name: 'Public Portal Live Chat AI',
    category: 'communications',
    description: 'Automated AI response generator for public customer support tickets and portal chat.',
    icon: 'MessageSquare',
    defaultEnabled: true
  },
  {
    key: 'ai:document_record_converter',
    name: 'Document-to-Record AI Converter',
    category: 'documents_data',
    description: 'Converts unstructured documents directly into People & Organisation directory records or custom module records with field confidence verification and deduplication check.',
    icon: 'FileOutput',
    defaultEnabled: true
  },
  {
    key: 'ai:document_redaction',
    name: 'AI PII Redaction & Document Sanitiser',
    category: 'documents_data',
    description: 'Detects sensitive PII patterns in documents and generates cryptographically masked, sanitized versions with irreversible black-box redactions.',
    icon: 'EyeOff',
    defaultEnabled: true
  },
  {
    key: 'ai:document_version_diff',
    name: 'AI Version Comparison & Clause Diff',
    category: 'documents_data',
    description: 'Compares any two document versions, producing colored clause diffs and an automated executive summary of legal or commercial changes.',
    icon: 'GitCompare',
    defaultEnabled: true
  },
  {
    key: 'ai:document_obligation_extractor',
    name: 'Contract Obligation & Milestone Extractor',
    category: 'documents_data',
    description: 'Scans agreements and contracts for operative milestones, compliance clauses, and renewal deadlines, auto-generating scheduled tasks.',
    icon: 'CalendarCheck',
    defaultEnabled: true
  }
];

export interface TenantAIGovernanceSummary {
  tenantId: string;
  featureDefaults: Record<string, boolean>;
  teamOverrides: Record<string, { teamName: string; overrides: Record<string, AIPolicyState> }>;
  memberOverridesCount: number;
}

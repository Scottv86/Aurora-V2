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
  | 'ai:public_portal_chat';

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
  }
];

export interface TenantAIGovernanceSummary {
  tenantId: string;
  featureDefaults: Record<string, boolean>;
  teamOverrides: Record<string, { teamName: string; overrides: Record<string, AIPolicyState> }>;
  memberOverridesCount: number;
}

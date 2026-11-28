export type SolutionStatus = 'ACTIVE' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SolutionArtifactType =
  | 'FORM'
  | 'WORKFLOW'
  | 'NAVIGATION'
  | 'PAGE'
  | 'SITE'
  | 'MODULE'
  | 'AUTOMATION'
  | 'VALIDATION'
  | 'INTEGRATION'
  | 'REPORT'
  | 'METRIC'
  | 'KPI'
  | 'BRAND'
  | 'SEARCH'
  | 'CONTENT'
  | 'TEMPLATE'
  | 'GLOBAL_LIST'
  | 'PERMISSION'
  | 'API'
  | 'AGENT'
  | 'QUEUE'
  | 'QUERY'
  | 'VIEW'
  | 'RECORDS';

export type SolutionArtifactOrigin = 'CORE' | 'TEMPLATE' | 'AI_GEN' | 'CUSTOM';

export type SolutionComponentColumn =
  | 'DATA_LOGIC'
  | 'INTERFACES_OUTPUTS'
  | 'PROCESS_AI';

export interface ContextSource {
  id: string;
  name: string;
  type: 'docx' | 'pdf' | 'png' | 'txt' | 'json' | 'other';
  size: string;
  uploadedAt: string;
  status: 'PROCESSED' | 'INDEXING' | 'ERROR';
  contentSummary?: string;
  rawText?: string;
  sourceOrigin?:
    | 'LOCAL_FILE'
    | 'KNOWLEDGE_BASE'
    | 'DRIVE'
    | 'REPORT'
    | 'APP'
    | 'GENERATED'
    | 'WEBSITE';
}

export interface ConnectedModule {
  id: string;
  name: string;
  type: 'REGISTRY' | 'WORK_ITEM' | 'RECORD' | 'LOG' | 'FINANCIAL' | 'CUSTOM';
  description?: string;
  fieldsCount: number;
  linked: boolean;
  isCore?: boolean;
}

export interface SolutionArtifact {
  id: string;
  slug?: string;
  name: string;
  type: SolutionArtifactType;
  description?: string;
  content: any; // Spec data for form layout, visual workflow nodes/edges, navigation items, schema JSON, RolePolicy, etc.
  groundedSources?: string[];
  origin?: SolutionArtifactOrigin;
  sourceTemplateId?: string;
  isSharedCore?: boolean;
  coreExtensionOnly?: boolean;
  linkedModuleId?: string;
  dependencies?: string[];
  lastEditedBy?: 'AI' | 'USER';
  manualEditVersion?: number;
  updatedAt?: string;
}

export interface SavedNote {
  id: string;
  title: string;
  text: string;
  createdAt: string;
}

export interface GuidedDiscoveryOption {
  id: string;
  label: string;
  description?: string;
  isDefault?: boolean;
}

export interface GuidedDiscoveryCard {
  id: string;
  question: string;
  stepIndex?: number;
  totalSteps?: number;
  options: GuidedDiscoveryOption[];
  selectedOptionId?: string;
  customValue?: string;
  status?: 'PENDING' | 'ANSWERED' | 'SKIPPED';
}

export interface ProposalAssemblyItem {
  name: string;
  type: SolutionArtifactType;
  origin: SolutionArtifactOrigin;
  action: 'LINK_CORE' | 'EXTEND_CORE' | 'TEMPLATE' | 'GENERATE';
}

export interface ProposalAssemblyCard {
  id: string;
  title: string;
  summary?: string;
  items: ProposalAssemblyItem[];
}

export interface PinnedChatContext {
  artifactId: string;
  artifactName: string;
  artifactType: SolutionArtifactType;
  targetPath?: string;
  label: string;
}

export interface SolutionChatMessage {
  id: string;
  role: 'aurora' | 'self';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  generatedArtifactId?: string;
  groundedSources?: string[];
  steps?: Array<{ name: string; arguments?: any; result?: any }>;
  guidedDiscovery?: GuidedDiscoveryCard;
  proposalCard?: ProposalAssemblyCard;
  pinnedContext?: PinnedChatContext;
}

export interface SolutionVersionSnapshot {
  id: string;
  versionTag: string;
  label: string;
  createdAt: string;
  author: 'USER' | 'AI' | 'DEPLOY';
  artifacts: SolutionArtifact[];
  connectedModules: ConnectedModule[];
  contextSourcesCount?: number;
}

export interface SolutionBlueprint {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  status: SolutionStatus;
  modulesCount: number;
  workflowsCount: number;
  formsCount: number;
  metricsCount?: number;
  brandsCount?: number;
  searchesCount?: number;
  contentCount?: number;
  agentsCount?: number;
  artifactsCount?: number;
  author: string;
  updatedAt: string;
  icon?: string;
  contextSources: ContextSource[];
  connectedModules: ConnectedModule[];
  artifacts: SolutionArtifact[];
  chatHistory?: SolutionChatMessage[];
  chatMessages?: SolutionChatMessage[];
  activeArtifactId?: string;
  solutionNotes?: string;
  savedNotes?: SavedNote[];
  versions?: SolutionVersionSnapshot[];
  metadata?: Record<string, any>;
}

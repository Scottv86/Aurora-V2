export type SolutionStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

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
  | 'TEMPLATE' 
  | 'GLOBAL_LIST' 
  | 'PERMISSION'
  | 'API' 
  | 'RECORDS';

export interface ContextSource {
  id: string;
  name: string;
  type: 'docx' | 'pdf' | 'png' | 'txt' | 'json' | 'other';
  size: string;
  uploadedAt: string;
  status: 'PROCESSED' | 'INDEXING' | 'ERROR';
  contentSummary?: string;
  rawText?: string;
  sourceOrigin?: 'LOCAL_FILE' | 'KNOWLEDGE_BASE' | 'DRIVE' | 'REPORT' | 'APP' | 'GENERATED' | 'WEBSITE';

}

export interface ConnectedModule {
  id: string;
  name: string;
  type: 'RECORD' | 'WORK_ITEM' | 'REGISTRY' | 'LOG' | 'FINANCIAL' | 'CUSTOM';
  description?: string;
  fieldsCount: number;
  linked: boolean;
}

export interface SolutionArtifact {
  id: string;
  name: string;
  type: SolutionArtifactType;
  description?: string;
  content: any; // Spec data for form layout, visual workflow nodes/edges, navigation items, schema JSON, etc.
  groundedSources?: string[];
}

export interface SavedNote {
  id: string;
  title: string;
  text: string;
  createdAt: string;
}

export interface SolutionChatMessage {
  id: string;
  role: 'aurora' | 'self';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  generatedArtifactId?: string;
  groundedSources?: string[];
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
}



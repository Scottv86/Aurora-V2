export interface Field {
  id: string;
  name?: string;
  isNameManuallyEdited?: boolean;
  type: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  tooltip?: string;
  defaultValue?: any;
  required?: boolean;
  currencySymbol?: string;
  options?: string[];
  optionsSource?: 'manual' | 'global_list';
  globalListId?: string;
  calculationLogic?: string;
  calculationTriggers?: string[];
  targetModuleId?: string;
  targetPlatformModuleId?: string;
  fields?: Field[];
  rollupConfig?: any;
  relationshipConfig?: any;
  [key: string]: any;
}

export interface ModuleVersionSnapshotState {
  layout: Field[];
  tabs: any[];
  moduleSettings: any;
  interfaceSettings: any;
  forms?: any[];
  validationRules?: any[];
  fieldSecurity?: Record<string, Record<string, any>>;
  connectorMappings?: Record<string, Record<string, string>>;
  dataPopulationRules?: any[];
  workflows?: any[];
  accessControl?: any;
}

export interface VersionFieldDiff {
  type: 'added' | 'removed' | 'modified' | 'renamed' | 'unchanged';
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  oldField?: Partial<Field>;
  newField?: Partial<Field>;
  details?: string;
  riskLevel?: 'safe' | 'warning' | 'critical';
  riskMessage?: string;
  suggestedSql?: string;
}

export interface AICommitResult {
  title: string;
  summary: string[];
  releaseNotes: string;
  aiGenerated: boolean;
}

export interface ModuleVersionSnapshot {
  id: string;
  moduleId: string;
  moduleName: string;
  versionTag: string;
  name: string;
  description?: string;
  commitSummary?: string[];
  aiGenerated?: boolean;
  isGeneratingAI?: boolean;
  author: string;
  authorId?: string;
  createdAt: string;
  isDeployed: boolean;
  deployedAt?: string;
  promotedBy?: string;
  isRollback?: boolean;
  rollbackFromVersion?: string;
  rollbackTargetVersion?: string;
  snapshot: ModuleVersionSnapshotState;
  migrationSql?: string;
  downMigrationSql?: string;
  sectionChanges?: string[];
  changesSummary: {
    added: number;
    removed: number;
    modified: number;
    total: number;
  };
}

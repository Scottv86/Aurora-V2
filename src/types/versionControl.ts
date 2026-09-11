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
}

export interface VersionFieldDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  oldField?: Partial<Field>;
  newField?: Partial<Field>;
  details?: string;
}

export interface ModuleVersionSnapshot {
  id: string;
  moduleId: string;
  moduleName: string;
  versionTag: string;
  name: string;
  description?: string;
  author: string;
  createdAt: string;
  isDeployed: boolean;
  isRollback?: boolean;
  rollbackFromVersion?: string;
  snapshot: ModuleVersionSnapshotState;
  migrationSql?: string;
  downMigrationSql?: string;
  changesSummary: {
    added: number;
    removed: number;
    modified: number;
    total: number;
  };
}

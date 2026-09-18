import { QueryParameter, QueryColumnConfig, QueryStatus } from './queryBuilder';

export type SearchScopeType = 'SINGLE_MODULE' | 'MULTI_MODULE' | 'PLATFORM';
export type SearchTargetEntity = 'records' | 'files';

export type SearchFilterControlType = 
  | 'text' 
  | 'user' 
  | 'status' 
  | 'date_preset' 
  | 'date_range' 
  | 'select' 
  | 'number_range' 
  | 'boolean';

export interface SearchParameterExposed {
  id: string;
  parameterName: string; // matches SQL param e.g. "assigneeId"
  fieldKey: string;      // underlying field e.g. "assigneeId", "status", "claim_amount"
  label: string;         // e.g. "Allocated Member"
  controlType: SearchFilterControlType;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string; color?: string }>;
  isMultiSelect?: boolean;
  isLocked?: boolean;     // user cannot modify this constraint
  isRequired?: boolean;
  targetModuleId?: string; // specific module id or 'ALL'
  description?: string;
}

export interface SearchFieldAlias {
  id: string;
  aliasName: string;      // e.g. "Reference / File #"
  label: string;
  mappings: Array<{ moduleId: string; fieldKey: string }>;
}

export interface SearchUXConfig {
  defaultLayout: 'table' | 'cards' | 'split';
  pageSize: number;
  allowExport: boolean;
  allowPersonalPresets: boolean;
  enableInstantSearch: boolean;
  entityTarget?: SearchTargetEntity;
  exposedControls: SearchParameterExposed[];
  fieldAliases?: SearchFieldAlias[];
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
}

export interface SavedSearchEntity {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  tags?: string[];
  iconName?: string;
  isSearchEnabled: boolean;
  scopeType: SearchScopeType;
  targetModuleIds: string[];
  sql: string;
  parameters: QueryParameter[];
  columnsConfig: QueryColumnConfig[];
  searchConfig: SearchUXConfig;
  allowedRoleIds?: string[];
  status: QueryStatus;
  cacheTtlSeconds?: number;
  downstreamUsagesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchExecutionPayload {
  searchId?: string;
  queryId?: string;
  sql?: string;
  targetModuleIds?: string[];
  scopeType?: SearchScopeType;
  parameters: Record<string, any>;
  page?: number;
  pageSize?: number;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  keyword?: string;
}

export interface SearchExecutionResult {
  rows: any[];
  rowCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
  durationMs: number;
  columns: Array<{ name: string; type: string }>;
  error?: string | null;
}

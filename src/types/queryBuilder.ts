export type ParameterType = 'string' | 'number' | 'boolean' | 'date' | 'date_range' | 'user_id' | 'module_record';

export interface QueryParameter {
  id: string;
  name: string;        // e.g. "status", "minAmount"
  label: string;       // e.g. "Order Status"
  type: ParameterType;
  defaultValue?: any;
  required?: boolean;
  description?: string;
}

export type ColumnDisplayType = 'text' | 'number' | 'currency' | 'date' | 'badge' | 'avatar' | 'boolean' | 'link';

export interface QueryColumnConfig {
  name: string;        // Field name returned from SQL
  label: string;       // Custom display label
  type: ColumnDisplayType;
  visible: boolean;
  formatOptions?: {
    currencyCode?: string;
    dateFormat?: string;
    badgeColors?: Record<string, string>;
  };
}

export type QueryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface SavedQueryEntity {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  tags?: string[];
  iconName?: string;
  sql: string;
  parameters: QueryParameter[];
  columnsConfig: QueryColumnConfig[];
  status: QueryStatus;
  cacheTtlSeconds?: number;
  lastExecutedAt?: string;
  downstreamUsagesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueryExecutionResult {
  rows: any[];
  rowCount: number;
  durationMs: number;
  columns: Array<{ name: string; type: string }>;
  error?: string | null;
}

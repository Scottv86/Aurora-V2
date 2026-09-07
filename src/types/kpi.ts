export type KpiSourceType = 'module_record' | 'saved_query' | 'formula' | 'system';

export type KpiAggregationType = 
  | 'count' 
  | 'sum' 
  | 'avg' 
  | 'min' 
  | 'max' 
  | 'median' 
  | 'percentage' 
  | 'formula';

export type KpiFormatType = 'number' | 'currency' | 'percentage' | 'duration' | 'bytes';

export type KpiTrendDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';

export type KpiTimeHorizon = 
  | 'today' 
  | 'this_week' 
  | 'mtd' 
  | 'qtd' 
  | 'ytd' 
  | 'trailing_30d' 
  | 'all_time' 
  | 'custom';

export interface KpiFilterCondition {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty' | 'in';
  value: any;
}

export interface KpiThresholdRule {
  id?: string;
  condition: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  value: number;
  color: 'emerald' | 'rose' | 'amber' | 'blue' | 'zinc';
  label: string;
  severity?: 'good' | 'warning' | 'critical' | 'neutral';
}

export interface KpiFormatOptions {
  currencyCode?: string; // 'USD', 'AUD', 'EUR', 'GBP'
  decimalPrecision?: number;
  prefix?: string;
  suffix?: string;
  useGrouping?: boolean; // 1,000s separators
  compactNotation?: boolean; // 1.2M, 34K
}

export interface KpiSourceConfig {
  // For module_record source
  moduleId?: string;
  moduleSlug?: string;
  aggregateField?: string;
  aggregateType?: KpiAggregationType;
  dateField?: string; // field to slice time horizons (e.g. 'createdAt', 'closeDate')
  filters?: KpiFilterCondition[];
  filterLogic?: 'AND' | 'OR';
  
  // For saved_query source
  savedQueryId?: string;
  valueColumn?: string;
  comparisonValueColumn?: string;

  // For multi-metric formula source
  formulaExpression?: string; // e.g. "kpi_won_deals / kpi_total_leads * 100"
  metricDependencies?: string[]; // IDs or slugs of other KPI definitions
}

export interface KpiDefinition {
  id: string;
  tenantId: string;
  workspaceId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  tags: string[];
  iconName?: string | null;
  sourceType: KpiSourceType;
  sourceConfig: KpiSourceConfig;
  formula?: string | null;
  format: KpiFormatType;
  formatOptions?: KpiFormatOptions | null;
  trendDirection: KpiTrendDirection;
  targetValue?: number | null;
  targetConfig?: {
    type?: 'static' | 'dynamic_kpi' | 'monthly_budget';
    dynamicKpiId?: string;
    targetPercent?: number;
  } | null;
  thresholds: KpiThresholdRule[];
  timeHorizon: KpiTimeHorizon;
  isGlobal: boolean;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  cacheTtlSeconds: number;
  downstreamUsagesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KpiSparklinePoint {
  date: string;
  value: number;
}

export interface KpiEvaluationResult {
  kpiId: string;
  value: number;
  formattedValue: string;
  previousValue?: number;
  changePercent?: number; // e.g. +14.2% vs previous period
  trend: 'up' | 'down' | 'neutral';
  targetValue?: number;
  targetProgressPercent?: number; // e.g. 85.5% of target achieved
  statusColor: 'emerald' | 'rose' | 'amber' | 'blue' | 'zinc';
  statusLabel?: string;
  sparklineData?: KpiSparklinePoint[];
  matchedRecordCount?: number;
  drillDownFilters?: KpiFilterCondition[];
  evaluatedAt: string;
  cached?: boolean;
}

export interface KpiRibbonItem {
  id: string;
  kpiId?: string;
  label: string;
  iconName?: string;
  color?: string;
  filterKey?: string;
  filterValue?: any;
  customCountQuery?: any;
}

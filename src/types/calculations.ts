export type CalculationMode = 'standard' | 'scientific' | 'financial' | 'records' | 'scratchpad';

export interface CalculationTapeEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
  mode?: CalculationMode;
  variables?: Record<string, any>;
  label?: string;
}

export interface UniversalCalculationItem {
  id: string;
  tenantId: string;
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  title: string;
  mode: CalculationMode;
  expression: string;
  result: string;
  tape: CalculationTapeEntry[];
  variables: Record<string, any>;
  notes?: string;
  isPinned: boolean;
  isArchived: boolean;
  moduleId?: string;
  recordId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  module?: {
    id: string;
    name: string;
    label: string;
    icon?: string;
  };
  record?: {
    id: string;
    data: Record<string, any>;
    createdAt: string;
  };
}

export interface FinancialPresetMargin {
  cost: number;
  revenue: number;
  marginPercent: number;
  markupPercent: number;
  profit: number;
}

export interface FinancialPresetTax {
  netAmount: number;
  taxRate: number; // in percent e.g. 10 for 10%
  taxAmount: number;
  grossAmount: number;
}

export interface FinancialPresetLoan {
  principal: number;
  annualRate: number; // in percent
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
}

export interface ModuleAggregateQuery {
  moduleId: string;
  fieldName: string;
  aggregateType: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'MEDIAN';
  filterField?: string;
  filterValue?: any;
}

export interface ModuleAggregateResult {
  moduleId: string;
  fieldName: string;
  aggregateType: string;
  value: number;
  count: number;
  totalRecords: number;
  sampleSize: number;
}

import { Module } from './platform';

export type PreviewDataSource = 'actual' | 'mock';

export interface ModulePreviewConfig {
  enabled: true;
  /** Live in-memory draft module definition from ModuleEditor (unsaved edits included) */
  moduleOverride: Module;
  /** Active sandbox data mode */
  dataSource: PreviewDataSource;
  /** In-memory sandbox records (cloned real records or generated dummy records) */
  records: Record<string, any>[];
  /** Mutates only the in-memory sandbox records — NEVER writes to Postgres */
  onRecordsChange: (
    updater: (prev: Record<string, any>[]) => Record<string, any>[],
    actionLabel?: string
  ) => void;
  /** Simulated role or permission group ID for testing field security & masking */
  simulatedRole?: string;
  /** Impersonated actual workspace member for testing user-specific views, permissions, and defaults */
  simulatedUser?: {
    id: string;
    userId?: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    roleId?: string;
    isSuperAdmin?: boolean;
    permissionGroupIds?: string[];
    teamId?: string;
    positionId?: string;
  } | null;
  /** Intercepts record selection so clicking a row opens RecordDetailView inside the preview modal */
  onOpenRecord?: (record: Record<string, any>) => void;
  /** Optional form ID to automatically open the Create Record modal on mount */
  initialCreateFormId?: string | null;
  /** True when embedded inside ModuleEditor's Interface -> List View design canvas */
  designMode?: boolean;
  /** Callback when user clicks a configurable region (e.g. '__table_settings') in design mode */
  onSelectDesignTarget?: (targetId: string) => void;
  /** Callback when user switches the master view layout inside ModuleView in design mode */
  onLayoutTypeChange?: (layoutType: string) => void;
}

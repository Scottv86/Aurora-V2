export type DeploymentStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type DeploymentRiskLevel = 'safe' | 'warning' | 'critical';

export interface ScheduledDeployment {
  id: string;
  moduleId: string;
  moduleName: string;
  versionTag: string;
  fromVersion?: string;
  riskLevel: DeploymentRiskLevel;
  changesCount: {
    added: number;
    removed: number;
    modified: number;
    renamed: number;
    total: number;
  };
  generatedSql: string;
  scheduledAt: string; // ISO string
  status: DeploymentStatus;
  maintenanceMode: boolean;
  notifyUsers: boolean;
  autoRollback: boolean;
  softDeleteDropped: boolean;
  createSnapshot: boolean;
  createdAt: string;
  executedAt?: string;
  durationMs?: number;
  author: string;
  error?: string;
  logs?: string[];
}

export interface MaintenanceWindowPreset {
  id: string;
  label: string;
  description: string;
  offsetHours: number;
}

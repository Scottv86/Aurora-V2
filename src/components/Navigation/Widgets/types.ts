import React from 'react';

export type WidgetCategory = 'ambient' | 'productivity' | 'operations';

export interface WidgetCommonProps {
  onOpenCustomize?: () => void;
  isCompact?: boolean;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: WidgetCategory;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultEnabled: boolean;
  defaultOrder: number;
  component: React.ComponentType<WidgetCommonProps>;
}

export interface UserWidgetPreferences {
  enabledIds: string[];
  order: string[];
  maxVisibleDesktop: number; // e.g. 3
  unit?: 'C' | 'F';
}

import React from 'react';
import { SolutionArtifact, SolutionArtifactType } from '../types/solutions';

export interface SolutionArtifactPlugin {
  type: SolutionArtifactType | string;
  label: string;
  description: string;
  iconName: string;
  targetBuilderRoute?: string;
  renderPreview: (artifact: SolutionArtifact) => React.ReactNode;
}

class SolutionArtifactRegistryManager {
  private plugins: Map<string, SolutionArtifactPlugin> = new Map();

  constructor() {
    this.registerBuiltInPlugins();
  }

  public registerPlugin(plugin: SolutionArtifactPlugin) {
    this.plugins.set(plugin.type, plugin);
  }

  public getPlugin(type: string): SolutionArtifactPlugin | undefined {
    return this.plugins.get(type);
  }

  public getAllPlugins(): SolutionArtifactPlugin[] {
    return Array.from(this.plugins.values());
  }

  private registerBuiltInPlugins() {
    // 1. MODULE
    this.registerPlugin({
      type: 'MODULE',
      label: 'Data Record Module',
      description: 'Data collections and record schema definitions',
      iconName: 'Database',
      targetBuilderRoute: '/workspace/settings/platform-modules',
      renderPreview: (_artifact) => null
    });

    // 2. FORM
    this.registerPlugin({
      type: 'FORM',
      label: 'Interactive Form',
      description: '12-column grid interactive user form',
      iconName: 'FileText',
      targetBuilderRoute: '/workspace/settings/platform-modules/forms-library',
      renderPreview: (_artifact) => null
    });

    // 3. WORKFLOW
    this.registerPlugin({
      type: 'WORKFLOW',
      label: 'Process Graph Workflow',
      description: 'Step-by-step visual execution flow graph',
      iconName: 'GitBranch',
      targetBuilderRoute: '/workspace/settings/platform-modules/workflows-library',
      renderPreview: (_artifact) => null
    });

    // 4. NAVIGATION
    this.registerPlugin({
      type: 'NAVIGATION',
      label: 'Portal Navigation Menu',
      description: 'Sidebar and header portal navigation tree',
      iconName: 'Menu',
      targetBuilderRoute: '/workspace/settings/platform-modules/navigation',
      renderPreview: (_artifact) => null
    });

    // 5. SITE / PAGE
    this.registerPlugin({
      type: 'SITE',
      label: 'Web Site & Pages',
      description: 'Client portal web layout and pages list',
      iconName: 'Globe',
      targetBuilderRoute: '/workspace/settings/platform-modules/sites',
      renderPreview: (_artifact) => null
    });

    this.registerPlugin({
      type: 'PAGE',
      label: 'Portal Page',
      description: 'Interactive dashboard or content page',
      iconName: 'Layout',
      targetBuilderRoute: '/workspace/settings/platform-modules/sites',
      renderPreview: (_artifact) => null
    });

    // 6. GLOBAL_LIST
    this.registerPlugin({
      type: 'GLOBAL_LIST',
      label: 'Global Picklist',
      description: 'Shared picklist dropdown options and enum keys',
      iconName: 'ListFilter',
      targetBuilderRoute: '/workspace/settings/platform-modules/global-lists',
      renderPreview: (_artifact) => null
    });

    // 7. AUTOMATION
    this.registerPlugin({
      type: 'AUTOMATION',
      label: 'Event Automation Rule',
      description: 'Triggers, SLA escalations, and automated webhooks',
      iconName: 'Zap',
      targetBuilderRoute: '/workspace/settings/platform-modules/automation-management',
      renderPreview: (_artifact) => null
    });

    // 8. VALIDATION
    this.registerPlugin({
      type: 'VALIDATION',
      label: 'Validation Rules',
      description: 'Field constraints and business validation criteria',
      iconName: 'ShieldCheck',
      targetBuilderRoute: '/workspace/settings/platform-modules/validations',
      renderPreview: (_artifact) => null
    });

    // 9. INTEGRATION / API
    this.registerPlugin({
      type: 'API',
      label: 'REST Endpoint API',
      description: 'OpenAPI endpoints, webhooks, and request schemas',
      iconName: 'Webhook',
      targetBuilderRoute: '/workspace/settings/platform-modules/api-gateway',
      renderPreview: (_artifact) => null
    });

    this.registerPlugin({
      type: 'INTEGRATION',
      label: 'External Integration',
      description: 'Third-party API connectors and authentication rules',
      iconName: 'Plug',
      targetBuilderRoute: '/workspace/settings/platform-modules/integrations',
      renderPreview: (_artifact) => null
    });

    // 10. REPORT
    this.registerPlugin({
      type: 'REPORT',
      label: 'Analytics & Reports',
      description: 'KPI summary metrics cards and chart queries',
      iconName: 'BarChart3',
      targetBuilderRoute: '/workspace/settings/platform-modules/reports-library',
      renderPreview: (_artifact) => null
    });

    // 11. TEMPLATE
    this.registerPlugin({
      type: 'TEMPLATE',
      label: 'Email & Document Template',
      description: 'Dynamic body templates with mustache variable pills',
      iconName: 'Mail',
      targetBuilderRoute: '/workspace/settings/platform-modules/templates-library',
      renderPreview: (_artifact) => null
    });
  }
}

export const solutionArtifactRegistry = new SolutionArtifactRegistryManager();

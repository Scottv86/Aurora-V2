export interface FormattedAction {
  title: string;
  activeTitle: string;
  detail?: string;
}

/**
 * Converts internal tool / procedure names and arguments into clean,
 * friendly, human-readable labels for end users.
 */
export function formatAction(
  name: string,
  args?: any,
  result?: any
): FormattedAction {
  if (!name) {
    return {
      title: 'Completed action',
      activeTitle: 'Processing...',
    };
  }

  // 1. Read-only SQL queries
  if (name === 'execute_read_only_query') {
    const sql = String(args?.sql || '').toLowerCase();
    
    // Check if query is targeting specific records or fields
    if (sql.includes('records')) {
      let detail: string | undefined;
      if (Array.isArray(result)) {
        detail = result.length === 1 ? 'Retrieved 1 record' : `Retrieved ${result.length} records`;
      } else if (result?.dryRunResults && Array.isArray(result.dryRunResults)) {
        detail = `Retrieved ${result.dryRunResults.length} records`;
      }

      return {
        title: 'Checked record details',
        activeTitle: 'Looking up record details...',
        detail: detail || 'Retrieved record data',
      };
    }

    if (sql.includes('tenant_members') || sql.includes('members') || sql.includes('users')) {
      return {
        title: 'Checked team directory',
        activeTitle: 'Looking up team directory...',
        detail: Array.isArray(result) ? `Found ${result.length} members` : undefined,
      };
    }

    if (sql.includes('modules')) {
      return {
        title: 'Checked workspace modules',
        activeTitle: 'Checking workspace modules...',
      };
    }

    if (sql.includes('automations') || sql.includes('workflows')) {
      return {
        title: 'Checked automation rules',
        activeTitle: 'Checking automations...',
      };
    }

    if (sql.includes('connectors') || sql.includes('integrations')) {
      return {
        title: 'Checked integration connectors',
        activeTitle: 'Checking integrations...',
      };
    }

    if (sql.includes('audit') || sql.includes('logs')) {
      return {
        title: 'Checked activity history',
        activeTitle: 'Checking activity history...',
      };
    }

    let resultCountText: string | undefined;
    if (Array.isArray(result)) {
      resultCountText = result.length === 1 ? 'Found 1 item' : `Retrieved ${result.length} items`;
    }

    return {
      title: 'Queried workspace data',
      activeTitle: 'Looking up information...',
      detail: resultCountText,
    };
  }

  // 2. Schema lookups
  if (name === 'get_workspace_schema') {
    return {
      title: 'Checked workspace setup',
      activeTitle: 'Checking workspace structure...',
      detail: 'Loaded modules and fields',
    };
  }

  // 3. Upsert / update records
  if (name === 'upsert_record') {
    const isUpdate = Boolean(args?.recordId);
    return {
      title: isUpdate ? 'Updated record' : 'Created record',
      activeTitle: isUpdate ? 'Updating record...' : 'Saving record...',
      detail: args?.recordId ? `Saved changes for ${args.recordId}` : 'Added new record',
    };
  }

  // 4. Query explain and assist
  if (name === 'query_explain_and_assist') {
    return {
      title: 'Analyzed data query',
      activeTitle: 'Analyzing data query...',
      detail: args?.description ? String(args.description).slice(0, 60) : undefined,
    };
  }

  // 5. Modules
  if (name === 'create_or_update_module') {
    const isUpdate = Boolean(args?.id);
    return {
      title: isUpdate ? 'Updated module' : 'Created module',
      activeTitle: isUpdate ? 'Updating module...' : 'Creating module...',
      detail: args?.name ? `Module: ${args.name}` : undefined,
    };
  }

  // 6. Automations
  if (name === 'create_or_update_automation') {
    const isUpdate = Boolean(args?.id);
    return {
      title: isUpdate ? 'Updated automation' : 'Configured automation',
      activeTitle: 'Configuring automation...',
      detail: args?.name ? `Rule: ${args.name}` : undefined,
    };
  }

  // 7. Connectors
  if (name === 'create_or_update_connector') {
    const isUpdate = Boolean(args?.id);
    return {
      title: isUpdate ? 'Updated integration' : 'Configured integration',
      activeTitle: 'Configuring integration...',
      detail: args?.name ? `Connector: ${args.name}` : undefined,
    };
  }

  // 8. Module fields & tabs
  if (name === 'manage_module_field') {
    const fieldLabel = args?.fieldConfig?.label || args?.fieldConfig?.name;
    return {
      title: 'Configured module field',
      activeTitle: 'Configuring field...',
      detail: fieldLabel ? `Field: ${fieldLabel}` : undefined,
    };
  }

  if (name === 'manage_module_tab') {
    const tabLabel = args?.tabConfig?.label || args?.tabId;
    return {
      title: args?.action === 'RENAME' ? 'Renamed module tab' : 'Configured module tab',
      activeTitle: 'Configuring module tab...',
      detail: tabLabel ? `Tab: ${tabLabel}` : undefined,
    };
  }

  if (name === 'manage_module_interface') {
    const viewName = args?.master?.layoutType || args?.detail?.layoutType;
    return {
      title: 'Updated module view & layout',
      activeTitle: 'Updating module layout...',
      detail: viewName ? `Layout: ${viewName}` : 'Updated list/detail settings',
    };
  }

  // 9. Validation rules
  if (name === 'manage_module_validation') {
    const ruleName = args?.ruleConfig?.name;
    return {
      title: 'Configured validation rule',
      activeTitle: 'Configuring validation...',
      detail: ruleName ? `Rule: ${ruleName}` : undefined,
    };
  }

  // 10. Workflows
  if (name === 'manage_module_workflow') {
    return {
      title: 'Updated workflow stages',
      activeTitle: 'Updating workflow...',
    };
  }

  // 11. Page widgets
  if (name === 'manage_page_widget') {
    return {
      title: 'Customized page widgets',
      activeTitle: 'Customizing layout...',
    };
  }

  // 12. Document templates
  if (name === 'manage_document_template') {
    return {
      title: 'Updated document template',
      activeTitle: 'Updating template...',
      detail: args?.name ? `Template: ${args.name}` : undefined,
    };
  }

  // 13. Document generation
  if (name === 'render_generated_document' || name === 'create_aurora_document') {
    return {
      title: 'Generated document',
      activeTitle: 'Generating document...',
      detail: 'Document artifact ready',
    };
  }

  // 14. Aurora Drive
  if (name === 'save_to_aurora_drive') {
    return {
      title: 'Saved to Drive',
      activeTitle: 'Saving to Drive...',
      detail: 'Stored in Aurora Drive',
    };
  }

  // 15. Web Search & fetch
  if (name === 'search_web') {
    return {
      title: 'Searched the web',
      activeTitle: 'Searching the web...',
      detail: args?.query ? `"${args.query}"` : undefined,
    };
  }

  if (name === 'fetch_web_page') {
    const host = args?.url ? String(args.url).replace(/^https?:\/\//, '').slice(0, 50) : undefined;
    return {
      title: result?.title ? `Read "${result.title}"` : 'Reviewed web page',
      activeTitle: 'Reading web page...',
      detail: host,
    };
  }

  // Solution Studio & Shared Read-Only Tools
  if (name === 'inspect_workspace_schema') {
    return {
      title: 'Inspected workspace modules',
      activeTitle: 'Inspecting workspace modules...',
      detail: args?.moduleName ? `Module: ${args.moduleName}` : 'Loaded live module schemas',
    };
  }
  if (name === 'inspect_tenant_configuration') {
    return {
      title: 'Reviewed workspace configuration',
      activeTitle: 'Checking workspace configuration...',
      detail: 'Roles, teams, connectors & settings',
    };
  }
  if (name === 'inspect_workspace_assets') {
    return {
      title: 'Scanned deployed workspace assets',
      activeTitle: 'Scanning deployed workspace assets...',
    };
  }
  if (name === 'search_knowledge_base_and_drive') {
    return {
      title: 'Searched Knowledge Base & Drive',
      activeTitle: 'Searching Knowledge Base & Drive...',
      detail: args?.query ? `"${args.query}"` : undefined,
    };
  }
  if (name === 'read_attached_source') {
    return {
      title: 'Read attached source document',
      activeTitle: 'Reading attached source...',
      detail: args?.sourceName || undefined,
    };
  }
  if (name === 'get_builder_schema_contract') {
    const types = Array.isArray(args?.builderTypes) ? args.builderTypes.join(', ') : '';
    return {
      title: 'Loaded builder schema contract',
      activeTitle: 'Loading builder schema...',
      detail: types || undefined,
    };
  }
  if (name === 'inspect_draft_artifact') {
    return {
      title: 'Inspected current draft component',
      activeTitle: 'Inspecting draft component...',
      detail: args?.artifactId || undefined,
    };
  }
  if (name === 'evaluate_compliance') {
    return {
      title: 'Evaluated Compliance-as-Code',
      activeTitle: 'Evaluating Compliance-as-Code...',
      detail: typeof result?.score === 'number' ? `Score: ${result.score}/100` : undefined,
    };
  }
  if (name === 'analyze_change_impact') {
    return {
      title: 'Analyzed downstream impact',
      activeTitle: 'Analyzing downstream impact...',
      detail: args?.moduleNameOrId || undefined,
    };
  }
  if (name === 'simulate_rule_or_workflow') {
    return {
      title: 'Dry-ran rule against live records',
      activeTitle: 'Simulating rule on live records...',
      detail: args?.moduleNameOrId || undefined,
    };
  }
  if (name === 'inspect_system_health') {
    return {
      title: 'Checked workspace system health',
      activeTitle: 'Checking system health...',
    };
  }

  // 16. Calculations
  if (name === 'execute_scratch_script') {
    return {
      title: 'Processed calculation',
      activeTitle: 'Calculating data...',
    };
  }

  // 17. Organization graph
  if (name === 'manage_org_graph') {
    return {
      title: 'Updated team structure',
      activeTitle: 'Updating team structure...',
    };
  }

  // 18. Testing & integrations
  if (name === 'test_connector_integration') {
    return {
      title: 'Tested API connection',
      activeTitle: 'Testing connection...',
    };
  }

  if (name === 'manage_webhook_subscription') {
    return {
      title: 'Configured webhook',
      activeTitle: 'Configuring webhook...',
    };
  }

  if (name === 'manage_scheduled_job') {
    return {
      title: 'Configured scheduled task',
      activeTitle: 'Configuring scheduled task...',
    };
  }

  // 19. Audit logs
  if (name === 'explore_audit_trail') {
    return {
      title: 'Checked activity history',
      activeTitle: 'Checking audit history...',
    };
  }

  // 20. Agent profiles
  if (name === 'manage_agent_profile') {
    return {
      title: 'Configured assistant settings',
      activeTitle: 'Updating assistant settings...',
    };
  }

  // 21. Planning
  if (name === 'write_agent_plan') {
    return {
      title: 'Formulated action plan',
      activeTitle: 'Planning workflow...',
    };
  }

  // 22. Subagents
  if (name === 'delegate_subagent') {
    return {
      title: 'Assigned subtask',
      activeTitle: 'Coordinating subtask...',
      detail: args?.role ? `Assigned to ${args.role}` : undefined,
    };
  }

  // Fallback: Clean up any unknown snake_case procedure names
  let clean = name
    .replace(/^execute_/, '')
    .replace(/^get_/, '')
    .replace(/^fetch_/, '')
    .replace(/^api_/, '')
    .replace(/^run_/, '')
    .replace(/^do_/, '')
    .replace(/_/g, ' ')
    .trim();

  if (!clean) clean = 'action';

  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  return {
    title: `Completed ${capitalized.toLowerCase()}`,
    activeTitle: `Processing ${capitalized.toLowerCase()}...`,
  };
}

/**
 * Generates a clean, concise summary line for the collapsed Antigravity-style trace header.
 */
export function formatActionSummary(steps: any[]): string {
  const validSteps = (Array.isArray(steps) ? steps : []).filter(
    (s) => s && s.name && !s._meta
  );

  if (validSteps.length === 0) {
    return 'Worked for a few seconds';
  }

  if (validSteps.length === 1) {
    const formatted = formatAction(validSteps[0].name, validSteps[0].arguments, validSteps[0].result);
    return formatted.title;
  }

  if (validSteps.length === 2) {
    const first = formatAction(validSteps[0].name, validSteps[0].arguments, validSteps[0].result);
    return `${first.title} & 1 more action`;
  }

  return `Completed ${validSteps.length} actions`;
}

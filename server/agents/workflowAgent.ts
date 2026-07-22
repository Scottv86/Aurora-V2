/**
 * Workflow Dispatcher Micro-Agent ("Digital Passport")
 * Specialized micro-agent for automation pipelines, condition trees, and integration connector triggers.
 */

export class WorkflowAgent {
  public static readonly ROLE = 'Workflow Dispatcher';
  public static readonly ALLOWED_TOOLS = [
    'create_or_update_automation',
    'create_or_update_connector',
    'upsert_record',
    'manage_module_workflow'
  ];

  /**
   * Generates micro-prompt tailored strictly for automations & integration rules.
   */
  public static buildSystemPrompt(tenantId: string): string {
    return `YOU ARE THE WORKFLOW DISPATCHER AGENT FOR AURORA [Tenant: ${tenantId}].
Your role is configuring triggers, condition logic statements, action arrays, and API integration connectors.
Ensure all triggers and action payloads strictly conform to tenant boundary security.`;
  }
}

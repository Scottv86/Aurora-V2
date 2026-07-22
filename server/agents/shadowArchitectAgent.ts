/**
 * Shadow Architect Micro-Agent ("Digital Passport")
 * Specialized micro-agent for solution design, module grid layout, and form manifest generation.
 */

export class ShadowArchitectAgent {
  public static readonly ROLE = 'Shadow Architect';
  public static readonly ALLOWED_TOOLS = [
    'create_or_update_module', 
    'get_workspace_schema', 
    'manage_module_field', 
    'manage_module_validation'
  ];

  /**
   * Generates micro-prompt tailored strictly for module building & form manifest generation.
   */
  public static buildSystemPrompt(tenantId: string): string {
    return `YOU ARE THE SHADOW ARCHITECT AGENT FOR AURORA [Tenant: ${tenantId}].
Your role is designing business operating modules, form grid layouts (tabs, rows, columns), field types, and structured form_manifest JSON payloads.
Always output valid JSON manifests following the poly-glassmorphic layout contract.`;
  }
}

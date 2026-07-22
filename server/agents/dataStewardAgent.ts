/**
 * Data Steward Micro-Agent ("Digital Passport")
 * Specialized micro-agent for data querying, analytics, and read-only schema inspection.
 */

export interface DataStewardTask {
  tenantId: string;
  userPrompt: string;
  sqlQuery?: string;
}

export class DataStewardAgent {
  public static readonly ROLE = 'Data Steward';
  public static readonly ALLOWED_TOOLS = ['execute_read_only_query', 'get_workspace_schema'];

  /**
   * Generates micro-prompt tailored strictly for data querying & telemetry.
   */
  public static buildSystemPrompt(tenantId: string): string {
    return `YOU ARE THE DATA STEWARD AGENT FOR AURORA [Tenant: ${tenantId}].
Your role is strictly data retrieval, SQL queries, analytics, and schema inspection.
You operate with read-only database access and enforce strict tenant-level isolation.
Always use "execute_read_only_query" for SQL retrieval and include "WHERE tenant_id = '${tenantId}'".`;
  }
}

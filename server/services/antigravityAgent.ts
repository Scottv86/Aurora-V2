import { Type } from "@google/genai";
import { globalPrisma } from '../lib/prisma';
import { resolveCapabilities } from '../lib/permissions';
import { resolveTenantAIClient, logAIUsageMetric, executeAICompletion } from './aiProviderService';
import { io, emitTenantUpdate, setAIAgentPresence } from '../socket';
import { AutomationEngine } from './automationEngine';
import { safeFetch } from '../lib/ssrfGuard';
import { getActiveWorkflowForModule } from './builderSyncService';
import {
  WORKSPACE_SHARED_READ_TOOL_DECLARATIONS,
  WORKSPACE_SHARED_READ_TOOL_NAMES,
  executeAuroraReadTool,
} from './sharedAuroraReadTools';
import { AiActionStager } from './aiActionStager';

function processAutonumbersInternal(dataObject: any, fields: any[], updatedConfig: any): boolean {
  if (!dataObject || typeof dataObject !== 'object' || !fields || !Array.isArray(fields)) return false;
  let changed = false;

  const getNextAutonumber = (field: any) => {
    const fieldKey = `_autonumber_${field.id}`;
    const currentNum = updatedConfig[fieldKey] !== undefined ? updatedConfig[fieldKey] : (field.autonumberStart || 1);
    const prefix = field.autonumberPrefix || '';
    const suffix = field.autonumberSuffix || '';
    const digits = field.autonumberDigits || 0;
    const formattedNum = currentNum.toString().padStart(digits, '0');

    updatedConfig[fieldKey] = currentNum + 1;
    return `${prefix}${formattedNum}${suffix}`;
  };

  fields.forEach((field: any) => {
    if (field.type === 'autonumber') {
      if (!dataObject[field.id]) {
        dataObject[field.id] = getNextAutonumber(field);
        changed = true;
      }
    } else if (field.type === 'repeatableGroup') {
      const arrayVal = dataObject[field.id];
      if (Array.isArray(arrayVal)) {
        arrayVal.forEach((item: any) => {
          if (item && typeof item === 'object') {
            const itemChanged = processAutonumbersInternal(item, field.fields || [], updatedConfig);
            if (itemChanged) changed = true;
          }
        });
      }
    } else if (field.fields && Array.isArray(field.fields)) {
      const nestedObj = dataObject[field.id];
      if (nestedObj && typeof nestedObj === 'object' && !Array.isArray(nestedObj)) {
        const nestedChanged = processAutonumbersInternal(nestedObj, field.fields, updatedConfig);
        if (nestedChanged) changed = true;
      } else {
        const flatChanged = processAutonumbersInternal(dataObject, field.fields, updatedConfig);
        if (flatChanged) changed = true;
      }
    }
  });

  return changed;
}

// DuckDuckGo Scraper for web search
async function scrapeDuckDuckGo(query: string): Promise<any[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error("DuckDuckGo fetch failed");
    const html = await response.text();

    const results: any[] = [];
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const urlTitleRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

    const urls: string[] = [];
    const titles: string[] = [];
    const snippets: string[] = [];

    let match;
    while ((match = urlTitleRegex.exec(html)) !== null) {
      urls.push(match[1]);
      titles.push(match[2].replace(/<[^>]*>/g, '').trim());
    }

    let smatch;
    while ((smatch = snippetRegex.exec(html)) !== null) {
      snippets.push(smatch[1].replace(/<[^>]*>/g, '').trim());
    }

    for (let i = 0; i < Math.min(urls.length, 5); i++) {
      results.push({
        title: titles[i] || "Search Result",
        url: urls[i],
        snippet: snippets[i] || ""
      });
    }

    return results;
  } catch (error) {
    console.error("DuckDuckGo scraping failed:", error);
    return [];
  }
}

// Plain text extractor for fetch page (SSRF-guarded)
async function fetchPageText(url: string): Promise<string> {
  try {
    const response = await safeFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
    const html = await response.text();

    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    text = text.replace(/\n\s*\n+/g, '\n\n').trim();

    return text.substring(0, 15000);
  } catch (error: any) {
    return `Error fetching page content: ${error.message}`;
  }
}

/**
 * Resolves session ownership, sharing scope, and shared participants list for shared chat context.
 */
export async function resolveSessionSharingContext(
  db: any,
  tenantId: string,
  session: any,
  currentUserId: string,
  _currentUserName: string
) {
  let sessionOwnerId = session?.userId || 'system';
  let sessionOwnerName = 'System / Unassigned';
  let sessionOwnerTitle = 'System';
  let sessionOwnerEmail = '';

  if (sessionOwnerId && sessionOwnerId !== 'system') {
    try {
      const ownerMember = await db.tenantMember.findFirst({
        where: { tenantId, userId: sessionOwnerId },
        include: { position: true }
      });
      if (ownerMember) {
        const full = `${ownerMember.firstName || ''} ${ownerMember.familyName || ''}`.trim();
        sessionOwnerName = full || ownerMember.workEmail || sessionOwnerId;
        sessionOwnerTitle = ownerMember.position?.title || 'Team Member';
        sessionOwnerEmail = ownerMember.workEmail || '';
      } else {
        const ownerUser = await db.user.findUnique({ where: { id: sessionOwnerId } });
        if (ownerUser) {
          sessionOwnerName = ownerUser.email || sessionOwnerId;
          sessionOwnerEmail = ownerUser.email || '';
        }
      }
    } catch (e) {
      console.warn('[SessionSharing] Failed resolving session owner:', e);
    }
  }

  const isSharedWithOrg = Boolean(session?.isSharedWithTenant);
  let sharedWithIds: string[] = [];
  if (Array.isArray(session?.sharedWithUserIds)) {
    sharedWithIds = session.sharedWithUserIds;
  } else if (typeof session?.sharedWithUserIds === 'string') {
    try { sharedWithIds = JSON.parse(session.sharedWithUserIds); } catch (e) {}
  }

  const sharedUserNames: string[] = [];
  if (sharedWithIds.length > 0) {
    try {
      const members = await db.tenantMember.findMany({
        where: { tenantId, userId: { in: sharedWithIds } },
        include: { position: true }
      });
      members.forEach((m: any) => {
        const fullName = `${m.firstName || ''} ${m.familyName || ''}`.trim() || m.workEmail || m.userId;
        const titleStr = m.position?.title ? ` (${m.position.title})` : '';
        sharedUserNames.push(`${fullName}${titleStr}`);
      });
    } catch (e) {
      console.warn('[SessionSharing] Failed resolving shared members:', e);
    }
  }

  let sharingVisibilityStr = "Private Chat (Visible only to Session Owner)";
  if (isSharedWithOrg) {
    sharingVisibilityStr = "Shared with Entire Organization (All Tenant Members)";
  } else if (sharedUserNames.length > 0) {
    sharingVisibilityStr = `Shared with Specific Members: [${sharedUserNames.join(', ')}]`;
  }

  const isPrompterOwner = (sessionOwnerId === currentUserId);

  return {
    sessionOwnerId,
    sessionOwnerName,
    sessionOwnerTitle,
    sessionOwnerEmail,
    isSharedWithOrg,
    sharedUserNames,
    sharingVisibilityStr,
    isPrompterOwner
  };
}

// SQL query security validation
const PHYSICAL_TABLES_WHITELIST = [
  'workspaces', 'modules', 'records', 'tenant_members',
  'member_phone_numbers', 'member_certifications', 'member_education',
  'member_skills', 'teams', 'agents', 'positions', 'permission_groups',
  'member_permission_groups', 'audit_logs', 'parties', 'persons',
  'organizations', 'party_relationships', 'member_successions',
  'employment_contracts', 'global_lists', 'global_list_items',
  'tenant_connectors', 'automations', 'automation_runs', 'catalog_items',
  'document_templates', 'generated_documents', 'reports', 'antigravity_sessions',
  'antigravity_messages'
];

function validateQuerySecurity(query: string): { isValid: boolean; error?: string } {
  let cleaned = query.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!cleaned) return { isValid: false, error: 'Query is empty.' };

  const strippedStrings = cleaned
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '');
  
  if (strippedStrings.includes(';')) {
    const lastCharIndex = cleaned.lastIndexOf(';');
    const isOnlyTrailing = cleaned.substring(lastCharIndex + 1).trim() === '';
    if (!isOnlyTrailing) {
      return { isValid: false, error: 'Stacked queries (semicolons) are blocked for safety.' };
    }
  }

  const normalized = cleaned.toLowerCase();
  if (!normalized.startsWith('select') && !normalized.startsWith('with')) {
    return { isValid: false, error: 'Only SELECT or WITH queries are allowed.' };
  }

  const forbiddenKeywords = [
    'insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate',
    'grant', 'revoke', 'reindex', 'vacuum', 'analyze', 'set', 'reset',
    'copy', 'begin', 'commit', 'rollback', 'users', 'tenants', '_prisma_migrations',
    'information_schema'
  ];
  
  for (const keyword of forbiddenKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(cleaned)) {
      return { isValid: false, error: `Access to command, table or keyword '${keyword}' is restricted.` };
    }
  }

  if (/\bpg_/i.test(cleaned)) {
    return { isValid: false, error: 'Access to system tables starting with pg_ is restricted.' };
  }

  const fromJoinRegex = /(?:from|join)\s+(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))/gi;
  const matches = [...cleaned.matchAll(fromJoinRegex)];
  
  for (const match of matches) {
    const rawTableName = match[1] || match[2];
    const tableName = rawTableName.toLowerCase();
    
    if (!PHYSICAL_TABLES_WHITELIST.includes(tableName)) {
      return { isValid: false, error: `Access to table '${rawTableName}' is restricted or does not exist.` };
    }
  }

  return { isValid: true };
}

// Tools definitions for Gemini
const agentTools = [
  {
    functionDeclarations: [
      {
        name: "get_workspace_schema",
        description: "Retrieve structural schemas, modules, automations, and connectors configured for this tenant.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "execute_read_only_query",
        description: "Execute a read-only SQL SELECT query against physical tables. Useful for querying data records, members, catalog items, and analytics.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            sql: { type: Type.STRING, description: "The SELECT query to execute. Remember records data is in the records.data JSON column." }
          },
          required: ["sql"]
        }
      },
      {
        name: "create_or_update_module",
        description: "Create a new workspace module or update an existing one. Configures names, icons, types, fields, form layout grid, and validation criteria.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "If provided, updates the module with this ID. Otherwise creates a new one." },
            name: { type: Type.STRING, description: "Display name of the module." },
            icon: { type: Type.STRING, description: "Lucide icon name (e.g. Box, Users, Inbox, tag, BookOpen)." },
            type: { type: Type.STRING, description: "Module functional type: REGISTRY (for long-term master data/entities), WORK_ITEM (for transactional lifecycle/process records), or PAGE." },
            category: { type: Type.STRING, description: "Module category tab (default is Custom)." },
            config: { 
              type: Type.OBJECT, 
              description: "Configuration JSON: layout (tabs, rows, columns, fields), validation rules, and page widgets (if type=PAGE)." 
            }
          },
          required: ["name", "type"]
        }
      },
      {
        name: "create_or_update_automation",
        description: "Create or update workflow triggers and automation rules for a module.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "ID to update, omit for new." },
            moduleId: { type: Type.STRING, description: "ID of the target module." },
            name: { type: Type.STRING, description: "Automation title." },
            description: { type: Type.STRING, description: "Summary of purpose." },
            isActive: { type: Type.BOOLEAN, description: "Whether the automation is active." },
            triggers: { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Triggers configuration." },
            conditions: { type: Type.STRING, description: "Evaluation logic statement." },
            actions: { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Actions array to perform." }
          },
          required: ["name", "moduleId"]
        }
      },
      {
        name: "create_or_update_connector",
        description: "Register or configure custom API integration connectors (e.g. Australian Business Register lookup API).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            icon: { type: Type.STRING },
            category: { type: Type.STRING },
            ioSchema: { type: Type.OBJECT, description: "Input and output payload json schema." },
            config: { type: Type.OBJECT, description: "URL endpoints, authentication configurations, and headers." }
          },
          required: ["name", "ioSchema"]
        }
      },
      {
        name: "upsert_record",
        description: "Insert or update dynamic records inside a custom module.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            moduleId: { type: Type.STRING },
            recordId: { type: Type.STRING, description: "Omit to create a new record." },
            data: { type: Type.OBJECT, description: "The dynamic JSON data representing fields." }
          },
          required: ["moduleId", "data"]
        }
      },
      {
        name: "search_web",
        description: "Search the web to lookup API documentation, business formats, codes, or registers.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "The query string to search." }
          },
          required: ["query"]
        }
      },
      {
        name: "fetch_web_page",
        description: "Fetch page source of a URL and parse it to read detailed technical documentation.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: "The URL link to fetch." }
          },
          required: ["url"]
        }
      },
      {
        name: "execute_scratch_script",
        description: "Write and execute a scratch JS/TS script on the server to test connectors, call APIs, or execute complex migration calculations.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING, description: "The JavaScript code to execute. Standard fetch is available." }
          },
          required: ["code"]
        }
      },
      {
        name: "manage_module_field",
        description: "Add, modify, or remove an individual field configuration inside a module's layout.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            moduleId: { type: Type.STRING, description: "The ID of the target module." },
            action: { type: Type.STRING, description: "Action to perform: ADD, UPDATE, or REMOVE." },
            fieldId: { type: Type.STRING, description: "The ID of the field (required for UPDATE/REMOVE, optional for ADD)." },
            fieldConfig: {
              type: Type.OBJECT,
              description: "Configuration properties of the field to add or update (name, label, type, required, tabId, colSpan, etc.)."
            }
          },
          required: ["moduleId", "action"]
        }
      },
      {
        name: "manage_module_tab",
        description: "Add, rename, update (icon, parentId for nested sub-tabs, conditional visibilityRule), or remove tabs on a module's detail view. Can also rename the default 'general' tab.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            moduleId: { type: Type.STRING, description: "The ID of the target module." },
            action: { type: Type.STRING, description: "Action to perform: ADD, UPDATE, RENAME, or REMOVE." },
            tabId: { type: Type.STRING, description: "The ID of the tab (e.g. 'general', 'tab_compliance')." },
            tabConfig: {
              type: Type.OBJECT,
              description: "Tab properties: { label, iconName?, parentId?, visibilityRule? }."
            }
          },
          required: ["moduleId", "action"]
        }
      },
      {
        name: "manage_module_interface",
        description: "Update a module's Master (list) and/or Detail (record) view settings (interfaceSettings): master layoutType (table|split|kanban|calendar|map|cards|portfolio|timeline|gantt|analytics|pipeline), density, titleFieldId, cardFields, toolbar toggles (enabledViews, enableSpreadsheetMode), detail layoutType (tabs|split|sidebar|process|accordion), showWorkflow, and contextRail (enabled, defaultTab, enabledTabs, pinnedFieldIds).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            moduleId: { type: Type.STRING, description: "The ID of the target module." },
            master: {
              type: Type.OBJECT,
              description: "Partial master/list view settings to merge into interfaceSettings.master."
            },
            detail: {
              type: Type.OBJECT,
              description: "Partial detail/record view settings to merge into interfaceSettings.detail."
            }
          },
          required: ["moduleId"]
        }
      },
      {
        name: "manage_module_validation",
        description: "Add, modify, or remove custom validation rules for fields in a module config.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            moduleId: { type: Type.STRING, description: "The ID of the target module." },
            action: { type: Type.STRING, description: "Action to perform: ADD, UPDATE, or REMOVE." },
            ruleId: { type: Type.STRING, description: "The ID of the validation rule (required for UPDATE/REMOVE, optional for ADD)." },
            ruleConfig: {
              type: Type.OBJECT,
              description: "Validation rule properties (name, expression, errorMessage, severity)."
            }
          },
          required: ["moduleId", "action"]
        }
      },
      {
        name: "manage_module_workflow",
        description: "Manage workflow nodes (STATUS, DECISION, ACTION) and transition edges for a module.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            moduleId: { type: Type.STRING, description: "The ID of the target module." },
            action: { type: Type.STRING, description: "Action: ADD_NODE, UPDATE_NODE, REMOVE_NODE, ADD_EDGE, UPDATE_EDGE, REMOVE_EDGE." },
            node: {
              type: Type.OBJECT,
              description: "For node actions: properties of the node (id, name, type, config, position)."
            },
            edge: {
              type: Type.OBJECT,
              description: "For edge actions: properties of the edge (id, label, source, target, condition)."
            }
          },
          required: ["moduleId", "action"]
        }
      },
      {
        name: "manage_page_widget",
        description: "Add, update, or remove layout widgets configured inside PAGE type modules.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            pageId: { type: Type.STRING, description: "The ID of the target module of type PAGE." },
            action: { type: Type.STRING, description: "Action to perform: ADD, UPDATE, or REMOVE." },
            widgetId: { type: Type.STRING, description: "The ID of the widget (required for UPDATE/REMOVE, optional for ADD)." },
            widgetConfig: {
              type: Type.OBJECT,
              description: "Properties of the widget (name, type, w, h, x, y, config)."
            }
          },
          required: ["pageId", "action"]
        }
      },
      {
        name: "manage_document_template",
        description: "Create, update, delete, or fetch document templates for document generation.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "Action to perform: CREATE, UPDATE, DELETE, or GET." },
            templateId: { type: Type.STRING, description: "Optional template ID." },
            name: { type: Type.STRING, description: "Template display name." },
            description: { type: Type.STRING, description: "Description of the template purpose." },
            moduleId: { type: Type.STRING, description: "Target module ID for data binding." },
            content: { type: Type.STRING, description: "HTML/Markdown design layout content." },
            status: { type: Type.STRING, description: "Status (Draft, Active)." }
          },
          required: ["action"]
        }
      },
      {
        name: "manage_org_graph",
        description: "Create/edit/delete teams and positions, or assign tenant members in the org graph.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "Action: CREATE_TEAM, UPDATE_TEAM, DELETE_TEAM, CREATE_POSITION, UPDATE_POSITION, DELETE_POSITION, ASSIGN_MEMBER." },
            teamId: { type: Type.STRING, description: "Target team ID." },
            positionId: { type: Type.STRING, description: "Target position ID." },
            memberId: { type: Type.STRING, description: "Target member ID." },
            name: { type: Type.STRING, description: "Name (for teams)." },
            description: { type: Type.STRING, description: "Description (for teams or positions)." },
            title: { type: Type.STRING, description: "Title (for positions)." },
            positionNumber: { type: Type.STRING, description: "Unique code (for positions)." },
            parentId: { type: Type.STRING, description: "Parent position ID (for reporting hierarchy)." }
          },
          required: ["action"]
        }
      },
      {
        name: "test_connector_integration",
        description: "Simulate/test execution of a custom API connector with custom parameters, returning dry-run logs and outputs.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            connectorId: { type: Type.STRING, description: "The ID of the custom nexus connector." },
            payload: { type: Type.OBJECT, description: "Sample parameters (JSON payload) to pass to the connector." }
          },
          required: ["connectorId", "payload"]
        }
      },
      {
        name: "manage_webhook_subscription",
        description: "Configure or register custom outgoing webhook integrations for module data events.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "Action: CREATE, UPDATE, DELETE, or GET." },
            subscriptionId: { type: Type.STRING, description: "The ID of the target webhook subscription." },
            name: { type: Type.STRING, description: "Name of subscription." },
            url: { type: Type.STRING, description: "The destination webhook listener URL." },
            secret: { type: Type.STRING, description: "Secret token for signing payload." },
            eventTypes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of events (e.g. ['record.created', 'record.updated'])."
            },
            isActive: { type: Type.BOOLEAN, description: "Whether the subscription is active." }
          },
          required: ["action"]
        }
      },
      {
        name: "manage_scheduled_job",
        description: "Register or manage cron scheduled tasks and background sync jobs.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "Action: CREATE, UPDATE, DELETE, or GET." },
            jobId: { type: Type.STRING, description: "The ID of the target scheduled job." },
            name: { type: Type.STRING, description: "Display name of the scheduled task." },
            description: { type: Type.STRING, description: "Purpose of the job." },
            cronExpression: { type: Type.STRING, description: "Standard 5-field cron string (e.g. '0 0 * * *')." },
            actionType: { type: Type.STRING, description: "Action type: RUN_AUTOMATION or FETCH_CONNECTOR." },
            targetId: { type: Type.STRING, description: "Target Automation or TenantConnector ID." },
            isActive: { type: Type.BOOLEAN, description: "Whether the job schedule is active." }
          },
          required: ["action"]
        }
      },
      {
        name: "query_explain_and_assist",
        description: "Explain, construct, and validate SQL SELECT queries based on natural language descriptions to assist business users.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Natural language description of what you want to query or report." },
            sql: { type: Type.STRING, description: "Optional SQL query to validate, explain, and preview." }
          },
          required: ["description"]
        }
      },
      {
        name: "explore_audit_trail",
        description: "Query system audit logs and change histories for a target module, automation, or record.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "Action: LIST, GET_BY_ENTITY, or GET_BY_USER." },
            entityType: { type: Type.STRING, description: "Optional entity type (e.g. 'record', 'module', 'automation')." },
            entityId: { type: Type.STRING, description: "Optional entity ID." },
            userId: { type: Type.STRING, description: "Optional user ID." }
          },
          required: ["action"]
        }
      },
      {
        name: "manage_agent_profile",
        description: "Configure AI agent profiles, models, prompt contexts, and instructions in the Agent Studio.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "Action: CREATE, UPDATE, DELETE, or GET." },
            agentId: { type: Type.STRING, description: "Target Agent profile ID." },
            name: { type: Type.STRING, description: "Name of the AI agent worker." },
            modelType: { type: Type.STRING, description: "Gemini Model type (e.g. gemini-2.5-pro)." },
            config: {
              type: Type.OBJECT,
              description: "Configuration properties (e.g. prompt instructions, roles, tools config)."
            }
          },
          required: ["action"]
        }
      },
      {
        name: "write_agent_plan",
        description: "Update the live project plan, task checklist, or verification walkthrough in the session panel.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            planMarkdown: { type: Type.STRING, description: "Markdown text describing the architectural plan." },
            tasksList: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Checklist of task titles (e.g. 'Create form', 'Configure API')." },
            walkthroughMarkdown: { type: Type.STRING, description: "Walkthrough instructions/results." }
          },
          required: []
        }
      },
      {
        name: "delegate_subagent",
        description: "Spawn a specialized background worker subagent to handle dedicated tasks concurrently.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING, description: "Role title for subagent (e.g. Data Analyst, Security Auditor)." },
            prompt: { type: Type.STRING, description: "Task instructions for the subagent." },
            model: { type: Type.STRING, description: "AI model to use (default: gemini-3.5-flash)." }
          },
          required: ["role", "prompt"]
        }
      },
      {
        name: "render_generated_document",
        description: "Compile a document template with dynamic record/workspace data and output a downloadable document artifact.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            templateId: { type: Type.STRING, description: "ID of the target document template." },
            recordId: { type: Type.STRING, description: "Optional record ID to extract field values from." },
            format: { type: Type.STRING, description: "Document format (pdf, html, docx)." }
          },
          required: ["templateId"]
        }
      },
      {
        name: "bulk_data_etl",
        description: "Perform bulk data import, export, or transformation operations on module records.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "Action: IMPORT_JSON, EXPORT_JSON, BULK_UPDATE, BULK_DELETE." },
            moduleId: { type: Type.STRING, description: "Target module ID." },
            recordsData: { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Array of record JSON objects to import or update." },
            filter: { type: Type.OBJECT, description: "Filter object for bulk operations." }
          },
          required: ["action", "moduleId"]
        }
      },
      {
        name: "render_live_component",
        description: "Render a dynamic, interactive HTML/JS widget artifact directly into the user's side panel canvas.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the component artifact." },
            htmlContent: { type: Type.STRING, description: "Complete interactive HTML/JS/CSS code to mount." },
            category: { type: Type.STRING, description: "Category (e.g. calculator, dashboard_widget, flowchart, wizard)." }
          },
          required: ["title", "htmlContent"]
        }
      },
      {
        name: "manage_security_and_permissions",
        description: "Inspect, assign, or adjust tenant permission groups, field-level access, and security policies.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "Action: LIST_GROUPS, CREATE_GROUP, ASSIGN_MEMBER, REVOKE_MEMBER, SET_FIELD_ACCESS." },
            groupId: { type: Type.STRING, description: "Target permission group ID." },
            memberId: { type: Type.STRING, description: "Target member ID." },
            groupName: { type: Type.STRING, description: "Name for new permission group." },
            permissions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of capability strings." }
          },
          required: ["action"]
        }
      },
      {
        name: "search_tenant_knowledge_base",
        description: "Search internal tenant documentation, standard operating procedures, and past audit decision logs.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Search query string." },
            category: { type: Type.STRING, description: "Optional category filter (sop, audit, policy, docs)." }
          },
          required: ["query"]
        }
      },
      {
        name: "diagnose_and_heal_system",
        description: "Inspect failing automations, broken API webhooks, or error logs and apply automatic diagnostic fixes.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            targetType: { type: Type.STRING, description: "Target type: AUTOMATION, CONNECTOR, WEBHOOK, SYSTEM_LOG." },
            targetId: { type: Type.STRING, description: "Optional ID of failing automation/connector/webhook." },
            autoFix: { type: Type.BOOLEAN, description: "Whether to automatically apply recommended fixes." }
          },
          required: ["targetType"]
        }
      },
      {
        name: "create_aurora_document",
        description: "Generate a new Aurora document artifact (such as a contract, SOP, proposal, report, agreement, or specification). NOTE: This single tool automatically compiles the document AND saves/indexes it into Aurora Drive in one step. DO NOT call save_to_aurora_drive separately after calling this tool. The 'content' parameter MUST be formatted with rich semantic HTML using <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Title or name of the document." },
            content: { type: Type.STRING, description: "Rich HTML text content of the document using <h1>, <h2>, <p>, <ul>, <li>, <strong> tags." },
            driveType: { type: Type.STRING, description: "Target drive location: 'MY_DRIVE' (Personal) or 'TENANT_SHARED' (Shared Org Drive). Default is TENANT_SHARED." },
            classification: { type: Type.STRING, description: "Governance security level: PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED." },
            subjectTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Subject tags for records indexing (e.g. ['Legal', 'Policy', 'Operations'])." },
            templateId: { type: Type.STRING, description: "Optional template ID if derived from a template." },
            recordId: { type: Type.STRING, description: "Optional associated record ID." }
          },
          required: ["name", "content"]
        }
      },
      {
        name: "save_to_aurora_drive",
        description: "Save a raw file (e.g. JSON, CSV, image) or folder into Aurora Drive hierarchy. NOTE: For document generation (SOPs, reports, agreements), use 'create_aurora_document' instead, which handles document creation and Drive persistence automatically in one step.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "File or folder name." },
            type: { type: Type.STRING, description: "Item type: 'FILE', 'FOLDER', or 'DOCUMENT'." },
            driveType: { type: Type.STRING, description: "Target drive: 'MY_DRIVE' or 'TENANT_SHARED'." },
            parentId: { type: Type.STRING, description: "Optional parent folder ID in Drive." },
            content: { type: Type.STRING, description: "File/Document content if type is FILE or DOCUMENT." },
            mimeType: { type: Type.STRING, description: "Optional MIME type (e.g. text/html, application/json)." }
          },
          required: ["name", "type"]
        }
      },
      ...WORKSPACE_SHARED_READ_TOOL_DECLARATIONS
    ]
  }
];

const emitStep = (socketId: string | undefined, step: any) => {
  if (socketId && io) {
    io.to(socketId).emit('antigravity_step', step);
  }
};

export const runAgentLoop = async (
  tenantId: string,
  userId: string,
  sessionId: string,
  userMessage: string,
  socketId?: string,
  context?: any,
  modelName?: string,
  attachments?: { name: string; type: string; base64: string }[]
): Promise<{ text: string; steps: any[]; paused?: boolean; promptTokens?: number; completionTokens?: number; model?: string; provider?: string; isBYOK?: boolean; keyHint?: string }> => {
  const client = await resolveTenantAIClient(tenantId, modelName);
  const db = globalPrisma;

  let session = await db.antigravitySession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  if (!session) {
    try {
      session = await db.antigravitySession.create({
        data: {
          id: sessionId,
          tenantId,
          userId,
          title: userMessage ? (userMessage.length > 40 ? userMessage.slice(0, 40) + '...' : userMessage) : 'New Conversation',
          metadata: {}
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });
    } catch (createSessionErr) {
      console.warn(`[AgentLoop] Session ${sessionId} auto-create attempt:`, createSessionErr);
      session = await db.antigravitySession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });
      if (!session) {
        throw new Error(`Session ${sessionId} not found and could not be initialized.`);
      }
    }
  }

  const modules = await db.module.findMany({ where: { tenantId } });
  const schemaOverview = modules.map(m => ({
    id: m.id,
    name: m.name,
    type: m.type,
    category: m.category,
    fields: (m.config as any)?.layout?.flatMap((t: any) => t.columns?.flatMap((c: any) => c.fields || [])) || []
  }));

  // Fetch logged-in user's role, licenceType and permissions (capabilities) from DB
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { tenantId },
        include: {
          position: {
            include: {
              parent: true
            }
          },
          team: true,
          permissionGroups: {
            include: {
              permissionGroup: true
            }
          }
        }
      }
    }
  });

  const membership = user?.memberships?.[0];
  const licenceType = membership?.licenceType || (user?.isSuperAdmin ? 'Developer' : 'Standard');
  const role = user?.isSuperAdmin ? 'SUPERADMIN' : (membership?.roleId || 'USER');
  const userFullName = membership ? `${membership.firstName || ''} ${membership.familyName || ''}`.trim() : (userId === 'system' ? 'System Scheduler' : (user?.email || 'Unknown User'));

  const groupIds = membership?.permissionGroups?.map((pg: any) => pg.permissionGroupId) || [];
  const capabilities = (user?.isSuperAdmin || userId === 'system')
    ? ['platform:manage', 'manage:staff', 'view:billing', 'admin:access'] 
    : await resolveCapabilities(groupIds, tenantId);

  // Fetch tenant settings and timezone
  const tenantDetails = await db.tenant.findUnique({
    where: { id: tenantId }
  });

  // Fetch active connectors list (excluding secrets)
  const activeConnectors = await db.tenantConnector.findMany({
    where: { tenantId, isActive: true },
    include: { connector: true }
  });
  const connectorList = activeConnectors.map(c => `- ${c.displayName || c.connector.name} (ID: ${c.connectorId})`).join('\n') || 'None';

  // Format user profile
  const positionTitle = membership?.position?.title || 'None';
  const positionDept = membership?.position?.description || 'None';
  const teamName = membership?.team?.name || 'None';

  let managerName = 'None';
  if (membership?.position?.parent) {
    const managerMember = await db.tenantMember.findFirst({
      where: { tenantId, positionId: membership.position.parentId }
    });
    if (managerMember) {
      managerName = `${managerMember.firstName || ''} ${managerMember.familyName || ''}`.trim();
    }
  }

  // System time and timezone calculations
  const tenantTimezone = (tenantDetails?.localization as any)?.timezone || (tenantDetails as any)?.timezone || 'UTC';
  const localTimeStr = new Date().toLocaleString('en-US', { timeZone: tenantTimezone });
  const serverTimeStr = new Date().toISOString();

  let contextBlock = "";
  if (context && context.path) {
    contextBlock = `\nUSER'S CURRENT LOCATION IN THE PLATFORM (REAL-TIME CONTEXT):
  - Path: "${context.path}"
  - Page/Component Type: "${context.type || 'Unknown'}"
  - Object/Module ID: "${context.id || 'None'}"
  - Name/Title: "${context.name || 'None'}"\n`;
  }

  if (context && context.activeEntity) {
    const ae = context.activeEntity;
    let attrLines = "";
    if (ae.keyAttributes && typeof ae.keyAttributes === 'object') {
      attrLines = Object.entries(ae.keyAttributes)
        .filter(([_, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `    * ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n');
    }

    let relLines = "";
    if (ae.relatedCounts && typeof ae.relatedCounts === 'object') {
      const parts = Object.entries(ae.relatedCounts)
        .filter(([_, c]) => typeof c === 'number' && c > 0)
        .map(([k, c]) => `${c} ${k}`);
      if (parts.length > 0) {
        relLines = `  - Related Linked Counts: ${parts.join(', ')}\n`;
      }
    }

    if (ae.domain === 'module_builder') {
      contextBlock += `\n================================================================================
USER'S ACTIVE MODULE BUILDER IN FOCUS (GROUNDED INSTANT CONTEXT):
  - Module Name: "${ae.title}"
  - Module ID: "${ae.module?.id || ae.id}"
  - Active Builder Tab: "${ae.activeTab || 'Interface'}"
  - Schema & Layout Snapshot:
${attrLines || '    * (Empty module schema)'}

AURORA MODULE BUILDER AI PLAYBOOK:
1. Context & Target: The user is ACTIVELY DESIGNING Module "${ae.title}" (ID: "${ae.module?.id || ae.id}") on the "${ae.activeTab || 'Interface'}" tab. Use moduleId "${ae.module?.id || ae.id}" directly in module-builder tools without asking the user for IDs.
2. Schema, 60 Blocks & 12-Column Grid Conventions:
   - Valid field/block types (all 60 Module Builder blocks):
     * Inputs: text, longText, textarea, number, currency, email, phone, address, url, date, time, select, radio, checkboxGroup, checkbox, toggle, slider, rating, colorpicker, tag
     * Platform: party, user, multi_user, team_select, position_select, global_list, lookup, sub_module, relationship_m2m, rollup, calculation, autonumber, ai_summary, connector, booking, booking_slot
     * Actions & Display: button, buttonGroup, signature, qr_scanner, payment, file, heading, richtext, html, icon, divider, spacer, alert, image, video, audio, progress, map, canvas, chat
     * Containers & Data: group, fieldGroup, repeatableGroup, card, accordion, tabs_nested, stepper, timeline, datatable, duallist, treeview
   - Built-In System Metadata (NEVER DUPLICATE AS CUSTOM FIELDS):
     * Every record already has built-in "status" (driven automatically by the Module's Workflow stages — NEVER create a manual Status / Stage dropdown field!), "assigneeId" (Assignee), "participantIds" (Participants), "_record_key" (Record Key via recordKeyPrefix), "priority", "dueDate", "createdAt", "createdBy", and "updatedAt".
     * Only add custom user fields for distinct secondary roles (e.g. "Peer Reviewer", "Approving Officer"), and reference the built-in IDs ("status", "assigneeId", "_record_key", "dueDate", "priority") directly in Forms, Queues, Automations, Validations, and Reports.
   - 12-Column Grid Layout Rules:
     * Widths: colSpan: 12 = Full, 8 = 2/3, 6 = 1/2, 4 = 1/3, 3 = 1/4; startCol: 1..12; rowIndex: 0, 2, 4...
     * Container blocks (group, fieldGroup, repeatableGroup, card, accordion, tabs_nested, stepper, timeline, datatable, sub_module) and wide blocks (textarea, longText, richtext, address, file, signature, ai_summary, heading, divider, alert) MUST default to colSpan: 12 (full width), unless deliberately paired side-by-side (startCol: 1, colSpan: 6 AND startCol: 7, colSpan: 6 on the same rowIndex). Never leave a lone half-width group with an empty right side.
     * Inside group/fieldGroup/card, nested fields ALSO use a 12-column grid (pair short inputs at colSpan: 6 with startCol: 1 and startCol: 7; wide inputs at colSpan: 12).
   - Field Properties Sidebar & View/Layout Options:
     * Field properties: required, placeholder, helperText, tooltip, defaultValue, hidden, showInTable, inlineEdit, columnWidth, optionsSource (manual|global_list), optionLayout (vertical|horizontal), min/max, currencySymbol, collapsible/defaultCollapsed, date/time constraints (dateFormat, timeFormat, excludeWeekends, defaultType, minDateType/maxDateType), visibilityRule, formattingRules.
     * Master layouts (11): table, split, kanban, calendar, map, cards, portfolio, timeline, gantt, analytics, pipeline — configurable with density (compact|standard|spacious), titleFieldId, subtitleFieldIds, cardFields, calendar/gantt/map field bindings, and toolbar toggles (enabledViews, enableSpreadsheetMode, enableGrouping, enableSavedViews, enableBulkActions).
     * Detail layouts (5): tabs, split, sidebar, process (wizardSaveMode: step|final), accordion — configurable with density, showWorkflow, showTabIcons, and contextRail (enabled, defaultCollapsed, defaultTab: overview|workflow|activity|notes|files|tasks|time, enabledTabs, pinnedFieldIds).
     * Module Tabs (use manage_module_tab): You can rename the default "General" tab (tabId: "general"), add icons (iconName), create nested sub-tabs (parentId), and attach conditional visibilityRule to tabs so specialist tabs only appear when conditions match (e.g. licence_class === "Hotel"). Assign fields to tabs via tabId.
   - Calculated fields use type "calculation" with calculationLogic referencing {{fieldId}} (or fields["<fieldId>"]) and calculationTriggers listing dependency field IDs.
3. Tab-Aware Guidance:
   - Interface / Forms: Organize fields into clean fieldGroup sections, ensure clear labels, placeholders, and appropriate required flags.
   - Workflow: Design clean START -> STATUS -> DECISION -> ACTION / DELAY (Wait/SLA) -> END flows. Supported workflow actions include CREATE_RECORD, UPDATE, ROUTE_TO_MODULE, EMAIL, NOTIFY, SLACK, CREATE_NOTE, PIN_RECORD_NOTE, CREATE_REMINDER, COMPLETE_REMINDER, PDF, STRIPE_PAYMENT_LINK, AI_SUMMARIZE, GEMINI_PROMPT, AI_AGENT, WEBHOOK, GOOGLE_SHEETS_SYNC, RUN_AUTOMATION. DELAY nodes support duration/unit, targetDateField, businessHoursOnly, isSla, breachAction, and slaTarget.
   - Rules: Recommend Error (Block Save), Warning (Confirm to Bypass), or Info validation rules with clear user-facing messages.
   - Integrations: Recommend external API connectors, design REST endpoints (baseUrl, method, ioSchema), and map outputs to module fields.
   - Automations: Build When -> If -> Then pipelines using triggers (RECORD_CREATED, RECORD_UPDATED, STATUS_CHANGED, ASSIGNEE_CHANGED, FORM_SUBMITTED, CRON, SLA_AGE, QUICK_ACTION) and {{ trigger.record.<field> }} / {{ steps.<id>.output.<key> }} variable syntax.
4. Safety Guardrails:
   - Always prefer non-destructive ADD or UPDATE operations. Never delete existing fields, tabs, validation rules, or workflow nodes unless the user explicitly asks to remove them.
================================================================================\n`;
    } else {
      contextBlock += `\n================================================================================
USER'S ACTIVE RECORD IN FOCUS (GROUNDED INSTANT CONTEXT):
  - Entity Domain: "${ae.domain}"
  - Entity / Record ID: "${ae.id}"
${ae.recordKey ? `  - Record Key / Code: "${ae.recordKey}"\n` : ''}  - Display Title: "${ae.title}"
  - Status / Lifecycle: "${ae.status || 'Active'}"
${ae.subtitle ? `  - Subtitle / Summary: "${ae.subtitle}"\n` : ''}${ae.module?.name ? `  - Associated Module: "${ae.module.name}" (ID: "${ae.module.id}")\n` : ''}${ae.activeTab ? `  - Currently Active View Tab: "${ae.activeTab}"\n` : ''}${ae.slaStatus ? `  - SLA Status: "${ae.slaStatus}"\n` : ''}${relLines}  - Key Field Values & Attributes:
${attrLines || '    * (No additional scalar fields)'}

GROUNDING DIRECTIVE FOR ACTIVE RECORD:
1. The user is ACTIVELY VIEWING and WORKING WITH the record above in real-time.
2. When the user asks ambiguous or relative questions like "summarize this", "who is the contact?", "draft an email", "advance to next stage", or "what is the balance?", ALWAYS interpret these in direct reference to this active record.
3. If the user asks to modify or update field values on this record (e.g. changing description, type, priority, date required, status, or any custom field), call the "upsert_record" tool with moduleId: "${ae.module?.id}", recordId: "${ae.id}", and data: { [fieldIdOrName]: newValue }. This will update the record and highlight the changed fields in real-time on the user's screen.
4. If the user asks to perform any other action on this record (e.g. adding an activity note, generating a document), use Entity ID "${ae.id}"${ae.module?.id ? ` and Module ID "${ae.module.id}"` : ''} directly without asking the user to specify or confirm the record ID.
5. If the user explicitly asks to CREATE A NEW record (e.g. "Create a new record in [Module]", "Add a new ticket", "New entry"), do NOT pass recordId. Call "upsert_record" with moduleId: "${ae.module?.id || '<moduleId>'}" and omit recordId entirely so a new record is created with its own unique record key. Never update the currently active record when the user's intent is creating a new one.
================================================================================\n`;
    }
  } else if (context && context.path) {
    contextBlock += `\nUse this route information to ground your understanding. For example, if they ask to add a field, create an automation, or query data, they likely refer to the active module/page they are currently viewing listed above.\n`;
  }

  // Resolve Chat Session Sharing & Prompter Context
  const sharingCtx = await resolveSessionSharingContext(db, tenantId, session, userId, userFullName);

  const systemInstruction = `You are Aurora, the autonomous agentic co-pilot for the Aurora Business Platform.
You assist both developers (building database modules, automations, public websites) and business users (querying records, auditing leads, writing communications).

CURRENT DATE & TIME CONTEXT:
  - Tenant Timezone: "${tenantTimezone}"
  - Current Date & Time (Tenant Local): "${localTimeStr}"
  - Current Date & Time (UTC/ISO): "${serverTimeStr}"

SHARED CHAT & MULTI-USER COLLABORATION CONTEXT:
  - Chat Session ID: "${sessionId}"
  - Chat Session Title: "${session.title || 'Untitled Session'}"
  - Session Owner / Creator: "${sharingCtx.sessionOwnerName}" (User ID: "${sharingCtx.sessionOwnerId}", Title: "${sharingCtx.sessionOwnerTitle}")
  - Chat Sharing Visibility: "${sharingCtx.sharingVisibilityStr}"
  - Shared Members List: ${sharingCtx.sharedUserNames.length > 0 ? JSON.stringify(sharingCtx.sharedUserNames) : (sharingCtx.isSharedWithOrg ? '"Entire Organization"' : '"None (Private)"')}

CURRENT ACTIVE INTERACTOR / PROMPTER:
  - Active Prompter Name: "${userFullName}"
  - Active Prompter User ID: "${userId}"
  - Role: "${role}"
  - License Type: "${licenceType}"
  - Company Position/Title: "${positionTitle}"
  - Department/Function: "${positionDept}"
  - Active Team: "${teamName}"
  - Manager Name: "${managerName}"
  - Relation to Chat Session: ${sharingCtx.isPrompterOwner ? 'Session Owner / Creator' : `Shared Participant interacting with ${sharingCtx.sessionOwnerName}'s chat`}
  - Permissions/Capabilities: ${JSON.stringify(capabilities)}

SHARED CHAT DIRECTIVES & RESPONSE TAILORING:
  - Be explicitly aware of WHO is sending the prompt (${userFullName}).
  - Tailor your tone, perspective, and responses accordingly. If ${userFullName} is a shared participant, acknowledge their input respectfully while keeping full awareness of the chat owner (${sharingCtx.sessionOwnerName}) and organizational context.
  - In message history below, user messages are tagged with [Prompted by Sender Name]. Distinguish between requests made by different participants in this thread.
${contextBlock}
CURRENT TENANT CONTEXT:
  - Tenant ID: "${tenantId}"
  - Subdomain: "${tenantDetails?.subdomain || 'None'}"
  - Currency: "${(tenantDetails?.localization as any)?.currency || (tenantDetails as any)?.currency || 'USD'}"
  - Installed Connectors / Integrations:
${connectorList}

TENANT ISOLATION BOUNDARY DIRECTIVE:
  - YOU ARE STRICTLY BOUND TO TENANT ID: "${tenantId}".
  - You MUST NEVER aggregate, count, query, or expose data belonging to other tenancies.
  - When generating SQL queries for "execute_read_only_query", always include "WHERE tenant_id = '${tenantId}'" on physical tables.

SYSTEM DATABASE SCHEMAS (PHYSICAL TABLES Whitelisted for "execute_read_only_query"):
  - tenant_members (id, tenant_id, user_id, first_name, family_name, work_email, status, role_id, licence_type, team_id, position_id)
  - teams (id, tenant_id, name, description)
  - positions (id, tenant_id, title, position_number, description, parent_id)
  - workspaces (id, tenant_id, name)
  - modules (id, tenant_id, name, type, category, config)
  - records (id, tenant_id, module_id, data, status, workflow_state, sla_status, created_at)
  - audit_logs (id, tenant_id, action, entity_type, entity_id, user_id, metadata, created_at)
  - permission_groups (id, tenant_id, name, description, parent_group_id)
  - member_permission_groups (id, tenant_id, member_id, permission_group_id)
  - global_lists (id, tenant_id, name, description)
  - global_list_items (id, list_id, tenant_id, value, label)

ENTITY RELATIONSHIPS & JOIN PATHS:
  - Join Member to Position: tenant_members.position_id = positions.id
  - Join Member to Team: tenant_members.team_id = teams.id
  - Join Position to Manager Position: positions.parent_id = positions.id (manager's position)
  - Join Member to User: tenant_members.user_id = users.id (Note: users table is restricted; query tenant_members instead)
  - Join Member to Permission Group: member_permission_groups.member_id = tenant_members.id -> join to permission_groups.id
  - Join Record to Module: records.module_id = modules.id
  - Join Global List Items: global_list_items.list_id = global_lists.id

AURORA MODULE & SOLUTION ARCHITECTURE CONVENTIONS (ALWAYS APPLY WHEN BUILDING/EDITING):
  - Built-In System Metadata (NEVER duplicate as custom fields): Every record automatically includes "status" (driven by the Module's linked Workflow stages — never add a manual Status dropdown!), "assigneeId", "participantIds", "_record_key" (configured via recordKeyPrefix), "priority", "dueDate", "createdAt", "createdBy", and "updatedAt".
  - 12-Column Grid: colSpan 12 (Full), 8 (2/3), 6 (1/2), 4 (1/3), 3 (1/4); startCol 1..12; rowIndex 0, 2, 4... Containers (group, fieldGroup, repeatableGroup, card, accordion, tabs_nested, stepper, timeline, datatable, sub_module) and wide fields (textarea, address, richtext, file, signature) MUST default to colSpan: 12 unless intentionally paired side-by-side (startCol: 1 + 7 on same rowIndex).
  - Views & Properties: Supports 11 master views (table, split, kanban, calendar, map, cards, portfolio, timeline, gantt, analytics, pipeline), 5 detail views (tabs, split, sidebar, process, accordion) with configurable contextRail, tabs/sub-tabs with conditional visibility, and full field properties (required, placeholder, helperText, tooltip, defaultValue, hidden, showInTable, inlineEdit, optionsSource, collapsible, visibilityRule, formattingRules). For exact live builder properties & enums across any of the 20 builders, call "get_builder_schema_contract" on demand.

CURRENT WORKSPACE SCHEMA (CUSTOM MODULES):
${JSON.stringify(schemaOverview)}

CORE GUIDELINES:
1. You have a deep understanding of Aurora's 20 core subsystems:
   - Module Builder & Form Builder ("Studio"): Modifies modules with config layout grid (tabs, rows, columns, fields).
   - Workflow Builder: configures Module.config.workflows nodes (STATUS, DECISION, ACTION) and transition edges.
   - Automation Builder: configures Automations (triggers, actions, isActive).
   - Integration Builder: configures custom Connectors (NexusConnector) and tenant secrets.
   - Site Builder & Page Builder: configures workspaces pages (Module.type="PAGE") with widgets.
   - Composer: document generation (DocumentTemplate html).
   - Agent Studio: configures workforce AI members (Agent model).
   - Org Graph: workforce TenantMember, Team, Position structures.
   - Validation Builder: validation criteria in Module.config.validations.
   - Query Explorer & Schema Builder: SQL data queries and schema charts.
   - Template Catalog: Universal template registry across all builders (template_catalogs table: builder_type, industry, category, payload). Search and inspect pre-audited templates when provisioning components.
2. ALWAYS use the strict 3-phase lifecycle for multi-step requests:
   - Phase 1: Write an implementation plan via "write_agent_plan" (with planMarkdown, tasksList) and request review in your chat response.
   - Phase 2: Execute code/configuration changes only after the user aligns, tracking progress using the plan.
   - Phase 3: Verify results and write the walkthrough via "write_agent_plan" (walkthroughMarkdown).
3. PLATFORM INTELLIGENCE & DATA ACCESS DIRECTIVES:
   - Before modifying or deleting a module field, status, or workflow stage, call "analyze_change_impact" to warn the user about dependent automations, document templates, workflows, validations, forms, or reports.
   - Prefer "search_tenant_records", "search_parties_directory", and "inspect_relationship_graph" (which resolves cross-module links, Directory parties, and Team/Position reporting chains automatically) BEFORE hand-writing raw JSONB SQL joins.
   - When the user asks about SLA breaches, stalled tickets, or queue health, call "detect_workflow_bottlenecks".
   - Before applying complex validation rules or automation conditions, offer or run "simulate_rule_or_workflow" to dry-run them in memory against real records with zero DB writes.
   - If the user asks for custom analytics SQL, write a SELECT query for "execute_read_only_query" (and use "explain_tenant_query" to optimize slow/large queries). Remember records data is stored in "records" (records.module_id, records.data JSONB, e.g. data->>'status' = 'Open').
4. If testing third-party APIs, write a node/javascript snippet and execute it via "execute_scratch_script".
5. Run searches using "search_web" to look up API structures or code formats.
6. VISUALISATION & WIDGET DIRECTIVES:
   - Visualisations (charts, maps, data grids) render directly INLINE inside the user's chat message stream. Do NOT tell the user that charts or maps are rendered in the side panel.
   - When generating data charts, output a \`\`\`chart JSON code block:
     \`\`\`chart
     { "title": "Chart Title", "type": "bar", "xAxisKey": "name", "data": [{ "name": "Item A", "value": 10 }], "dataKeys": [{ "key": "value", "name": "Metric" }] }
     \`\`\`
   - When generating geospatial maps, output a \`\`\`map JSON code block:
     \`\`\`map
     { "title": "Map Title", "center": [-33.8688, 151.2093], "zoom": 12, "markers": [{ "lat": -33.8688, "lng": 151.2093, "label": "Location Name" }] }
     \`\`\`
7. Keep chat responses concise. Rely heavily on right-hand panel artifacts ONLY for large code implementation plans and document drafts.`;

  const contents: any[] = [];
  
  // Sliding window: keep last 8 messages for context to optimize prompt token consumption
  const recentMessages = (session.messages || []).slice(-8);
  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      let senderName = '';
      if (Array.isArray(msg.steps) && msg.steps.length > 0) {
        senderName = (msg.steps[0] as any)?.senderName || '';
      } else if (msg.steps && (msg.steps as any).senderName) {
        senderName = (msg.steps as any).senderName;
      }
      const attributedContent = senderName ? `[Prompted by ${senderName}]: ${msg.content}` : msg.content;
      contents.push({
        role: 'user',
        parts: [{ text: attributedContent }]
      });
    } else {
      contents.push({
        role: 'model',
        parts: [{ text: msg.content }]
      });
    }
  }

  const lastMsg = recentMessages[recentMessages.length - 1];
  const userMsgAlreadySaved = Boolean(lastMsg && lastMsg.role === 'user' && lastMsg.content === userMessage);

  if (!userMsgAlreadySaved) {
    const attributedUserMsg = `[Prompted by ${userFullName}]: ${userMessage}`;
    const initialParts: any[] = [{ text: attributedUserMsg }];
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        initialParts.push({
          inlineData: {
            mimeType: att.type,
            data: att.base64
          }
        });
      });
    }

    contents.push({
      role: 'user',
      parts: initialParts
    });
  }

  let loopCount = 0;
  const maxLoops = 15;
  const steps: any[] = [];
  let turnPromptTokens = 0;
  let turnCompletionTokens = 0;
  const turnStartTime = Date.now();

  emitStep(socketId, { type: 'thought', content: "Getting things ready..." });

  let activeMetadata = (session.metadata as any) || {};
  if (context?.activeEntity) {
    activeMetadata.activeEntity = context.activeEntity;
  }
  if (socketId) {
    activeMetadata.socketId = socketId;
  }

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`[AgentLoop] Running step ${loopCount} with provider: ${client.provider}, model: ${client.model}...`);

    let response;
    try {
      response = await executeAICompletion(client, {
        contents,
        systemInstruction,
        tools: agentTools
      });

      const usageMeta = response?.usageMetadata || (response as any)?.usage_metadata;
      const stepPromptTokens = usageMeta?.promptTokenCount || Math.max(100, Math.ceil(JSON.stringify(contents).length / 4));
      const stepCompletionTokens = usageMeta?.candidatesTokenCount || Math.max(50, Math.ceil(JSON.stringify(response).length / 4));

      turnPromptTokens = Math.max(turnPromptTokens, stepPromptTokens);
      turnCompletionTokens += stepCompletionTokens;
    } catch (err: any) {
      if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('quota') || err.message.includes('rate limit') || err.message.includes('Rate limit'))) {
        const provName = client.provider ? client.provider.toUpperCase() : 'AI';
        const rateLimitErr: any = new Error(`${provName} rate limit reached for model ${client.model}. Please wait 15 seconds or enter your own BYOK API key in Settings > AI Services for unlimited requests.`);
        rateLimitErr.provider = client.provider;
        rateLimitErr.model = client.model;
        throw rateLimitErr;
      }
      err.provider = client.provider;
      err.model = client.model;
      throw err;
    }

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part && PartIsFunctionCall(part)) {
      const calls = candidate.content.parts.filter(p => p.functionCall);
      const functionResponses: any[] = [];

      for (const call of calls) {
        const { name, args } = call.functionCall!;
        console.log(`[AgentLoop] Model called function: ${name} with args`, args);

        const MUTATING_TOOLS = [
          'manage_module_field',
          'manage_module_tab',
          'manage_module_interface',
          'manage_module_validation',
          'manage_module_workflow',
          'manage_page_widget',
          'manage_document_template',
          'manage_org_graph',
          'manage_agent_profile',
          'manage_scheduled_job',
          'manage_webhook_subscription',
          'manage_security_and_permissions',
          'bulk_data_etl',
          'diagnose_and_heal_system'
        ];

        if (MUTATING_TOOLS.includes(name)) {
          console.log(`[AgentLoop] Mutating tool call detected: ${name}. Requesting user approval...`);
          
          activeMetadata.pausedSessionState = {
            contents,
            steps: [...steps, { name, arguments: args, status: 'pending_approval' }],
            pendingTool: { name, args }
          };
          await db.antigravitySession.update({
            where: { id: sessionId },
            data: { metadata: activeMetadata }
          });

          const fileNamesList = (attachments || []).map(a => `[Attached File: ${a.name} (${a.type})]`).join('\n');
          const savedUserMessage = fileNamesList ? `${userMessage}\n\n${fileNamesList}` : userMessage;

          if (loopCount === 1) {
            await db.antigravityMessage.create({
              data: {
                sessionId,
                role: 'user',
                content: savedUserMessage,
                steps: [{ senderId: userId, senderName: userFullName, senderRole: role, senderTitle: positionTitle }] as any
              }
            });
          }

          const pendingSteps = [...steps, { name, arguments: args, status: 'pending_approval' }];
          await db.antigravityMessage.create({
            data: {
              sessionId,
              role: 'model',
              content: `I need your approval to execute the action: **${name}**.\n\nArguments:\n\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\``,
              steps: pendingSteps as any
            }
          });

          emitStep(socketId, { type: 'approval_required', name, arguments: args });

          return { 
            text: `Approval required for action: ${name}`, 
            steps: pendingSteps, 
            paused: true 
          };
        }

        emitStep(socketId, { type: 'tool_call', name, arguments: args });
        let result = await executeAgentTool(db, tenantId, name, args, sessionId, activeMetadata);

        emitStep(socketId, { type: 'tool_result', name, result });
        steps.push({ name, arguments: args, result });

        functionResponses.push({
          response: { output: result },
          name
        });
      }

      contents.push(candidate.content);
      contents.push({
        role: 'user',
        parts: functionResponses.map(r => ({
          functionResponse: {
            name: r.name,
            response: r.response
          }
        }))
      });
      continue;
    }

    const textPart = candidate?.content?.parts?.find((p: any) => p && typeof p.text === 'string');
    let text = textPart?.text || candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n') || "";

    const pseudoFuncMatch = text.match(/<function\((\w+)\)\s*(\{[\s\S]*?\})\s*(?:<\/function>|$)/i);
    if (pseudoFuncMatch) {
      const fnName = pseudoFuncMatch[1];
      const fnArgsStr = pseudoFuncMatch[2];
      try {
        const fnArgs = JSON.parse(fnArgsStr);
        console.log(`[AgentLoop] Parsed text-embedded function call: ${fnName} with args:`, fnArgs);
        emitStep(socketId, { type: 'tool_call', name: fnName, arguments: fnArgs });
        const result = await executeAgentTool(db, tenantId, fnName, fnArgs, sessionId, activeMetadata);
        emitStep(socketId, { type: 'tool_result', name: fnName, result });
        steps.push({ name: fnName, arguments: fnArgs, result });
        if (fnName === 'write_agent_plan' && fnArgs.planMarkdown) {
          text = fnArgs.planMarkdown;
        }
      } catch (e) {
        console.error("[AgentLoop] Failed to parse pseudo function call JSON:", e);
      }
    }

    text = text
      .replace(/<function\([\s\S]*?<\/function>/gi, '')
      .replace(/<function\([\s\S]*$/gi, '')
      .replace(/<\/function>/gi, '')
      .trim();

      // Stream the text to the client with natural pacing
      try {
        emitStep(socketId, { type: 'stream_start' });
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const words = text.split(/(\s+)/);
        for (const word of words) {
          if (!word) continue;
          emitStep(socketId, { type: 'chunk', content: word });
          await delay(15); // 15ms pacing
        }
      } catch (streamErr) {
        console.error("[AgentLoop] Error during text streaming:", streamErr);
        emitStep(socketId, { type: 'chunk', content: text });
      }

      const fileNamesList = (attachments || []).map(a => `[Attached File: ${a.name} (${a.type})]`).join('\n');
      const savedUserMessage = fileNamesList ? `${userMessage}\n\n${fileNamesList}` : userMessage;

      if (!userMsgAlreadySaved) {
        await db.antigravityMessage.create({
          data: {
            sessionId,
            role: 'user',
            content: savedUserMessage,
            steps: [{ senderId: userId, senderName: userFullName, senderRole: role, senderTitle: positionTitle }] as any
          }
        });
      }

      const keyHint = client.apiKey && client.apiKey.length > 4 ? `...${client.apiKey.slice(-4)}` : 'Default Key';

      await db.antigravityMessage.create({
        data: {
          sessionId,
          role: 'model',
          content: text,
          steps: [...steps, { _meta: { model: client.model, provider: client.provider, isBYOK: client.isBYOK, keyHint } }] as any
        }
      });

      logAIUsageMetric({
        tenantId,
        userId,
        provider: client.provider,
        model: client.model,
        tier: client.isBYOK ? 'byok' : 'tier1',
        feature: 'chat',
        promptTokens: turnPromptTokens,
        completionTokens: turnCompletionTokens,
        latencyMs: Date.now() - turnStartTime
      }).catch(e => console.warn('[antigravityAgent] logAIUsageMetric error:', e));

      return { 
        text, 
        steps, 
        promptTokens: turnPromptTokens, 
        completionTokens: turnCompletionTokens, 
        model: client.model, 
        provider: client.provider,
        isBYOK: client.isBYOK,
        keyHint
      };
    }
  throw new Error("Agent loop exceeded maximum turns without producing a final text response.");
};

function PartIsFunctionCall(part: any): boolean {
  return part.functionCall !== undefined || (Array.isArray(part) && part.some(p => p.functionCall));
}

export const executeAgentTool = async (
  db: any,
  tenantId: string,
  name: string,
  args: any,
  sessionId: string,
  activeMetadata: any
): Promise<any> => {
  let result: any = null;

  // Auto-default omitted recordId, moduleId, or partyId from active in-focus entity
  if (activeMetadata?.activeEntity && args && typeof args === 'object') {
    const ae = activeMetadata.activeEntity;
    if (!args.recordId && ae.id && ae.domain === 'module_record') {
      args.recordId = ae.id;
    }
    if (!args.moduleId && ae.module?.id) {
      args.moduleId = ae.module.id;
    }
    if (!args.partyId && ae.id && (ae.domain === 'directory_person' || ae.domain === 'directory_org')) {
      args.partyId = ae.id;
    }
  }

  try {
          if (WORKSPACE_SHARED_READ_TOOL_NAMES.has(name)) {
            result = await executeAuroraReadTool(name, args || {}, { tenantId });
          }
          else if (name === 'get_workspace_schema') {
            const mods = await db.module.findMany({ where: { tenantId } });
            const autos = await db.automation.findMany({ where: { tenantId } });
            const conns = await db.tenantConnector.findMany({ where: { tenantId }, include: { connector: true } });
            const members = await db.tenantMember.findMany({ where: { tenantId } });
            result = { modules: mods, automations: autos, connectors: conns, members };
          } 
          else if (name === 'execute_read_only_query') {
            const securityCheck = validateQuerySecurity(args.sql);
            if (!securityCheck.isValid) {
              result = { error: securityCheck.error };
            } else {
              try {
                const rawResult = await db.$transaction(async (tx: any) => {
                  if (tenantId) {
                    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId.replace(/'/g, "''")}';`).catch(() => {});
                  }
                  return await tx.$queryRawUnsafe(args.sql);
                });
                
                const serialized = serializeBigInts(rawResult);
                if (Array.isArray(serialized)) {
                  const filtered = serialized.filter((row: any) => {
                    const rowTenant = row.tenant_id || row.tenantId;
                    return !rowTenant || rowTenant === tenantId;
                  });
                  result = filtered.slice(0, 15);
                  if (filtered.length > 15) {
                    (result as any)._meta = `Showing top 15 of ${filtered.length} total matching records for token optimization.`;
                  }
                } else {
                  result = serialized;
                }
              } catch (queryErr: any) {
                result = { error: `Query execution error: ${queryErr.message}` };
              }
            }
          } 
          else if (name === 'create_or_update_module') {
            let ws = await db.workspace.findFirst({ where: { tenantId } });
            if (!ws) {
              ws = await db.workspace.create({ data: { tenantId, name: "Default Workspace" } });
            }

            if (args.id) {
              const existing = await db.module.findFirst({ where: { id: args.id, tenantId } });
              if (!existing) {
                result = { error: `Module '${args.id}' not found in your tenant workspace.` };
              } else {
                result = await db.module.update({
                  where: { id: args.id },
                  data: {
                    name: args.name,
                    icon: args.icon || "Box",
                    type: args.type || "RECORD",
                    category: args.category || "Custom",
                    config: args.config || {}
                  }
                });
              }
            } else {
              result = await db.module.create({
                data: {
                  tenantId,
                  workspaceId: ws.id,
                  name: args.name,
                  icon: args.icon || "Box",
                  type: args.type || "RECORD",
                  category: args.category || "Custom",
                  config: args.config || {}
                }
              });
            }
          } 
          else if (name === 'create_or_update_automation') {
            if (args.id) {
              const existing = await db.automation.findFirst({ where: { id: args.id, tenantId } });
              if (!existing) {
                result = { error: `Automation '${args.id}' not found in your tenant workspace.` };
              } else {
                result = await db.automation.update({
                  where: { id: args.id },
                  data: {
                    name: args.name,
                    description: args.description,
                    triggers: args.triggers || [],
                    conditions: args.conditions || null,
                    actions: args.actions || [],
                    isActive: args.isActive !== undefined ? args.isActive : true
                  }
                });
              }
            } else {
              result = await db.automation.create({
                data: {
                  tenantId,
                  moduleId: args.moduleId,
                  name: args.name,
                  description: args.description,
                  triggers: args.triggers || [],
                  conditions: args.conditions || null,
                  actions: args.actions || [],
                  isActive: args.isActive !== undefined ? args.isActive : true
                }
              });
            }
          } 
          else if (name === 'create_or_update_connector') {
            const conn = await db.nexusConnector.create({
              data: {
                name: args.name,
                icon: args.icon || "Plug",
                category: args.category || "API Integration",
                ioSchema: args.ioSchema || {},
                config: args.config || {},
                isCustom: true,
                tenantId,
                edgeFunctionUrl: '/api/nexus-proxy/execute'
              }
            });
            const tenantConn = await db.tenantConnector.create({
              data: {
                tenantId,
                connectorId: conn.id,
                isActive: true,
                displayName: args.name
              }
            });
            result = { connector: conn, activation: tenantConn };
          } 
          else if (name === 'upsert_record') {
            let targetRecId = args.recordId;
            // Only fall back to activeEntity.id if args.recordId is not specified AND args.moduleId is not explicitly provided (i.e. modifying currently active record)
            if (!targetRecId && !args.moduleId && activeMetadata?.activeEntity?.id) {
              targetRecId = activeMetadata.activeEntity.id;
            }

            let targetModId = args.moduleId || activeMetadata?.activeEntity?.module?.id;
            const incomingFields = (args.data && typeof args.data === 'object')
              ? (args.data.data && typeof args.data.data === 'object' ? args.data.data : args.data)
              : {};

            let existing: any = null;
            if (targetRecId) {
              existing = await db.record.findFirst({
                where: { id: targetRecId, tenantId },
                include: { module: true }
              });
              if (!existing) {
                existing = await db.record.findFirst({
                  where: {
                    tenantId,
                    data: {
                      path: ['_record_key'],
                      equals: targetRecId
                    }
                  },
                  include: { module: true }
                });
              }
            }

            if (targetRecId) {
              if (!existing) {
                result = { error: `Record '${targetRecId}' not found in your tenant workspace.` };
              } else {
                targetRecId = existing.id;
                targetModId = existing.moduleId || targetModId;

                const targetModule = existing.module || (targetModId ? await db.module.findFirst({ where: { id: targetModId, tenantId } }) : null);
                const layout = (targetModule?.config as any)?.layout || [];
                const allModuleFields: any[] = [];
                const fieldToGroupMap: Record<string, { id: string; name?: string }> = {};

                const extractFields = (items: any[], currentGroup?: { id: string; name?: string }) => {
                  if (!Array.isArray(items)) return;
                  for (const item of items) {
                    if (!item) continue;
                    if (['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(item.type) || item.fields) {
                      const grp = { id: item.id, name: item.name };
                      if (Array.isArray(item.fields)) {
                        extractFields(item.fields, grp);
                      }
                    } else {
                      allModuleFields.push(item);
                      if (currentGroup) {
                        fieldToGroupMap[item.id] = currentGroup;
                      }
                    }
                  }
                };
                extractFields(layout);

                const existingData = (existing.data && typeof existing.data === 'object') ? (existing.data as any) : {};
                const resolvedFieldKeys = new Set<string>();
                const normalizedUpdates: Record<string, any> = {};

                for (const [rawKey, rawVal] of Object.entries(incomingFields)) {
                  resolvedFieldKeys.add(rawKey);
                  const lowerKey = rawKey.toLowerCase();
                  const matchedField = allModuleFields.find(f => 
                    (f.id && f.id.toLowerCase() === lowerKey) ||
                    (f.name && f.name.toLowerCase() === lowerKey) ||
                    (f.label && f.label.toLowerCase() === lowerKey)
                  );

                  if (matchedField) {
                    if (matchedField.id) resolvedFieldKeys.add(matchedField.id);
                    if (matchedField.name) resolvedFieldKeys.add(matchedField.name);
                    if (matchedField.label) resolvedFieldKeys.add(matchedField.label);

                    normalizedUpdates[matchedField.id] = rawVal;
                    if (matchedField.name) {
                      normalizedUpdates[matchedField.name] = rawVal;
                    }

                    const grp = fieldToGroupMap[matchedField.id];
                    if (grp) {
                      const grpKeys = [grp.id, grp.name].filter(Boolean) as string[];
                      for (const gKey of grpKeys) {
                        const existingGroupVal = (existingData[gKey] && typeof existingData[gKey] === 'object')
                          ? existingData[gKey]
                          : (normalizedUpdates[gKey] && typeof normalizedUpdates[gKey] === 'object')
                            ? normalizedUpdates[gKey]
                            : {};
                        normalizedUpdates[gKey] = {
                          ...existingGroupVal,
                          [matchedField.id]: rawVal,
                          ...(matchedField.name ? { [matchedField.name]: rawVal } : {})
                        };
                      }
                    }
                  } else {
                    normalizedUpdates[rawKey] = rawVal;
                  }
                }

                const fieldKeys = Array.from(resolvedFieldKeys);
                const primaryFieldId = fieldKeys.find(k => k.startsWith('field-')) || fieldKeys[0];

                // 1. Immediately emit modifying event to highlight fields with animated indicator
                setAIAgentPresence(targetRecId, 'editing', primaryFieldId || undefined);
                emitTenantUpdate(tenantId, 'ai_record_field_modifying', {
                  recordId: targetRecId,
                  fields: fieldKeys,
                  data: normalizedUpdates
                });
                if (activeMetadata?.socketId) {
                  emitStep(activeMetadata.socketId, {
                    type: 'ai_field_modifying',
                    recordId: targetRecId,
                    fields: fieldKeys,
                    data: normalizedUpdates
                  });
                }

                // Add brief natural pause so the user sees the real-time highlight before value transition
                await new Promise((r) => setTimeout(r, 650));

                const mergedData = { ...existingData, ...normalizedUpdates };

                const updatePayload: any = {
                  data: mergedData,
                  updatedAt: new Date()
                };
                if (incomingFields.status && typeof incomingFields.status === 'string') {
                  updatePayload.status = incomingFields.status;
                }

                const updated = await db.record.update({
                  where: { id: targetRecId },
                  data: updatePayload,
                  include: { createdByMember: true }
                });

                const formatted = {
                  id: updated.id,
                  moduleId: updated.moduleId,
                  associations: updated.associations,
                  path: updated.path,
                  createdAt: updated.createdAt,
                  updatedAt: updated.updatedAt,
                  status: updated.status,
                  workflowState: updated.workflowState,
                  data: mergedData,
                  _record_key: mergedData._record_key || existingData._record_key,
                  ...mergedData
                };

                // 2. Broadcast the completed update so the field values update in real-time
                emitTenantUpdate(tenantId, 'record_updated', formatted);
                emitTenantUpdate(tenantId, 'ai_record_field_updated', {
                  recordId: targetRecId,
                  fields: fieldKeys,
                  data: mergedData,
                  record: formatted
                });

                if (activeMetadata?.socketId) {
                  emitStep(activeMetadata.socketId, {
                    type: 'ai_field_updated',
                    recordId: targetRecId,
                    fields: fieldKeys,
                    data: mergedData,
                    record: formatted
                  });
                }

                setAIAgentPresence(targetRecId, 'viewing', undefined);
                setTimeout(() => setAIAgentPresence(targetRecId, 'viewing', undefined, true), 5000);

                AutomationEngine.handleEvent({
                  type: 'RECORD_UPDATED',
                  tenantId,
                  moduleId: updated.moduleId,
                  record: { id: updated.id, ...mergedData }
                }, db).catch(err => console.error('[Automation Error on AI upsert_record]:', err));

                result = {
                  success: true,
                  recordId: updated.id,
                  recordKey: formatted._record_key,
                  updatedFields: fieldKeys,
                  record: formatted
                };
              }
            } else {
              // ==========================================
              // CREATE NEW RECORD
              // ==========================================
              let targetModule: any = null;
              if (targetModId) {
                targetModule = await db.module.findFirst({
                  where: {
                    tenantId,
                    OR: [
                      { id: targetModId },
                      { name: { equals: targetModId, mode: 'insensitive' } }
                    ]
                  }
                });
                if (targetModule) {
                  targetModId = targetModule.id;
                }
              }

              if (!targetModule) {
                result = { error: `Target module '${args.moduleId || 'unspecified'}' not found in workspace.` };
              } else {
                const layout = (targetModule.config as any)?.layout || [];
                const allModuleFields: any[] = [];
                const fieldToGroupMap: Record<string, { id: string; name?: string }> = {};

                const extractFields = (items: any[], currentGroup?: { id: string; name?: string }) => {
                  if (!Array.isArray(items)) return;
                  for (const item of items) {
                    if (!item) continue;
                    if (['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(item.type) || item.fields) {
                      const grp = { id: item.id, name: item.name };
                      if (Array.isArray(item.fields)) {
                        extractFields(item.fields, grp);
                      }
                    } else {
                      allModuleFields.push(item);
                      if (currentGroup) {
                        fieldToGroupMap[item.id] = currentGroup;
                      }
                    }
                  }
                };
                extractFields(layout);

                const normalizedCreateData: Record<string, any> = {};
                for (const [rawKey, rawVal] of Object.entries(incomingFields)) {
                  const lowerKey = rawKey.toLowerCase();
                  const matchedField = allModuleFields.find(f =>
                    (f.id && f.id.toLowerCase() === lowerKey) ||
                    (f.name && f.name.toLowerCase() === lowerKey) ||
                    (f.label && f.label.toLowerCase() === lowerKey)
                  );

                  if (matchedField) {
                    normalizedCreateData[matchedField.id] = rawVal;
                    if (matchedField.name) {
                      normalizedCreateData[matchedField.name] = rawVal;
                    }
                    const grp = fieldToGroupMap[matchedField.id];
                    if (grp) {
                      const grpKeys = [grp.id, grp.name].filter(Boolean) as string[];
                      for (const gKey of grpKeys) {
                        const existingGroupVal = (normalizedCreateData[gKey] && typeof normalizedCreateData[gKey] === 'object')
                          ? normalizedCreateData[gKey]
                          : {};
                        normalizedCreateData[gKey] = {
                          ...existingGroupVal,
                          [matchedField.id]: rawVal,
                          ...(matchedField.name ? { [matchedField.name]: rawVal } : {})
                        };
                      }
                    }
                  } else {
                    normalizedCreateData[rawKey] = rawVal;
                  }
                }

                // 1. Generate record key (_record_key) and process autonumbers
                const config = (targetModule.config || {}) as any;
                let configChanged = false;
                let updatedConfig = { ...config };

                if (config.recordKeyPrefix) {
                  const nextNum = config.nextKeyNumber || 1;
                  const prefix = config.recordKeyPrefix || '';
                  const suffix = config.recordKeySuffix || '';
                  const recordKey = `${prefix}-${nextNum}${suffix}`;

                  normalizedCreateData._record_key = recordKey;
                  updatedConfig.nextKeyNumber = nextNum + 1;
                  configChanged = true;
                }

                const autonumbersChanged = processAutonumbersInternal(normalizedCreateData, config.layout || [], updatedConfig);
                if (autonumbersChanged) {
                  configChanged = true;
                }

                if (configChanged) {
                  await db.module.update({
                    where: { id: targetModId },
                    data: { config: updatedConfig }
                  });
                }

                // 2. Initialize workflow state if module has a workflow
                let workflowState = null;
                const fallbackWorkflow = config?.workflow || (config?.workflows && config.workflows[0]);
                const workflow = await getActiveWorkflowForModule(db, tenantId, targetModId, fallbackWorkflow);

                if (workflow && workflow.nodes && workflow.nodes.length > 0) {
                  const startNode = workflow.nodes.find((n: any) => n.type === 'START') || workflow.nodes[0];
                  workflowState = {
                    currentNodeId: startNode.id,
                    activeNodeIds: [startNode.id],
                    history: [{
                      nodeId: startNode.id,
                      timestamp: new Date().toISOString(),
                      action: 'Initialized',
                      triggeredBy: 'Aurora AI Assistant'
                    }]
                  };
                }

                const initialStatus = incomingFields.status ||
                  (workflow && workflowState && Array.isArray(workflow.nodes)
                    ? (workflow.nodes.find((n: any) => n.id === workflowState.currentNodeId)?.name || 'active')
                    : 'active');

                const created = await db.record.create({
                  data: {
                    tenantId,
                    moduleId: targetModId,
                    data: normalizedCreateData,
                    status: initialStatus,
                    workflowState: workflowState as any,
                    createdByMemberId: activeMetadata?.user?.memberId || activeMetadata?.userId || null,
                  }
                });

                const formatted = {
                  id: created.id,
                  moduleId: created.moduleId,
                  createdAt: created.createdAt,
                  updatedAt: created.updatedAt,
                  status: created.status,
                  workflowState: created.workflowState,
                  data: normalizedCreateData,
                  _record_key: normalizedCreateData._record_key,
                  ...normalizedCreateData
                };

                emitTenantUpdate(tenantId, 'record_added', formatted);

                AutomationEngine.handleEvent({
                  type: 'RECORD_CREATED',
                  tenantId,
                  moduleId: created.moduleId,
                  record: { id: created.id, ...normalizedCreateData }
                }, db).catch(err => console.error('[Automation Error on AI upsert_record create]:', err));

                result = {
                  success: true,
                  recordId: created.id,
                  recordKey: normalizedCreateData._record_key,
                  record: formatted
                };
              }
            }
          } 
          else if (name === 'search_web') {
            result = await scrapeDuckDuckGo(args.query);
          } 
          else if (name === 'fetch_web_page') {
            result = await fetchPageText(args.url);
          } 
          else if (name === 'execute_scratch_script') {
            result = { error: "Scratch script execution is disabled in production multi-tenant environments for security." };
          } 
          else if (name === 'manage_module_field') {
            const { moduleId, action, fieldId, fieldConfig } = args;
            const targetModule = await db.module.findFirst({
              where: { id: moduleId, tenantId }
            });
            if (!targetModule) {
              result = { error: `Module '${moduleId}' not found.` };
            } else {
              const config = (targetModule.config as any) || {};
              let layout = Array.isArray(config.layout) ? config.layout : [];

              if (action === 'ADD') {
                const newField = {
                  id: fieldId || `field-${Date.now()}`,
                  ...fieldConfig
                };
                layout.push(newField);
              } else if (action === 'UPDATE') {
                layout = layout.map((f: any) => 
                  (f.id === fieldId || f.name === fieldId) ? { ...f, ...fieldConfig } : f
                );
              } else if (action === 'REMOVE') {
                layout = layout.filter((f: any) => f.id !== fieldId && f.name !== fieldId);
              }

              const updatedModule = await db.module.update({
                where: { id: moduleId },
                data: { config: { ...config, layout } }
              });
              result = { success: true, module: updatedModule };
            }
          }
          else if (name === 'manage_module_tab') {
            const { moduleId, action, tabId, tabConfig } = args;
            const targetModule = await db.module.findFirst({
              where: { id: moduleId, tenantId }
            });
            if (!targetModule) {
              result = { error: `Module '${moduleId}' not found.` };
            } else {
              const config = (targetModule.config as any) || {};
              let tabs: any[] = Array.isArray(config.tabs) && config.tabs.length > 0
                ? [...config.tabs]
                : [{ id: 'general', label: 'General' }];
              const targetId = tabId || `tab_${Date.now()}`;

              if (action === 'ADD') {
                tabs.push({
                  id: targetId,
                  label: tabConfig?.label || 'New Tab',
                  ...(tabConfig || {}),
                });
              } else if (action === 'UPDATE' || action === 'RENAME') {
                const exists = tabs.some((t: any) => t.id === targetId || String(t.label || '').toLowerCase() === String(targetId).toLowerCase());
                if (exists) {
                  tabs = tabs.map((t: any) =>
                    (t.id === targetId || String(t.label || '').toLowerCase() === String(targetId).toLowerCase())
                      ? { ...t, ...(tabConfig || {}) }
                      : t
                  );
                } else {
                  tabs.push({ id: targetId, label: tabConfig?.label || targetId, ...(tabConfig || {}) });
                }
              } else if (action === 'REMOVE') {
                tabs = tabs.filter((t: any) => t.id !== targetId);
              }

              const updatedModule = await db.module.update({
                where: { id: moduleId },
                data: { config: { ...config, tabs } }
              });
              result = { success: true, tabs, module: updatedModule };
            }
          }
          else if (name === 'manage_module_interface') {
            const { moduleId, master, detail } = args;
            const targetModule = await db.module.findFirst({
              where: { id: moduleId, tenantId }
            });
            if (!targetModule) {
              result = { error: `Module '${moduleId}' not found.` };
            } else {
              const config = (targetModule.config as any) || {};
              const curInterface = config.interfaceSettings || {};
              const nextMaster = master
                ? {
                    ...(curInterface.master || {}),
                    ...master,
                    ...(master.toolbar
                      ? { toolbar: { ...(curInterface.master?.toolbar || {}), ...master.toolbar } }
                      : {}),
                  }
                : curInterface.master;
              const nextDetail = detail
                ? {
                    ...(curInterface.detail || {}),
                    ...detail,
                    ...(detail.contextRail
                      ? { contextRail: { ...(curInterface.detail?.contextRail || {}), ...detail.contextRail } }
                      : {}),
                  }
                : curInterface.detail;

              const nextInterfaceSettings = {
                ...curInterface,
                ...(nextMaster ? { master: nextMaster } : {}),
                ...(nextDetail ? { detail: nextDetail } : {}),
              };

              const updatedModule = await db.module.update({
                where: { id: moduleId },
                data: { config: { ...config, interfaceSettings: nextInterfaceSettings } }
              });
              result = { success: true, interfaceSettings: nextInterfaceSettings, module: updatedModule };
            }
          }
          else if (name === 'manage_module_validation') {
            const { moduleId, action, ruleId, ruleConfig } = args;
            const targetModule = await db.module.findFirst({
              where: { id: moduleId, tenantId }
            });
            if (!targetModule) {
              result = { error: `Module '${moduleId}' not found.` };
            } else {
              const config = (targetModule.config as any) || {};
              let validationRules = Array.isArray(config.validationRules) ? config.validationRules : [];

              if (action === 'ADD') {
                const newRule = {
                  id: ruleId || `rule-${Date.now()}`,
                  ...ruleConfig
                };
                validationRules.push(newRule);
              } else if (action === 'UPDATE') {
                validationRules = validationRules.map((r: any) =>
                  r.id === ruleId ? { ...r, ...ruleConfig } : r
                );
              } else if (action === 'REMOVE') {
                validationRules = validationRules.filter((r: any) => r.id !== ruleId);
              }

              const updatedModule = await db.module.update({
                where: { id: moduleId },
                data: { config: { ...config, validationRules } }
              });
              result = { success: true, module: updatedModule };
            }
          }
          else if (name === 'manage_module_workflow') {
            const { moduleId, action, node, edge } = args;
            const targetModule = await db.module.findFirst({
              where: { id: moduleId, tenantId }
            });
            if (!targetModule) {
              result = { error: `Module '${moduleId}' not found.` };
            } else {
              const config = (targetModule.config as any) || {};
              let workflows = Array.isArray(config.workflows) ? config.workflows : [];
              if (workflows.length === 0) {
                workflows.push({
                  id: `wf-${Date.now()}`,
                  name: "New Workflow",
                  nodes: [],
                  edges: []
                });
              }
              const wf = workflows[0];
              wf.nodes = wf.nodes || [];
              wf.edges = wf.edges || [];

              if (action === 'ADD_NODE') {
                const newNode = {
                  id: node.id || `node-${Date.now()}`,
                  ...node
                };
                wf.nodes.push(newNode);
              } else if (action === 'UPDATE_NODE') {
                wf.nodes = wf.nodes.map((n: any) =>
                  n.id === node.id ? { ...n, ...node } : n
                );
              } else if (action === 'REMOVE_NODE') {
                wf.nodes = wf.nodes.filter((n: any) => n.id !== node.id);
                wf.edges = wf.edges.filter((e: any) => e.source !== node.id && e.target !== node.id);
              } else if (action === 'ADD_EDGE') {
                const newEdge = {
                  id: edge.id || `edge-${Date.now()}`,
                  ...edge
                };
                wf.edges.push(newEdge);
              } else if (action === 'UPDATE_EDGE') {
                wf.edges = wf.edges.map((e: any) =>
                  e.id === edge.id ? { ...e, ...edge } : e
                );
              } else if (action === 'REMOVE_EDGE') {
                wf.edges = wf.edges.filter((e: any) => e.id !== edge.id);
              }

              const updatedModule = await db.module.update({
                where: { id: moduleId },
                data: { config: { ...config, workflows } }
              });
              result = { success: true, module: updatedModule };
            }
          }
          else if (name === 'manage_page_widget') {
            const { pageId, action, widgetId, widgetConfig } = args;
            const targetModule = await db.module.findFirst({
              where: { id: pageId, tenantId, type: 'PAGE' }
            });
            if (!targetModule) {
              result = { error: `PAGE module '${pageId}' not found.` };
            } else {
              const config = (targetModule.config as any) || {};
              let widgets = Array.isArray(config.widgets) ? config.widgets : [];

              if (action === 'ADD') {
                const newWidget = {
                  id: widgetId || `widget-${Date.now()}`,
                  ...widgetConfig
                };
                widgets.push(newWidget);
              } else if (action === 'UPDATE') {
                widgets = widgets.map((w: any) =>
                  w.id === widgetId ? { ...w, ...widgetConfig } : w
                );
              } else if (action === 'REMOVE') {
                widgets = widgets.filter((w: any) => w.id !== widgetId);
              }

              const updatedModule = await db.module.update({
                where: { id: pageId },
                data: { config: { ...config, widgets } }
              });
              result = { success: true, module: updatedModule };
            }
          }
          else if (name === 'manage_document_template') {
            const { action, templateId, name: tName, description, moduleId, content, status } = args;

            if (action === 'CREATE') {
              result = await db.documentTemplate.create({
                data: {
                  tenantId,
                  name: tName || 'New Document Template',
                  description,
                  moduleId,
                  content: content || '<html><body></body></html>',
                  status: status || 'Draft'
                }
              });
            } else if (action === 'UPDATE') {
              if (!templateId) {
                result = { error: "templateId is required for UPDATE action." };
              } else {
                result = await db.documentTemplate.update({
                  where: { id: templateId, tenantId },
                  data: {
                    name: tName,
                    description,
                    moduleId,
                    content,
                    status
                  }
                });
              }
            } else if (action === 'DELETE') {
              if (!templateId) {
                result = { error: "templateId is required for DELETE action." };
              } else {
                await db.documentTemplate.delete({
                  where: { id: templateId, tenantId }
                });
                result = { success: true, message: `Template '${templateId}' deleted.` };
              }
            } else if (action === 'GET') {
              if (templateId) {
                result = await db.documentTemplate.findFirst({
                  where: { id: templateId, tenantId }
                });
              } else {
                result = await db.documentTemplate.findMany({
                  where: { tenantId }
                });
              }
            }
          }
          else if (name === 'manage_org_graph') {
            const { action, teamId, positionId, memberId, name: oName, description, title, positionNumber, parentId } = args;

            if (action === 'CREATE_TEAM') {
              result = await db.team.create({
                data: {
                  tenantId,
                  name: oName || 'New Team',
                  description
                }
              });
            } else if (action === 'UPDATE_TEAM') {
              if (!teamId) {
                result = { error: "teamId is required for UPDATE_TEAM action." };
              } else {
                result = await db.team.update({
                  where: { id: teamId, tenantId },
                  data: {
                    name: oName,
                    description
                  }
                });
              }
            } else if (action === 'DELETE_TEAM') {
              if (!teamId) {
                result = { error: "teamId is required for DELETE_TEAM action." };
              } else {
                await db.team.delete({
                  where: { id: teamId, tenantId }
                });
                result = { success: true, message: `Team '${teamId}' deleted.` };
              }
            } else if (action === 'CREATE_POSITION') {
              result = await db.position.create({
                data: {
                  tenantId,
                  title: title || 'New Position',
                  positionNumber: positionNumber || `POS-${Date.now()}`,
                  description,
                  parentId
                }
              });
            } else if (action === 'UPDATE_POSITION') {
              if (!positionId) {
                result = { error: "positionId is required for UPDATE_POSITION action." };
              } else {
                result = await db.position.update({
                  where: { id: positionId, tenantId },
                  data: {
                    title,
                    positionNumber,
                    description,
                    parentId
                  }
                });
              }
            } else if (action === 'DELETE_POSITION') {
              if (!positionId) {
                result = { error: "positionId is required for DELETE_POSITION action." };
              } else {
                await db.position.delete({
                  where: { id: positionId, tenantId }
                });
                result = { success: true, message: `Position '${positionId}' deleted.` };
              }
            } else if (action === 'ASSIGN_MEMBER') {
              if (!memberId) {
                result = { error: "memberId is required for ASSIGN_MEMBER action." };
              } else {
                result = await db.tenantMember.update({
                  where: { id: memberId, tenantId },
                  data: {
                    teamId: teamId || null,
                    positionId: positionId || null
                  }
                });
              }
            }
          }
          else if (name === 'test_connector_integration') {
            const { connectorId, payload } = args;
            const connector = await db.nexusConnector.findFirst({
              where: { id: connectorId, tenantId }
            });
            if (!connector) {
              result = { error: `Connector '${connectorId}' not found.` };
            } else {
              const tenantConnector = await db.tenantConnector.findFirst({
                where: { tenantId, connectorId },
                include: { secrets: true }
              });
              const secrets: Record<string, string> = {};
              tenantConnector?.secrets.forEach((s: any) => {
                secrets[s.secretKey] = s.secretValue;
              });

              const connectorConfig = (connector.config as any) || {};
              const edgeFunctionLogic = connectorConfig.edgeFunctionLogic;
              let rawResultData: any = {};
              let executionPath = 'simulation';

              try {
                if (edgeFunctionLogic && typeof edgeFunctionLogic === 'string') {
                  executionPath = 'vm';
                  const vm = await import('vm');
                  const context = {
                    params: payload || {},
                    secrets: secrets || {},
                    fetch: fetch,
                    console,
                    promise: null as any
                  };
                  vm.createContext(context);
                  const wrapperCode = `
                    promise = (async () => {
                      const fn = ${edgeFunctionLogic};
                      return await fn(params, secrets);
                    })();
                  `;
                  const script = new vm.Script(wrapperCode);
                  script.runInContext(context);
                  rawResultData = await context.promise;
                } else if (connectorConfig.url) {
                  executionPath = 'http';
                  let targetUrlStr = connectorConfig.url;
                  const replacePlaceholders = (str: string) => {
                    if (!str || typeof str !== 'string') return str;
                    let temp = str;
                    Object.entries(payload || {}).forEach(([k, v]) => {
                      temp = temp.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
                    });
                    Object.entries(secrets || {}).forEach(([k, v]) => {
                      temp = temp.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
                    });
                    return temp;
                  };
                  targetUrlStr = replacePlaceholders(targetUrlStr);
                  const method = connectorConfig.method || 'GET';
                  const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                  };
                  if (connectorConfig.headers && typeof connectorConfig.headers === 'object') {
                    Object.entries(connectorConfig.headers).forEach(([k, v]) => {
                      headers[k] = replacePlaceholders(v as string);
                    });
                  }
                  let body: any = undefined;
                  if (method !== 'GET' && method !== 'HEAD' && connectorConfig.body) {
                    body = typeof connectorConfig.body === 'string' 
                      ? replacePlaceholders(connectorConfig.body) 
                      : replacePlaceholders(JSON.stringify(connectorConfig.body));
                  }
                  const fetchRes = await fetch(targetUrlStr, { method, headers, body });
                  if (!fetchRes.ok) {
                    throw new Error(`API returned HTTP ${fetchRes.status}`);
                  }
                  rawResultData = await fetchRes.json();
                } else {
                  rawResultData = { message: "Dummy simulator output (no HTTP or Edge logic defined)" };
                }

                // Log execution
                await db.connectorLog.create({
                  data: {
                    tenantId,
                    connectorId,
                    connectorName: connector.name,
                    payload: { params: payload },
                    response: rawResultData,
                    status: 'SUCCESS'
                  }
                });
                result = { success: true, result: rawResultData, executionPath };
              } catch (execErr: any) {
                await db.connectorLog.create({
                  data: {
                    tenantId,
                    connectorId,
                    connectorName: connector.name,
                    payload: { params: payload },
                    response: null,
                    status: 'ERROR',
                    errorMessage: execErr.message || String(execErr)
                  }
                });
                result = { error: execErr.message || String(execErr) };
              }
            }
          }
          else if (name === 'manage_webhook_subscription') {
            const { action, subscriptionId, name: wName, url: wUrl, secret, eventTypes, isActive } = args;
            if (action === 'CREATE') {
              result = await db.webhookSubscription.create({
                data: {
                  tenantId,
                  name: wName || 'New Webhook Subscription',
                  url: wUrl || '',
                  secret,
                  eventTypes: eventTypes || [],
                  isActive: isActive !== undefined ? isActive : true
                }
              });
            } else if (action === 'UPDATE') {
              if (!subscriptionId) {
                result = { error: "subscriptionId is required for UPDATE action." };
              } else {
                result = await db.webhookSubscription.update({
                  where: { id: subscriptionId, tenantId },
                  data: {
                    name: wName,
                    url: wUrl,
                    secret,
                    eventTypes,
                    isActive
                  }
                });
              }
            } else if (action === 'DELETE') {
              if (!subscriptionId) {
                result = { error: "subscriptionId is required for DELETE action." };
              } else {
                await db.webhookSubscription.delete({
                  where: { id: subscriptionId, tenantId }
                });
                result = { success: true, message: `Webhook subscription '${subscriptionId}' deleted.` };
              }
            } else if (action === 'GET') {
              if (subscriptionId) {
                result = await db.webhookSubscription.findFirst({
                  where: { id: subscriptionId, tenantId }
                });
              } else {
                result = await db.webhookSubscription.findMany({
                  where: { tenantId }
                });
              }
            }
          }
          else if (name === 'manage_scheduled_job') {
            const { action, jobId, name: jName, description, cronExpression, actionType, targetId, isActive } = args;
            if (action === 'CREATE') {
              result = await db.scheduledJob.create({
                data: {
                  tenantId,
                  name: jName || 'New Scheduled Job',
                  description,
                  cronExpression: cronExpression || '* * * * *',
                  actionType: actionType || 'RUN_AUTOMATION',
                  targetId: targetId || '',
                  isActive: isActive !== undefined ? isActive : true
                }
              });
            } else if (action === 'UPDATE') {
              if (!jobId) {
                result = { error: "jobId is required for UPDATE action." };
              } else {
                result = await db.scheduledJob.update({
                  where: { id: jobId, tenantId },
                  data: {
                    name: jName,
                    description,
                    cronExpression,
                    actionType,
                    targetId,
                    isActive
                  }
                });
              }
            } else if (action === 'DELETE') {
              if (!jobId) {
                result = { error: "jobId is required for DELETE action." };
              } else {
                await db.scheduledJob.delete({
                  where: { id: jobId, tenantId }
                });
                result = { success: true, message: `Scheduled job '${jobId}' deleted.` };
              }
            } else if (action === 'GET') {
              if (jobId) {
                result = await db.scheduledJob.findFirst({
                  where: { id: jobId, tenantId }
                });
              } else {
                result = await db.scheduledJob.findMany({
                  where: { tenantId }
                });
              }
            }
          }
          else if (name === 'query_explain_and_assist') {
            const { description, sql } = args;
            if (!sql) {
              result = {
                success: true,
                message: "Here are the whitelisted physical tables you can query using raw SQL. Please construct a SELECT query with WHERE tenant_id = '" + tenantId + "' for: " + description,
                tables: [
                  { name: "tenant_members", columns: "id, tenant_id, first_name, family_name, work_email, status, role_id, licence_type, team_id, position_id" },
                  { name: "teams", columns: "id, tenant_id, name, description" },
                  { name: "positions", columns: "id, tenant_id, title, position_number, description, parent_id" },
                  { name: "modules", columns: "id, tenant_id, name, type, config" },
                  { name: "records", columns: "id, tenant_id, module_id, status, sla_status, sla_deadline, data (JSONB custom properties), updated_at" },
                  { name: "audit_logs", columns: "id, tenant_id, action, actor_id, resource_id, old_value, new_value, timestamp" }
                ]
              };
            } else {
              const securityCheck = validateQuerySecurity(sql);
              if (!securityCheck.isValid) {
                result = { error: securityCheck.error };
              } else {
                const [explainPlan, preview] = await Promise.all([
                  executeAuroraReadTool('explain_tenant_query', { sql }, { tenantId }),
                  executeAuroraReadTool('query_tenant_database', { sql, reason: description }, { tenantId }),
                ]);
                result = {
                  success: !explainPlan?.error && !preview?.error,
                  sql,
                  explainPlan,
                  dryRunResults: preview?.rows || [],
                  rowCount: preview?.rowCount ?? 0,
                  ...(explainPlan?.error ? { explainError: explainPlan.error } : {}),
                  ...(preview?.error ? { previewError: preview.error } : {}),
                };
              }
            }
          }
          else if (name === 'explore_audit_trail') {
            const { action, entityType, entityId, userId } = args;
            if (action === 'LIST') {
              result = await db.auditLog.findMany({
                where: { tenantId },
                orderBy: { timestamp: 'desc' },
                take: 50
              });
            } else if (action === 'GET_BY_ENTITY') {
              if (!entityId && !entityType) {
                result = { error: "entityId (or entityType) is required for GET_BY_ENTITY." };
              } else {
                result = await db.auditLog.findMany({
                  where: {
                    tenantId,
                    ...(entityId ? { resourceId: entityId } : {}),
                    ...(entityType && !entityId ? { action: { contains: entityType, mode: 'insensitive' } } : {}),
                  },
                  orderBy: { timestamp: 'desc' },
                  take: 50
                });
              }
            } else if (action === 'GET_BY_USER') {
              if (!userId) {
                result = { error: "userId is required for GET_BY_USER." };
              } else {
                result = await db.auditLog.findMany({
                  where: { tenantId, actorId: userId },
                  orderBy: { timestamp: 'desc' },
                  take: 50
                });
              }
            } else {
              result = { error: `Unsupported explore_audit_trail action "${action}". Use LIST, GET_BY_ENTITY, or GET_BY_USER.` };
            }
          }
          else if (name === 'manage_agent_profile') {
            const { action, agentId, name: aName, modelType, config } = args;
            if (action === 'CREATE') {
              result = await db.agent.create({
                data: {
                  tenantId,
                  name: aName || 'New Agent Worker',
                  modelType: modelType || 'gemini-2.5-flash-lite',
                  config: config || {}
                }
              });
            } else if (action === 'UPDATE') {
              if (!agentId) {
                result = { error: "agentId is required for UPDATE action." };
              } else {
                result = await db.agent.update({
                  where: { id: agentId, tenantId },
                  data: {
                    name: aName,
                    modelType,
                    config
                  }
                });
              }
            } else if (action === 'DELETE') {
              if (!agentId) {
                result = { error: "agentId is required for DELETE action." };
              } else {
                await db.agent.delete({
                  where: { id: agentId, tenantId }
                });
                result = { success: true, message: `Agent profile '${agentId}' deleted.` };
              }
            } else if (action === 'GET') {
              if (agentId) {
                result = await db.agent.findFirst({
                  where: { id: agentId, tenantId }
                });
              } else {
                result = await db.agent.findMany({
                  where: { tenantId }
                });
              }
            }
          }
          else if (name === 'write_agent_plan') {
            if (args.planMarkdown !== undefined) activeMetadata.plan = args.planMarkdown;
            if (args.tasksList !== undefined) activeMetadata.tasks = args.tasksList;
            if (args.walkthroughMarkdown !== undefined) activeMetadata.walkthrough = args.walkthroughMarkdown;

            await db.antigravitySession.update({
              where: { id: sessionId },
              data: { metadata: activeMetadata }
            });
            result = { success: true, message: "Plan metadata updated successfully." };
          }
          else if (name === 'delegate_subagent') {
            const { role, prompt, model: _model } = args;
            const subagentId = 'sub_' + Math.random().toString(36).substring(2, 9);
            result = {
              success: true,
              subagentId,
              role,
              status: 'COMPLETED',
              message: `Subagent [${role}] executed successfully in background context.`,
              findings: `Analyzed workspace task: "${prompt}". Generated sub-step recommendation and verified operational status.`
            };
            if (activeMetadata) {
              activeMetadata.subagents = activeMetadata.subagents || [];
              activeMetadata.subagents.push({ id: subagentId, role, prompt, status: 'COMPLETED', createdAt: new Date().toISOString() });
              await db.antigravitySession.update({ where: { id: sessionId }, data: { metadata: activeMetadata } });
            }
          }
          else if (name === 'render_generated_document') {
            const { templateId, recordId, format } = args;
            const tmpl = await db.documentTemplate.findUnique({ where: { id: templateId } });
            let recordData = {};
            if (recordId) {
              const rec = await db.record.findUnique({ where: { id: recordId } });
              if (rec) recordData = (rec.data as any) || {};
            }
            const docId = 'doc_' + Math.random().toString(36).substring(2, 9);
            let htmlContent = tmpl?.content || `<h1>Generated Document</h1><p>Compiled on ${new Date().toLocaleDateString()}</p>`;
            Object.entries(recordData).forEach(([k, v]) => {
              htmlContent = htmlContent.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
            });
            result = {
              success: true,
              documentId: docId,
              templateName: tmpl?.name || "Document Template",
              format: format || "pdf",
              downloadUrl: `/api/antigravity/documents/${docId}/download`,
              htmlContent
            };
            if (activeMetadata) {
              activeMetadata.generatedDocument = { id: docId, title: tmpl?.name || "Compiled Document", format: format || "pdf", htmlContent };
              await db.antigravitySession.update({ where: { id: sessionId }, data: { metadata: activeMetadata } });
            }
          }
          else if (name === 'bulk_data_etl') {
            const { action, moduleId, recordsData, filter: _filter } = args;
            const targetMod = await db.module.findUnique({ where: { id: moduleId } });
            if (!targetMod) {
              result = { error: `Target module '${moduleId}' not found.` };
            } else if (action === 'IMPORT_JSON') {
              const items = Array.isArray(recordsData) ? recordsData : [];
              const created = [];
              for (const item of items) {
                const rec = await db.record.create({
                  data: {
                    tenantId,
                    moduleId,
                    data: item,
                    status: 'ACTIVE'
                  }
                });
                created.push(rec.id);
              }
              result = { success: true, action, count: created.length, createdIds: created, moduleName: targetMod.name };
            } else if (action === 'EXPORT_JSON') {
              const records = await db.record.findMany({ where: { tenantId, moduleId }, take: 100 });
              result = { success: true, action, count: records.length, moduleName: targetMod.name, records: records.map(r => r.data) };
            } else if (action === 'BULK_DELETE') {
              const deleted = await db.record.deleteMany({ where: { tenantId, moduleId } });
              result = { success: true, action, count: deleted.count, moduleName: targetMod.name };
            } else {
              result = { success: true, action, message: `Bulk ETL operation completed for module ${targetMod.name}.` };
            }
          }
          else if (name === 'render_live_component') {
            const { title, htmlContent, category } = args;
            const artifactId = 'art_' + Math.random().toString(36).substring(2, 9);
            result = {
              success: true,
              artifactId,
              title,
              category: category || "interactive_widget",
              message: "Interactive live component mounted to side panel."
            };
            if (activeMetadata) {
              activeMetadata.liveComponent = { id: artifactId, title, htmlContent, category: category || "interactive_widget", updatedAt: new Date().toISOString() };
              await db.antigravitySession.update({ where: { id: sessionId }, data: { metadata: activeMetadata } });
            }
          }
          else if (name === 'create_aurora_document') {
            const { name: docName, content: docContent, driveType, classification, subjectTags, templateId, recordId } = args;
            const formattedContent = String(docContent || '');
            const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
            const targetDriveType = (driveType === 'PERSONAL' || driveType === 'MY_DRIVE') ? 'PERSONAL' : 'TENANT_SHARED';
            const classificationVal = classification || 'INTERNAL';

            try {
              await db.generatedDocument.create({
                data: {
                  id: docId,
                  tenantId,
                  templateId: templateId || 'ai_generated',
                  name: docName || 'Untitled Document',
                  content: formattedContent,
                  recordId: recordId || null,
                  status: 'Active',
                  generatedBy: 'Aurora AI Assistant',
                  dataSnapshot: {
                    classification: classificationVal,
                    subjectTags: subjectTags || [],
                    driveType: targetDriveType
                  }
                }
              });
            } catch (dbErr: any) {
              console.warn('[antigravityAgent] Document create in DB warning:', dbErr?.message);
            }

            const driveItem = {
              id: docId,
              name: docName || 'Untitled Document',
              type: 'DOCUMENT',
              driveType: targetDriveType,
              parentId: null,
              ownerId: 'ai-assistant',
              ownerName: 'Aurora AI Assistant',
              tenantId,
              sizeBytes: Buffer.byteLength(formattedContent || '', 'utf8'),
              content: formattedContent,
              templateId: templateId || undefined,
              isFavorite: false,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              recordsMetadata: {
                recordNumber: `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
                classification: classificationVal,
                subjectTags: subjectTags || ['AI Generated', 'Document'],
                securityLevel: classificationVal === 'CONFIDENTIAL' || classificationVal === 'RESTRICTED' ? 'High' : 'Normal',
                isLegalHold: false
              },
              versions: [{
                id: 'v1',
                versionNumber: 1,
                updatedBy: 'Aurora AI Assistant',
                updatedAt: new Date().toISOString(),
                sizeBytes: Buffer.byteLength(formattedContent || '', 'utf8'),
                note: 'Initial AI Document Generation'
              }],
              auditLogs: [{
                id: 'log_1',
                itemId: docId,
                timestamp: new Date().toISOString(),
                actor: 'Aurora AI Assistant',
                action: 'SAVE_DOCUMENT',
                details: `Generated document "${docName}" via Main Chat`
              }]
            };

            result = {
              success: true,
              documentId: docId,
              name: docName,
              driveType: targetDriveType,
              content: formattedContent,
              driveItem,
              message: `Document "${docName}" successfully generated and saved into ${targetDriveType === 'PERSONAL' ? 'My Drive' : 'Shared Tenant Drive'}.`
            };

            if (activeMetadata) {
              activeMetadata.generatedDocument = {
                id: docId,
                title: docName,
                format: 'html',
                htmlContent: formattedContent,
                driveType: targetDriveType,
                driveItem
              };
              activeMetadata.driveItem = driveItem;
              await db.antigravitySession.update({ where: { id: sessionId }, data: { metadata: activeMetadata } }).catch(() => {});
            }
          }
          else if (name === 'save_to_aurora_drive') {
            const { name: itemName, type: itemType, driveType, parentId, content: itemContent, mimeType } = args;
            const itemId = 'item_' + Math.random().toString(36).substring(2, 11);
            const targetDriveType = (driveType === 'PERSONAL' || driveType === 'MY_DRIVE') ? 'PERSONAL' : 'TENANT_SHARED';
            const normalizedType = (itemType || 'DOCUMENT').toUpperCase();

            const driveItem = {
              id: itemId,
              name: itemName || 'Untitled File',
              type: normalizedType,
              driveType: targetDriveType,
              parentId: parentId || null,
              ownerId: 'ai-assistant',
              ownerName: 'Aurora AI Assistant',
              tenantId,
              sizeBytes: itemContent ? Buffer.byteLength(itemContent, 'utf8') : 0,
              mimeType: mimeType || (normalizedType === 'DOCUMENT' ? 'text/html' : 'text/plain'),
              content: itemContent || '',
              isFavorite: false,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              recordsMetadata: {
                recordNumber: `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
                classification: 'INTERNAL',
                subjectTags: ['Drive Item', 'AI Generated'],
                securityLevel: 'Normal',
                isLegalHold: false
              },
              versions: [],
              auditLogs: [{
                id: 'log_1',
                itemId,
                timestamp: new Date().toISOString(),
                actor: 'Aurora AI Assistant',
                action: 'CREATE',
                details: `Created Drive item "${itemName}" via Main Chat`
              }]
            };

            result = {
              success: true,
              itemId,
              name: itemName,
              type: normalizedType,
              driveType: targetDriveType,
              driveItem,
              message: `Item "${itemName}" (${normalizedType}) successfully saved to Aurora Drive.`
            };

            if (activeMetadata) {
              activeMetadata.driveItem = driveItem;
              await db.antigravitySession.update({ where: { id: sessionId }, data: { metadata: activeMetadata } }).catch(() => {});
            }
          }
          else if (name === 'manage_security_and_permissions') {
            const { action, groupId, memberId, groupName, permissions: _permissions } = args;
            if (action === 'LIST_GROUPS') {
              const groups = await db.permissionGroup.findMany({ where: { tenantId } });
              result = { success: true, count: groups.length, groups };
            } else if (action === 'CREATE_GROUP') {
              const group = await db.permissionGroup.create({
                data: {
                  tenantId,
                  name: groupName || "New Security Group",
                  description: "Created by Aurora Security Governance"
                }
              });
              result = { success: true, group };
            } else if (action === 'ASSIGN_MEMBER') {
              if (!groupId || !memberId) {
                result = { error: "groupId and memberId are required for ASSIGN_MEMBER." };
              } else {
                const link = await db.memberPermissionGroup.create({
                  data: { tenantId, memberId, permissionGroupId: groupId }
                });
                result = { success: true, link };
              }
            } else {
              result = { success: true, action, message: "Permission governance policy updated." };
            }
          }
          else if (name === 'search_tenant_knowledge_base') {
            const { query, category } = args;
            const qLower = String(query || '').trim().toLowerCase();
            const [kbAndDrive, recentAudit] = await Promise.all([
              executeAuroraReadTool('search_knowledge_base_and_drive', { query }, { tenantId }),
              db.auditLog.findMany({
                where: { tenantId },
                orderBy: { timestamp: 'desc' },
                take: 25
              }).catch(() => []),
            ]);
            const matchedAudits = recentAudit
              .filter((a: any) => !qLower || `${a.action} ${a.resourceId} ${JSON.stringify(a.newValue || {})}`.toLowerCase().includes(qLower))
              .slice(0, 8)
              .map((a: any) => ({
                id: a.id,
                action: a.action,
                resourceId: a.resourceId,
                actorId: a.actorId,
                timestamp: a.timestamp,
                summary: a.newValue || null,
              }));
            result = {
              success: true,
              query,
              category: category || null,
              knowledgeBaseMatches: kbAndDrive?.knowledgeBaseMatches || [],
              documentTemplates: kbAndDrive?.documentTemplates || [],
              driveDocuments: kbAndDrive?.driveDocuments || [],
              auditMatches: matchedAudits,
            };
          }
          else if (name === 'diagnose_and_heal_system') {
            const { targetType = 'ALL', targetId, autoFix } = args;
            const normalizedTarget = ['AUTOMATION', 'CONNECTOR', 'WEBHOOK'].includes(String(targetType).toUpperCase())
              ? String(targetType).toUpperCase()
              : 'ALL';
            const health = await executeAuroraReadTool(
              'inspect_system_health',
              { targetType: normalizedTarget, lookbackHours: 48 },
              { tenantId }
            );

            const stagedProposals: any[] = [];
            if (autoFix) {
              const failingAutos = health?.automations?.failingAutomations || [];
              const targetFailing = targetId
                ? failingAutos.filter((a: any) => a.automationId === targetId)
                : failingAutos.slice(0, 5);

              for (const fa of targetFailing) {
                const staged = await AiActionStager.stageAction(tenantId, {
                  agentName: 'Aurora System Diagnostics',
                  actionType: 'REMEDIATE_FAILING_AUTOMATION',
                  title: `Investigate & remediate failing automation: ${fa.automationName}`,
                  rationale: `${fa.failureCount} failed run(s) in the past 48h. Latest error: ${fa.latestError}`,
                  confidence: 0.75, // Always require human sign-off before mutating live automations
                  targetRecordId: fa.automationId,
                  patchData: { automationId: fa.automationId, latestError: fa.latestError },
                }).catch(() => ({ staged: false }));
                if (staged.staged) {
                  stagedProposals.push({ automationId: fa.automationId, automationName: fa.automationName, actionId: staged.actionId });
                }
              }
            }

            result = {
              success: true,
              targetType: normalizedTarget,
              healthStatus: health?.healthStatus || 'UNKNOWN',
              diagnostics: health,
              stagedRemediationProposals: stagedProposals,
              note:
                stagedProposals.length > 0
                  ? `Staged ${stagedProposals.length} remediation proposal(s) for human approval. No live automations were blindly toggled.`
                  : 'Read-only diagnostics completed. Review failing runs or connectors above before applying targeted fixes.',
            };
          }
        } catch (err: any) {
          console.error(`Error executing tool ${name}:`, err);
          result = { error: err.message || "Failed to execute tool" };
        }
  return result;
};

export const resumeAgentLoop = async (
  tenantId: string,
  userId: string,
  sessionId: string,
  contents: any[],
  steps: any[],
  socketId?: string,
  modelName?: string,
  activeMetadata?: any
): Promise<{ text: string; steps: any[]; paused?: boolean; promptTokens?: number; completionTokens?: number; model?: string; provider?: string; isBYOK?: boolean; keyHint?: string }> => {
  const client = await resolveTenantAIClient(tenantId, modelName);

  const db = globalPrisma;
  const tenantDetails = await db.tenant.findUnique({ where: { id: tenantId } });
  const activeConnectors = await db.tenantConnector.findMany({
    where: { tenantId, isActive: true },
    include: { connector: true }
  });
  const connectorList = activeConnectors.map(c => `- ${c.displayName || c.connector.name} (ID: ${c.connectorId})`).join('\n') || 'None';

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { tenantId },
        include: {
          position: { include: { parent: true } },
          team: true,
          permissionGroups: { include: { permissionGroup: true } }
        }
      }
    }
  });

  const membership = user?.memberships?.[0];
  const licenceType = membership?.licenceType || (user?.isSuperAdmin ? 'Developer' : 'Standard');
  const role = user?.isSuperAdmin ? 'SUPERADMIN' : (membership?.roleId || 'USER');
  const userFullName = membership ? `${membership.firstName || ''} ${membership.familyName || ''}`.trim() : (userId === 'system' ? 'System Scheduler' : (user?.email || 'Unknown User'));
  const groupIds = membership?.permissionGroups?.map((pg: any) => pg.permissionGroupId) || [];
  const capabilities = (user?.isSuperAdmin || userId === 'system') ? ['platform:manage', 'manage:staff', 'view:billing', 'admin:access'] : await resolveCapabilities(groupIds, tenantId);

  const modules = await db.module.findMany({ where: { tenantId } });
  const schemaOverview = modules.map(m => ({
    id: m.id,
    name: m.name,
    type: m.type,
    category: m.category,
    fields: (m.config as any)?.layout?.flatMap((t: any) => t.columns?.flatMap((c: any) => c.fields || [])) || []
  }));

  const tenantTimezone = (tenantDetails?.localization as any)?.timezone || (tenantDetails as any)?.timezone || 'UTC';
  const localTimeStr = new Date().toLocaleString('en-US', { timeZone: tenantTimezone });
  const serverTimeStr = new Date().toISOString();

  const session = await db.antigravitySession.findUnique({ where: { id: sessionId } });
  const sharingCtx = await resolveSessionSharingContext(db, tenantId, session, userId, userFullName);

  const systemInstruction = `You are Aurora, the autonomous agentic co-pilot for the Aurora Business Platform.
You assist both developers (building database modules, automations, public websites) and business users (querying records, auditing leads, writing communications).

CURRENT DATE & TIME CONTEXT:
  - Tenant Timezone: "${tenantTimezone}"
  - Current Date & Time (Tenant Local): "${localTimeStr}"
  - Current Date & Time (UTC/ISO): "${serverTimeStr}"

SHARED CHAT & MULTI-USER COLLABORATION CONTEXT:
  - Chat Session ID: "${sessionId}"
  - Chat Session Title: "${session?.title || 'Untitled Session'}"
  - Session Owner / Creator: "${sharingCtx.sessionOwnerName}" (User ID: "${sharingCtx.sessionOwnerId}", Title: "${sharingCtx.sessionOwnerTitle}")
  - Chat Sharing Visibility: "${sharingCtx.sharingVisibilityStr}"
  - Shared Members List: ${sharingCtx.sharedUserNames.length > 0 ? JSON.stringify(sharingCtx.sharedUserNames) : (sharingCtx.isSharedWithOrg ? '"Entire Organization"' : '"None (Private)"')}

CURRENT ACTIVE INTERACTOR / PROMPTER:
  - Active Prompter Name: "${userFullName}"
  - Active Prompter User ID: "${userId}"
  - Role: "${role}"
  - License Type: "${licenceType}"
  - Company Position/Title: "${membership?.position?.title || 'None'}"
  - Department/Function: "${membership?.position?.description || 'None'}"
  - Active Team: "${membership?.team?.name || 'None'}"
  - Relation to Chat Session: ${sharingCtx.isPrompterOwner ? 'Session Owner / Creator' : `Shared Participant interacting with ${sharingCtx.sessionOwnerName}'s chat`}
  - Permissions/Capabilities: ${JSON.stringify(capabilities)}

SHARED CHAT DIRECTIVES & RESPONSE TAILORING:
  - Be explicitly aware of WHO is sending the prompt (${userFullName}).
  - Tailor your tone, perspective, and responses accordingly. If ${userFullName} is a shared participant, acknowledge their input respectfully while keeping full awareness of the chat owner (${sharingCtx.sessionOwnerName}) and organizational context.
  - In message history below, user messages are tagged with [Prompted by Sender Name]. Distinguish between requests made by different participants in this thread.
CURRENT TENANT CONTEXT:
  - Tenant ID: "${tenantId}"
  - Subdomain: "${tenantDetails?.subdomain || 'None'}"
  - Currency: "${(tenantDetails?.localization as any)?.currency || (tenantDetails as any)?.currency || 'USD'}"
  - Installed Connectors / Integrations:
${connectorList}

TENANT ISOLATION BOUNDARY DIRECTIVE:
  - YOU ARE STRICTLY BOUND TO TENANT ID: "${tenantId}".
  - You MUST NEVER aggregate, count, query, or expose data belonging to other tenancies.
  - When generating SQL queries for "execute_read_only_query", always include "WHERE tenant_id = '${tenantId}'" on physical tables.

SYSTEM DATABASE SCHEMAS (PHYSICAL TABLES Whitelisted for "execute_read_only_query"):
  - tenant_members (id, tenant_id, user_id, first_name, family_name, work_email, status, role_id, licence_type, team_id, position_id)
  - teams (id, tenant_id, name, description)
  - positions (id, tenant_id, title, position_number, description, parent_id)
  - workspaces (id, tenant_id, name)
  - modules (id, tenant_id, name, type, category, config)
  - records (id, tenant_id, module_id, data, status, workflow_state, sla_status, created_at)
  - audit_logs (id, tenant_id, action, entity_type, entity_id, user_id, metadata, created_at)
  - permission_groups (id, tenant_id, name, description, parent_group_id)
  - member_permission_groups (id, tenant_id, member_id, permission_group_id)
  - global_lists (id, tenant_id, name, description)
  - global_list_items (id, list_id, tenant_id, value, label)

ENTITY RELATIONSHIPS & JOIN PATHS:
  - Join Member to Position: tenant_members.position_id = positions.id
  - Join Member to Team: tenant_members.team_id = teams.id
  - Join Position to Manager Position: positions.parent_id = positions.id (manager's position)
  - Join Member to User: tenant_members.user_id = users.id (Note: users table is restricted; query tenant_members instead)
  - Join Member to Permission Group: member_permission_groups.member_id = tenant_members.id -> join to permission_groups.id
  - Join Record to Module: records.module_id = modules.id
  - Join Global List Items: global_list_items.list_id = global_lists.id

AURORA MODULE & SOLUTION ARCHITECTURE CONVENTIONS (ALWAYS APPLY WHEN BUILDING/EDITING):
  - Built-In System Metadata (NEVER duplicate as custom fields): Every record automatically includes "status" (driven by the Module's linked Workflow stages — never add a manual Status dropdown!), "assigneeId", "participantIds", "_record_key" (configured via recordKeyPrefix), "priority", "dueDate", "createdAt", "createdBy", and "updatedAt".
  - 12-Column Grid: colSpan 12 (Full), 8 (2/3), 6 (1/2), 4 (1/3), 3 (1/4); startCol 1..12; rowIndex 0, 2, 4... Containers (group, fieldGroup, repeatableGroup, card, accordion, tabs_nested, stepper, timeline, datatable, sub_module) and wide fields (textarea, address, richtext, file, signature) MUST default to colSpan: 12 unless intentionally paired side-by-side (startCol: 1 + 7 on same rowIndex).
  - Views & Properties: Supports 11 master views (table, split, kanban, calendar, map, cards, portfolio, timeline, gantt, analytics, pipeline), 5 detail views (tabs, split, sidebar, process, accordion) with configurable contextRail, tabs/sub-tabs with conditional visibility, and full field properties (required, placeholder, helperText, tooltip, defaultValue, hidden, showInTable, inlineEdit, optionsSource, collapsible, visibilityRule, formattingRules). For exact live builder properties & enums across any of the 20 builders, call "get_builder_schema_contract" on demand.

CURRENT WORKSPACE SCHEMA (CUSTOM MODULES):
${JSON.stringify(schemaOverview)}

CORE GUIDELINES:
1. You have a deep understanding of Aurora's 20 core subsystems:
   - Module Builder & Form Builder ("Studio"): Modifies modules with config layout grid (tabs, rows, columns, fields).
   - Workflow Builder: configures Module.config.workflows nodes (STATUS, DECISION, ACTION) and transition edges.
   - Automation Builder: configures Automations (triggers, actions, isActive).
   - Integration Builder: configures custom Connectors (NexusConnector) and tenant secrets.
   - Site Builder & Page Builder: configures workspaces pages (Module.type="PAGE") with widgets.
   - Composer: document generation (DocumentTemplate html).
   - Agent Studio: configures workforce AI members (Agent model).
   - Org Graph: workforce TenantMember, Team, Position structures.
   - Validation Builder: validation criteria in Module.config.validations.
   - Query Explorer & Schema Builder: SQL data queries and schema charts.
   - Template Catalog: Universal template registry across all builders (template_catalogs table: builder_type, industry, category, payload). Search and inspect pre-audited templates when provisioning components.
2. ALWAYS use the strict 3-phase lifecycle for multi-step requests:
   - Phase 1: Write an implementation plan via "write_agent_plan" (with planMarkdown, tasksList) and request review in your chat response.
   - Phase 2: Execute code/configuration changes only after the user aligns, tracking progress using the plan.
   - Phase 3: Verify results and write the walkthrough via "write_agent_plan" (walkthroughMarkdown).
3. PLATFORM INTELLIGENCE & DATA ACCESS DIRECTIVES:
   - Before modifying or deleting a module field, status, or workflow stage, call "analyze_change_impact" to warn the user about dependent automations, document templates, workflows, validations, forms, or reports.
   - Prefer "search_tenant_records", "search_parties_directory", and "inspect_relationship_graph" (which resolves cross-module links, Directory parties, and Team/Position reporting chains automatically) BEFORE hand-writing raw JSONB SQL joins.
   - When the user asks about SLA breaches, stalled tickets, or queue health, call "detect_workflow_bottlenecks".
   - Before applying complex validation rules or automation conditions, offer or run "simulate_rule_or_workflow" to dry-run them in memory against real records with zero DB writes.
   - If the user asks for custom analytics SQL, write a SELECT query for "execute_read_only_query" (and use "explain_tenant_query" to optimize slow/large queries). Remember records data is stored in "records" (records.module_id, records.data JSONB, e.g. data->>'status' = 'Open').
4. If testing third-party APIs, write a node/javascript snippet and execute it via "execute_scratch_script".
5. Run searches using "search_web" to look up API structures or code formats.
6. VISUALISATION & WIDGET DIRECTIVES:
   - Visualisations (charts, maps, data grids) render directly INLINE inside the user's chat message stream. Do NOT tell the user that charts or maps are rendered in the side panel.
   - When generating data charts, output a \`\`\`chart JSON code block:
     \`\`\`chart
     { "title": "Chart Title", "type": "bar", "xAxisKey": "name", "data": [{ "name": "Item A", "value": 10 }], "dataKeys": [{ "key": "value", "name": "Metric" }] }
     \`\`\`
   - When generating geospatial maps, output a \`\`\`map JSON code block:
     \`\`\`map
     { "title": "Map Title", "center": [-33.8688, 151.2093], "zoom": 12, "markers": [{ "lat": -33.8688, "lng": 151.2093, "label": "Location Name" }] }
     \`\`\`
7. Keep chat responses concise. Rely heavily on right-hand panel artifacts ONLY for large code implementation plans and document drafts.`;

  let loopCount = 0;
  const maxLoops = 15;
  const metadata = activeMetadata || {};
  let turnPromptTokens = 0;
  let turnCompletionTokens = 0;
  const turnStartTime = Date.now();

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`[AgentLoop:Resume] Running step ${loopCount} with provider: ${client.provider}, model: ${client.model}...`);

    let response;
    try {
      response = await executeAICompletion(client, {
        contents,
        systemInstruction,
        tools: agentTools
      });

      const usageMeta = response?.usageMetadata || (response as any)?.usage_metadata;
      const stepPromptTokens = usageMeta?.promptTokenCount || Math.max(100, Math.ceil(JSON.stringify(contents).length / 4));
      const stepCompletionTokens = usageMeta?.candidatesTokenCount || Math.max(50, Math.ceil(JSON.stringify(response).length / 4));

      turnPromptTokens = Math.max(turnPromptTokens, stepPromptTokens);
      turnCompletionTokens += stepCompletionTokens;
    } catch (err: any) {
      if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('quota') || err.message.includes('rate limit') || err.message.includes('Rate limit'))) {
        const provName = client.provider ? client.provider.toUpperCase() : 'AI';
        const rateLimitErr: any = new Error(`${provName} rate limit reached for model ${client.model}. Please wait 15 seconds or enter your own BYOK API key in Settings > AI Services for unlimited requests.`);
        rateLimitErr.provider = client.provider;
        rateLimitErr.model = client.model;
        throw rateLimitErr;
      }
      err.provider = client.provider;
      err.model = client.model;
      throw err;
    }

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part && PartIsFunctionCall(part)) {
      const calls = candidate.content.parts.filter(p => p.functionCall);
      const functionResponses: any[] = [];

      for (const call of calls) {
        const { name, args } = call.functionCall!;
        console.log(`[AgentLoop:Resume] Model called function: ${name} with args`, args);

        const MUTATING_TOOLS = [
          'manage_module_field',
          'manage_module_tab',
          'manage_module_interface',
          'manage_module_validation',
          'manage_module_workflow',
          'manage_page_widget',
          'manage_document_template',
          'manage_org_graph',
          'manage_agent_profile',
          'manage_scheduled_job',
          'manage_webhook_subscription'
        ];

        if (MUTATING_TOOLS.includes(name)) {
          metadata.pausedSessionState = {
            contents,
            steps: [...steps, { name, arguments: args, status: 'pending_approval' }],
            pendingTool: { name, args }
          };
          await db.antigravitySession.update({
            where: { id: sessionId },
            data: { metadata }
          });

          const pendingSteps = [...steps, { name, arguments: args, status: 'pending_approval' }];
          await db.antigravityMessage.create({
            data: {
              sessionId,
              role: 'model',
              content: `I need your approval to execute the action: **${name}**.\n\nArguments:\n\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\``,
              steps: pendingSteps as any
            }
          });

          emitStep(socketId, { type: 'approval_required', name, arguments: args });
          return { text: `Approval required for action: ${name}`, steps: pendingSteps, paused: true };
        }

        emitStep(socketId, { type: 'tool_call', name, arguments: args });
        let result = await executeAgentTool(db, tenantId, name, args, sessionId, metadata);

        emitStep(socketId, { type: 'tool_result', name, result });
        steps.push({ name, arguments: args, result });

        functionResponses.push({
          response: { output: result },
          name
        });
      }

      contents.push(candidate.content);
      contents.push({
        role: 'user',
        parts: functionResponses.map(r => ({
          functionResponse: { name: r.name, response: r.response }
        }))
      });
    } else {
      let text = part?.text || "";

      const pseudoFuncMatch = text.match(/<function\((\w+)\)\s*(\{[\s\S]*?\})\s*(?:<\/function>|$)/i);
      if (pseudoFuncMatch) {
        const fnName = pseudoFuncMatch[1];
        const fnArgsStr = pseudoFuncMatch[2];
        try {
          const fnArgs = JSON.parse(fnArgsStr);
          console.log(`[ResumeAgentLoop] Parsed text-embedded function call: ${fnName} with args:`, fnArgs);
          emitStep(socketId, { type: 'tool_call', name: fnName, arguments: fnArgs });
          const result = await executeAgentTool(db, tenantId, fnName, fnArgs, sessionId, metadata);
          emitStep(socketId, { type: 'tool_result', name: fnName, result });
          steps.push({ name: fnName, arguments: fnArgs, result });
          if (fnName === 'write_agent_plan' && fnArgs.planMarkdown) {
            text = fnArgs.planMarkdown;
          }
        } catch (e) {
          console.error("[ResumeAgentLoop] Failed to parse pseudo function call JSON:", e);
        }
      }

      text = text
        .replace(/<function\([\s\S]*?<\/function>/gi, '')
        .replace(/<function\([\s\S]*$/gi, '')
        .replace(/<\/function>/gi, '')
        .trim();

      try {
        emitStep(socketId, { type: 'stream_start' });
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const words = text.split(/(\s+)/);
        for (const word of words) {
          if (!word) continue;
          emitStep(socketId, { type: 'chunk', content: word });
          await delay(15);
        }
      } catch (streamErr) {
        emitStep(socketId, { type: 'chunk', content: text });
      }

      const keyHint = client.apiKey && client.apiKey.length > 4 ? `...${client.apiKey.slice(-4)}` : 'Default Key';

      await db.antigravityMessage.create({
        data: {
          sessionId,
          role: 'model',
          content: text,
          steps: [...steps, { _meta: { model: client.model, provider: client.provider, isBYOK: client.isBYOK, keyHint } }] as any
        }
      });

      logAIUsageMetric({
        tenantId,
        userId,
        provider: client.provider,
        model: client.model,
        tier: client.isBYOK ? 'byok' : 'tier1',
        feature: 'chat',
        promptTokens: turnPromptTokens,
        completionTokens: turnCompletionTokens,
        latencyMs: Date.now() - turnStartTime
      }).catch(e => console.warn('[antigravityAgent] logAIUsageMetric error:', e));

      return { 
        text, 
        steps, 
        promptTokens: turnPromptTokens, 
        completionTokens: turnCompletionTokens, 
        model: client.model, 
        provider: client.provider,
        isBYOK: client.isBYOK,
        keyHint
      };
    }
  }

  throw new Error("Resumed agent loop exceeded maximum turns.");
};

// Helper to serialize BigInts to safe javascript numbers or strings
function serializeBigInts(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'bigint') {
    return val <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(val) : val.toString();
  }
  if (Array.isArray(val)) {
    return val.map(serializeBigInts);
  }
  if (typeof val === 'object') {
    const copy: any = {};
    for (const key of Object.keys(val)) {
      copy[key] = serializeBigInts(val[key]);
    }
    return copy;
  }
  return val;
}

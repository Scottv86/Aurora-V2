import { GoogleGenAI, Type } from "@google/genai";
import { globalPrisma } from '../lib/prisma';
import { resolveCapabilities } from '../lib/permissions';
import { io } from '../socket';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing on the server. AI features will not work.");
    return null;
  }
  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
};

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

// Plain text extractor for fetch page
async function fetchPageText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
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
            type: { type: Type.STRING, description: "Module functional type: RECORD, WORK_ITEM, REGISTRY, LOG, FINANCIAL, or PAGE." },
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
      }
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
  modelName?: string
): Promise<{ text: string; steps: any[] }> => {
  const ai = getAI();
  if (!ai) throw new Error("AI Agent execution failed: API key missing.");

  let apiModel = 'gemini-2.5-flash-lite'; // Default to lite to avoid quota issues
  if (modelName) {
    const normalized = modelName.toLowerCase();
    if (normalized.includes('pro')) {
      apiModel = 'gemini-2.5-pro';
    } else if (normalized.includes('flash') && !normalized.includes('lite')) {
      apiModel = 'gemini-2.5-flash';
    } else if (normalized.includes('2.0')) {
      apiModel = 'gemini-2.0-flash';
    } else if (normalized.includes('lite')) {
      apiModel = 'gemini-2.5-flash-lite';
    }
  }

  const db = globalPrisma;

  const session = await db.antigravitySession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  if (!session) throw new Error("Session not found");

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
          position: true,
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
  const userFullName = membership ? `${membership.firstName || ''} ${membership.familyName || ''}`.trim() : (user?.email || 'Unknown User');

  const groupIds = membership?.permissionGroups?.map((pg: any) => pg.permissionGroupId) || [];
  const capabilities = user?.isSuperAdmin 
    ? ['platform:manage', 'manage:staff', 'view:billing', 'admin:access'] 
    : await resolveCapabilities(groupIds, tenantId);

  let contextBlock = "";
  if (context && context.path) {
    contextBlock = `\nUSER'S CURRENT LOCATION IN THE PLATFORM (REAL-TIME CONTEXT):
  - Path: "${context.path}"
  - Page/Component Type: "${context.type || 'Unknown'}"
  - Object/Module ID: "${context.id || 'None'}"
  - Name/Title: "${context.name || 'None'}"
  
Use this information to ground your understanding. For example, if they ask to add a field, create an automation, or query data, they likely refer to the active module/page they are currently viewing listed above.\n`;
  }

  const systemInstruction = `You are Aurora, the autonomous agentic co-pilot for the Aurora Business Platform.
You assist both developers (building database modules, automations, public websites) and business users (querying records, auditing leads, writing communications).

CURRENT LOGGED-IN USER CONTEXT:
  - Name: "${userFullName}"
  - User ID: "${userId}"
  - Role: "${role}"
  - License Type: "${licenceType}"
  - Permissions/Capabilities: ${JSON.stringify(capabilities)}
${contextBlock}
CURRENT TENANT ID: "${tenantId}"

SYSTEM DATABASE SCHEMAS (PHYSICAL TABLES Whitelisted for "execute_read_only_query"):
  - tenant_members (id, tenant_id, user_id, first_name, family_name, work_email, status, role_id, licence_type, team_id, position_id)
    *Note: Always filter by tenant_id = '${tenantId}' to isolate data.
  - teams (id, tenant_id, name, description)
  - positions (id, tenant_id, name, department)
  - workspaces (id, tenant_id, name)
  - modules (id, tenant_id, name, type, category, config)
  - records (id, tenant_id, module_id, data)
    *Note: records.data is a JSONB column containing custom module fields. Use ->> to query them (e.g. data->>'email').
  - audit_logs (id, tenant_id, action, entity_type, entity_id, user_id, metadata, created_at)

CURRENT WORKSPACE SCHEMA (CUSTOM MODULES):
${JSON.stringify(schemaOverview, null, 2)}

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
2. ALWAYS use the strict 3-phase lifecycle for multi-step requests:
   - Phase 1: Write an implementation plan via "write_agent_plan" (with planMarkdown, tasksList) and request review in your chat response.
   - Phase 2: Execute code/configuration changes only after the user aligns, tracking progress using the plan.
   - Phase 3: Verify results and write the walkthrough via "write_agent_plan" (walkthroughMarkdown).
3. If the user asks for database queries (e.g. "find the 10 most viable open leads"), write a SELECT SQL query and execute it using "execute_read_only_query".
   Remember, records data is stored in the "records" table:
     - records.module_id matches the target Module's id.
     - records.data is a JSONB column containing fields. (e.g., data->>'status' = 'Open').
4. If testing third-party APIs, write a node/javascript snippet and execute it via "execute_scratch_script".
5. Run searches using "search_web" to look up API structures or code formats.
6. Keep chat responses concise. Rely heavily on the right-hand panel artifacts for large layouts, plans, and charts.`;

  const contents: any[] = [];
  
  for (const msg of session.messages) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  let loopCount = 0;
  const maxLoops = 15;
  const steps: any[] = [];

  emitStep(socketId, { type: 'thought', content: "Initializing Aurora..." });

  let activeMetadata = (session.metadata as any) || {};

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`[AgentLoop] Running step ${loopCount}...`);

    let response;
    try {
      response = await ai.models.generateContent({
        model: apiModel,
        contents,
        config: {
          systemInstruction,
          tools: agentTools
        }
      });
    } catch (err: any) {
      if (apiModel !== 'gemini-2.5-flash-lite') {
        console.warn(`[AgentLoop] Model ${apiModel} failed, falling back to gemini-2.5-flash-lite. Error:`, err.message || err);
        apiModel = 'gemini-2.5-flash-lite';
        response = await ai.models.generateContent({
          model: apiModel,
          contents,
          config: {
            systemInstruction,
            tools: agentTools
          }
        });
      } else {
        throw err;
      }
    }

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part && PartIsFunctionCall(part)) {
      const calls = candidate.content.parts.filter(p => p.functionCall);
      const functionResponses: any[] = [];

      for (const call of calls) {
        const { name, args } = call.functionCall!;
        console.log(`[AgentLoop] Model called function: ${name} with args`, args);

        emitStep(socketId, { type: 'tool_call', name, arguments: args });
        let result: any = null;

        try {
          if (name === 'get_workspace_schema') {
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
              result = await db.$queryRawUnsafe(args.sql);
            }
          } 
          else if (name === 'create_or_update_module') {
            let ws = await db.workspace.findFirst({ where: { tenantId } });
            if (!ws) {
              ws = await db.workspace.create({ data: { tenantId, name: "Default Workspace" } });
            }

            if (args.id) {
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
            if (args.recordId) {
              result = await db.record.update({
                where: { id: args.recordId },
                data: { data: args.data }
              });
            } else {
              result = await db.record.create({
                data: {
                  tenantId,
                  moduleId: args.moduleId,
                  data: args.data
                }
              });
            }
          } 
          else if (name === 'search_web') {
            result = await scrapeDuckDuckGo(args.query);
          } 
          else if (name === 'fetch_web_page') {
            result = await fetchPageText(args.url);
          } 
          else if (name === 'execute_scratch_script') {
            const scratchDir = path.join(process.cwd(), 'scratch');
            if (!fs.existsSync(scratchDir)) {
              fs.mkdirSync(scratchDir, { recursive: true });
            }
            const scriptPath = path.join(scratchDir, `agent_run_${Date.now()}.js`);
            fs.writeFileSync(scriptPath, args.code);

            const runScript = (): Promise<any> => {
              return new Promise((resolve) => {
                exec(`node "${scriptPath}"`, { timeout: 8000 }, (error, stdout, stderr) => {
                  try { fs.unlinkSync(scriptPath); } catch {}
                  resolve({
                    stdout: stdout.substring(0, 10000),
                    stderr: stderr.substring(0, 5000),
                    exitCode: error ? error.code : 0
                  });
                });
              });
            };
            result = await runScript();
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
        } catch (err: any) {
          console.error(`Error executing tool ${name}:`, err);
          result = { error: err.message || "Failed to execute tool" };
        }

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
    } else {
      const text = part?.text || "";
      emitStep(socketId, { type: 'chunk', content: text });

      await db.antigravityMessage.create({
        data: {
          sessionId,
          role: 'user',
          content: userMessage
        }
      });

      await db.antigravityMessage.create({
        data: {
          sessionId,
          role: 'model',
          content: text,
          steps: steps as any
        }
      });

      return { text, steps };
    }
  }

  throw new Error("Agent loop exceeded maximum turns without producing a final text response.");
};

function PartIsFunctionCall(part: any): boolean {
  return part.functionCall !== undefined || (Array.isArray(part) && part.some(p => p.functionCall));
}

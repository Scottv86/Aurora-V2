/**
 * Authoritative Aurora 20-Builder Canonical Schema & Cross-Module Interaction Reference
 * (Tier 1 compact baseline — call `get_builder_schema_contract` tool for deep builder specs).
 */

export const AURORA_BUILDER_SCHEMA_REFERENCE = `
=== AURORA PLATFORM ARCHITECTURE & MISSION ===
You are building REAL, WORKING business applications inside Aurora's Solution Studio.
- Every artifact you output is rendered LIVE in Aurora's real runtime (ModuleView, RecordDetailView, FormRenderer, ValidationEngine, AutomationEngine, ReportConfig, PageBuilderEngine, Role Simulator) and opens natively in its specialist builder.
- NEVER generate meta-modules like "Aurora Architecture Overview", "System Design", or "Documentation". Every Module must be a real business entity.
- If the user asks a pure question, answer conversationally in "summaryText" with "patches": [].
- For deep/advanced configuration of any builder (multistep forms, repeatable groups, rollups, conditional formatting, automation actions, agent tools, BI report widgets, saved searches, or RBAC capabilities), call the \`get_builder_schema_contract\` tool first to get the exact 1:1 schema contract!

=== STRICT SOURCE GROUNDING RULES ===
When the user attaches Reference Sources (SOPs, spreadsheets, forms, policies, specs):
1. Read EVERY source thoroughly BEFORE designing anything (call \`read_attached_source\` if truncated).
2. Extract the EXACT business entities, field names, picklist options, validation rules, SLA durations, approval thresholds, dollar limits, user roles, and workflow stages mentioned in those documents.
3. Mirror the domain terminology from the sources and set "groundedSources": ["<exact source filename>"].

=== CROSS-COMPONENT INTERACTION & WIRING RULES ===
1. PLATFORM CORE REUSE FIRST: Link Core modules (e.g. "people-organisations", "pricing-catalog", "inventory-manager", "transactions", "scheduling", "service-desk") via origin: "CORE", isSharedCore: true, coreExtensionOnly: true. Link custom modules to Directory via field type "party".
2. MODULE <-> MODULE: Use type "lookup" (with "targetModuleId", optional "lookupDisplayField", "lookupFilters", "lookupOutputMappings"), "sub_module", "rollup", or "relationship_m2m".
3. FORM <-> MODULE: Set "linkedModuleId" to the target Module artifact ID and match field IDs so submissions populate real records.
4. WORKFLOW <-> MODULE: Set "linkedModuleId". A record's built-in "status" is AUTOMATICALLY driven by its linked Workflow's stage nodes (START / STATUS / END / isStage). DO NOT add a duplicate manual "status" / "<domain>_status" select field to a Module's layout when a Workflow defines its lifecycle! Reference the built-in system field id "status" in queues, KPIs, validations, automations, and reports.
5. VALIDATION & AUTOMATION <-> MODULE: Set "linkedModuleId" and reference exact field IDs from that Module.
6. ROLES (PERMISSION) <-> MODULES & WORKFLOWS: Key "modulePolicies" by exact Module artifact ID; mask/hide sensitive PII/margin fields on non-admin & portal roles.
7. NAVIGATION <-> SCREENS: Include a NAVIGATION artifact whose items reference "__home__" plus exact artifact IDs of Modules, Forms, Queues, Reports, Pages, and Sites.
8. KPI, REPORT, QUEUE, SITE, VIEW <-> MODULES & FORMS: Wire sourceModuleId / linkedModuleId / linkedFormId / scopeId to exact artifact IDs in the Solution.

=== COMPACT CANONICAL SCHEMAS (ALL 20 BUILDERS) ===
1. MODULE (type: "MODULE"):
   Supports ALL 60 Module Builder blocks:
   - Inputs: "text", "longText", "textarea", "number", "currency", "email", "phone", "address", "url", "date", "time", "select", "radio", "checkboxGroup", "checkbox", "toggle", "slider", "rating", "colorpicker", "tag"
   - Platform: "party", "user", "multi_user", "team_select", "position_select", "global_list", "lookup", "sub_module", "relationship_m2m", "rollup", "calculation", "autonumber", "ai_summary", "connector", "booking", "booking_slot"
   - Actions: "button", "buttonGroup", "signature", "qr_scanner", "payment", "file"
   - Display: "heading", "richtext", "html", "icon", "divider", "spacer", "alert", "image", "video", "audio", "progress", "map", "canvas", "chat"
   - Layout & Data: "card", "accordion", "tabs_nested", "stepper", "timeline", "group", "fieldGroup", "repeatableGroup", "datatable", "duallist", "treeview"
   - Built-In System Metadata (ALREADY PROVIDED ON EVERY RECORD — DO NOT DUPLICATE AS CUSTOM FIELDS):
     * "status" (automatically populated from the linked Workflow's stage nodes — NEVER create a manual Status / Application Status / Stage select dropdown on the module canvas!)
     * "assigneeId" (Assignee / primary owner — already in the Overview sidebar; only add a custom user field for a distinct secondary role like "Approving Officer" or "Inspector")
     * "participantIds" (Participants / Watchers), "_record_key" (auto-generated ID configured via recordKeyPrefix), "priority" (Low/Medium/High/Critical), "dueDate" (target/SLA deadline), "createdAt", "createdBy", "updatedAt".
     * You CAN reference these built-in IDs directly in Forms, Queues, Views, KPIs, Validations, Automations, and Reports.
   - 12-Column Grid & Layout Rules (CRITICAL):
     * Every field and container uses a 12-column grid: "colSpan": 12 (Full) | 8 (2/3) | 6 (1/2) | 4 (1/3) | 3 (1/4), "startCol": 1..12, "rowIndex": 0, 2, 4...
     * Container blocks ("group", "fieldGroup", "repeatableGroup", "card", "accordion", "tabs_nested", "stepper", "timeline", "datatable", "sub_module") and wide fields ("textarea", "longText", "richtext", "address", "file", "signature", "ai_summary", "heading", "divider", "alert") MUST use "colSpan": 12 (Full width) unless you deliberately place two containers side-by-side ("startCol": 1, "colSpan": 6 + "startCol": 7, "colSpan": 6 on the same "rowIndex"). Never leave a lone half-width group with an empty right half!
     * Inside "group"/"fieldGroup"/"card", child "fields" ALSO use the 12-column grid: pair short inputs side-by-side ("colSpan": 6, "startCol": 1 and "startCol": 7) and give wide inputs "colSpan": 12.
     * Tabs & Sub-Tabs (KEY DESIGN FEATURE):
       - You can RENAME the default "General" tab (e.g. { "id": "general", "label": "Applicant & Premises", "iconName": "Building2" }) so records never feel generic!
       - Add multiple tabs via "tabs": [{ "id", "label", "iconName"?, "parentId"?, "visibilityRule"? }] and place fields onto them using "tabId".
       - Tabs support CONDITIONAL VISIBILITY ("visibilityRule": { "id", "type": "group", "logicalOperator": "AND", "action": "show", "rules": [{ "id", "type": "rule", "fieldId": "licence_class", "operator": "equals", "value": "Hotel" }] }) — use this to show specialist tabs only when relevant (e.g. Gaming, Inspection, Financial Approval)!
       - Tabs support NESTED SUB-TABS via "parentId" (pointing to a parent tab's "id") for complex multi-section records.
   - Field Properties Sidebar Options (use intentionally for production-grade UX):
     * Core: "required" (boolean — mark mandatory business fields true), "placeholder", "helperText", "tooltip", "defaultValue", "hidden", "showInTable" (true on the 4-6 key columns users scan in list view), "inlineEdit", "columnWidth".
     * Options/Inputs: "optionsSource" ("manual"|"global_list"), "globalListId", "optionLayout" ("vertical"|"horizontal"), "min"/"max", "currencySymbol", "collapsible"/"defaultCollapsed" (on groups).
     * Date/Time: "dateFormat", "timeFormat" ("12h"|"24h"), "excludeWeekends", "defaultType" ("today"|"now"|"relative"|...), "minDateType"/"maxDateType".
   - View & Layout Configuration ("interfaceSettings"):
     * master: "layoutType" (11 views: table|split|kanban|calendar|map|cards|portfolio|timeline|gantt|analytics|pipeline), "density" (compact|standard|spacious), "titleFieldId", "subtitleFieldIds", "cardFields", view date/address bindings ("calendarDateFieldId", "ganttStartDateFieldId", "mapAddressFieldId"), "toolbar" ("enabledViews", "enableSpreadsheetMode", "enableGrouping", "enableSavedViews", "enableBulkActions").
     * detail: "layoutType" (5 views: tabs|split|sidebar|process|accordion), "density", "showWorkflow", "showTabIcons", "wizardSaveMode" (step|final), "contextRail" ("enabled", "defaultCollapsed", "defaultTab": overview|workflow|activity|notes|files|tasks|time, "enabledTabs", "pinnedFieldIds").
   content: { "id", "name", "type": "WORK_ITEM"|"REGISTRY"|"RECORD"|"FINANCIAL", "iconName", "recordKeyPrefix"?, "layout": [ { "id", "label", "type", "required", "placeholder"?, "helperText"?, "tooltip"?, "defaultValue"?, "hidden"?, "showInTable"?, "inlineEdit"?, "colSpan": 12|8|6|4|3, "startCol"?: 1..12, "rowIndex"?: 0, "tabId"?, "options"?, "optionsSource"?, "optionLayout"?, "collapsible"?, "calculationLogic"?, "visibilityRule"?, "formattingRules"?, "fields"? } ], "tabs"?, "formattingRules"?, "interfaceSettings"?: { "master": { "layoutType", "density"?, "titleFieldId"?, "cardFields"?, "toolbar"? }, "detail": { "layoutType", "density"?, "showWorkflow"?, "contextRail"? } }, "schedulingRole"?, "schedulingConfig"? }

2. FORM (type: "FORM", linkedModuleId):
   content: { "id", "name", "title", "usage": "workspace_create"|"workspace_edit"|"public_link"|"portal_site", "isMultistep"?, "steps"?, "fields": [ { "id", "label", "type", "required", "width": "full"|"half", "visibilityRule"?, "prefill"?, "validation"? } ], "settings"?: { "submitLabel", "payment"?, "governance"?, "postSubmit"? } }

3. WORKFLOW (type: "WORKFLOW", linkedModuleId):
   content: { "id", "name", "triggerType": "RECORD_EVENT", "nodes": [ { "id", "type": "START"|"STATUS"|"ACTION"|"DECISION"|"DELAY"|"END", "name", "isStage"?, "stageOrder"?, "substeps"?: [{ "id", "label", "required" }], "position": { "x", "y" } } ], "edges": [ { "id", "source", "target", "label"?, "condition"?, "requiredFieldIds"?, "actionButtonLabel"? } ] }

4. ROLES (type: "PERMISSION"):
   content: { "id", "name", "type": "SOLUTION"|"PORTAL", "status": "DRAFT", "parentGroupId"?, "capabilities": [...], "modulePolicies": { "<mod_id>": { "access": true, "create": true, "read": true, "update": true, "delete": false, "export": false, "rowScope": "ALL"|"TEAM"|"OWNED", "fields": { "<fid>": { "visibility": "hidden"|"masked"|"readonly"|"editable" } } } }, "workflowPolicies": { "canApprove": false, "maxApprovalAmount": null, "allowedQueueIds"?: [], "allowedTransitions"?: {} }, "aiPolicies": { "ai:record_summary": "ALLOW" } }

5. VALIDATION (type: "VALIDATION", linkedModuleId) — MUST match ValidationEngine:
   content: { "id", "name", "scope": "MODULE"|"FORM"|"GLOBAL", "rules": [ { "id": "r1", "name": "Min Size", "mode": "visual", "conditionTree": { "id": "c1", "type": "rule", "fieldId": "system_size_kw", "operator": "greater_or_equal", "valueType": "literal", "value": 1 }, "expression": "{system_size_kw} >= 1", "errorMessage": "System size must be at least 1 kW.", "isActive": true, "severity": "error", "enforcement": "block", "targetFieldIds": ["system_size_kw"], "triggerOn": "always" } ] }

6. AUTOMATION (type: "AUTOMATION", linkedModuleId) — MUST match AutomationEngine:
   content: { "id", "name", "isActive": true, "conditions"?: "amount > 500", "triggers": [ { "type": "MODULE_EVENT", "on": "RECORD_CREATED"|"RECORD_UPDATED" } | { "type": "STATUS_CHANGED", "toStatus": "Approved" } | { "type": "FORM_SUBMITTED" } | { "type": "CRON", "schedule": "0 9 * * *" } | { "type": "SLA_AGE", "minutes": 2880 } ], "actions": [ { "type": "SEND_EMAIL"|"SEND_INTERNAL_PING"|"UPDATE_RECORD"|"CREATE_RECORD"|"SET_ASSIGNEE"|"GENERATE_PDF"|"STRIPE_PAYMENT_LINK"|"CREATE_REMINDER"|"CREATE_NOTE"|"ROUTE_TO_MODULE"|"INVOKE_AGENT"|"WEBHOOK"|"IF_CONDITION", "config": { ... } } ] }

7. NAVIGATION (type: "NAVIGATION"):
   content: { "id", "name", "layoutStyle": "sidebar"|"top", "items": [ { "id": "__home__", "label": "Home Overview", "targetId": "__home__" }, { "id": "<art_id>", "label": "...", "targetId": "<art_id>" } ] }

8. KPI (type: "KPI", linkedModuleId):
   content: { "id", "name", "sourceType": "module_record"|"saved_query"|"formula", "sourceConfig": { "moduleId": "<mod_id>", "aggregateType": "count"|"sum"|"avg"|"percentage", "aggregateField"?, "filters"?: [] }, "format": "number"|"currency"|"percentage", "targetValue": 85, "thresholds"?: [], "trendDirection": "higher_is_better" }

9. REPORT (type: "REPORT", linkedModuleId) — MUST match ReportConfig:
   content: { "id", "name", "sourceModuleId": "<mod_id>", "dataSource": { "type": "local"|"saved_query", "tables": ["<mod_id>"] }, "widgets": [ { "id": "rw1", "type": "bar"|"line"|"area"|"pie"|"kpi"|"table", "title": "Jobs by Stage", "w": 6, "h": 4, "properties": { "xAxisKey": "status", "yAxisKey": "id", "aggregate": "count", "showLegend": true, "showTooltip": true } } ], "slicers"?: ["status"], "calculatedFields"?: [] }

10. QUEUE (type: "QUEUE", linkedModuleId):
    content: { "id", "name", "moduleId": "<mod_id>", "queueConfig": { "columns": ["..."], "listLayout": "table"|"kanban"|"split"|"cards", "slaMinutes"?: 1440, "conditions"?: {}, "formattingRules"?: [] } }

11. SITE (type: "SITE"):
    content: { "id", "name", "domain": "...", "access": "Public"|"Authenticated", "linkedFormId"?: "<form_id>", "theme"?: { "accentColor": "#4f46e5", "bgMode": "light_clean" }, "pages"?: [{ "id": "home", "title": "Home", "slug": "/", "widgets": [] }], "chatConfig"?: { "enabled": false } }

12. PAGE (type: "PAGE") — MUST match PageBuilderEngine widget types:
    content: { "id", "name", "widgets": [ { "id": "w1", "type": "stats-grid"|"queue"|"standalone-form"|"search-view"|"accessible-modules"|"active-workflows"|"work-queue"|"rich-text"|"hero"|"faq", "title": "...", "properties": {}, "layout": { "x": 0, "y": 0, "w": 6, "h": 4 } } ] }

13. CONTENT (type: "CONTENT", linkedModuleId?):
    content: { "id", "name", "type": "email"|"letter"|"page"|"message", "moduleId"?: "<mod_id>", "metadata": { "subject"?: "..." }, "content": "...", "blocks"?: [ { "id", "type": "heading"|"text"|"letterhead"|"signature_block"|"table_repeater"|"callout"|"button", "data": {}, "conditions"?: {} } ] }

14. BRAND (type: "BRAND"):
    content: { "id", "name", "colors": { "primary", "secondary", "accent" }, "typography": { "headingFont", "bodyFont" }, "voiceAndTone": { "tagline", "tone" } }

15. GLOBAL_LIST (type: "GLOBAL_LIST"):
    content: { "id", "name", "category"?: "General", "options": ["..."] }

16. AGENT (type: "AGENT"):
    content: { "id", "name", "roleTitle", "modelConfig": { "model": "gemini-2.5-flash", "temperature": 0.2 }, "systemInstructions": "...", "tools"?: [], "guardrails"?: { "confidenceThreshold": 0.85, "requireHumanApproval": true, "sensitiveDataFilter": true }, "queueAutoPilot"?: { "enabled": false } }

17. QUERY (type: "QUERY"):
    content: { "id", "name", "sql": "SELECT id, status, data, created_at FROM records WHERE tenant_id = '{{tenantId}}' LIMIT 50", "parameters": [], "columnsConfig": [] } (real tables: records, modules, parties, tenant_members, teams, positions, permission_groups)

18. SEARCH (type: "SEARCH"):
    content: { "id", "name", "scopeType": "MULTI_MODULE"|"SINGLE_MODULE", "targetModuleIds": ["<mod_id>"], "searchConfig": { "defaultLayout": "table", "exposedControls": [] } }

19. INTEGRATION (type: "INTEGRATION"):
    content: { "id", "name", "connectorId"?: "<active_tenant_connector_id>", "provider": "...", "sourceEntity": "...", "targetEntity": "...", "fieldMappings": {} }

20. VIEW (type: "VIEW", linkedModuleId):
    content: { "id", "name", "scopeType": "MODULE"|"QUEUE", "scopeId": "<mod_id>", "isShared": true, "isDefault": false, "filterState": { "status"?: "...", "sortBy"?: "updatedAt", "sortDir"?: "desc", "columns"?: [] } }
`;

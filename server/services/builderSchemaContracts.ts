/**
 * Tier-2 On-Demand Deep Builder Schema Contracts for Aurora's 20 Builders.
 * Fetched via the `get_builder_schema_contract(builderTypes[])` tool only when
 * the AI needs advanced configuration (multistep forms, rollups, repeatable groups,
 * conditional formatting, automation actions, agent tools, BI report widgets, RBAC keys, etc.).
 *
 * Hybrid Architecture:
 * - Curated design contracts below preserve architectural taste & layout rules.
 * - `server/generated/builderCapabilities.json` (generated via `npm run sync:ai-schemas`)
 *   is merged in on-demand so both AIs always see 100%-current TypeScript properties & enums.
 */

import fs from 'fs';
import path from 'path';

let cachedLiveCapabilities: Record<string, any> | null = null;
function loadLiveBuilderCapabilities(): Record<string, any> {
  if (cachedLiveCapabilities) return cachedLiveCapabilities;
  try {
    const manifestPath = path.join(process.cwd(), 'server', 'generated', 'builderCapabilities.json');
    if (fs.existsSync(manifestPath)) {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      cachedLiveCapabilities = parsed?.builders || {};
      return cachedLiveCapabilities;
    }
  } catch {
    // Non-fatal: fall back to curated contracts if manifest hasn't been generated yet
  }
  return {};
}

export const DEEP_BUILDER_SCHEMA_CONTRACTS: Record<string, any> = {
  MODULE: {
    description: 'Data module with all 60 Module Builder blocks across 6 categories, tabs, formulas, rollups, repeatable groups, conditional formatting, 11 master views, 5 detail views, and scheduling.',
    blockCategories: {
      inputs: ['text', 'longText', 'textarea', 'number', 'currency', 'email', 'phone', 'address', 'url', 'date', 'time', 'select', 'radio', 'checkboxGroup', 'checkbox', 'boolean', 'toggle', 'slider', 'rating', 'colorpicker', 'tag'],
      platform: ['party', 'user', 'multi_user', 'team_select', 'position_select', 'global_list', 'lookup', 'sub_module', 'relationship_m2m', 'rollup', 'calculation', 'autonumber', 'ai_summary', 'connector', 'booking', 'booking_slot'],
      actionsAndTools: ['button', 'buttonGroup', 'signature', 'qr_scanner', 'payment', 'file'],
      contentAndDisplay: ['heading', 'richtext', 'html', 'icon', 'divider', 'spacer', 'alert', 'image', 'video', 'audio', 'progress', 'map', 'canvas', 'chat'],
      containersAndLayout: ['card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'group', 'fieldGroup', 'repeatableGroup'],
      dataViews: ['datatable', 'duallist', 'treeview'],
    },
    builtInSystemMetaFields: {
      note: 'Every Aurora record automatically includes these built-in system metadata fields in the Overview sidebar, tables, queues, forms, automations, and reports. DO NOT recreate them as duplicate custom fields in module.layout!',
      fields: {
        status: 'Automatically driven by the linked Workflow stage nodes (START/STATUS/END/isStage). Never add a manual Status select dropdown to module.layout.',
        assigneeId: 'Built-in Assignee (primary owner). Only add custom user fields for distinct secondary roles (e.g. Reviewer, Approver).',
        participantIds: 'Built-in Participants / Watchers (multi-user).',
        _record_key: 'Built-in auto-generated Record Key (configure prefix via recordKeyPrefix, e.g. LIC-).',
        priority: 'Built-in Priority (Low, Medium, High, Critical).',
        dueDate: 'Built-in Due Date / SLA deadline.',
        audit: 'createdAt, createdBy, updatedAt (automatic).',
      },
    },
    gridAndLayoutOptions: {
      columns: 12,
      allowedColSpans: { full: 12, twoThirds: 8, half: 6, oneThird: 4, oneQuarter: 3 },
      positioning: { colSpan: '1..12 (required)', startCol: '1..12 (1-based column start)', rowIndex: '0, 2, 4... (row order)', tabId: 'matches tabs[].id' },
      containerWidthRule: 'Containers (group, fieldGroup, repeatableGroup, card, accordion, tabs_nested, stepper, timeline, datatable, sub_module) and wide blocks (textarea, longText, richtext, address, file, signature, ai_summary, heading, divider, alert) MUST default to colSpan: 12 (full width), unless intentionally paired side-by-side (startCol: 1 colSpan: 6 + startCol: 7 colSpan: 6 on the same rowIndex).',
      nestedGridRule: 'Child fields inside group/fieldGroup/card also use a 12-column grid (pair short fields at colSpan: 6 with startCol: 1 and startCol: 7; wide fields at colSpan: 12).',
      masterLayouts: ['table', 'split', 'kanban', 'calendar', 'map', 'cards', 'portfolio', 'timeline', 'gantt', 'analytics', 'pipeline'],
      detailLayouts: ['tabs', 'split', 'sidebar', 'process', 'accordion'],
    },
    fieldPropertiesSidebar: {
      general: { label: 'Display label', name: 'API key / field slug', placeholder: 'Input placeholder', helperText: 'Subtle guidance below field', tooltip: 'Info hover tooltip', defaultValue: 'Static default', required: 'boolean (enforces validation on save/submit)', hidden: 'boolean (hide from canvas while keeping data)', iconName: 'Lucide icon name', showIcon: 'boolean' },
      tableAndListBehavior: { showInTable: 'boolean (show as column in List/Table view)', inlineEdit: 'boolean (allow inline editing in table/spreadsheet mode)', columnWidth: 'number (px)' },
      optionsAndInputs: { options: ['Option A', 'Option B'], optionsSource: 'manual|global_list', globalListId: '<list_id>', optionLayout: 'vertical|horizontal (for radio/checkboxGroup)', min: 'number (number/slider/rating)', max: 'number', currencySymbol: '$', variant: 'default|primary|secondary|outline|info|warning|success|danger', density: 'compact|standard|spacious', action: 'button action key' },
      containers: { collapsible: 'boolean', defaultCollapsed: 'boolean', fields: 'nested child Field[] (12-col grid)' },
      dateAndTime: { dateFormat: 'YYYY-MM-DD|DD/MM/YYYY|MM/DD/YYYY', timeFormat: '12h|24h', minuteStep: 15, excludeWeekends: true, defaultType: 'static|today|now|rounded_now|relative|field_copy|start_of_week|end_of_week|start_of_month|end_of_month|start_of_year|end_of_year', defaultOffset: 7, defaultOffsetUnit: 'minutes|hours|days|business_days|months|years', defaultSourceFieldId: '<field_id>', minDateType: 'none|static|today|now|relative|field_value', minDateValue: '', minDateOffset: 0, minDateOffsetUnit: 'days|business_days', minDateFieldId: '', maxDateType: 'none|static|today|now|relative|field_value', maxDateValue: '', maxDateOffset: 0, maxDateOffsetUnit: 'days|business_days', maxDateFieldId: '' },
    },
    advancedFieldProperties: {
      calculation: { calculationLogic: 'ROUND({{quantity}} * {{unit_price}} * 1.1, 2)', showAsCurrency: true, currencySymbol: '$' },
      autonumber: { autonumberPrefix: 'JOB-', autonumberSuffix: '', autonumberStart: 1001, autonumberDigits: 4 },
      rollup: { rollupConfig: { targetModuleId: '<child_mod_id>', linkFieldId: '<lookup_field_id>', aggregateField: 'amount', aggregateType: 'SUM' } },
      repeatableGroup: { minRows: 1, maxRows: 20, addRowLabel: 'Add Line Item', fields: [{ id: 'item', label: 'Item', type: 'text', required: true }, { id: 'qty', label: 'Qty', type: 'number' }] },
      fieldGroup: { collapsible: true, defaultCollapsed: false, fields: [] },
      lookup: { targetModuleId: '<mod_id>', targetPlatformModuleId: '<core_mod_id>', lookupSource: 'module_records|global_list|tenant_users|platform|connector', platformEntity: 'users|teams|roles|security_groups|modules|records', globalListId: '<list_id>', connectorId: '<conn_id>', connectorSearchParam: 'q', connectorLabelField: 'name', connectorValueField: 'id', searchMode: 'auto|manual', minSearchLength: 2, debounceDelay: 300, maxResults: 25, noResultsMessage: 'No matches found', lookupDisplayField: 'name', lookupFilters: [{ id: 'lf1', field: 'status', operator: 'equals', value: 'Active' }], lookupOutputMappings: [{ id: 'om1', sourceFieldId: 'email', targetFieldId: 'client_email' }], allowInlineCreate: true },
      party: { partyTypeFilter: 'ALL|PERSON|ORGANIZATION', classificationFilter: 'Customer', allowInlineCreate: true },
      visibilityRule: { id: 'v1', type: 'group', logicalOperator: 'AND', action: 'show', rules: [{ id: 'v1a', type: 'rule', fieldId: 'type', operator: 'equals', value: 'Commercial' }] },
      formattingRules: [{ id: 'f1', name: 'Overdue', enabled: true, targetType: 'field', targetId: 'status', condition: { id: 'c1', type: 'rule', fieldId: 'status', operator: 'equals', value: 'Overdue' }, style: { preset: 'danger', isBold: true, badgeLabel: 'Overdue' } }],
    },
    moduleLevelProperties: {
      recordKeyPrefix: 'SOL-',
      recordKeySuffix: '',
      nextKeyNumber: 1001,
      tabs: [
        { id: 'general', label: 'Applicant & Premises (renames default General tab)', iconName: 'Building2' },
        { id: 'tab_compliance', label: 'Compliance & Trading Hours', iconName: 'ShieldCheck', visibilityRule: { id: 'tv1', type: 'group', logicalOperator: 'AND', action: 'show', rules: [{ id: 'tv1a', type: 'rule', fieldId: 'licence_class', operator: 'equals', value: 'Hotel' }] } },
        { id: 'tab_gaming_sub', label: 'Gaming Machines (nested sub-tab)', parentId: 'tab_compliance', iconName: 'Layers' },
      ],
      formattingRules: [{ id: 'row_fmt_1', name: 'High Value Row', enabled: true, targetType: 'row', condition: { id: 'c1', type: 'rule', fieldId: 'quote_total', operator: 'greater_than', value: 25000 }, style: { preset: 'success', isBold: true } }],
      interfaceSettings: {
        master: {
          layoutType: 'table|split|kanban|calendar|map|cards|portfolio|timeline|gantt|analytics|pipeline',
          density: 'compact|standard|spacious',
          pagination: { enabled: true, pageSize: 25 },
          titleFieldId: '<primary_title_field_id>',
          subtitleFieldIds: ['<field_id_1>', '<field_id_2>'],
          cardFields: ['<field_id_1>', '<field_id_2>', 'status'],
          calendarDateFieldId: 'start_date',
          calendarEndDateFieldId: 'end_date',
          calendarResourceFieldId: 'assigneeId',
          calendarEnableBuffers: false,
          calendarEnableHoldBadges: true,
          calendarEnableSlotBooking: true,
          timelineDateFieldId: 'createdAt',
          ganttStartDateFieldId: 'start_date',
          ganttEndDateFieldId: 'end_date',
          mapAddressFieldId: 'site_address',
          toolbar: { enableSavedViews: true, enableGrouping: true, enableAskAurora: true, enableChartToggle: true, enableSpreadsheetMode: false, enableBulkActions: true, enabledViews: ['table', 'split', 'kanban', 'calendar', 'analytics', 'pipeline', 'timeline', 'gantt', 'cards', 'portfolio', 'map'] },
        },
        detail: {
          layoutType: 'tabs|split|sidebar|process|accordion',
          density: 'compact|standard|spacious',
          showWorkflow: true,
          showTabIcons: true,
          wizardSaveMode: 'step|final',
          contextRail: {
            enabled: true,
            defaultCollapsed: false,
            defaultTab: 'overview|workflow|activity|notes|files|tasks|time',
            enabledTabs: ['overview', 'workflow', 'activity', 'notes', 'files', 'tasks', 'time'],
            pinnedFieldIds: ['<key_field_id>'],
          },
        },
      },
      schedulingRole: 'NONE|RESOURCE_POOL|BOOKING_EVENT',
      schedulingConfig: { archetype: 'APPOINTMENT|RENTAL|FIELD_SERVICE|CAPACITY', startDateFieldId: 'start_date', endDateFieldId: 'end_date', resourceRefFieldId: 'technician', customerRefFieldId: 'client_party', defaultDurationMinutes: 60 },
    },
  },
  FORM: {
    description: 'CanonicalFormDefinition supporting multistep wizards, conditional step/field visibility, prefill, payments, governance, and post-submit actions.',
    schema: {
      id: '<art_id>',
      name: 'Form Name',
      title: 'Form Title',
      usage: 'workspace_create|workspace_edit|action_trigger|public_link|portal_site',
      isMultistep: true,
      steps: [{ id: 'step_1', title: 'Applicant Details', subtitle: 'Basic info', visibilityRule: undefined, fields: [{ id: 'client_name', label: 'Client Name', type: 'text', width: 'half', required: true, prefill: { source: 'user_context', userAttribute: 'name' }, validation: { minLength: 2, pattern: '', errorMessage: '' } }] }],
      settings: {
        submitLabel: 'Submit Application',
        successMessage: 'Thank you!',
        allowSaveDraft: true,
        payment: { enabled: false, amountMode: 'fixed|field', fixedAmount: 150, amountFieldId: 'fee_amount', currency: 'AUD', allowVoucher: true },
        governance: { openAt: '', closeAt: '', maxSubmissions: 1000, oneSubmissionPerUser: false },
        contextBindings: { captureLoggedInUser: true, userIdFieldId: 'submitted_by', partyIdFieldId: 'client_party' },
        postSubmit: { validationRulesetId: '<val_id>', pdfTemplateId: '<content_id>', notifyEmails: 'ops@example.com', triggerAutomation: true },
        theme: { accentColor: '#4f46e5', density: 'standard', showProgressBar: true },
      },
    },
  },
  WORKFLOW: {
    description: 'Visual lifecycle workflow with stage ordering, required substeps checklists, conditional edges, and required fields per transition.',
    schema: {
      id: '<art_id>',
      name: 'Lifecycle Workflow',
      triggerType: 'RECORD_EVENT',
      nodes: [{ id: 'n1', type: 'START|STATUS|ACTION|DECISION|DELAY|END|ZONE', name: 'Site Survey', isStage: true, stageOrder: 1, stageDescription: 'On-site technical inspection', substeps: [{ id: 'sub1', label: 'Upload switchboard photo', required: true, allowOverride: false }], position: { x: 80, y: 140 } }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Approve', actionButtonLabel: 'Approve Survey', buttonVariant: 'primary|success|destructive|outline', condition: '{roof_pitch_deg} <= 45', requiredFieldIds: ['switchboard_photo', 'inspector_signoff'] }],
    },
  },
  VALIDATION: {
    description: 'Canonical ValidationEngine ruleset (mode visual + conditionTree + compiled expression).',
    operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'matches_regex', 'min_length', 'max_length', 'greater_than', 'greater_or_equal', 'less_than', 'less_or_equal', 'before', 'after', 'on_or_before', 'on_or_after', 'is_empty', 'not_empty', 'is_true', 'is_false', 'is_one_of', 'is_not_one_of'],
    ruleSchema: {
      id: 'rule_1',
      name: 'Minimum Margin Check',
      mode: 'visual',
      conditionTree: { id: 'c1', type: 'rule', fieldId: 'margin_pct', operator: 'greater_or_equal', valueType: 'literal', value: 20 },
      expression: '{margin_pct} >= 20',
      errorMessage: 'Internal margin must be at least 20%.',
      isActive: true,
      severity: 'error|warning|info',
      enforcement: 'block|confirm|allow',
      targetFieldIds: ['margin_pct'],
      triggerOn: 'always|create|update',
      exemptRoles: ['Manager'],
    },
  },
  AUTOMATION: {
    description: 'Canonical AutomationEngine pipeline with real triggers, condition expression, SLA config, and 23 typed actions.',
    triggers: [
      { type: 'MODULE_EVENT', on: 'RECORD_CREATED|RECORD_UPDATED' },
      { type: 'STATUS_CHANGED', fromStatus: '', toStatus: 'Approved' },
      { type: 'ASSIGNEE_CHANGED' },
      { type: 'PARTICIPANTS_CHANGED' },
      { type: 'RELATION_LINKED', linkedModuleId: '' },
      { type: 'USER_MENTIONED' },
      { type: 'FORM_SUBMITTED', formId: '' },
      { type: 'QUICK_ACTION', label: 'Send Quote' },
      { type: 'CRON', schedule: '0 9 * * 1-5' },
      { type: 'SLA_AGE', minutes: 2880 },
      { type: 'SERVICE_DESK_SESSION_STARTED|SERVICE_DESK_ALLOCATED|SERVICE_DESK_ESCALATED|SERVICE_DESK_RESOLVED' },
    ],
    actions: {
      CREATE_RECORD: { targetModuleId: '<mod_id>', fields: { status: 'New' } },
      UPDATE_RECORD: { targetType: 'TRIGGERING', recordId: '', fields: { status: 'Escalated' } },
      GET_RECORD: { targetModuleId: '<mod_id>', queryField: 'id', queryValue: '{{parent_id}}' },
      SEND_EMAIL: { to: '{{email}}', subject: 'Update on {{_record_key}}', body: 'Hello {{client_name}}...' },
      SEND_INTERNAL_PING: { channel: 'operations', message: 'New record {{_record_key}} requires attention' },
      SET_ASSIGNEE: { targetType: 'TRIGGERING', assigneeId: '' },
      IF_CONDITION: { condition: 'amount > 5000', thenSteps: [], elseSteps: [] },
      DELAY: { delaySeconds: '3600' },
      GEMINI_PROMPT: { prompt: 'Summarize {{description}} and classify priority.' },
      GENERATE_PDF: { template: '<content_template_name>' },
      STRIPE_PAYMENT_LINK: { amount: '{{quote_total}}' },
      ROUTE_TO_MODULE: { targetModuleId: '<mod_id>', fieldMapping: {}, archiveSource: false },
      CREATE_REMINDER: { title: 'Follow up {{_record_key}}', dueOffset: '+2 days at 09:00', priority: 'HIGH', assignedTo: '{{ownerId}}' },
      CREATE_NOTE: { title: 'Audit Note', body: 'Auto-checked', color: 'zinc', isPinned: false },
      PIN_RECORD_NOTE: { title: 'Alert', body: 'SLA threshold approaching', color: 'amber' },
      INVOKE_AGENT: { agentId: '<agent_id>', promptTemplate: 'Review record {{id}}', outputVariable: 'agent_result' },
      WEBHOOK: { url: 'https://...', method: 'POST', headers: {} },
      ALLOCATE_SERVICE_DESK_SESSION: { teamId: '' },
      SEND_SERVICE_DESK_MESSAGE: { message: '' },
    },
  },
  PERMISSION: {
    description: 'Full RolePolicy schema with RBAC capabilities, FLS, workflow scoping, inheritance, and 14 AI governance flags.',
    capabilities: [
      'view:staff', 'manage:staff', 'invite:staff', 'decommission:staff', 'staff:*',
      'view:teams', 'manage:teams', 'view:positions', 'manage:positions', 'teams:*',
      'view:settings', 'manage:settings', 'view:audit_logs', 'manage:billing', 'platform:*',
      'manage:modules', 'create:records', 'delete:records', 'export:records', 'data:*',
    ],
    aiGovernanceFeatures: [
      'ai:antigravity_agent', 'ai:agent_builder', 'ai:solution_builder', 'ai:form_builder', 'ai:page_builder',
      'ai:report_generator', 'ai:ask_aurora_filter', 'ai:record_summary', 'ai:workflow_actions',
      'ai:document_template', 'ai:document_ocr', 'ai:document_redaction', 'ai:smart_inbox', 'ai:public_portal_chat',
    ],
    schema: {
      id: '<art_id>', name: 'Role Name', type: 'SOLUTION|PORTAL|CUSTOM', status: 'DRAFT', parentGroupId: null,
      capabilities: ['create:records'],
      modulePolicies: { '<mod_id>': { access: true, create: true, read: true, update: true, delete: false, export: false, rowScope: 'ALL|TEAM|OWNED', fields: { sensitive_field: { visibility: 'hidden|masked|readonly|editable' } } } },
      workflowPolicies: { allowedQueueIds: [], allowedWorkflowIds: [], allowedTransitions: {}, canApprove: false, maxApprovalAmount: null },
      aiPolicies: { 'ai:record_summary': 'ALLOW', 'ai:public_portal_chat': 'DENY' },
    },
  },
  REPORT: {
    description: 'Canonical ReportConfig with dataSource (local/external/saved_query), multi-table joins, widgets, slicers, and calculatedFields.',
    schema: {
      id: '<art_id>', name: 'Report Name', sourceModuleId: '<mod_id>',
      dataSource: { type: 'local|external|saved_query', tables: ['<mod_id>'], relationships: [{ id: 'rel1', joinTable: '<other_mod_id>', primaryKey: 'id', foreignKey: 'job_ref', type: 'left' }] },
      widgets: [{ id: 'rw1', type: 'bar|line|area|pie|kpi|table', title: 'Pipeline by Stage', w: 6, h: 4, x: 0, y: 0, properties: { xAxisKey: 'status', yAxisKey: 'quote_total', aggregate: 'count|sum|avg|min|max', color: '#4f46e5', showGridlines: true, showLegend: true, showTooltip: true } }],
      slicers: ['status'],
      calculatedFields: [{ id: 'cf1', name: 'age_days', formula: 'TIMESPAN("days", {created_at}, TODAY())' }],
    },
  },
  PAGE: {
    description: 'Workspace PageBuilderEngine layout using exact supported widget types.',
    widgetTypes: ['accessible-modules', 'search-view', 'queue', 'standalone-form', 'stats-grid', 'active-workflows', 'work-queue', 'rich-text', 'hero', 'faq'],
    schema: {
      id: '<art_id>', name: 'Dashboard Page',
      widgets: [{ id: 'w1', type: 'stats-grid', title: 'Key Metrics', properties: { moduleId: '<mod_id>' }, layout: { x: 0, y: 0, w: 12, h: 3 } }],
    },
  },
  SITE: {
    description: 'External Portal / Site with theme, multi-page navigation, embedded forms/searches, and optional Service Desk live chat.',
    schema: {
      id: '<art_id>', name: 'Customer Portal', domain: 'portal.aurora.app', access: 'Public|Authenticated', linkedFormId: '<form_id>',
      theme: { accentColor: '#4f46e5', bgMode: 'light_clean|dark_obsidian|emerald_eco', cardStyle: 'bordered|solid|glass', borderRadius: 'xl', fontFamily: 'sans', headerLayout: 'top_right' },
      navigation: [{ id: 'nav_home', label: 'Home', pageId: 'pg_home' }],
      pages: [{ id: 'pg_home', title: 'Welcome', slug: '/', widgets: [{ id: 'sw1', type: 'hero', title: 'Submit a Request' }, { id: 'sw2', type: 'standalone-form', properties: { formId: '<form_id>' } }] }],
      chatConfig: { enabled: false, greeting: 'Hi! How can we help?' },
    },
  },
  QUEUE: {
    description: 'Work Queue with SLA minutes, list layout (table/kanban/split/cards), conditions, and conditional formatting.',
    schema: {
      id: '<art_id>', name: 'Triage Queue', moduleId: '<mod_id>', isUnifiedQueue: false, moduleIds: ['<mod_id>'],
      queueConfig: {
        columns: ['_record_key', 'client_name', 'status'],
        defaultSort: { key: 'createdAt', direction: 'desc' },
        slaMinutes: 1440,
        listLayout: 'table|split|kanban|cards',
        listSettings: { kanbanGroupBy: 'status', density: 'standard' },
        detailViewMode: 'split|modal|page',
        conditions: { logicalOperator: 'AND', rules: [] },
        formattingRules: [],
      },
    },
  },
  KPI: {
    description: 'Semantic KpiDefinition with filters, thresholds, formatOptions, timeHorizon, or multi-metric formula.',
    schema: {
      id: '<art_id>', name: 'Approval Rate', sourceType: 'module_record|service_desk|saved_query|formula',
      sourceConfig: { moduleId: '<mod_id>', aggregateType: 'count|sum|avg|min|max|median|percentage|formula', aggregateField: 'quote_total', dateField: 'createdAt', filters: [{ id: 'kf1', fieldId: 'status', operator: 'equals', value: 'Approved' }], filterLogic: 'AND' },
      format: 'number|currency|percentage|duration', formatOptions: { currencyCode: 'AUD', decimalPrecision: 1 },
      trendDirection: 'higher_is_better|lower_is_better|neutral', targetValue: 85, timeHorizon: 'trailing_30d|mtd|ytd|all_time',
      thresholds: [{ condition: 'gte', value: 85, color: 'emerald', label: 'On Target', severity: 'good' }, { condition: 'lt', value: 70, color: 'rose', label: 'At Risk', severity: 'critical' }],
    },
  },
  AGENT: {
    description: 'Autonomous AI Digital Coworker with tools, guardrails, few-shot examples, memory, and queue autopilot.',
    toolTypes: ['CONNECTOR', 'DATABASE_QUERY', 'WORKFLOW_TRIGGER', 'WEBHOOK', 'REST_API', 'FILE_PARSER', 'SUB_AGENT', 'DOCUMENT_GENERATOR'],
    schema: {
      id: '<art_id>', name: 'Triage Copilot', roleTitle: 'Intake Reviewer',
      modelConfig: { model: 'gemini-2.5-flash', temperature: 0.2, topP: 0.9, maxOutputTokens: 2048, systemPersona: 'Thorough and concise' },
      systemInstructions: '...',
      tools: [{ id: 't1', name: 'Lookup Records', type: 'DATABASE_QUERY', description: 'Query module records', enabled: true, requiresApproval: false }],
      guardrails: { confidenceThreshold: 0.85, requireHumanApproval: true, approvalThresholdAmount: 5000, readOnlyMode: false, maxTokensPerExecution: 4000, allowedDomains: [], sensitiveDataFilter: true },
      workforceMapping: { teamId: '', role: 'Operations Copilot', licenceType: 'AI Agent Seat' },
      queueAutoPilot: { enabled: false, queueId: '<queue_id>', autoProcessNewItems: false, pollingIntervalMinutes: 15, autoResolveConfidenceThreshold: 0.9 },
      memory: { enabled: true, memoryType: 'EPISODIC', retentionDays: 90, autoExtractEntities: true, maxMemoriesInjected: 5, entries: [] },
    },
  },
  CONTENT: {
    description: 'DocumentTemplate supporting structured ContentBlock[] (13 block types) and conditional block rendering.',
    blockTypes: ['heading', 'text', 'letterhead', 'signature_block', 'table_repeater', 'callout', 'hero_banner', 'grid_2col', 'button', 'divider', 'spacer', 'quote', 'code'],
    schema: {
      id: '<art_id>', name: 'Official Notice', type: 'email|letter|page|message', moduleId: '<mod_id>',
      metadata: { subject: 'Update on {{_record_key}}', paperSize: 'A4', showLetterhead: true },
      content: 'Hi {{client_name}}, ...',
      blocks: [{ id: 'b1', type: 'letterhead', data: {} }, { id: 'b2', type: 'text', data: { html: '<p>Dear {{client_name}}</p>' }, conditions: { enabled: false, conjunction: 'AND', rules: [] } }],
    },
  },
  QUERY: {
    description: 'SavedQueryEntity with parameterized SQL against real Postgres tables (records, modules, parties, tenant_members, teams, positions, permission_groups).',
    schema: {
      id: '<art_id>', name: 'Open Jobs Dataset',
      sql: 'SELECT id, status, data, created_at FROM records WHERE tenant_id = \'{{tenantId}}\' AND status = {{status}} LIMIT 100',
      parameters: [{ id: 'p1', name: 'status', label: 'Status', type: 'string|number|boolean|date|date_range|user_id|module_record', defaultValue: 'New', required: false }],
      columnsConfig: [{ name: 'status', label: 'Status', type: 'badge|text|number|currency|date|boolean|link', visible: true }],
    },
  },
  SEARCH: {
    description: 'SavedSearchEntity with exposed user filter controls and cross-module field aliases.',
    schema: {
      id: '<art_id>', name: 'Global Operations Search', scopeType: 'MULTI_MODULE|SINGLE_MODULE|PLATFORM', targetModuleIds: ['<mod_id>'],
      allowedRoleIds: [],
      searchConfig: {
        defaultLayout: 'table|cards|split', pageSize: 25, allowExport: true, enableInstantSearch: true, entityTarget: 'records|files',
        exposedControls: [{ id: 'sc1', parameterName: 'status', fieldKey: 'status', label: 'Stage', controlType: 'select|text|user|status|date_preset|date_range|number_range|boolean' }],
        fieldAliases: [{ id: 'fa1', aliasName: 'ref', label: 'Reference #', mappings: [{ moduleId: '<mod_id>', fieldKey: '_record_key' }] }],
      },
    },
  },
  INTEGRATION: {
    description: 'ConnectorMappingEntity linking an active TenantConnector to a Module.',
    schema: { id: '<art_id>', name: 'Xero Invoice Sync', connectorId: '<tenant_connector_id>', provider: 'xero', sourceEntity: 'Invoice', targetEntity: '<mod_id>', fieldMappings: { quote_total: 'Total', client_name: 'Contact.Name' } },
  },
  BRAND: {
    description: 'Full BrandKit palette, typography, styling, voiceAndTone, and emailDefaults.',
    schema: { id: '<art_id>', name: 'Brand Kit', colors: { primary: '#4f46e5', secondary: '#0f172a', accent: '#10b981', background: '#ffffff', surface: '#f8fafc', text: '#0f172a', muted: '#64748b', border: '#e2e8f0' }, typography: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', monoFont: 'JetBrains Mono' }, voiceAndTone: { tone: 'Professional', tagline: '', prohibitedWords: [] } },
  },
  GLOBAL_LIST: {
    description: 'Reusable enterprise picklist with category and options.',
    schema: { id: '<art_id>', name: 'Equipment Types', category: 'Operations', options: ['Option A', 'Option B'] },
  },
  NAVIGATION: {
    description: 'Solution sidebar/top menu wired to exact artifact IDs.',
    schema: { id: '<art_id>', name: 'App Menu', layoutStyle: 'sidebar|top', items: [{ id: '__home__', label: 'Home Overview', targetId: '__home__' }] },
  },
  VIEW: {
    description: 'SavedView for a Module or Queue with filterState, sorting, visible columns, and sharing flags.',
    schema: { id: '<art_id>', name: 'My Open Items', scopeType: 'MODULE|QUEUE', scopeId: '<mod_id>', icon: 'Bookmark', isShared: true, isDefault: false, filterState: { status: 'In Progress', sortBy: 'updatedAt', sortDir: 'desc', columns: ['_record_key', 'client_name', 'status'] } },
  },
};

export function getBuilderSchemaContracts(builderTypes: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  const liveCaps = loadLiveBuilderCapabilities();
  const requested = Array.isArray(builderTypes) && builderTypes.length > 0 ? builderTypes : ['MODULE'];
  for (const raw of requested.slice(0, 6)) {
    const key = String(raw || '').toUpperCase().trim();
    if (DEEP_BUILDER_SCHEMA_CONTRACTS[key]) {
      result[key] = liveCaps[key]
        ? { ...DEEP_BUILDER_SCHEMA_CONTRACTS[key], liveCodeCapabilities: liveCaps[key] }
        : DEEP_BUILDER_SCHEMA_CONTRACTS[key];
    }
  }
  return result;
}

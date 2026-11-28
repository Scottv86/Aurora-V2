import { AURORA_BUILDER_SCHEMA_REFERENCE } from './solutionSchemaReference';

/**
 * Unified "As-Shipped Aurora" Platform Knowledge Pack.
 * Shared by Solution Studio AI and Aurora AI Assistant so both understand
 * all 22 built-in Platform Core modules, active vs coming_soon Workspace Apps,
 * exact expression/formula/visibility/formatting syntax, and governance rules.
 */
export const AURORA_AS_SHIPPED_CATALOG = `
=== AURORA AS-SHIPPED PLATFORM CORE MODULES (22 BUILT-IN — REUSE / EXTEND FIRST) ===
Do NOT build duplicate custom tables when one of these built-in Platform Core modules already solves it:
1. Directory / People & Orgs (id: "people-organisations"): Customers, clients, citizens, patients, suppliers, partners, contacts, companies, households, and relationship graphs. Link via field type "party".
2. Triage / Work Distribution (id: "work-distribution"): Automated intake routing, prioritization, and workload distribution across teams.
3. Knowledge Base (id: "knowledge-base"): Institutional SOPs, policies, help articles, and AI agent grounding documents.
4. Pricing Catalog (id: "pricing-catalog"): Products, service rates, application fees, subscriptions, SKUs, and penalties.
5. Inventory Manager (id: "inventory-manager"): Real-time stock tracking, warehouse locations, alert thresholds, and parts adjustments.
6. Transactions (id: "transactions"): Omnichannel payment ledger, authorizations, settlements, and refund management.
7. Payment Gateways & Hardware (id: "payment-gateways"): Online/form/invoice/POS merchant payment channels (Stripe, EFTPOS).
8. Point of Sale & Terminals (id: "pos"): Register terminals, barcode checkout, split tenders, and cash drawer sessions.
9. Global Lists (id: "global-lists"): Enterprise lookup tables and shared picklists with SCD Type 2 versioning.
10. Workforce Management (id: "workforce-management"): Workspace staff members, teams, positions (org hierarchy), skills, certifications, and RBAC seats (including synthetic AI Agent seats).
11. Integration Management (id: "integration-management"): Third-party connectors (Xero, Stripe, Slack, REST APIs, webhooks) and field mappings.
12. Sites (id: "sites"): External portals, citizen portals, public intake pages, and embedded Service Desk chat.
13. Automation Management (id: "automation-management"): Event/status/CRON/SLA-triggered multi-step automation pipelines.
14. Content / Document Generation (id: "document-generation"): Reusable document, email, letter, and certificate merge templates.
15. Report Management (id: "report-management"): BI visual charts, multi-table joins, slicers, and calculated report fields.
16. API Management (id: "api-management"): Programmatic API keys, endpoints, and developer access logs.
17. Accounting / Financial Management (id: "financial-management"): Double-entry general ledger, Chart of Accounts, Tax Rates, AR invoicing, AP supplier bills, and bank reconciliation.
18. Records Management (id: "records-management"): Compliance retention schedules (UniversalDisposalSchedule), legal holds, and archival disposition.
19. Queries Library (id: "queries-library"): Parameterized multi-table SQL queries and virtual datasets.
20. Searches Library (id: "searches-library"): Self-service cross-module searches with exposed filters and field aliases.
21. Metrics / KPIs (id: "kpi-management"): Semantic KPIs, multi-metric formulas, targets, and threshold alarms.
22. Bookings & Scheduling (id: "scheduling"): Bookable resources (rooms, technicians, vehicles, equipment), appointments, rentals, field dispatch availability & capacity (configure via Module.schedulingRole & schedulingConfig).

=== AURORA BUILT-IN WORKSPACE APPS (ACTIVE VS COMING SOON) ===
- ACTIVE Workspace Apps (check tenant.enabledApps in manifest before relying on optional ones): AI Assistant, Approvals Hub, Point of Sale, Inbox, Triage, Directory, Documents, Drive, Searches, Query Explorer, Query Builder, Metrics & KPIs, Chat, Service Desk (omnichannel customer chat/voice/wrap-ups), Calendar, Feed, Notes, Reminders, Calculator, Recycling Bin.
- COMING SOON (do NOT promise or wire solutions to these yet): Spreadsheet, PDF Editor, Redact, Meet, Campaigns, Draw, Whiteboard, Flowchart, Slideshow, Graphics, File Converter, Snipping Tool.

=== AURORA EXPRESSION, FORMULA, VISIBILITY & FORMATTING SYNTAX ===
1. Calculated Fields (type: "calculation"):
   - Use {{field_id}} tokens in "calculationLogic" (supported by both client formulaEngine.ts and server FormulaService).
   - Available functions: IF, AND, OR, NOT, SWITCH, COALESCE, IS_NULL, IS_EMPTY, ABS, CEIL, FLOOR, ROUND, POW, PERCENT, MAX, MIN, SUM, AVG, LEN, CONCAT, UPPER, LOWER, PROPER, TRIM, LEFT, RIGHT, MID, REPLACE, CONTAINS, TODAY, NOW, YEAR, MONTH, DAY, TIMESPAN, DIFF_DAYS, ADD_TIME, SUB_TIME, ADD_DAYS, EOMONTH, WORKDAY.
2. Conditional Visibility (VisibilityRule — on Module fields, Tabs, Form fields, Form steps):
   - Single rule: { "id": "vis_1", "type": "rule", "fieldId": "system_size_kw", "operator": "greater_than", "value": 10, "action": "show" }
   - Nested group: { "id": "vis_g1", "type": "group", "logicalOperator": "AND", "action": "show", "rules": [ ... ] }
   - Operators: "equals", "not_equals", "contains", "greater_than", "less_than", "is_empty", "not_empty".
3. Conditional Formatting (ConditionalFormattingRule — on Module.formattingRules, ModuleField.formattingRules, Queue.queueConfig.formattingRules):
   - { "id": "fmt_1", "name": "High Value", "enabled": true, "targetType": "row" | "column" | "field", "targetId": "quote_total", "condition": { ...VisibilityRule }, "style": { "preset": "danger" | "warning" | "success" | "info" | "purple" | "slate", "isBold": true, "badgeLabel": "VIP" } }
4. Validation Rules (ValidationEngine — type: "VALIDATION"):
   - MUST use canonical ValidationRule shape: { "id": "r1", "name": "...", "mode": "visual" | "expression", "conditionTree": { ...ValidationConditionNode }, "expression": "{system_size_kw} >= 1", "errorMessage": "...", "isActive": true, "severity": "error" | "warning" | "info", "enforcement": "block" | "confirm" | "allow", "targetFieldIds": ["system_size_kw"], "triggerOn": "always" | "create" | "update" }.

=== ENTERPRISE PII & GOVERNANCE DEFAULTS ===
- Any field containing DOB, Tax ID / TFN / SSN, Medicare / Passport, Bank Account / Credit Card, Medical Info, Salary, or Internal Profit Margin MUST have "visibility": "masked" or "hidden" on non-admin and Portal Roles (type: "PERMISSION").
- Any workflow involving financial payouts, refunds, discounts > 15%, or regulatory sign-off MUST include a DECISION/APPROVAL stage paired with a Manager Role having "workflowPolicies": { "canApprove": true, "maxApprovalAmount": <threshold> }.

${AURORA_BUILDER_SCHEMA_REFERENCE}
`;

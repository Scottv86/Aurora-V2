/**
 * Aurora Platform Types
 */

export type Environment = 'DEV' | 'QA' | 'UAT' | 'PROD';

export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastNotificationConfig {
  position?: ToastPosition;
  duration?: number;
  closeButton?: boolean;
  expand?: boolean;
}

export type ChimeSoundId = 
  | 'aurora' 
  | 'crystal' 
  | 'breeze' 
  | 'pop' 
  | 'ping' 
  | 'zen' 
  | 'celestial' 
  | 'ripple' 
  | 'marimba' 
  | 'apex';

export interface SoundNotificationConfig {
  enabled?: boolean;
  volume?: number;
  defaultChime?: ChimeSoundId;
  toastChime?: ChimeSoundId;
}

export interface NotificationSettings {
  toasts?: ToastNotificationConfig;
  sounds?: SoundNotificationConfig;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  createdAt: string;
  environments: Environment[];
  currentEnvironment: Environment;
  enabledApps?: string[];
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    faviconUrl?: string;
    useTenantBranding?: boolean;
    aiEnabled?: boolean;
    forceDarkMode?: boolean;
    layout_style?: string;
    show_breadcrumbs?: boolean;
    toastPosition?: ToastPosition;
  };
  localization?: {
    timezone?: string;
    language?: string;
    currency?: string;
    dateFormat?: string;
  };
  metadata?: {
    industry?: string;
    website?: string;
    contactEmail?: string;
    siteTitle?: string;
    metaDescription?: string;
    socialImage?: string;
  };
  workspaceSettings?: {
    defaultModuleVisibility?: 'public' | 'private';
    autoCategorization?: boolean;
    archivingPolicyDays?: number;
    homePageId?: string | null;
    notifications?: NotificationSettings;
  };
  menuConfig?: any;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  icon: string;
  suites: Suite[];
}

export interface Suite {
  id: string;
  name: string;
  description: string;
  modules: Module[];
}

export type FieldType = 
  | 'text' | 'longText' | 'textarea' | 'number' | 'checkbox' | 'boolean' | 'currency' | 'email' | 'phone' | 'address' | 'lookup' | 'user' | 'calculation' | 'ai_summary' | 'date' | 'select' | 'file'
  | 'radio' | 'checkboxGroup' | 'toggle' | 'slider' | 'time' | 'button' | 'buttonGroup' | 'icon' | 'card' | 'richtext' | 'accordion' | 'datatable' | 'stepper' 
  | 'timeline' | 'duallist' | 'treeview' | 'signature' | 'payment' | 'colorpicker' | 'map' | 'html' | 'qr_scanner' | 'canvas' | 'chat' | 'tabs_nested' 
  | 'rating' | 'progress' | 'tag' | 'video' | 'audio' | 'heading' | 'divider' | 'spacer' | 'alert' | 'url' | 'fieldGroup' | 'group' | 'repeatableGroup' | 'autonumber' | 'connector' | 'automation' | 'sub_module' | 'placeholder';

export interface VisibilityRule {
  id: string;
  type: 'rule' | 'group';
  fieldId?: string;
  fieldType?: 'field' | 'variable';
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'not_empty';
  value?: any;
  valueType?: 'literal' | 'field' | 'variable';
  logicalOperator?: 'AND' | 'OR';
  rules?: VisibilityRule[];
  action?: 'show' | 'hide';
  isCollapsed?: boolean;
  name?: string;
}

export type FormattingPreset = 'danger' | 'warning' | 'success' | 'info' | 'purple' | 'slate' | 'custom';

export interface FormattingStyle {
  preset?: FormattingPreset;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isStrikethrough?: boolean;
  badgeLabel?: string;
  iconName?: string;
}

export interface ConditionalFormattingRule {
  id: string;
  name?: string;
  enabled: boolean;
  targetType: 'row' | 'column' | 'field';
  targetId?: string; // column key or field ID (empty or omitted for row-level)
  condition: VisibilityRule;
  style: FormattingStyle;
}

export interface ModuleField {
  id: string;
  name?: string;
  label: string;
  type: FieldType;
  options?: string[];
  required: boolean;
  placeholder?: string;
  helperText?: string;
  tooltip?: string;
  defaultValue?: any;
  calculationLogic?: string;
  calculationTriggers?: string[];
  targetModuleId?: string;
  targetPlatformModuleId?: string;
  globalListId?: string;
  connectorId?: string;
  lookupSource?: 'module_records' | 'global_list' | 'tenant_users' | 'platform' | 'connector';
  platformEntity?: 'users' | 'teams' | 'roles' | 'security_groups' | 'modules' | 'records';
  lookupFilters?: LookupFilter[];
  optionsSource?: 'manual' | 'global_list' | 'platform' | 'module_records' | 'connector';
  fields?: ModuleField[]; // For nested structures like fieldGroup or repeatableGroup
  
  // Lookup enhancements
  lookupDisplayField?: string;
  lookupOutputMappings?: { id: string; sourceFieldId: string; targetFieldId: string }[];
  
  // Layout metadata (Modern Grid)
  colSpan?: number; // 1-12
  startCol?: number; // 1-12
  rowIndex?: number; // 0-indexed
  rowSpan?: number;
  tabId?: string;
  visibilityRule?: VisibilityRule;
  formattingRules?: ConditionalFormattingRule[];
  hidden?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  
  // UI & Component specific
  variant?: string;
  action?: string;
  showIcon?: boolean;
  iconName?: string;
  icon?: any;
  min?: number;
  max?: number;
  step?: number;
  
  // Auto-number settings
  autonumberPrefix?: string;
  autonumberSuffix?: string;
  autonumberStart?: number;
  autonumberDigits?: number;
  
  // Date & Time settings
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  minuteStep?: number;
  excludeWeekends?: boolean;
  
  // Advanced Defaults
  defaultType?: 'static' | 'today' | 'now' | 'relative' | 'field_copy' | 'start_of_month' | 'end_of_month' | 'rounded_now' | 'start_of_week' | 'end_of_week' | 'start_of_year' | 'end_of_year';
  defaultSourceFieldId?: string;
  defaultOffset?: number;
  defaultOffsetUnit?: 'days' | 'business_days' | 'months' | 'years' | 'minutes' | 'hours';
  defaultRounding?: number; // e.g., 15 for 15-min blocks
  
  // Constraints
  minDateType?: 'static' | 'today' | 'field_value' | 'relative';
  minDateFieldId?: string;
  minDateValue?: string;
  minDateOffset?: number;
  minDateOffsetUnit?: 'days' | 'business_days' | 'months' | 'years' | 'minutes' | 'hours';
  
  maxDateType?: 'static' | 'today' | 'field_value' | 'relative';
  maxDateFieldId?: string;
  maxDateValue?: string;
  maxDateOffset?: number;
  maxDateOffsetUnit?: 'days' | 'business_days' | 'months' | 'years' | 'minutes' | 'hours';

  // View & Table settings
  showInTable?: boolean;
  inlineEdit?: boolean;
  columnWidth?: number;
  optionLayout?: 'vertical' | 'horizontal';
  isCollapsed?: boolean;

  // Calculation formatting
  showAsCurrency?: boolean;
  currencySymbol?: string;

  // Cross-Builder Integration Mesh
  validationRuleId?: string;
  pdfTemplateId?: string;
}


export type ModuleType = 'RECORD' | 'WORK_ITEM' | 'REGISTRY' | 'LOG' | 'FINANCIAL';

export interface LookupFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'not_empty';
  value: any;
}

export interface Tab {
  id: string;
  label: string;
  iconName?: string;
  visibilityRule?: VisibilityRule;
  parentId?: string;
}

export interface ModuleConfig {
  titleFieldId?: string;
  subtitleFieldIds?: string[];
  [key: string]: any;
}

export interface Module {
  id: string;
  name: string;
  type: ModuleType;
  description: string;
  icon: any; // Can be a string (Lucide icon name) or a component
  category: string;
  enabled: boolean;
  isCustom?: boolean;
  isGlobal?: boolean;
  isTemplate?: boolean;
  templateId?: string;
  blueprintId?: string;
  dependencies?: string[];
  layout: ModuleField[];
  fields?: ModuleField[]; // Deprecated: use layout instead
  tabs?: Tab[];
  workflow?: Workflow;
  workflows?: Workflow[];

  // Record Key Configuration
  recordKeyPrefix?: string;
  recordKeySuffix?: string;
  nextKeyNumber?: number;

  config?: ModuleConfig;
  connectorMappings?: Record<string, Record<string, string>>;
  forms?: any[];
  interfaceSettings?: any;
  formattingRules?: any;
}


export type WorkflowNodeType = 'STATUS' | 'DECISION' | 'ACTION' | 'DELAY' | 'START' | 'END' | 'ZONE';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config?: Record<string, any>;
  position?: { x: number; y: number }; // Visual positioning
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string; // Aurora expression syntax
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}


export interface GlobalObject {
  id: string;
  type: 'CONTACT' | 'ORG' | 'ADDRESS' | 'NOTE' | 'TASK';
  data: Record<string, any>;
}

export interface BusinessLogic {
  id: string;
  name: string;
  type: 'FORMULA' | 'PROCEDURE' | 'TRIGGER' | 'SCHEDULE';
  expression: string;
  active: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STAFF' | 'EXTERNAL' | string;
  licenceType: 'Developer' | 'Standard' | string;
  isSuperAdmin?: boolean;
  tenantId?: string;
  avatarUrl?: string;
  position?: string;
  capabilities?: string[];
  memberId?: string;
  cuid?: string;
}

export type ContentType = 'email' | 'letter' | 'page' | 'message';

export type ContentBlockType = 
  | 'heading'
  | 'text'
  | 'letterhead'
  | 'signature_block'
  | 'table_repeater'
  | 'callout'
  | 'hero_banner'
  | 'grid_2col'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'quote'
  | 'code';

export interface ContentBlockStyles {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  padding?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
}

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'greater_than' 
  | 'less_than' 
  | 'is_empty' 
  | 'is_not_empty';

export interface ContentBlockRule {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface ContentBlockCondition {
  enabled?: boolean;
  conjunction?: 'AND' | 'OR';
  rules?: ContentBlockRule[];
  // Legacy single condition fallback support
  field?: string;
  operator?: ConditionOperator;
  value?: string;
}

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  data: Record<string, any>;
  styles?: ContentBlockStyles;
  conditions?: ContentBlockCondition;
}

export interface ContentMetadata {
  // Email specific
  subject?: string;
  preheader?: string;
  senderName?: string;
  replyTo?: string;

  // Letter specific
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  showLetterhead?: boolean;

  // Site Page specific
  slug?: string;
  containerWidth?: 'contained' | 'full';
  seoTitle?: string;

  // Message / SMS specific
  channel?: 'sms' | 'push' | 'banner';
  maxChars?: number;
}

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  name: string;
  type?: ContentType;
  description?: string;
  moduleId?: string;
  content: string;
  blocks?: ContentBlock[];
  fontFamily?: string;
  metadata?: ContentMetadata;
  status?: 'Draft' | 'Published' | 'Archived';
  version?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ContentItem = DocumentTemplate;

export interface GeneratedDocument {
  id: string;
  tenantId: string;
  templateId: string;
  templateVersion?: number;
  recordId?: string;
  moduleId?: string;
  name: string;
  url?: string;
  status: 'Draft' | 'Generated' | 'Signed' | 'Archived';
  generatedAt: string;
  generatedBy?: string;
  dataSnapshot?: Record<string, any>;
  content?: string;
}
export interface PlanQuota {
  developerSeats: number;
  standardSeats: number;
  price: number;
}

export interface BillingUsage {
  plan: string;
  quota: PlanQuota;
  usage: {
    developer: number;
    standard: number;
  };
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  downloadUrl: string;
}

export interface TenantMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: 'Admin' | 'Lead' | 'Standard';
  team: string;
  teamId?: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Offline';
  isSynthetic: boolean;
  positionId?: string;
  position?: string;
  positionNumber?: string;
  avatarUrl?: string;
  modelType?: string; // For agents
  agentConfig?: any;
  lastActive?: string;
  createdAt: string;
  updatedAt?: string;

  // New Staff Details
  firstName?: string;
  otherName?: string;
  familyName?: string;
  personalEmail?: string;
  homeAddress?: string;
  workArrangements?: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  startDate?: string;
  endDate?: string;

  // Workforce Hub Enhancements
  isContractor?: boolean;
  licenceType?: string;
  aiHumour?: number;
  workEmail?: string;
  signature?: string;

  phoneNumbers?: { label: string; number: string }[];
  certifications?: { name: string; issuer: string; dateObtained?: string; expiryDate?: string }[];
  education?: { institution: string; degree: string; fieldOfStudy: string; startDate?: string; endDate?: string }[];
  skills?: { name: string; proficiencyLevel: string }[];
  permissionGroups?: { id: string; name: string; description?: string }[];
  aiOverrides?: Record<string, 'ALLOW' | 'DENY' | 'INHERIT'>;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  agentCount: number;
  avatar?: string;
}

export interface IndustryBlueprint {
  id: string;
  name: string;
  description: string;
  industry: string;
  icon: string;
  config: {
    modules: { templateId: string; category?: string }[];
    lists?: string[];
    connections?: { sourceModule: string; targetModule: string; type: string }[];
  };
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
}

export type BuilderMode = 'global' | 'in_context';

export interface StandaloneBuilderContext {
  mode: BuilderMode;
  hostType?: 'site' | 'module' | 'workspace' | 'portal';
  hostId?: string;
  onSaveSuccess?: (entityId: string, entityData?: any) => void;
  onCancel?: () => void;
}

export interface FormEntity {
  id: string;
  tenantId: string;
  moduleId?: string;
  moduleName?: string;
  name: string;
  description?: string;
  isGlobal: boolean;
  schema: {
    layout?: ModuleField[];
    tabs?: Tab[];
    settings?: Record<string, any>;
  };
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowEntity {
  id: string;
  tenantId: string;
  moduleId?: string;
  moduleName?: string;
  name: string;
  description?: string;
  isGlobal: boolean;
  triggerType: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidationRulesetEntity {
  id: string;
  tenantId: string;
  moduleId?: string;
  moduleName?: string;
  name: string;
  description?: string;
  scope: 'GLOBAL' | 'MODULE' | 'FORM';
  rules: any[];
  createdAt?: string;
  updatedAt?: string;
}


export interface ConnectorMappingEntity {
  id: string;
  tenantId: string;
  connectorId: string;
  moduleId?: string;
  sourceEntity: string;
  targetEntity: string;
  fieldMappings: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface QueueEntity {
  id: string;
  tenantId: string;
  name: string;
  slug?: string;
  description?: string;
  iconName?: string;
  isGlobal?: boolean;
  isUnifiedQueue?: boolean;
  moduleId?: string;
  moduleName?: string;
  moduleIds?: string[];
  queueConfig?: {
    conditions?: any;
    columns?: string[];
    defaultSort?: { key: string; direction: 'asc' | 'desc' };
    slaMinutes?: number;
    actions?: any[];
    formattingRules?: ConditionalFormattingRule[];
    listLayout?: 'table' | 'split' | 'kanban' | 'cards';
    listSettings?: {
      kanbanGroupBy?: 'status' | 'priority' | 'assigneeId' | string;
      cardFields?: string[];
      density?: 'compact' | 'standard' | 'spacious';
    };
    detailViewMode?: 'page' | 'modal' | 'split';
    detailLayoutType?: 'tabs' | 'split' | 'sidebar' | 'process' | 'accordion';
  };
  version?: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
}


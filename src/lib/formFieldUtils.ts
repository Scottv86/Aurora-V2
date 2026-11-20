import {
  User,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Tag,
  Users,
  PlusCircle,
  Edit3,
  Zap,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import { FieldType, FormUsageType, ModuleField } from '../types/platform';
import { flattenFields } from './utils';

export interface SystemMetaField {
  id: string;
  name?: string;
  label: string;
  type: FieldType;
  icon?: any;
  options?: string[];
  description?: string;
  isSystemMeta: boolean;
}

export interface GroupedModuleFields {
  id: string;
  label: string;
  iconName?: string;
  type: string;
  fields: any[];
}

export interface FormPrefillConfig {
  source: 'none' | 'static' | 'url_param' | 'user_context' | 'parent_context' | 'today';
  staticValue?: any;
  urlParam?: string;
  userAttribute?: 'id' | 'name' | 'email' | 'phone' | 'partyId' | 'organisationId' | 'role' | 'department';
  parentParam?: string;
}

export interface FormFieldValidation {
  pattern?: string;
  errorMessage?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface FormFieldPlacement {
  id: string;
  type?: string;
  labelOverride?: string;
  placeholderOverride?: string;
  helperTextOverride?: string;
  width?: 'full' | 'half' | 'two-thirds' | 'one-third' | 'one-quarter' | '12' | '8' | '6' | '4' | '3';
  required?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  height?: 'sm' | 'md' | 'lg' | 'xl';
  alertStyle?: 'info' | 'success' | 'warning' | 'error';
  visibilityRule?: any;
  calculationLogic?: string;
  calculationTriggers?: string[];
  validation?: FormFieldValidation;
  validationRuleId?: string;
  pdfTemplateId?: string;
  prefill?: FormPrefillConfig;
  // Field Group / Repeater Container Config
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  minRows?: number;
  maxRows?: number;
  addRowLabel?: string;
  includedSubFieldIds?: string[];
}

export interface FormStepConfig {
  id: string;
  title: string;
  subtitle?: string;
  fields: FormFieldPlacement[];
  visibilityRule?: any;
}

export interface FormContextBindings {
  captureLoggedInUser?: boolean;
  requireAuthentication?: boolean;
  userIdFieldId?: string;
  userNameFieldId?: string;
  userEmailFieldId?: string;
  partyIdFieldId?: string;
  parentObjectLabel?: string;
  parentObjectUrlParam?: string;
  parentObjectTargetFieldId?: string;
}

export interface FormPostSubmitConfig {
  validationRulesetId?: string;
  pdfTemplateId?: string;
  webhookUrl?: string;
  notifyEmails?: string;
  triggerAutomation?: boolean;
}

export interface FormThemeConfig {
  accentColor?: string;
  density?: 'compact' | 'standard' | 'spacious';
  modalSize?: 'md' | 'lg' | 'xl' | 'fullscreen';
  showProgressBar?: boolean;
  hideHeader?: boolean;
}

export interface FormPaymentConfig {
  enabled?: boolean;
  amountMode?: 'fixed' | 'field';
  fixedAmount?: number;
  amountFieldId?: string;
  currency?: string;
  itemTitle?: string;
  allowVoucher?: boolean;
}

export interface FormSettingsConfig {
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  redirectUrl?: string;
  requireLogin?: boolean;
  allowSaveDraft?: boolean;
  // Workspace Create / Edit
  workspaceButtonLabel?: string;
  // Workspace Action Trigger
  actionButtonLabel?: string;
  actionButtonIcon?: string;
  actionButtonVariant?: 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';
  actionTargetMode?: 'create_record' | 'update_record';
  autoTransitionStatus?: string;
  // Public Link
  customerRefPrefix?: string;
  customerRefSuffix?: string;
  customerRefNextNumber?: number;
  rateLimitPerHour?: number;
  enableCaptcha?: boolean;
  routingTarget?: 'direct_module' | 'triage_inbox';
  // Context & Post-Submit & Payments
  contextBindings?: FormContextBindings;
  postSubmit?: FormPostSubmitConfig;
  payment?: FormPaymentConfig;
  theme?: FormThemeConfig;
}

export interface CanonicalFormDefinition {
  id: string;
  name: string;
  title?: string;
  description?: string;
  moduleId?: string;
  moduleName?: string;
  isGlobal?: boolean;
  usage: FormUsageType;
  isMultistep: boolean;
  fields: FormFieldPlacement[];
  steps: FormStepConfig[];
  customFields: ModuleField[];
  settings: FormSettingsConfig;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version?: number;
}

export interface FormUsageModeMeta {
  id: FormUsageType;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  badgeClass: string;
}

export const FORM_USAGE_MODES: FormUsageModeMeta[] = [
  {
    id: 'workspace_create',
    label: 'Workspace: Create New Record',
    shortLabel: 'Create',
    description: 'Primary modal form opened when users click the "+ Create" button in the module workspace.',
    icon: PlusCircle,
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  {
    id: 'workspace_edit',
    label: 'Workspace: Edit Record Form',
    shortLabel: 'Edit',
    description: 'Structured form modal used when editing an existing record in the workspace.',
    icon: Edit3,
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  {
    id: 'action_trigger',
    label: 'Workspace: Button / Quick Action',
    shortLabel: 'Action',
    description: 'Triggered by pressing an action button in the workspace toolbar or record view (can update or create records and transition status).',
    icon: Zap,
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'public_link',
    label: 'Public External Intake Form',
    shortLabel: 'Public',
    description: 'Shareable external URL and embeddable form for unauthenticated public submissions with reference tracking.',
    icon: Globe,
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'portal_site',
    label: 'Site / Portal Form (Context-Aware)',
    shortLabel: 'Portal Site',
    description: 'Embedded in customer portals or internal sites with automatic logged-in user and parent object context binding.',
    icon: ShieldCheck,
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
];

export const getUsageModeMeta = (usage?: string): FormUsageModeMeta => {
  return FORM_USAGE_MODES.find((m) => m.id === usage) || FORM_USAGE_MODES[0];
};

export const colSpanToWidth = (colSpan?: number | string): FormFieldPlacement['width'] => {
  const n = Number(colSpan);
  if (n === 6 || colSpan === 'half') return 'half';
  if (n === 8 || colSpan === 'two-thirds') return 'two-thirds';
  if (n === 4 || colSpan === 'one-third') return 'one-third';
  if (n === 3 || colSpan === 'one-quarter') return 'one-quarter';
  return 'full';
};

export const widthToColSpan = (width?: string | number): number => {
  if (width === 'half' || width === '6' || width === 6) return 6;
  if (width === 'two-thirds' || width === '8' || width === 8) return 8;
  if (width === 'one-third' || width === '4' || width === 4) return 4;
  if (width === 'one-quarter' || width === '3' || width === 3) return 3;
  return 12;
};

export const widthToGridClass = (width?: string | number): string => {
  if (width === 'half' || width === '6' || width === 6) return 'col-span-12 sm:col-span-6';
  if (width === 'two-thirds' || width === '8' || width === 8) return 'col-span-12 sm:col-span-8';
  if (width === 'one-third' || width === '4' || width === 4) return 'col-span-12 sm:col-span-4';
  if (width === 'one-quarter' || width === '3' || width === 3) return 'col-span-12 sm:col-span-3';
  return 'col-span-12';
};

/**
 * Standard system metadata fields available across Aurora records.
 */
export const getSystemMetaFields = (workflow?: any): SystemMetaField[] => {
  let statusOptions: string[] = ['Open', 'In Progress', 'Completed'];
  if (workflow?.nodes && Array.isArray(workflow.nodes)) {
    const stageNodes = workflow.nodes.filter(
      (n: any) => n.type === 'STATUS' || n.type === 'START' || n.type === 'END' || n.isStage
    );
    if (stageNodes.length > 0) {
      statusOptions = stageNodes.map((n: any) => n.name || n.label || n.id);
    }
  }

  return [
    {
      id: 'assigneeId',
      name: 'assigneeId',
      label: 'Assignee',
      type: 'user' as FieldType,
      icon: User,
      description: 'Assign record to a team member',
      isSystemMeta: true,
    },
    {
      id: 'status',
      name: 'status',
      label: 'Status',
      type: 'select' as FieldType,
      icon: CheckCircle2,
      options: statusOptions,
      description: 'Workflow stage or lifecycle status',
      isSystemMeta: true,
    },
    {
      id: 'priority',
      name: 'priority',
      label: 'Priority',
      type: 'select' as FieldType,
      icon: AlertTriangle,
      options: ['Low', 'Medium', 'High', 'Critical'],
      description: 'Urgency / priority classification',
      isSystemMeta: true,
    },
    {
      id: 'dueDate',
      name: 'dueDate',
      label: 'Due Date',
      type: 'date' as FieldType,
      icon: Calendar,
      description: 'Target completion or SLA deadline',
      isSystemMeta: true,
    },
    {
      id: '_record_key',
      name: '_record_key',
      label: 'Record Key',
      type: 'text' as FieldType,
      icon: Tag,
      description: 'Human-readable record identifier (e.g. TKT-001)',
      isSystemMeta: true,
    },
    {
      id: 'participantIds',
      name: 'participantIds',
      label: 'Participants',
      type: 'user' as FieldType,
      icon: Users,
      description: 'Co-workers or watchers collaborating on this record',
      isSystemMeta: true,
    },
  ];
};

/**
 * Organizes a module's layout into standalone fields, grouped sections, and repeatable groups for form building.
 */
export const extractPaletteFields = (layout: any[] = []) => {
  const containerTypes = ['group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested'];
  const visualTypes = ['divider', 'spacer', 'heading', 'alert', 'html', 'html-text'];

  const ungroupedFields: any[] = [];
  const groups: GroupedModuleFields[] = [];
  const repeatableGroups: GroupedModuleFields[] = [];

  layout.forEach((item) => {
    if (item.type === 'repeatableGroup') {
      const childFields = (item.fields || []).filter(
        (cf: any) => !visualTypes.includes(cf.type) && !containerTypes.includes(cf.type)
      );
      repeatableGroups.push({
        id: item.id,
        label: item.label || 'Untitled Repeater',
        iconName: item.iconName || 'ListPlus',
        type: 'repeatableGroup',
        fields: childFields,
      });
    } else if (containerTypes.includes(item.type)) {
      const childFields = (item.fields || []).flatMap((child: any) => {
        if (child.fields && Array.isArray(child.fields)) {
          return child.fields.filter(
            (cf: any) => !visualTypes.includes(cf.type) && !containerTypes.includes(cf.type)
          );
        }
        if (!visualTypes.includes(child.type) && !containerTypes.includes(child.type)) {
          return [child];
        }
        return [];
      });

      if (childFields.length > 0) {
        groups.push({
          id: item.id,
          label: item.label || 'Untitled Section',
          iconName: item.iconName || 'Folder',
          type: item.type,
          fields: childFields,
        });
      }
    } else if (!visualTypes.includes(item.type)) {
      ungroupedFields.push(item);
    }
  });

  return { ungroupedFields, groups, repeatableGroups };
};

/**
 * Unified resolver for any field or container (fieldGroup / repeatableGroup) on a form -
 * resolves layout containers, leaf data fields, system metadata fields, and standalone/custom form fields.
 */
export const getUnifiedFieldDefinition = (
  fieldId: string,
  layout: any[] = [],
  workflow?: any,
  customFields: any[] = []
): any | null => {
  if (!fieldId) return null;

  // 1. Check direct layout items (including container blocks like repeatableGroup and fieldGroup)
  const directMatch = (layout || []).find((f: any) => f && f.id === fieldId);
  if (directMatch) return directMatch;

  // 2. Check flattened layout fields (inside groups and nested structures)
  const flattened = flattenFields(layout);
  const matchedLayoutField = flattened.find((f: any) => f.id === fieldId);
  if (matchedLayoutField) return matchedLayoutField;

  // 3. Check system meta fields
  const metaFields = getSystemMetaFields(workflow);
  const matchedMeta = metaFields.find((m) => m.id === fieldId);
  if (matchedMeta) return matchedMeta;

  // 4. Check custom / standalone form fields (including custom repeaters and custom field groups)
  if (Array.isArray(customFields) && customFields.length > 0) {
    const matchedCustom = customFields.find((cf: any) => cf && cf.id === fieldId);
    if (matchedCustom) return matchedCustom;
    for (const cf of customFields) {
      if (cf && Array.isArray(cf.fields)) {
        const sub = cf.fields.find((sf: any) => sf && sf.id === fieldId);
        if (sub) return sub;
      }
    }
  }

  return null;
};

/**
 * Resolves the active child fields / sub-columns inside a Field Group (`fieldGroup`)
 * or Repeater (`repeatableGroup`) placement on a form.
 * Supports both native sub-fields defined on the container (`fieldDef.fields`) AND any
 * module field, system meta field, or custom form field added to `fObj.includedSubFieldIds`.
 */
export const resolveContainerChildFields = (
  fObj: FormFieldPlacement,
  fieldDef: any,
  layout: any[] = [],
  workflow?: any,
  customFields: any[] = []
): any[] => {
  const rawChildren: any[] = Array.isArray(fieldDef?.fields) ? fieldDef.fields : [];

  if (Array.isArray(fObj.includedSubFieldIds)) {
    const resolved: any[] = [];
    const seen = new Set<string>();
    fObj.includedSubFieldIds.forEach((subId) => {
      if (!subId || seen.has(subId)) return;
      seen.add(subId);
      const fromDirectChildren = rawChildren.find((c: any) => c && c.id === subId);
      if (fromDirectChildren) {
        resolved.push(fromDirectChildren);
        return;
      }
      const fromUnified = getUnifiedFieldDefinition(subId, layout, workflow, customFields);
      if (fromUnified && fromUnified.id !== fObj.id) {
        resolved.push(fromUnified);
      }
    });
    return resolved;
  }

  return rawChildren;
};

/**
 * Normalizes any form representation (from db.form, module.config.forms, or legacy schema.layout)
 * into a single canonical structure.
 */
export const normalizeFormSchema = (
  raw: any,
  fallbackModuleId?: string
): CanonicalFormDefinition => {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `form-${Date.now()}`,
      name: 'Untitled Form',
      description: '',
      moduleId: fallbackModuleId || undefined,
      isGlobal: !fallbackModuleId,
      usage: fallbackModuleId ? 'workspace_create' : 'public_link',
      isMultistep: false,
      fields: [],
      steps: [{ id: 'step-1', title: 'Step 1', fields: [] }],
      customFields: [],
      settings: {
        requireLogin: !fallbackModuleId ? false : true,
        submitLabel: fallbackModuleId ? 'Create Record' : 'Submit',
        successMessage: 'Submission received successfully!',
        workspaceButtonLabel: 'Create',
        allowSaveDraft: false,
      },
      status: 'PUBLISHED',
      version: 1,
    };
  }

  const schemaObj = raw.schema && typeof raw.schema === 'object' ? raw.schema : {};
  const merged = { ...schemaObj, ...raw };

  const id = raw.id || schemaObj.id || `form-${Date.now()}`;
  const name = raw.name || raw.title || schemaObj.name || schemaObj.title || 'Untitled Form';
  const moduleId = raw.moduleId !== undefined ? raw.moduleId : (schemaObj.moduleId || fallbackModuleId || undefined);
  const isGlobal = raw.isGlobal !== undefined ? Boolean(raw.isGlobal) : !moduleId;

  const rawSettings = {
    ...(schemaObj.settings || {}),
    ...(raw.settings || {}),
  };

  const description =
    raw.description ||
    schemaObj.description ||
    rawSettings.description ||
    '';

  const usage: FormUsageType =
    raw.usage ||
    schemaObj.usage ||
    (isGlobal ? 'public_link' : 'workspace_create');

  // Collect customFields from raw or schemaObj or legacy schema.layout
  const customFieldsMap = new Map<string, ModuleField>();
  const rawCustomFields = Array.isArray(raw.customFields)
    ? raw.customFields
    : Array.isArray(schemaObj.customFields)
    ? schemaObj.customFields
    : [];

  rawCustomFields.forEach((cf: any) => {
    if (cf && cf.id) customFieldsMap.set(cf.id, cf);
  });

  // Check if form has canonical fields/steps or legacy schema.layout
  let fields: FormFieldPlacement[] = [];
  let steps: FormStepConfig[] = [];
  let isMultistep = Boolean(raw.isMultistep ?? schemaObj.isMultistep);

  const rawFields = Array.isArray(raw.fields)
    ? raw.fields
    : Array.isArray(schemaObj.fields)
    ? schemaObj.fields
    : null;

  const rawSteps = Array.isArray(raw.steps)
    ? raw.steps
    : Array.isArray(schemaObj.steps)
    ? schemaObj.steps
    : null;

  const legacyLayout = Array.isArray(schemaObj.layout)
    ? schemaObj.layout
    : Array.isArray(raw.layout)
    ? raw.layout
    : null;

  const normalizePlacement = (item: any): FormFieldPlacement => {
    if (!item) return { id: `f_${Date.now()}`, width: 'full' };
    const isVisual = String(item.id || '').startsWith('visual-') || ['heading', 'divider', 'spacer', 'html-text', 'alert'].includes(item.type);

    // If item looks like a full ModuleField definition (has type & label), register in customFieldsMap
    if (!isVisual && item.type && (item.label || item.name)) {
      if (!customFieldsMap.has(item.id)) {
        customFieldsMap.set(item.id, {
          id: item.id,
          label: item.label || item.name || item.labelOverride || 'Field',
          type: item.type,
          required: Boolean(item.required),
          placeholder: item.placeholder || item.placeholderOverride,
          helperText: item.helperText || item.helperTextOverride,
          options: item.options,
          defaultValue: item.defaultValue,
          calculationLogic: item.calculationLogic,
          calculationTriggers: item.calculationTriggers,
          visibilityRule: item.visibilityRule,
          validationRuleId: item.validationRuleId,
          pdfTemplateId: item.pdfTemplateId,
          colSpan: item.colSpan || widthToColSpan(item.width),
        });
      }
    }

    return {
      id: item.id,
      type: item.type,
      labelOverride: item.labelOverride ?? item.label ?? item.name,
      placeholderOverride: item.placeholderOverride ?? item.placeholder,
      helperTextOverride: item.helperTextOverride ?? item.helperText,
      width: item.width || colSpanToWidth(item.colSpan),
      required: Boolean(item.required),
      readOnly: Boolean(item.readOnly),
      hidden: Boolean(item.hidden),
      height: item.height,
      alertStyle: item.alertStyle,
      visibilityRule: item.visibilityRule,
      calculationLogic: item.calculationLogic,
      calculationTriggers: item.calculationTriggers,
      validation: item.validation,
      validationRuleId: item.validationRuleId,
      pdfTemplateId: item.pdfTemplateId,
      prefill: item.prefill,
      collapsible: item.collapsible,
      defaultCollapsed: item.defaultCollapsed,
      minRows: item.minRows,
      maxRows: item.maxRows,
      addRowLabel: item.addRowLabel,
      includedSubFieldIds: item.includedSubFieldIds,
    };
  };

  if (rawSteps && rawSteps.length > 0 && (isMultistep || !rawFields || rawFields.length === 0)) {
    steps = rawSteps.map((s: any, idx: number) => ({
      id: s.id || `step-${idx + 1}`,
      title: s.title || `Step ${idx + 1}`,
      subtitle: s.subtitle || '',
      fields: Array.isArray(s.fields) ? s.fields.map(normalizePlacement) : [],
      visibilityRule: s.visibilityRule,
    }));
    fields = steps.flatMap((s) => s.fields);
  } else if (rawFields && rawFields.length > 0) {
    fields = rawFields.map(normalizePlacement);
    steps =
      rawSteps && rawSteps.length > 0
        ? rawSteps.map((s: any, idx: number) => ({
            id: s.id || `step-${idx + 1}`,
            title: s.title || `Step ${idx + 1}`,
            subtitle: s.subtitle || '',
            fields: Array.isArray(s.fields) ? s.fields.map(normalizePlacement) : [],
            visibilityRule: s.visibilityRule,
          }))
        : [{ id: 'step-1', title: 'Step 1', fields }];
  } else if (legacyLayout && legacyLayout.length > 0) {
    const flatLegacy = flattenFields(legacyLayout).filter(
      (f: any) => !['group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested'].includes(f.type)
    );
    fields = flatLegacy.map(normalizePlacement);
    steps = [{ id: 'step-1', title: 'Step 1', fields }];
  } else {
    fields = [];
    steps = [{ id: 'step-1', title: 'Step 1', fields: [] }];
  }

  if (isMultistep && steps.length === 0) {
    steps = [{ id: 'step-1', title: 'Step 1', fields }];
  }

  const settings: FormSettingsConfig = {
    ...rawSettings,
    description: description || rawSettings.description || '',
    submitLabel: rawSettings.submitLabel || (usage === 'workspace_create' ? 'Create Record' : 'Submit'),
    successMessage: rawSettings.successMessage || 'Submission completed successfully!',
    requireLogin: rawSettings.requireLogin !== undefined ? Boolean(rawSettings.requireLogin) : usage !== 'public_link',
    workspaceButtonLabel: rawSettings.workspaceButtonLabel || 'Create',
    allowSaveDraft: Boolean(rawSettings.allowSaveDraft),
  };

  return {
    id,
    name,
    title: name,
    description,
    moduleId: moduleId || undefined,
    moduleName: merged.moduleName,
    isGlobal,
    usage,
    isMultistep,
    fields,
    steps,
    customFields: Array.from(customFieldsMap.values()),
    settings,
    status: raw.status || schemaObj.status || 'PUBLISHED',
    version: raw.version || schemaObj.version || 1,
  };
};

/**
 * Counts the number of data fields configured on any form object.
 */
export const getFormFieldCount = (rawForm: any): number => {
  const norm = normalizeFormSchema(rawForm);
  const list = norm.isMultistep
    ? norm.steps.flatMap((s) => s.fields || [])
    : norm.fields || [];
  return list.filter((f) => !String(f.id || '').startsWith('visual-')).length;
};

/**
 * Converts a CanonicalFormDefinition into the payload expected by POST/PUT /api/forms
 * while maintaining full compatibility with both ModuleEditor and FormEntity consumers.
 */
export const toFormEntityPayload = (
  form: CanonicalFormDefinition,
  tenantId: string,
  moduleLayout: any[] = [],
  workflow?: any
) => {
  const activePlacements = form.isMultistep
    ? form.steps.flatMap((s) => s.fields || [])
    : form.fields || [];

  // Reconstruct a backward-compatible layout array for any legacy consumer reading schema.layout
  const reconstructedLayout: ModuleField[] = activePlacements
    .filter((p) => !String(p.id || '').startsWith('visual-'))
    .map((p) => {
      const def = getUnifiedFieldDefinition(p.id, moduleLayout, workflow, form.customFields);
      return {
        ...(def || {}),
        id: p.id,
        label: p.labelOverride || def?.label || p.id,
        type: (def?.type || p.type || 'text') as FieldType,
        required: Boolean(p.required || def?.required),
        placeholder: p.placeholderOverride || def?.placeholder,
        helperText: p.helperTextOverride || def?.helperText,
        colSpan: widthToColSpan(p.width),
        visibilityRule: p.visibilityRule || def?.visibilityRule,
        calculationLogic: p.calculationLogic || def?.calculationLogic,
        calculationTriggers: p.calculationTriggers || def?.calculationTriggers,
        validationRuleId: p.validationRuleId || def?.validationRuleId,
        pdfTemplateId: p.pdfTemplateId || def?.pdfTemplateId,
      };
    });

  const canonicalSchema = {
    id: form.id,
    name: form.name,
    title: form.name,
    description: form.description || form.settings?.description || '',
    usage: form.usage,
    isMultistep: form.isMultistep,
    fields: form.isMultistep ? activePlacements : form.fields,
    steps: form.steps,
    customFields: form.customFields,
    settings: {
      ...form.settings,
      description: form.description || form.settings?.description || '',
    },
    layout: reconstructedLayout,
  };

  return {
    id: form.id,
    tenantId,
    name: form.name,
    description: form.description || form.settings?.description || '',
    moduleId: form.moduleId || undefined,
    isGlobal: !form.moduleId,
    status: form.status || 'PUBLISHED',
    version: form.version || 1,
    schema: canonicalSchema,
  };
};

/**
 * Resolves initial form values using field defaults, URL query parameters,
 * logged-in user context, parent object context, and form-level context bindings.
 */
export const resolveFormInitialValues = (
  rawForm: any,
  moduleLayout: any[] = [],
  workflow?: any,
  context?: {
    user?: any;
    urlParams?: URLSearchParams;
    parentRecord?: Record<string, any>;
    initialData?: Record<string, any>;
  }
): Record<string, any> => {
  const form = normalizeFormSchema(rawForm);
  const values: Record<string, any> = { ...(context?.initialData || {}) };
  const params =
    context?.urlParams ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams());
  const user = context?.user;

  const placements = form.isMultistep
    ? form.steps.flatMap((s) => s.fields || [])
    : form.fields || [];

  placements.forEach((fObj) => {
    if (String(fObj.id || '').startsWith('visual-')) return;
    if (values[fObj.id] !== undefined && values[fObj.id] !== '') return;

    const fieldDef = getUnifiedFieldDefinition(fObj.id, moduleLayout, workflow, form.customFields);

    // 1. Check explicit prefill configuration on field placement
    if (fObj.prefill && fObj.prefill.source !== 'none') {
      const { source, staticValue, urlParam, userAttribute, parentParam } = fObj.prefill;
      if (source === 'static' && staticValue !== undefined && staticValue !== '') {
        values[fObj.id] = staticValue;
        return;
      }
      if (source === 'today') {
        values[fObj.id] = new Date().toISOString().split('T')[0];
        return;
      }
      if (source === 'url_param') {
        const key = urlParam || fObj.id;
        const val = params.get(key);
        if (val !== null && val !== '') {
          values[fObj.id] = val;
          return;
        }
      }
      if (source === 'user_context' && user) {
        const attr = userAttribute || 'email';
        const userVal =
          attr === 'id'
            ? user.id || user.userId
            : attr === 'name'
            ? user.name || user.fullName || user.displayName
            : attr === 'email'
            ? user.email
            : attr === 'phone'
            ? user.phone || user.mobile
            : attr === 'partyId'
            ? user.partyId
            : attr === 'organisationId'
            ? user.organisationId || user.organizationId
            : (user as any)[attr];
        if (userVal !== undefined && userVal !== null && userVal !== '') {
          values[fObj.id] = userVal;
          return;
        }
      }
      if (source === 'parent_context') {
        const key = parentParam || fObj.id;
        const fromParent = context?.parentRecord?.[key] ?? params.get(key);
        if (fromParent !== undefined && fromParent !== null && fromParent !== '') {
          values[fObj.id] = fromParent;
          return;
        }
      }
    }

    // 2. Check URL query parameter matching field ID directly (if not already populated)
    const directParam = params.get(fObj.id);
    if (directParam !== null && directParam !== '') {
      values[fObj.id] = directParam;
      return;
    }

    // 3. Check base field defaultValue
    if (fieldDef?.defaultValue !== undefined && fieldDef.defaultValue !== null && fieldDef.defaultValue !== '') {
      values[fObj.id] = fieldDef.defaultValue;
    }
  });

  // 4. Apply form-level contextBindings (e.g. for portal_site usage mode)
  const bindings = form.settings?.contextBindings;
  if (bindings) {
    if (bindings.captureLoggedInUser && user) {
      if (bindings.userIdFieldId && !values[bindings.userIdFieldId]) {
        values[bindings.userIdFieldId] = user.id || user.userId;
      }
      if (bindings.userNameFieldId && !values[bindings.userNameFieldId]) {
        values[bindings.userNameFieldId] = user.name || user.fullName || user.displayName;
      }
      if (bindings.userEmailFieldId && !values[bindings.userEmailFieldId]) {
        values[bindings.userEmailFieldId] = user.email;
      }
      if (bindings.partyIdFieldId && !values[bindings.partyIdFieldId] && user.partyId) {
        values[bindings.partyIdFieldId] = user.partyId;
      }
    }
    if (bindings.parentObjectTargetFieldId) {
      const paramKey = bindings.parentObjectUrlParam || 'parentId';
      const parentVal =
        context?.parentRecord?.id ||
        context?.parentRecord?.[paramKey] ||
        params.get(paramKey);
      if (parentVal && !values[bindings.parentObjectTargetFieldId]) {
        values[bindings.parentObjectTargetFieldId] = parentVal;
      }
    }
  }

  return values;
};

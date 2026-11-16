import { LucideIcon, User, CheckCircle2, AlertTriangle, Calendar, Tag, Users } from 'lucide-react';
import { FieldType } from '../types/platform';
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

/**
 * Standard system metadata fields available across Aurora records.
 */
export const getSystemMetaFields = (workflow?: any): SystemMetaField[] => {
  // Extract workflow statuses/stages if present
  let statusOptions: string[] = ['Open', 'In Progress', 'Completed'];
  if (workflow?.nodes && Array.isArray(workflow.nodes)) {
    const stageNodes = workflow.nodes.filter((n: any) => 
      n.type === 'STATUS' || n.type === 'START' || n.type === 'END' || n.isStage
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
      isSystemMeta: true
    },
    {
      id: 'status',
      name: 'status',
      label: 'Status',
      type: 'select' as FieldType,
      icon: CheckCircle2,
      options: statusOptions,
      description: 'Workflow stage or lifecycle status',
      isSystemMeta: true
    },
    {
      id: 'priority',
      name: 'priority',
      label: 'Priority',
      type: 'select' as FieldType,
      icon: AlertTriangle,
      options: ['Low', 'Medium', 'High', 'Critical'],
      description: 'Urgency / priority classification',
      isSystemMeta: true
    },
    {
      id: 'dueDate',
      name: 'dueDate',
      label: 'Due Date',
      type: 'date' as FieldType,
      icon: Calendar,
      description: 'Target completion or SLA deadline',
      isSystemMeta: true
    },
    {
      id: '_record_key',
      name: '_record_key',
      label: 'Record Key',
      type: 'text' as FieldType,
      icon: Tag,
      description: 'Human-readable record identifier (e.g. TKT-001)',
      isSystemMeta: true
    },
    {
      id: 'participantIds',
      name: 'participantIds',
      label: 'Participants',
      type: 'user' as FieldType,
      icon: Users,
      description: 'Co-workers or watchers collaborating on this record',
      isSystemMeta: true
    }
  ];
};

/**
 * Organizes a module's layout into standalone fields and grouped sections for form building.
 * Flattens nested container items so individual fields are selectable, and collects their parent info.
 */
export const extractPaletteFields = (layout: any[] = []) => {
  const containerTypes = ['group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested'];
  const visualTypes = ['divider', 'spacer', 'heading', 'alert', 'html'];

  const ungroupedFields: any[] = [];
  const groups: GroupedModuleFields[] = [];

  layout.forEach((item) => {
    if (containerTypes.includes(item.type)) {
      // It's a container / group. Extract leaf data fields recursively.
      const childFields = (item.fields || []).flatMap((child: any) => {
        // If accordion or tabs_nested, might have sections
        if (child.fields && Array.isArray(child.fields)) {
          return child.fields.filter((cf: any) => !visualTypes.includes(cf.type) && !containerTypes.includes(cf.type));
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
          fields: childFields
        });
      }
    } else if (!visualTypes.includes(item.type)) {
      // Standalone data field
      ungroupedFields.push(item);
    }
  });

  return { ungroupedFields, groups };
};

/**
 * Unified resolver for any field on a form - resolves layout data fields (flat or inside groups)
 * and system metadata fields.
 */
export const getUnifiedFieldDefinition = (
  fieldId: string, 
  layout: any[] = [], 
  workflow?: any
): any | null => {
  if (!fieldId) return null;

  // 1. Check layout fields (flattening groups and nested structures)
  const flattened = flattenFields(layout);
  const matchedLayoutField = flattened.find((f: any) => f.id === fieldId);
  if (matchedLayoutField) return matchedLayoutField;

  // 2. Check system meta fields
  const metaFields = getSystemMetaFields(workflow);
  const matchedMeta = metaFields.find(m => m.id === fieldId);
  if (matchedMeta) return matchedMeta;

  return null;
};

import { Users } from 'lucide-react';

export interface PlatformModuleField {
  id: string;
  label: string;
  type: string;
  options?: { value: string; label: string }[];
}

export interface PlatformModule {
  id: string;
  name: string;
  slug: string;
  icon: any;
  description: string;
  apiEndpoint: string;
  availableFields: PlatformModuleField[];
}

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: 'people-organisations',
    name: 'People & Organisations',
    slug: 'people-organisations',
    icon: Users,
    description: 'Manage core entity taxonomies and global relationship rules.',
    apiEndpoint: '/api/people-organisations',
    availableFields: [
      { id: 'partyType', label: 'Entity Type', type: 'select', options: [{ value: 'PERSON', label: 'Person' }, { value: 'ORGANIZATION', label: 'Organisation' }] },
      { id: 'status', label: 'Status', type: 'select', options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'PENDING_REVIEW', label: 'Pending' }, { value: 'INACTIVE', label: 'Inactive' }] },
      { id: 'origin', label: 'Origin', type: 'select', options: [{ value: 'HUMAN', label: 'Human' }, { value: 'SWARM', label: 'AI Swarm' }] },
      { id: 'firstName', label: 'First Name (Person)', type: 'text' },
      { id: 'lastName', label: 'Last Name (Person)', type: 'text' },
      { id: 'legalName', label: 'Legal Name (Org)', type: 'text' },
      { id: 'taxIdentifier', label: 'Tax ID (Org)', type: 'text' }
    ]
  }
];

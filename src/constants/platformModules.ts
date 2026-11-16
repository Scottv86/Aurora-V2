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
    name: 'Directory (People & Organisations)',
    slug: 'people-organisations',
    icon: Users,
    description: 'Centralized master directory of all people, contacts, clients, suppliers, and corporate entities.',
    apiEndpoint: '/api/people-organisations',
    availableFields: [
      { id: 'displayName', label: 'Full / Display Name', type: 'text' },
      { id: 'partyCode', label: 'Directory Code (PER/ORG)', type: 'text' },
      {
        id: 'partyType',
        label: 'Entity Type',
        type: 'select',
        options: [
          { value: 'PERSON', label: 'Person' },
          { value: 'ORGANIZATION', label: 'Organisation' },
        ],
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'VERIFIED', label: 'Verified' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'PENDING_REVIEW', label: 'Pending Review' },
          { value: 'FLAGGED', label: 'Flagged' },
          { value: 'INACTIVE', label: 'Inactive' },
        ],
      },
      { id: 'email', label: 'Primary Email', type: 'email' },
      { id: 'secondaryEmail', label: 'Secondary / Billing Email', type: 'email' },
      { id: 'phone', label: 'Business Phone', type: 'phone' },
      { id: 'mobile', label: 'Mobile Phone', type: 'phone' },
      { id: 'website', label: 'Website URL', type: 'url' },
      { id: 'salutation', label: 'Salutation (Person)', type: 'text' },
      { id: 'firstName', label: 'First Name (Person)', type: 'text' },
      { id: 'middleName', label: 'Middle Name (Person)', type: 'text' },
      { id: 'lastName', label: 'Last Name (Person)', type: 'text' },
      { id: 'preferredName', label: 'Preferred Name (Person)', type: 'text' },
      { id: 'jobTitle', label: 'Job Title / Role (Person)', type: 'text' },
      { id: 'department', label: 'Department (Person)', type: 'text' },
      { id: 'primaryOrgName', label: 'Primary Organisation (Person)', type: 'text' },
      { id: 'legalName', label: 'Legal Name (Org)', type: 'text' },
      { id: 'tradingName', label: 'Trading Name (Org)', type: 'text' },
      { id: 'orgStructureType', label: 'Legal Structure (Org)', type: 'text' },
      { id: 'taxIdentifier', label: 'ABN / Tax ID (Org)', type: 'text' },
      { id: 'companyRegistrationNumber', label: 'ACN / Registration No. (Org)', type: 'text' },
      { id: 'industry', label: 'Industry (Org)', type: 'text' },
      { id: 'paymentTerms', label: 'Payment Terms (Org)', type: 'text' },
      { id: 'primaryAddress', label: 'Primary Address', type: 'address' },
    ],
  },
];

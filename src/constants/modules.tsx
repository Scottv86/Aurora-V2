import { 
  Users, 
  FileText, 
  CreditCard, 
  Database, 
  ShieldCheck, 
  ShoppingCart, 
  HeartHandshake 
} from 'lucide-react';

function UserPlus(props: any) {
  return <Users {...props} />;
}

export const MODULES = [
  { 
    id: 'contacts', 
    name: 'Contacts', 
    type: 'RECORD',
    category: 'CRM & People & Organisations', 
    icon: Users, 
    description: 'Manage people and relationships across your organization.',
    enabled: true,
    layout: [
      { id: 'f1', name: 'Full Name', label: 'Full Name', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
      { id: 'f2', name: 'Email', label: 'Email', type: 'text', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
      { id: 'f3', name: 'Company', label: 'Company', type: 'text', required: false, colSpan: 6, startCol: 1, rowIndex: 1 },
      { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['Lead', 'Customer', 'Partner'], required: true, colSpan: 6, startCol: 7, rowIndex: 1 }
    ]
  },
  { 
    id: 'service-requests', 
    name: 'Service Requests', 
    type: 'WORK_ITEM',
    category: 'Intake & Requests', 
    icon: FileText, 
    description: 'Handle external requests with automated triage and routing.',
    enabled: true,
    layout: [
      { id: 'f1', name: 'Subject', label: 'Subject', type: 'text', required: true, colSpan: 12, startCol: 1, rowIndex: 0 },
      { id: 'f2', name: 'Description', label: 'Description', type: 'longText', required: true, colSpan: 12, startCol: 1, rowIndex: 1 },
      { id: 'f3', name: 'Priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'], required: true, colSpan: 6, startCol: 1, rowIndex: 2 },
      { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['New', 'In Progress', 'Resolved'], required: true, colSpan: 6, startCol: 7, rowIndex: 2 }
    ]
  },
  { 
    id: 'invoicing', 
    name: 'Invoicing', 
    type: 'FINANCIAL',
    category: 'Finance', 
    icon: CreditCard, 
    description: 'Generate, send, and track invoices and payments.',
    enabled: true,
    layout: [
      { id: 'f1', name: 'Invoice Number', label: 'Invoice Number', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
      { id: 'f2', name: 'Client', label: 'Client', type: 'text', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
      { id: 'f3', name: 'Amount', label: 'Amount', type: 'number', required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
      { id: 'f4', name: 'Due Date', label: 'Due Date', type: 'date', required: true, colSpan: 6, startCol: 7, rowIndex: 1 },
      { id: 'f5', name: 'Status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Paid', 'Overdue'], required: true, colSpan: 12, startCol: 1, rowIndex: 2 }
    ]
  },
  { 
    id: 'assets', 
    name: 'Asset Register', 
    type: 'RECORD',
    category: 'Platform', 
    icon: Database, 
    description: 'Track physical and digital assets with maintenance history.',
    enabled: true,
    layout: [
      { id: 'f1', name: 'Asset Name', label: 'Asset Name', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
      { id: 'f2', name: 'Serial Number', label: 'Serial Number', type: 'text', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
      { id: 'f3', name: 'Purchase Date', label: 'Purchase Date', type: 'date', required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
      { id: 'f4', name: 'Value', label: 'Value', type: 'number', required: true, colSpan: 6, startCol: 7, rowIndex: 1 }
    ]
  },
  { 
    id: 'onboarding', 
    name: 'Onboarding', 
    type: 'WORK_ITEM',
    category: 'HR & People & Organisations', 
    icon: UserPlus, 
    description: 'Streamline employee and contractor onboarding flows.',
    enabled: true,
    layout: [
      { id: 'f1', name: 'Employee Name', label: 'Employee Name', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
      { id: 'f2', name: 'Role', label: 'Role', type: 'text', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
      { id: 'f3', name: 'Start Date', label: 'Start Date', type: 'date', required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
      { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed'], required: true, colSpan: 6, startCol: 7, rowIndex: 1 }
    ]
  },
  { 
    id: 'risk-register', 
    name: 'Risk Register', 
    type: 'RECORD',
    category: 'Risk & Compliance', 
    icon: ShieldCheck, 
    description: 'Identify, assess, and mitigate operational risks.',
    enabled: true,
    layout: [
      { id: 'f1', name: 'Risk Description', label: 'Risk Description', type: 'longText', required: true, colSpan: 12, startCol: 1, rowIndex: 0 },
      { id: 'f2', name: 'Impact', label: 'Impact', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
      { id: 'f3', name: 'Likelihood', label: 'Likelihood', type: 'select', options: ['Unlikely', 'Possible', 'Likely'], required: true, colSpan: 6, startCol: 7, rowIndex: 1 },
      { id: 'f4', name: 'Mitigation Plan', label: 'Mitigation Plan', type: 'longText', required: true, colSpan: 12, startCol: 1, rowIndex: 2 }
    ]
  },
  { 
    id: 'point-of-sale', 
    name: 'Point of Sale', 
    type: 'FINANCIAL',
    category: 'Platform', 
    icon: ShoppingCart, 
    description: 'Process retail transactions and manage till sessions.',
    enabled: true,
    layout: [
      { id: 'f1', name: 'Transaction ID', label: 'Transaction ID', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
      { id: 'f2', name: 'Amount', label: 'Amount', type: 'number', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
      { id: 'f3', name: 'Payment Method', label: 'Payment Method', type: 'select', options: ['Cash', 'Card', 'Other'], required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
      { id: 'f4', name: 'Timestamp', label: 'Timestamp', type: 'date', required: true, colSpan: 6, startCol: 7, rowIndex: 1 }
    ]
  },
  { 
    id: 'grants', 
    name: 'Grants Management', 
    type: 'WORK_ITEM',
    category: 'Intake & Requests', 
    icon: HeartHandshake, 
    description: 'End-to-end grant application and acquittal workflows.',
    enabled: true,
    layout: [
      { id: 'f1', name: 'Grant Name', label: 'Grant Name', type: 'text', required: true, colSpan: 12, startCol: 1, rowIndex: 0 },
      { id: 'f2', name: 'Applicant', label: 'Applicant', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
      { id: 'f3', name: 'Amount Requested', label: 'Amount Requested', type: 'number', required: true, colSpan: 6, startCol: 7, rowIndex: 1 },
      { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['Applied', 'Under Review', 'Approved', 'Declined'], required: true, colSpan: 12, startCol: 1, rowIndex: 2 }
    ]
  },
];

export const MODULE_CATEGORIES = [
  'CRM & People & Organisations',
  'Intake & Requests',
  'Finance',
  'Platform',
  'HR & People & Organisations',
  'Risk & Compliance',
  'Registry',
  'Custom'
];


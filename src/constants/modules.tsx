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
    category: 'CRM & People', 
    icon: Users, 
    description: 'Manage people and relationships across your organization.',
    fields: [
      { name: 'Full Name', type: 'string', required: true },
      { name: 'Email', type: 'string', required: true },
      { name: 'Company', type: 'string', required: false },
      { name: 'Status', type: 'select', options: ['Lead', 'Customer', 'Partner'], required: true }
    ]
  },
  { 
    id: 'service-requests', 
    name: 'Service Requests', 
    category: 'Intake & Requests', 
    icon: FileText, 
    description: 'Handle external requests with automated triage and routing.',
    fields: [
      { name: 'Subject', type: 'string', required: true },
      { name: 'Description', type: 'string', required: true },
      { name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'], required: true },
      { name: 'Status', type: 'select', options: ['New', 'In Progress', 'Resolved'], required: true }
    ]
  },
  { 
    id: 'invoicing', 
    name: 'Invoicing', 
    category: 'Finance', 
    icon: CreditCard, 
    description: 'Generate, send, and track invoices and payments.',
    fields: [
      { name: 'Invoice Number', type: 'string', required: true },
      { name: 'Client', type: 'string', required: true },
      { name: 'Amount', type: 'number', required: true },
      { name: 'Due Date', type: 'date', required: true },
      { name: 'Status', type: 'select', options: ['Draft', 'Sent', 'Paid', 'Overdue'], required: true }
    ]
  },
  { 
    id: 'assets', 
    name: 'Asset Register', 
    category: 'Operations', 
    icon: Database, 
    description: 'Track physical and digital assets with maintenance history.',
    fields: [
      { name: 'Asset Name', type: 'string', required: true },
      { name: 'Serial Number', type: 'string', required: true },
      { name: 'Purchase Date', type: 'date', required: true },
      { name: 'Value', type: 'number', required: true }
    ]
  },
  { 
    id: 'onboarding', 
    name: 'Onboarding', 
    category: 'HR & People', 
    icon: UserPlus, 
    description: 'Streamline employee and contractor onboarding flows.',
    fields: [
      { name: 'Employee Name', type: 'string', required: true },
      { name: 'Role', type: 'string', required: true },
      { name: 'Start Date', type: 'date', required: true },
      { name: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed'], required: true }
    ]
  },
  { 
    id: 'risk-register', 
    name: 'Risk Register', 
    category: 'Risk & Compliance', 
    icon: ShieldCheck, 
    description: 'Identify, assess, and mitigate operational risks.',
    fields: [
      { name: 'Risk Description', type: 'string', required: true },
      { name: 'Impact', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true },
      { name: 'Likelihood', type: 'select', options: ['Unlikely', 'Possible', 'Likely'], required: true },
      { name: 'Mitigation Plan', type: 'string', required: true }
    ]
  },
  { 
    id: 'point-of-sale', 
    name: 'Point of Sale', 
    category: 'Operations', 
    icon: ShoppingCart, 
    description: 'Process retail transactions and manage till sessions.',
    fields: [
      { name: 'Transaction ID', type: 'string', required: true },
      { name: 'Amount', type: 'number', required: true },
      { name: 'Payment Method', type: 'select', options: ['Cash', 'Card', 'Other'], required: true },
      { name: 'Timestamp', type: 'date', required: true }
    ]
  },
  { 
    id: 'grants', 
    name: 'Grants Management', 
    category: 'Intake & Requests', 
    icon: HeartHandshake, 
    description: 'End-to-end grant application and acquittal workflows.',
    fields: [
      { name: 'Grant Name', type: 'string', required: true },
      { name: 'Applicant', type: 'string', required: true },
      { name: 'Amount Requested', type: 'number', required: true },
      { name: 'Status', type: 'select', options: ['Applied', 'Under Review', 'Approved', 'Declined'], required: true }
    ]
  },
];

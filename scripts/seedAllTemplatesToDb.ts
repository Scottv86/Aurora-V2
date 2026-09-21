import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting Universal Template Catalog database seeding (100% complete seed)...');

  const templatesToSeed = [
    // ----------------------------------------------------
    // 1. DATA RECORD MODULES (9 Modules from modules.tsx)
    // ----------------------------------------------------
    {
      slug: 'mod-people_org',
      builderType: 'MODULE',
      name: 'People & Organisation',
      description: 'Manage people and relationships across your organization.',
      industry: 'Cross-Industry',
      category: 'Core',
      department: 'Operations',
      tags: ['crm', 'contacts', 'parties', 'people'],
      icon: 'Users',
      complexity: 'Beginner',
      payload: {
        id: 'people_org',
        type: 'RECORD',
        layout: [
          { id: 'f1', name: 'Full Name', label: 'Full Name', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Email', label: 'Email', type: 'text', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
          { id: 'f3', name: 'Company', label: 'Company', type: 'text', required: false, colSpan: 6, startCol: 1, rowIndex: 1 },
          { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['Lead', 'Customer', 'Partner'], required: true, colSpan: 6, startCol: 7, rowIndex: 1 }
        ]
      }
    },
    {
      slug: 'mod-service-requests',
      builderType: 'MODULE',
      name: 'Service Requests',
      description: 'Handle external requests with automated triage and routing.',
      industry: 'Cross-Industry',
      category: 'Intake & Requests',
      department: 'Customer Operations',
      tags: ['tickets', 'cases', 'service-desk', 'requests'],
      icon: 'FileText',
      complexity: 'Intermediate',
      payload: {
        id: 'service-requests',
        type: 'WORK_ITEM',
        layout: [
          { id: 'f1', name: 'Subject', label: 'Subject', type: 'text', required: true, colSpan: 12, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Description', label: 'Description', type: 'longText', required: true, colSpan: 12, startCol: 1, rowIndex: 1 },
          { id: 'f3', name: 'Priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'], required: true, colSpan: 6, startCol: 1, rowIndex: 2 },
          { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['New', 'In Progress', 'Resolved'], required: true, colSpan: 6, startCol: 7, rowIndex: 2 }
        ],
        dependencies: ['people_org']
      }
    },
    {
      slug: 'mod-invoicing',
      builderType: 'MODULE',
      name: 'Invoicing',
      description: 'Generate, send, and track invoices and payments.',
      industry: 'Financial Services & Fintech',
      category: 'Finance',
      department: 'Finance',
      tags: ['invoicing', 'finance', 'payments', 'billing'],
      icon: 'CreditCard',
      complexity: 'Intermediate',
      payload: {
        id: 'invoicing',
        type: 'FINANCIAL',
        layout: [
          { id: 'f1', name: 'Invoice Number', label: 'Invoice Number', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Client', label: 'Client', type: 'text', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
          { id: 'f3', name: 'Amount', label: 'Amount', type: 'number', required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
          { id: 'f4', name: 'Due Date', label: 'Due Date', type: 'date', required: true, colSpan: 6, startCol: 7, rowIndex: 1 },
          { id: 'f5', name: 'Status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Paid', 'Overdue'], required: true, colSpan: 12, startCol: 1, rowIndex: 2 }
        ],
        dependencies: ['people_org']
      }
    },
    {
      slug: 'mod-assets',
      builderType: 'MODULE',
      name: 'Asset Register',
      description: 'Track physical and digital assets with maintenance history.',
      industry: 'Cross-Industry',
      category: 'Platform',
      department: 'Facilities & IT',
      tags: ['assets', 'hardware', 'inventory', 'it'],
      icon: 'Database',
      complexity: 'Intermediate',
      payload: {
        id: 'assets',
        type: 'RECORD',
        layout: [
          { id: 'f1', name: 'Asset Name', label: 'Asset Name', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Serial Number', label: 'Serial Number', type: 'text', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
          { id: 'f3', name: 'Purchase Date', label: 'Purchase Date', type: 'date', required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
          { id: 'f4', name: 'Value', label: 'Value', type: 'number', required: true, colSpan: 6, startCol: 7, rowIndex: 1 }
        ]
      }
    },
    {
      slug: 'mod-onboarding',
      builderType: 'MODULE',
      name: 'Onboarding',
      description: 'Streamline employee and contractor onboarding flows.',
      industry: 'Human Resources & Talent',
      category: 'HR & People & Organisations',
      department: 'Human Resources',
      tags: ['hr', 'onboarding', 'staff', 'employees'],
      icon: 'Users',
      complexity: 'Intermediate',
      payload: {
        id: 'onboarding',
        type: 'WORK_ITEM',
        layout: [
          { id: 'f1', name: 'Employee Name', label: 'Employee Name', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Role', label: 'Role', type: 'text', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
          { id: 'f3', name: 'Start Date', label: 'Start Date', type: 'date', required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
          { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed'], required: true, colSpan: 6, startCol: 7, rowIndex: 1 }
        ],
        dependencies: ['people_org']
      }
    },
    {
      slug: 'mod-risk-register',
      builderType: 'MODULE',
      name: 'Risk Register',
      description: 'Identify, assess, and mitigate operational risks.',
      industry: 'Legal & Compliance',
      category: 'Risk & Compliance',
      department: 'Governance & Risk',
      tags: ['risk', 'compliance', 'audit', 'mitigation'],
      icon: 'ShieldCheck',
      complexity: 'Advanced',
      payload: {
        id: 'risk-register',
        type: 'RECORD',
        layout: [
          { id: 'f1', name: 'Risk Description', label: 'Risk Description', type: 'longText', required: true, colSpan: 12, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Impact', label: 'Impact', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
          { id: 'f3', name: 'Likelihood', label: 'Likelihood', type: 'select', options: ['Unlikely', 'Possible', 'Likely'], required: true, colSpan: 6, startCol: 7, rowIndex: 1 },
          { id: 'f4', name: 'Mitigation Plan', label: 'Mitigation Plan', type: 'longText', required: true, colSpan: 12, startCol: 1, rowIndex: 2 }
        ]
      }
    },
    {
      slug: 'mod-point-of-sale',
      builderType: 'MODULE',
      name: 'Point of Sale',
      description: 'Process retail transactions and manage till sessions.',
      industry: 'E-Commerce & Retail',
      category: 'Platform',
      department: 'Retail Ops',
      tags: ['pos', 'sales', 'retail', 'transactions'],
      icon: 'ShoppingCart',
      complexity: 'Beginner',
      payload: {
        id: 'point-of-sale',
        type: 'FINANCIAL',
        layout: [
          { id: 'f1', name: 'Transaction ID', label: 'Transaction ID', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Amount', label: 'Amount', type: 'number', required: true, colSpan: 6, startCol: 7, rowIndex: 0 },
          { id: 'f3', name: 'Payment Method', label: 'Payment Method', type: 'select', options: ['Cash', 'Card', 'Other'], required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
          { id: 'f4', name: 'Timestamp', label: 'Timestamp', type: 'date', required: true, colSpan: 6, startCol: 7, rowIndex: 1 }
        ]
      }
    },
    {
      slug: 'mod-grants',
      builderType: 'MODULE',
      name: 'Grants Management',
      description: 'End-to-end grant application and acquittal workflows.',
      industry: 'Non-Profit & Public Sector',
      category: 'Intake & Requests',
      department: 'Programs & Grants',
      tags: ['grants', 'funding', 'non-profit', 'applications'],
      icon: 'HeartHandshake',
      complexity: 'Advanced',
      payload: {
        id: 'grants',
        type: 'WORK_ITEM',
        layout: [
          { id: 'f1', name: 'Grant Name', label: 'Grant Name', type: 'text', required: true, colSpan: 12, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Applicant', label: 'Applicant', type: 'text', required: true, colSpan: 6, startCol: 1, rowIndex: 1 },
          { id: 'f3', name: 'Amount Requested', label: 'Amount Requested', type: 'number', required: true, colSpan: 6, startCol: 7, rowIndex: 1 },
          { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['Applied', 'Under Review', 'Approved', 'Declined'], required: true, colSpan: 12, startCol: 1, rowIndex: 2 }
        ],
        dependencies: ['people_org']
      }
    },
    {
      slug: 'mod-test-case-management',
      builderType: 'MODULE',
      name: 'Test Case Management',
      description: 'Track and organize manual and automated test cases, step-by-step procedures, and execution priorities.',
      industry: 'SaaS & Technology',
      category: 'Platform',
      department: 'Engineering & QA',
      tags: ['qa', 'testing', 'engineering', 'bugs'],
      icon: 'TestTube',
      complexity: 'Intermediate',
      payload: {
        id: 'test-case-management',
        type: 'RECORD',
        layout: [
          { id: 'f1', name: 'Test Case Name', label: 'Test Case Name', type: 'text', required: true, colSpan: 12, startCol: 1, rowIndex: 0 },
          { id: 'f2', name: 'Preconditions & Steps', label: 'Preconditions & Steps', type: 'longText', required: false, colSpan: 12, startCol: 1, rowIndex: 1 },
          { id: 'f3', name: 'Test Type', label: 'Test Type', type: 'select', options: ['Manual', 'Automated', 'Performance', 'Security'], required: true, colSpan: 4, startCol: 1, rowIndex: 2 },
          { id: 'f4', name: 'Status', label: 'Status', type: 'select', options: ['Draft', 'Active', 'Deprecated', 'Broken'], required: true, colSpan: 4, startCol: 5, rowIndex: 2 },
          { id: 'f5', name: 'Priority', label: 'Priority', type: 'select', options: ['P0 - Blocker', 'P1 - High', 'P2 - Medium', 'P3 - Low'], required: true, colSpan: 4, startCol: 9, rowIndex: 2 }
        ]
      }
    },

    // ----------------------------------------------------
    // 2. FORMS (6 Forms from NewFormModal.tsx)
    // ----------------------------------------------------
    {
      slug: 'form-contact-inquiry',
      builderType: 'FORM',
      name: 'Standard Contact & Inquiry Form',
      description: 'Clean public intake form for inquiries, leads, and visitor communication.',
      industry: 'Cross-Industry',
      category: 'General & Public',
      department: 'Customer Operations',
      tags: ['contact', 'inquiry', 'public', 'leads'],
      icon: 'Mail',
      complexity: 'Beginner',
      payload: {
        layout: [
          { id: 'name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
          { id: 'email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
          { id: 'subject', label: 'Inquiry Subject', type: 'text', required: true, colSpan: 12 },
          { id: 'message', label: 'Message Body', type: 'textarea', required: true, colSpan: 12 }
        ]
      }
    },
    {
      slug: 'form-support-ticket-intake',
      builderType: 'FORM',
      name: 'Customer Support Ticket Intake',
      description: 'Priority support request form with severity and issue classification.',
      industry: 'Cross-Industry',
      category: 'Support & Helpdesk',
      department: 'Customer Operations',
      tags: ['support', 'ticket', 'helpdesk', 'sla'],
      icon: 'HelpCircle',
      complexity: 'Beginner',
      payload: {
        layout: [
          { id: 'user_email', label: 'Requester Email', type: 'email', required: true, colSpan: 6 },
          { id: 'category', label: 'Issue Category', type: 'select', options: ['Billing', 'Bug Report', 'Feature Request', 'Account Access', 'Other'], required: true, colSpan: 6 },
          { id: 'priority', label: 'Severity Level', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], required: true, colSpan: 6 },
          { id: 'subject', label: 'Summary', type: 'text', required: true, colSpan: 6 },
          { id: 'issue', label: 'Detailed Description', type: 'textarea', required: true, colSpan: 12 }
        ]
      }
    },
    {
      slug: 'form-client-onboarding',
      builderType: 'FORM',
      name: 'Client Onboarding & Registration',
      description: 'Intake form for customer onboarding, account setup, and client profile data.',
      industry: 'Professional Services',
      category: 'Operations & Accounts',
      department: 'Operations',
      tags: ['onboarding', 'client', 'registration', 'b2b'],
      icon: 'UserCheck',
      complexity: 'Intermediate',
      payload: {
        layout: [
          { id: 'company_name', label: 'Company / Organization Name', type: 'text', required: true, colSpan: 6 },
          { id: 'contact_name', label: 'Primary Contact Person', type: 'text', required: true, colSpan: 6 },
          { id: 'work_email', label: 'Business Email', type: 'email', required: true, colSpan: 6 },
          { id: 'phone', label: 'Phone Number', type: 'text', required: false, colSpan: 6 },
          { id: 'industry', label: 'Industry Vertical', type: 'select', options: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Other'], required: true, colSpan: 6 },
          { id: 'target_date', label: 'Target Launch Date', type: 'date', required: false, colSpan: 6 }
        ]
      }
    },
    {
      slug: 'form-feedback-survey',
      builderType: 'FORM',
      name: 'Customer Satisfaction & Feedback Survey',
      description: 'Collect ratings, user feedback, and NPS sentiment from users.',
      industry: 'Cross-Industry',
      category: 'Customer Success',
      department: 'Customer Operations',
      tags: ['feedback', 'nps', 'survey', 'satisfaction'],
      icon: 'Star',
      complexity: 'Beginner',
      payload: {
        layout: [
          { id: 'cust_name', label: 'Customer / User Name', type: 'text', required: false, colSpan: 6 },
          { id: 'rating', label: 'Overall Rating', type: 'select', options: ['5 - Excellent', '4 - Good', '3 - Neutral', '2 - Poor', '1 - Very Poor'], required: true, colSpan: 6 },
          { id: 'highlights', label: 'What did you like most?', type: 'textarea', required: false, colSpan: 12 },
          { id: 'improvements', label: 'What can we improve?', type: 'textarea', required: false, colSpan: 12 }
        ]
      }
    },
    {
      slug: 'form-event-registration',
      builderType: 'FORM',
      name: 'Event Registration & RSVP',
      description: 'Attendee registration form for webinars, conferences, or workshops.',
      industry: 'Cross-Industry',
      category: 'Events & Marketing',
      department: 'Marketing',
      tags: ['event', 'rsvp', 'webinar', 'conference'],
      icon: 'Calendar',
      complexity: 'Beginner',
      payload: {
        layout: [
          { id: 'attendee_name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
          { id: 'attendee_email', label: 'Work Email', type: 'email', required: true, colSpan: 6 },
          { id: 'attendee_role', label: 'Job Title & Organization', type: 'text', required: false, colSpan: 12 },
          { id: 'session_track', label: 'Preferred Track', type: 'select', options: ['Keynote & Strategy', 'Technical & Architecture', 'Design & UX'], required: true, colSpan: 6 },
          { id: 'dietary', label: 'Dietary / Special Needs', type: 'text', required: false, colSpan: 6 }
        ]
      }
    },
    {
      slug: 'form-job-application',
      builderType: 'FORM',
      name: 'Job Application & Talent Intake',
      description: 'Intake form for candidate applications and talent pipelines.',
      industry: 'Human Resources & Talent',
      category: 'HR & Recruitment',
      department: 'Human Resources',
      tags: ['job', 'application', 'candidate', 'recruiting'],
      icon: 'Briefcase',
      complexity: 'Intermediate',
      payload: {
        layout: [
          { id: 'applicant_name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
          { id: 'applicant_email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
          { id: 'phone', label: 'Phone Number', type: 'text', required: true, colSpan: 6 },
          { id: 'position', label: 'Position Applied For', type: 'text', required: true, colSpan: 6 },
          { id: 'portfolio', label: 'Portfolio / LinkedIn URL', type: 'text', required: false, colSpan: 12 },
          { id: 'cover_letter', label: 'Cover Letter / Bio', type: 'textarea', required: false, colSpan: 12 }
        ]
      }
    },

    // ----------------------------------------------------
    // 3. AGENT BLUEPRINTS (3 Agents from NewAgentModal.tsx)
    // ----------------------------------------------------
    {
      slug: 'agent-invoice-dispute-specialist',
      builderType: 'AGENT',
      name: 'Invoice & Dispute Specialist',
      description: 'Inspects payment histories, reconciles transaction discrepancies in Stripe, and drafts resolution proposals.',
      industry: 'Financial Services & Fintech',
      category: 'Financial Triage & Disputes Analyst',
      department: 'Finance Squad',
      tags: ['dispute', 'stripe', 'finance', 'refunds'],
      icon: 'Bot',
      complexity: 'Advanced',
      payload: {
        roleTitle: 'Financial Triage & Disputes Analyst',
        status: 'ACTIVE',
        version: 'v1.0.0',
        modelConfig: {
          model: 'gemini-2.5-flash',
          temperature: 0.15,
          topP: 0.95,
          maxOutputTokens: 2048,
          systemPersona: 'Financial auditor with strict adherence to payment terms and accuracy.'
        },
        systemInstructions: `You are an autonomous Financial Dispute Specialist in Aurora.
Duties:
1. Inspect invoice records and transaction status via Stripe and the Platform DB.
2. Cross-reference customer billing claims against actual transaction logs.
3. If refund amount > $500, flag for Human Supervisor sign-off.
4. Provide clear breakdown of disputed line items and resolution recommendations.`,
        guardrails: {
          confidenceThreshold: 0.90,
          requireHumanApproval: true,
          approvalThresholdAmount: 500,
          sensitiveDataFilter: true
        }
      }
    },
    {
      slug: 'agent-support-copilot',
      builderType: 'AGENT',
      name: 'Customer Intake & Support Copilot',
      description: 'Triage customer inquiries, categorize urgency, summarize technical issues, and route to specialized teams.',
      industry: 'Cross-Industry',
      category: 'Tier-1 Support & Routing Specialist',
      department: 'Support Squad',
      tags: ['support', 'triage', 'routing', 'sla'],
      icon: 'Bot',
      complexity: 'Intermediate',
      payload: {
        roleTitle: 'Tier-1 Support & Routing Specialist',
        status: 'ACTIVE',
        version: 'v1.0.0',
        modelConfig: {
          model: 'gemini-2.5-flash',
          temperature: 0.3,
          systemPersona: 'Empathetic, structured, prompt, and solutions-oriented.'
        },
        systemInstructions: `You are the Aurora Customer Intake & Support Copilot.
Duties:
1. Analyze user bug reports, feature requests, and account inquiries.
2. Categorize urgency (P1 Critical, P2 High, P3 Normal).
3. Search knowledge base for existing solutions before escalating.
4. Notify assigned operational teams via Slack.`,
        guardrails: {
          confidenceThreshold: 0.80,
          requireHumanApproval: false
        }
      }
    },
    {
      slug: 'agent-compliance-auditor',
      builderType: 'AGENT',
      name: 'Compliance & SOP Auditor',
      description: 'Audits records against ISO/HIPAA regulations and corporate standard operating procedures.',
      industry: 'Legal & Compliance',
      category: 'Regulatory Compliance Inspector',
      department: 'Legal & Risk',
      tags: ['compliance', 'audit', 'iso', 'hipaa', 'sop'],
      icon: 'Shield',
      complexity: 'Enterprise',
      payload: {
        roleTitle: 'Regulatory Compliance Inspector',
        status: 'ACTIVE',
        version: 'v1.0.0',
        modelConfig: {
          model: 'gemini-2.5-pro',
          temperature: 0.1,
          systemPersona: 'Rigorous compliance officer with zero tolerance for policy gaps.'
        },
        systemInstructions: `You are an autonomous Compliance & SOP Auditor.
Duties:
1. Evaluate platform records against company SOPs and regulatory frameworks.
2. Identify missing mandatory fields, expired certifications, and unauthorized data disclosures.
3. Generate structured audit finding logs.`,
        guardrails: {
          confidenceThreshold: 0.95,
          requireHumanApproval: true,
          readOnlyMode: true
        }
      }
    },

    // ----------------------------------------------------
    // 4. BRAND KITS (5 Brands from NewBrandModal.tsx)
    // ----------------------------------------------------
    {
      slug: 'brand-aurora-indigo',
      builderType: 'BRAND',
      name: 'Aurora Indigo Enterprise',
      description: 'Sophisticated modern indigo and sky blue palette designed for B2B SaaS, developer platforms, and cloud infrastructure.',
      industry: 'SaaS & Technology',
      category: 'Technology & Cloud',
      department: 'Marketing & Design',
      tags: ['brand', 'indigo', 'modern', 'enterprise'],
      icon: 'Palette',
      complexity: 'Beginner',
      payload: {
        colors: {
          primary: '#4f46e5',
          secondary: '#0ea5e9',
          accent: '#6366f1',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#0f172a',
          muted: '#64748b',
          border: '#e2e8f0',
          chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
        },
        typography: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', monoFont: 'JetBrains Mono', fontSizeScale: 'medium' },
        styling: { borderRadius: '12px', buttonStyle: 'rounded', elevation: 'subtle' },
        voiceAndTone: { tone: 'Professional & Authoritative', tagline: 'Modern Platform Excellence', boilerplate: 'Delivering unified enterprise-grade collaborative workflows.' }
      }
    },
    {
      slug: 'brand-emerald-health',
      builderType: 'BRAND',
      name: 'Emerald Health & Bio',
      description: 'Calming organic forest green and cyan palette suited for health clinics, wellness platforms, and biological research.',
      industry: 'Healthcare & Life Sciences',
      category: 'Healthcare & Life Sciences',
      department: 'Marketing & Design',
      tags: ['brand', 'health', 'green', 'bio', 'wellness'],
      icon: 'Palette',
      complexity: 'Beginner',
      payload: {
        colors: {
          primary: '#059669',
          secondary: '#0284c7',
          accent: '#10b981',
          background: '#ffffff',
          surface: '#f0fdfa',
          text: '#134e4a',
          muted: '#5eead4',
          border: '#ccfbf1',
          chartPalette: ['#059669', '#10b981', '#0284c7', '#38bdf8', '#f59e0b', '#8b5cf6']
        },
        typography: { headingFont: 'Outfit', bodyFont: 'Inter', monoFont: 'JetBrains Mono', fontSizeScale: 'medium' },
        styling: { borderRadius: '16px', buttonStyle: 'pill', elevation: 'subtle' },
        voiceAndTone: { tone: 'Empathetic, Precise & Reassuring', tagline: 'Compassionate Care, Elevated Technology', boilerplate: 'Transforming healthcare delivery through secure patient-centered platforms.' }
      }
    },
    {
      slug: 'brand-cyber-neon',
      builderType: 'BRAND',
      name: 'Cyberpunk Neon AI',
      description: 'High-contrast vibrant hot pink and tangerine accents with deep obsidian dark backgrounds for cutting-edge creative tools.',
      industry: 'SaaS & Technology',
      category: 'Gaming & Next-Gen AI',
      department: 'Marketing & Design',
      tags: ['brand', 'cyberpunk', 'neon', 'dark', 'ai'],
      icon: 'Palette',
      complexity: 'Intermediate',
      payload: {
        colors: {
          primary: '#db2777',
          secondary: '#f97316',
          accent: '#ec4899',
          background: '#09090b',
          surface: '#18181b',
          text: '#fafafa',
          muted: '#a1a1aa',
          border: '#27272a',
          chartPalette: ['#db2777', '#f97316', '#eab308', '#6366f1', '#06b6d4', '#10b981']
        },
        typography: { headingFont: 'Space Grotesk', bodyFont: 'Inter', monoFont: 'JetBrains Mono', fontSizeScale: 'medium' },
        styling: { borderRadius: '8px', buttonStyle: 'square', elevation: 'elevated' },
        voiceAndTone: { tone: 'Bold, Disruptive & Visionary', tagline: 'Built for What Comes Next', boilerplate: 'Unleashing synthetic intelligence and generative creative tooling.' }
      }
    },
    {
      slug: 'brand-nordic-slate',
      builderType: 'BRAND',
      name: 'Nordic Slate Minimal',
      description: 'Restrained, ultra-clean monochrome slate palette with royal blue precision accents for wealth management and advisory.',
      industry: 'Financial Services & Fintech',
      category: 'Finance & Legal',
      department: 'Marketing & Design',
      tags: ['brand', 'minimal', 'slate', 'finance', 'legal'],
      icon: 'Palette',
      complexity: 'Beginner',
      payload: {
        colors: {
          primary: '#0f172a',
          secondary: '#475569',
          accent: '#3b82f6',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#0f172a',
          muted: '#64748b',
          border: '#e2e8f0',
          chartPalette: ['#0f172a', '#3b82f6', '#0284c7', '#64748b', '#10b981', '#f59e0b']
        },
        typography: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', monoFont: 'JetBrains Mono', fontSizeScale: 'medium' },
        styling: { borderRadius: '8px', buttonStyle: 'rounded', elevation: 'flat' },
        voiceAndTone: { tone: 'Discreet, Rigorous & Direct', tagline: 'Precision Wealth & Advisory Systems', boilerplate: 'Safeguarding assets and accelerating institutional compliance workflows.' }
      }
    },
    {
      slug: 'brand-royal-violet',
      builderType: 'BRAND',
      name: 'Royal Violet Studio',
      description: 'Elevated purple and magenta gradients crafted for design studios, marketing agencies, and creative content hubs.',
      industry: 'Cross-Industry',
      category: 'Creative Agency & Media',
      department: 'Marketing & Design',
      tags: ['brand', 'violet', 'creative', 'agency', 'studio'],
      icon: 'Palette',
      complexity: 'Beginner',
      payload: {
        colors: {
          primary: '#7c3aed',
          secondary: '#ec4899',
          accent: '#8b5cf6',
          background: '#ffffff',
          surface: '#faf5ff',
          text: '#581c87',
          muted: '#a855f7',
          border: '#f3e8ff',
          chartPalette: ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4']
        },
        typography: { headingFont: 'Outfit', bodyFont: 'Plus Jakarta Sans', monoFont: 'JetBrains Mono', fontSizeScale: 'medium' },
        styling: { borderRadius: '16px', buttonStyle: 'rounded', elevation: 'elevated' },
        voiceAndTone: { tone: 'Inspiring, Articulate & Expressive', tagline: 'Where Imagination Meets Scale', boilerplate: 'Transforming brand storytelling and digital multi-channel engagement.' }
      }
    },

    // ----------------------------------------------------
    // 5. SITES & PORTALS (4 Sites from NewSiteModal.tsx)
    // ----------------------------------------------------
    {
      slug: 'site-corporate-intranet',
      builderType: 'SITE',
      name: 'Corporate Intranet Hub',
      description: 'Central organizational hub for corporate announcements, company policies, employee directory, and intake forms.',
      industry: 'Cross-Industry',
      category: 'internal',
      department: 'Internal Communications',
      tags: ['intranet', 'portal', 'announcements', 'directory'],
      icon: 'Network',
      complexity: 'Intermediate',
      payload: {
        type: 'Intranet Hub',
        pages: [
          {
            id: 'p-home',
            title: 'Home',
            slug: '/',
            isHome: true,
            widgets: [
              { id: 'w-1', type: 'hero', enabled: true, title: 'Welcome to Corporate Intranet', subtitle: 'Central company news, resources, and triage.' },
              { id: 'w-2', type: 'announcements', enabled: true, title: 'Company Bulletins & Updates' }
            ]
          },
          {
            id: 'p-services',
            title: 'Services & Knowledge',
            slug: '/services',
            isHome: false,
            widgets: [{ id: 'w-3', type: 'kb_search', enabled: true, title: 'Search Organizational Knowledge Base' }]
          },
          {
            id: 'p-contact',
            title: 'Support & Contact',
            slug: '/contact',
            isHome: false,
            widgets: [{ id: 'w-4', type: 'ticket_form', enabled: true, title: 'Submit Support Ticket' }]
          }
        ]
      }
    },
    {
      slug: 'site-client-support-portal',
      builderType: 'SITE',
      name: 'Client Support & Ticket Portal',
      description: 'External customer portal with ticket submission, live chat assistant, knowledge base search, and SLA health monitor.',
      industry: 'Cross-Industry',
      category: 'external',
      department: 'Customer Support',
      tags: ['portal', 'support', 'helpdesk', 'external', 'tickets'],
      icon: 'Headphones',
      complexity: 'Intermediate',
      payload: {
        type: 'Customer Portal',
        pages: [
          {
            id: 'p-support-home',
            title: 'Support Center',
            slug: '/',
            isHome: true,
            widgets: [
              { id: 'w-s1', type: 'hero', enabled: true, title: 'Customer Support Portal', subtitle: 'How can we help your team today?' },
              { id: 'w-s2', type: 'kb_search', enabled: true, title: 'Search Knowledge Base' },
              { id: 'w-s3', type: 'status_widget', enabled: true, title: 'Live Service Status' }
            ]
          },
          {
            id: 'p-new-ticket',
            title: 'Submit Ticket',
            slug: '/submit-ticket',
            isHome: false,
            widgets: [{ id: 'w-s4', type: 'ticket_form', enabled: true, title: 'Customer Support Ticket Intake' }]
          },
          {
            id: 'p-status',
            title: 'System Uptime Status',
            slug: '/status',
            isHome: false,
            widgets: [{ id: 'w-s5', type: 'status_widget', enabled: true, title: 'Real-time Infrastructure Status' }]
          }
        ]
      }
    },
    {
      slug: 'site-engineering-kb',
      builderType: 'SITE',
      name: 'Engineering Knowledge Base',
      description: 'Technical documentation, architecture decision records (ADRs), API guidelines, and developer onboarding materials.',
      industry: 'SaaS & Technology',
      category: 'internal',
      department: 'Engineering',
      tags: ['kb', 'docs', 'developer', 'api', 'architecture'],
      icon: 'BookOpen',
      complexity: 'Intermediate',
      payload: {
        type: 'Knowledge Base',
        pages: [
          {
            id: 'p-eng-home',
            title: 'Developer Portal',
            slug: '/',
            isHome: true,
            widgets: [
              { id: 'w-k1', type: 'hero', enabled: true, title: 'Engineering Knowledge Base', subtitle: 'Architecture specs, API references, and developer guidelines.' },
              { id: 'w-k2', type: 'kb_search', enabled: true, title: 'Search Technical Docs' }
            ]
          },
          {
            id: 'p-api-docs',
            title: 'API Specifications',
            slug: '/api-docs',
            isHome: false,
            widgets: [{ id: 'w-k3', type: 'hero', enabled: true, title: 'API & Webhooks Specifications', subtitle: 'Authentication tokens, rate limits, and payload schemas.' }]
          },
          {
            id: 'p-status',
            title: 'Health & Latency',
            slug: '/system-health',
            isHome: false,
            widgets: [{ id: 'w-k4', type: 'status_widget', enabled: true, title: 'API Latency & Uptime' }]
          }
        ]
      }
    },
    {
      slug: 'site-product-landing',
      builderType: 'SITE',
      name: 'Product Launch Landing Page',
      description: 'High-impact marketing microsite for capturing customer pre-registrations, product feature highlights, and email signups.',
      industry: 'Cross-Industry',
      category: 'public',
      department: 'Marketing',
      tags: ['landing', 'marketing', 'product', 'public'],
      icon: 'Globe',
      complexity: 'Beginner',
      payload: {
        type: 'Landing Page',
        pages: [
          {
            id: 'p-land-home',
            title: 'Product Showcase',
            slug: '/',
            isHome: true,
            widgets: [
              { id: 'w-l1', type: 'hero', enabled: true, title: 'Next-Generation Aurora Platform', subtitle: 'Empower your enterprise with autonomous workflow execution.' },
              { id: 'w-l2', type: 'announcements', enabled: true, title: 'Release Notes & Product Updates' }
            ]
          },
          {
            id: 'p-signup',
            title: 'Request Early Access',
            slug: '/access',
            isHome: false,
            widgets: [{ id: 'w-l3', type: 'ticket_form', enabled: true, title: 'Join the Early Adopter Preview' }]
          }
        ]
      }
    },

    // ----------------------------------------------------
    // 6. REPORTS (4 Reports from ReportManagementSettings.tsx)
    // ----------------------------------------------------
    {
      slug: 'report-case-backlog-sla',
      builderType: 'REPORT',
      name: 'Case Backlog & SLA Performance',
      description: 'Visualise active case distributions, resolution times, and current backlog status.',
      industry: 'Cross-Industry',
      category: 'Operations & SLAs',
      department: 'Customer Operations',
      tags: ['report', 'sla', 'cases', 'kpi'],
      icon: 'BarChart2',
      complexity: 'Intermediate',
      payload: {
        dataSource: { type: 'local', tables: ['records'] },
        widgets: [
          { id: 'widget-1', type: 'kpi', title: 'Total Active Cases', w: 4, properties: { xAxisKey: 'status', yAxisKey: 'id', aggregate: 'count', color: '#6366f1' } },
          { id: 'widget-2', type: 'bar', title: 'Cases by Status', w: 8, properties: { xAxisKey: 'status', yAxisKey: 'id', aggregate: 'count', color: '#6366f1' } },
          { id: 'widget-3', type: 'table', title: 'Recent Cases Log', w: 12, properties: { xAxisKey: 'module_id', yAxisKey: 'status', aggregate: 'count', color: '#8b5cf6' } }
        ]
      }
    },
    {
      slug: 'report-workforce-allocation',
      builderType: 'REPORT',
      name: 'Workforce Allocation & Teams',
      description: 'Overview of team sizes, role distributions, and staff license status.',
      industry: 'Human Resources & Talent',
      category: 'Workforce & HR',
      department: 'Operations',
      tags: ['report', 'workforce', 'teams', 'hr'],
      icon: 'PieChart',
      complexity: 'Beginner',
      payload: {
        dataSource: { type: 'local', tables: ['tenant_members'] },
        widgets: [
          { id: 'widget-wf-1', type: 'kpi', title: 'Total Active Staff', w: 4, properties: { xAxisKey: 'status', yAxisKey: 'id', aggregate: 'count', color: '#10b981' } },
          { id: 'widget-wf-2', type: 'pie', title: 'Staff by Role ID', w: 8, properties: { xAxisKey: 'role_id', yAxisKey: 'id', aggregate: 'count', color: '#3b82f6' } }
        ]
      }
    },
    {
      slug: 'report-automation-audit',
      builderType: 'REPORT',
      name: 'Workflow Automation Audit',
      description: 'Audit log summary of automated rules, triggers, and runs performance.',
      industry: 'Cross-Industry',
      category: 'System Performance',
      department: 'Engineering',
      tags: ['report', 'automations', 'workflows', 'audit'],
      icon: 'Zap',
      complexity: 'Intermediate',
      payload: {
        dataSource: { type: 'local', tables: ['automations', 'automation_runs'] },
        widgets: [
          { id: 'widget-auto-1', type: 'kpi', title: 'Configured Automations', w: 4, properties: { xAxisKey: 'enabled', yAxisKey: 'id', aggregate: 'count', color: '#f59e0b' } },
          { id: 'widget-auto-2', type: 'area', title: 'Automation Success Rate', w: 8, properties: { xAxisKey: 'status', yAxisKey: 'id', aggregate: 'count', color: '#8b5cf6' } }
        ]
      }
    },
    {
      slug: 'report-salesforce-pipeline',
      builderType: 'REPORT',
      name: 'Salesforce Connector pipeline',
      description: 'Simulated dashboard connected to Salesforce external records leads pipeline.',
      industry: 'Financial Services & Fintech',
      category: 'Revenue & Sales',
      department: 'Sales',
      tags: ['report', 'salesforce', 'pipeline', 'sales', 'leads'],
      icon: 'TrendingUp',
      complexity: 'Advanced',
      payload: {
        dataSource: { type: 'external', connectorId: 'salesforce', tables: ['leads'] },
        widgets: [
          { id: 'widget-ext-1', type: 'kpi', title: 'Total Pipelines Deal Size', w: 4, properties: { xAxisKey: 'status', yAxisKey: 'value', aggregate: 'sum', color: '#10b981' } },
          { id: 'widget-ext-2', type: 'bar', title: 'Deals by Lead Source', w: 8, properties: { xAxisKey: 'source', yAxisKey: 'value', aggregate: 'sum', color: '#3b82f6' } }
        ]
      }
    },

    // ----------------------------------------------------
    // 7. DOCUMENT TEMPLATES (4 Docs from documentService.ts)
    // ----------------------------------------------------
    {
      slug: 'doc-standard-nda',
      builderType: 'DOCUMENT',
      name: 'Standard Non-Disclosure Agreement',
      description: 'Mutual non-disclosure and confidentiality agreement for contractors and partners.',
      industry: 'Legal & Compliance',
      category: 'Contracts & Legal',
      department: 'Legal',
      tags: ['nda', 'contract', 'legal', 'confidentiality'],
      icon: 'FileText',
      complexity: 'Intermediate',
      payload: {
        type: 'letter',
        metadata: { paperSize: 'A4', orientation: 'portrait', showLetterhead: true },
        content: `<h2>MUTUAL NON-DISCLOSURE AGREEMENT</h2>
<p>This Agreement is made effective as of <strong>{{createdAt}}</strong>, between <strong>{{tenant_name}}</strong> ("Disclosing Party") and <strong>{{recipient_name}}</strong> ("Receiving Party").</p>
<hr />
<h3>1. Purpose</h3>
<p>The parties wish to explore a business opportunity concerning {{project_title}} and will exchange confidential proprietary information.</p>
<h3>2. Confidential Information</h3>
<p>All information marked as Confidential or proprietary shall remain protected for a period of two (2) years.</p>`
      }
    },
    {
      slug: 'doc-client-onboarding-welcome',
      builderType: 'DOCUMENT',
      name: 'Client Onboarding Welcome Sequence',
      description: 'Automated transactional email sent when a new customer or account is activated.',
      industry: 'Cross-Industry',
      category: 'Email & Notifications',
      department: 'Customer Operations',
      tags: ['email', 'welcome', 'onboarding', 'activation'],
      icon: 'Mail',
      complexity: 'Beginner',
      payload: {
        type: 'email',
        metadata: { subject: 'Welcome aboard, {{name}}! Getting started with your account', senderName: 'Aurora Customer Success', replyTo: 'support@aurora.io' },
        content: `<h1>Welcome to {{tenant_name}}!</h1><p>Your workspace access for <strong>{{account_name}}</strong> is now active. You can now access your customized modules, view queues, and collaborate with your team.</p>`
      }
    },
    {
      slug: 'doc-service-announcement',
      builderType: 'DOCUMENT',
      name: 'Citizen Portal Service Notice',
      description: 'Reusable portal layout snippet for scheduled maintenance notices and updates.',
      industry: 'Cross-Industry',
      category: 'Announcements & Notices',
      department: 'Operations',
      tags: ['notice', 'portal', 'maintenance', 'announcement'],
      icon: 'FileText',
      complexity: 'Beginner',
      payload: {
        type: 'page',
        metadata: { slug: 'scheduled-maintenance-notice', containerWidth: 'contained', seoTitle: 'Service Schedule Notice' },
        content: `<h2>📢 Important Service Announcement</h2><p>Please be advised that automated document processing will undergo scheduled optimization this weekend.</p>`
      }
    },
    {
      slug: 'doc-appointment-reminder',
      builderType: 'DOCUMENT',
      name: 'SMS Appointment Confirmation',
      description: 'Short transactional SMS notification dispatched 24 hours prior to scheduled booking.',
      industry: 'Healthcare & Life Sciences',
      category: 'SMS & Messaging',
      department: 'Operations',
      tags: ['sms', 'appointment', 'reminder', 'scheduling'],
      icon: 'MessageSquare',
      complexity: 'Beginner',
      payload: {
        type: 'message',
        metadata: { channel: 'sms', maxChars: 160 },
        content: `Hi {{first_name}}, this is a reminder of your appointment on {{appointment_date}} at {{appointment_time}} with {{provider_name}}. Reply YES to confirm or call {{contact_phone}} to reschedule.`
      }
    },

    // ----------------------------------------------------
    // 8. INDUSTRY BLUEPRINTS (2 Blueprints from blueprints.ts)
    // ----------------------------------------------------
    {
      slug: 'bp-real-estate-portfolio',
      builderType: 'SOLUTION',
      name: 'Real Estate Portfolio Blueprint',
      description: 'A complete ecosystem for managing property portfolios, leases, and maintenance workflows.',
      industry: 'Real Estate & Property',
      category: 'Real Estate',
      department: 'Asset Management',
      tags: ['real-estate', 'properties', 'maintenance', 'leases'],
      icon: 'Building',
      complexity: 'Advanced',
      payload: {
        modulesCount: 3,
        workflowsCount: 1,
        formsCount: 1,
        agentsCount: 1,
        metricsCount: 1,
        connectedModules: [
          { templateId: 'assets', category: 'Portfolio' },
          { templateId: 'requests', category: 'Maintenance' },
          { templateId: 'invoices', category: 'Finance' }
        ]
      }
    },
    {
      slug: 'bp-non-profit-operations',
      builderType: 'SOLUTION',
      name: 'Non-Profit Operations Blueprint',
      description: 'Integrated grant management, donor tracking, and community service intake.',
      industry: 'Non-Profit & Public Sector',
      category: 'Non-Profit',
      department: 'Operations',
      tags: ['non-profit', 'grants', 'donors', 'community'],
      icon: 'Heart',
      complexity: 'Intermediate',
      payload: {
        modulesCount: 3,
        workflowsCount: 1,
        formsCount: 1,
        agentsCount: 1,
        metricsCount: 1,
        connectedModules: [
          { templateId: 'grants', category: 'Funding' },
          { templateId: 'people_org', category: 'Donors' },
          { templateId: 'requests', category: 'Services' }
        ]
      }
    },

    // ----------------------------------------------------
    // 9. COMPOSITE SOLUTION TEMPLATES (2 from NewSolutionModal.tsx)
    // ----------------------------------------------------
    {
      slug: 'sol-customer-support-incident-suite',
      builderType: 'SOLUTION',
      name: 'Customer Support & Incident Escalation Suite',
      description: 'End-to-end customer support ticket intake, AI triage copilot, escalation workflow, and SLA resolution tracking.',
      industry: 'Cross-Industry',
      category: 'Customer Operations',
      department: 'Customer Support',
      tags: ['solution', 'support', 'helpdesk', 'ai-agent', 'workflow'],
      icon: 'Boxes',
      complexity: 'Advanced',
      payload: {
        modulesCount: 2,
        workflowsCount: 1,
        formsCount: 1,
        agentsCount: 1,
        metricsCount: 1,
        connectedModules: [
          { id: 'service-requests', name: 'Service Requests', type: 'WORK_ITEM', fieldsCount: 5, linked: true },
          { id: 'people_org', name: 'People & Organisation', type: 'RECORD', fieldsCount: 4, linked: true }
        ]
      }
    },
    {
      slug: 'sol-financial-dispute-hub',
      builderType: 'SOLUTION',
      name: 'Financial Dispute Triage & Reconciliation Hub',
      description: 'Inspect transaction discrepancies, coordinate Stripe reconciliation, and enforce human sign-off for large refunds.',
      industry: 'Financial Services & Fintech',
      category: 'Financial Services & Fintech',
      department: 'Finance',
      tags: ['solution', 'finance', 'disputes', 'reconciliation', 'stripe'],
      icon: 'DollarSign',
      complexity: 'Enterprise',
      payload: {
        modulesCount: 2,
        workflowsCount: 1,
        formsCount: 1,
        agentsCount: 1,
        metricsCount: 1,
        connectedModules: [
          { id: 'invoices', name: 'Invoices & Disputes', type: 'FINANCIAL', fieldsCount: 6, linked: true },
          { id: 'people_org', name: 'Clients & Accounts', type: 'RECORD', fieldsCount: 4, linked: true }
        ]
      }
    }
  ];

  let seededCount = 0;

  for (const t of templatesToSeed) {
    const existing = await prisma.templateCatalog.findFirst({
      where: {
        slug: t.slug,
        isSystem: true
      }
    });

    if (existing) {
      await prisma.templateCatalog.update({
        where: { id: existing.id },
        data: {
          builderType: t.builderType,
          name: t.name,
          description: t.description,
          industry: t.industry,
          category: t.category,
          department: t.department,
          tags: t.tags,
          icon: t.icon,
          isSystem: true,
          complexity: t.complexity,
          payload: t.payload,
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.templateCatalog.create({
        data: {
          slug: t.slug,
          builderType: t.builderType,
          name: t.name,
          description: t.description,
          industry: t.industry,
          category: t.category,
          department: t.department,
          tags: t.tags,
          icon: t.icon,
          isSystem: true,
          tenantId: null,
          popularityScore: 100,
          complexity: t.complexity,
          payload: t.payload
        }
      });
    }
    seededCount++;
  }

  console.log(`✅ Successfully seeded all ${seededCount} universal templates into PostgreSQL template_catalogs table!`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});

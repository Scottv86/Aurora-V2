import { 
  Mail, 
  HelpCircle, 
  UserCheck, 
  Star, 
  Calendar, 
  Briefcase 
} from 'lucide-react';
import { ModuleField } from '../types/platform';

export interface FormTemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  fieldsCount: number;
  schema: {
    layout: ModuleField[];
  };
}

export const FORM_TEMPLATES: FormTemplateItem[] = [
  {
    id: 'tpl_contact',
    name: 'Standard Contact & Inquiry Form',
    category: 'General & Public',
    description: 'Clean public intake form for inquiries, leads, and visitor communication.',
    icon: Mail,
    fieldsCount: 4,
    schema: {
      layout: [
        { id: 'name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
        { id: 'email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
        { id: 'subject', label: 'Inquiry Subject', type: 'text', required: true, colSpan: 12 },
        { id: 'message', label: 'Message Body', type: 'textarea', required: true, colSpan: 12 }
      ]
    }
  },
  {
    id: 'tpl_support',
    name: 'Customer Support Ticket Intake',
    category: 'Support & Helpdesk',
    description: 'Priority support request form with severity and issue classification.',
    icon: HelpCircle,
    fieldsCount: 5,
    schema: {
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
    id: 'tpl_onboarding',
    name: 'Client Onboarding & Registration',
    category: 'Operations & Accounts',
    description: 'Intake form for customer onboarding, account setup, and client profile data.',
    icon: UserCheck,
    fieldsCount: 6,
    schema: {
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
    id: 'tpl_feedback',
    name: 'Customer Satisfaction & Feedback Survey',
    category: 'Customer Success',
    description: 'Collect ratings, user feedback, and NPS sentiment from users.',
    icon: Star,
    fieldsCount: 4,
    schema: {
      layout: [
        { id: 'cust_name', label: 'Customer / User Name', type: 'text', required: false, colSpan: 6 },
        { id: 'rating', label: 'Overall Rating', type: 'select', options: ['5 - Excellent', '4 - Good', '3 - Neutral', '2 - Poor', '1 - Very Poor'], required: true, colSpan: 6 },
        { id: 'highlights', label: 'What did you like most?', type: 'textarea', required: false, colSpan: 12 },
        { id: 'improvements', label: 'What can we improve?', type: 'textarea', required: false, colSpan: 12 }
      ]
    }
  },
  {
    id: 'tpl_event',
    name: 'Event Registration & RSVP',
    category: 'Events & Marketing',
    description: 'Attendee registration form for webinars, conferences, or workshops.',
    icon: Calendar,
    fieldsCount: 5,
    schema: {
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
    id: 'tpl_job',
    name: 'Job Application & Talent Intake',
    category: 'HR & Recruitment',
    description: 'Intake form for candidate applications and talent pipelines.',
    icon: Briefcase,
    fieldsCount: 6,
    schema: {
      layout: [
        { id: 'applicant_name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
        { id: 'applicant_email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
        { id: 'phone', label: 'Phone Number', type: 'text', required: true, colSpan: 6 },
        { id: 'position', label: 'Position Applied For', type: 'text', required: true, colSpan: 6 },
        { id: 'portfolio', label: 'Portfolio / LinkedIn URL', type: 'text', required: false, colSpan: 12 },
        { id: 'cover_letter', label: 'Cover Letter / Bio', type: 'textarea', required: false, colSpan: 12 }
      ]
    }
  }
];

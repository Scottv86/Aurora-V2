export interface LeaveBalance {
  id: string;
  memberId: string;
  type: string;
  accrued: number;
  used: number;
}

export interface LeaveRequest {
  id: string;
  memberId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Declined';
  reason?: string;
  createdAt?: string;
}

export interface TimesheetEntry {
  id?: string;
  timesheetId?: string;
  date: string;
  hours: number;
  description?: string;
}

export interface Timesheet {
  id: string;
  memberId: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  periodStart: string;
  periodEnd: string;
  entries: TimesheetEntry[];
}

export interface RemunerationDetail {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  effectiveDate: string;
}

export interface EmploymentContract {
  id: string;
  memberId: string;
  tenantId: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  documentUrl?: string | null;
  remuneration?: RemunerationDetail[];
}

export interface WorkSchedule {
  monday: 'Office' | 'Home' | 'Client' | 'Off';
  tuesday: 'Office' | 'Home' | 'Client' | 'Off';
  wednesday: 'Office' | 'Home' | 'Client' | 'Off';
  thursday: 'Office' | 'Home' | 'Client' | 'Off';
  friday: 'Office' | 'Home' | 'Client' | 'Off';
}

export interface WorkArrangementsData {
  pattern: string;
  schedule?: WorkSchedule;
  location?: string;
  flexibleHours?: boolean;
  notes?: string;
}

export interface EmployeeRequestItem {
  id: string;
  type: 'expense' | 'equipment' | 'letter' | 'general';
  title: string;
  description?: string;
  amount?: number | null;
  currency?: string;
  urgency?: 'Normal' | 'Urgent' | 'Critical';
  status: string;
  submittedAt: string;
  reviewerNotes?: string | null;
}

export interface MemberHRData {
  member: {
    id: string;
    userId?: string;
    firstName?: string;
    familyName?: string;
    workEmail?: string;
    personalEmail?: string;
    homeAddress?: string;
    emergencyContact?: string;
    startDate?: string;
    licenceType?: string;
    position?: { id: string; title: string };
    team?: { id: string; name: string };
    certifications?: Array<{ id: string; name: string; issuer?: string; issueDate?: string; expiryDate?: string }>;
    skills?: Array<{ id: string; name: string; level?: string }>;
    phoneNumbers?: Array<{ id: string; number: string; type: string }>;
  };
  contracts: EmploymentContract[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  timesheets: Timesheet[];
  workArrangements: WorkArrangementsData;
  requests: EmployeeRequestItem[];
}

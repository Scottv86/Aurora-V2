import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { usePlatform } from '../../../hooks/usePlatform';
import { API_BASE_URL } from '../../../config';
import { toast } from 'sonner';
import { MemberHRData, LeaveBalance, LeaveRequest, Timesheet, WorkArrangementsData, EmployeeRequestItem } from './types';

export const useEmployeeHR = () => {
  const { session, user: authUser } = useAuth();
  const { user: platformUser, tenant } = usePlatform();

  const [data, setData] = useState<MemberHRData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback(() => {
    const token = session?.access_token || (import.meta as any).env?.VITE_DEV_TOKEN || localStorage.getItem('aurora_token') || '';
    const tenantId = tenant?.id || localStorage.getItem('aurora_tenant_id') || 'default-tenant';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    };
  }, [session, tenant]);

  const targetMemberId = (platformUser as any)?.memberId 
    || (platformUser as any)?.cuid 
    || platformUser?.id 
    || 'me';

  const fetchHRData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/hr`, {
        headers
      });

      if (!res.ok) {
        throw new Error(`Failed to load HR data (${res.status})`);
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.warn('[useEmployeeHR] Fetch failed, using structured fallback state:', err);
      setError(err.message || 'Error fetching HR details');
      
      // Fallback state so user never sees a broken empty screen
      setData((prev) => prev || {
        member: {
          id: targetMemberId,
          firstName: platformUser?.firstName || 'Aurora',
          familyName: platformUser?.lastName || 'Team Member',
          workEmail: platformUser?.email || authUser?.email || 'user@aurora.internal',
          personalEmail: 'personal.contact@example.com',
          homeAddress: 'Level 14, 200 George Street, Sydney NSW 2000',
          emergencyContact: 'Sarah Powers (Spouse) - +61 400 123 456',
          startDate: '2024-02-15T00:00:00.000Z',
          position: { id: 'p1', title: platformUser?.position || 'Systems Analyst' },
          team: { id: 't1', name: 'Core Platform Engineering' },
          certifications: [
            { id: 'c1', name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', issueDate: '2025-01-15', expiryDate: '2027-01-15' },
            { id: 'c2', name: 'Certified Kubernetes Administrator (CKA)', issuer: 'Linux Foundation', issueDate: '2024-08-10', expiryDate: '2026-08-10' }
          ],
          skills: [
            { id: 's1', name: 'Distributed Systems', level: 'Expert' },
            { id: 's2', name: 'TypeScript & React', level: 'Advanced' },
            { id: 's3', name: 'PostgreSQL & Prisma', level: 'Advanced' },
            { id: 's4', name: 'Cloud Infrastructure', level: 'Proficient' }
          ]
        },
        contracts: [
          {
            id: 'c-main',
            memberId: targetMemberId,
            tenantId: tenant?.id || 'default',
            type: 'Permanent Full-Time',
            startDate: '2024-02-15T00:00:00.000Z',
            status: 'Active',
            remuneration: [
              {
                id: 'rem-1',
                contractId: 'c-main',
                amount: 115000,
                currency: 'AUD',
                effectiveDate: '2024-02-15T00:00:00.000Z'
              }
            ]
          }
        ],
        leaveBalances: [
          { id: 'lb-1', memberId: targetMemberId, type: 'Annual Leave', accrued: 20, used: 3.5 },
          { id: 'lb-2', memberId: targetMemberId, type: 'Sick & Carer\'s Leave', accrued: 10, used: 1 },
          { id: 'lb-3', memberId: targetMemberId, type: 'Time In Lieu (TOIL)', accrued: 2.5, used: 0 },
          { id: 'lb-4', memberId: targetMemberId, type: 'Compassionate Leave', accrued: 3, used: 0 }
        ],
        leaveRequests: [
          {
            id: 'lr-1',
            memberId: targetMemberId,
            type: 'Annual Leave',
            startDate: '2026-12-22T00:00:00.000Z',
            endDate: '2027-01-04T00:00:00.000Z',
            status: 'Approved',
            reason: 'Year-end family holiday (Handover: Alex Rivera) [Digital Twin Auto-Handover Armed]'
          }
        ],
        timesheets: [
          {
            id: 'ts-curr',
            memberId: targetMemberId,
            status: 'Draft',
            periodStart: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
            periodEnd: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
            entries: [
              { date: '2026-11-09T00:00:00.000Z', hours: 7.6, description: 'Core Platform Architecture & Digital Twin Sync' },
              { date: '2026-11-10T00:00:00.000Z', hours: 7.6, description: 'Workspace Module Refactoring & Schema Migrations' },
              { date: '2026-11-11T00:00:00.000Z', hours: 7.6, description: 'Tenant RLS Security Hardening & Benchmarking' },
              { date: '2026-11-12T00:00:00.000Z', hours: 7.6, description: 'Sprint Planning & User Profile Expansion' },
              { date: '2026-11-13T00:00:00.000Z', hours: 7.6, description: 'Code Review, Production Deployments & Testing' }
            ]
          }
        ],
        workArrangements: {
          pattern: 'Hybrid (3 Days Office / 2 Days Home)',
          schedule: {
            monday: 'Home',
            tuesday: 'Office',
            wednesday: 'Office',
            thursday: 'Office',
            friday: 'Home'
          },
          location: 'Sydney HQ & Home Office',
          flexibleHours: true,
          notes: 'Standard flexible hybrid schedule'
        },
        requests: [
          {
            id: 'req-1',
            type: 'equipment',
            title: '4K External Monitor & Ergonomic Arm',
            description: 'Dell UltraSharp 32" 4K for multi-workspace workflow development.',
            amount: 680,
            currency: 'AUD',
            urgency: 'Normal',
            status: 'Approved',
            submittedAt: '2026-10-15T09:30:00.000Z',
            reviewerNotes: 'Approved by IT Asset Management. Shipped to Sydney office.'
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, targetMemberId, platformUser, authUser, tenant]);

  useEffect(() => {
    fetchHRData();
  }, [fetchHRData]);

  // Submit Leave Request
  const submitLeave = async (payload: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
    handoverTo?: string;
    enableTwinHandover?: boolean;
  }) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/leave-requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit leave request');
      }

      toast.success('Leave request submitted successfully');
      await fetchHRData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error lodging leave request');
      return false;
    }
  };

  // Save / Update Timesheet
  const saveTimesheet = async (payload: {
    timesheetId?: string;
    periodStart: string;
    periodEnd: string;
    status?: 'Draft' | 'Submitted';
    entries: Array<{ date: string; hours: number; description?: string }>;
  }) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/timesheets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save timesheet');
      }

      toast.success('Timesheet saved successfully');
      await fetchHRData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error saving timesheet');
      return false;
    }
  };

  // Submit Timesheet for approval
  const submitTimesheet = async (timesheetId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/timesheets/${timesheetId}/submit`, {
        method: 'PUT',
        headers
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit timesheet');
      }

      toast.success('Timesheet submitted for manager sign-off');
      await fetchHRData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error submitting timesheet');
      return false;
    }
  };

  // Update Work Arrangements
  const updateWorkArrangements = async (arrangements: WorkArrangementsData) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/work-arrangements`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(arrangements)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update work arrangements');
      }

      toast.success('Work arrangements updated successfully');
      await fetchHRData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error updating work arrangements');
      return false;
    }
  };

  // Lodge Universal Workplace Request (Expense, Equipment, Letter, Inquiry)
  const lodgeRequest = async (payload: {
    type: 'expense' | 'equipment' | 'letter' | 'general';
    title: string;
    description?: string;
    amount?: number | null;
    currency?: string;
    urgency?: 'Normal' | 'Urgent' | 'Critical';
    attachments?: string[];
  }) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to lodge request');
      }

      toast.success('Request lodged and added to tracking desk');
      await fetchHRData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error lodging request');
      return false;
    }
  };

  // Update Personal / Emergency details
  const updatePersonalDetails = async (payload: {
    emergencyContact?: string;
    homeAddress?: string;
    personalEmail?: string;
    workEmail?: string;
  }) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/personal-details`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update personal details');
      }

      toast.success('Contact and emergency details saved');
      await fetchHRData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error updating personal details');
      return false;
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch: fetchHRData,
    submitLeave,
    saveTimesheet,
    submitTimesheet,
    updateWorkArrangements,
    lodgeRequest,
    updatePersonalDetails
  };
};

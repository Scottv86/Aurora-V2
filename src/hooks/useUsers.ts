import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';

export interface TenantMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Lead' | 'Standard';
  team: string;
  teamId?: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Offline';
  isSynthetic: boolean;
  positionId?: string;
  position?: string;
  positionNumber?: string;
  avatarUrl?: string;
  modelType?: string; // For agents
  agentConfig?: any;
  lastActive?: string;
  createdAt: string;
  updatedAt?: string;

  // New Staff Details
  firstName?: string;
  otherName?: string;
  familyName?: string;
  personalEmail?: string;
  homeAddress?: string;
  workArrangements?: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  startDate?: string;
  endDate?: string;

  // Workforce Hub Enhancements
  isContractor?: boolean;
  licenceType?: string;
  aiHumour?: number;
  workEmail?: string;
  signature?: string;

  phoneNumbers?: { label: string; number: string }[];
  certifications?: { name: string; issuer: string; dateObtained?: string; expiryDate?: string }[];
  education?: { institution: string; degree: string; fieldOfStudy: string; startDate?: string; endDate?: string }[];
  skills?: { name: string; proficiencyLevel: string }[];
  permissionGroups?: { id: string; name: string; description?: string }[];
}

const API_BASE_URL = 'http://localhost:3001/api/members';

export const useUsers = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      setMembers(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, session?.access_token]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteHuman = async (data: { 
    email: string, 
    role: string, 
    teamId?: string,
    firstName?: string,
    familyName?: string,
    isContractor?: boolean,
    licenceType?: string,
    workArrangements?: string
  }) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to send invitation');
      const newMember = await res.json();
      setMembers(prev => [newMember, ...prev]);
      toast.success(`Invitation sent to ${data.firstName || data.email}`);
      return newMember;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const provisionAgent = async (data: { 
    modelType: string, 
    teamId?: string, 
    role: string,
    name?: string,
    aiHumour?: number,
    agentConfig?: any,
    licenceType?: string
  }) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to provision agent');
      const newAgent = await res.json();
      setMembers(prev => [newAgent, ...prev]);
      toast.success(`Agent ${newAgent.name} successfully provisioned`);
      return newAgent;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const cloneMember = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/clone/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to clone member');
      const cloned = await res.json();
      setMembers(prev => [cloned, ...prev]);
      toast.success('Staff record cloned successfully');
      return cloned;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateMember = async (id: string, updates: Partial<TenantMember>) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update member');
      const { member: updatedMember } = await res.json();
      
      // Update local state is complex because of formatting in GET all members
      // Easier to just refetch or optimistically update if we trust the return
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      toast.success('Member updated successfully');
      return updatedMember;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { members, loading, inviteHuman, provisionAgent, cloneMember, updateMember, refetch: fetchMembers };
};

import { useCallback } from 'react';
import { toast } from 'sonner';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { TenantMember } from '../types/platform';

const API_BASE_URL = 'http://localhost:3001/api/members';

export const useUsers = (enabled: boolean = true) => {
  const { tenant, members, membersLoading, refreshMembers } = usePlatform();
  const { session } = useAuth();

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
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to send invitation');
      const newMember = await res.json();
      await refreshMembers();
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
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to provision agent');
      const newAgent = await res.json();
      await refreshMembers();
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
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/clone/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to clone member');
      const cloned = await res.json();
      await refreshMembers();
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
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update member');
      const { member: updatedMember } = await res.json();
      
      await refreshMembers();
      toast.success('Member updated successfully');
      return updatedMember;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { 
    members: enabled ? members : [], 
    loading: enabled ? membersLoading : false, 
    inviteHuman, 
    provisionAgent, 
    cloneMember, 
    updateMember, 
    refetch: refreshMembers 
  };
};

export type { TenantMember };

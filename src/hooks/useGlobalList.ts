import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePlatform } from './usePlatform';
import { toast } from 'sonner';

export interface ListColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'choice';
  options?: string[];
  required?: boolean;
}

export interface GlobalListItem {
  id: string;
  list_id: string;
  tenant_id: string;
  data: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
}

export interface GlobalList {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  columns: ListColumn[];
  created_at: string;
}

interface UseGlobalListOptions {
  referenceDate?: Date;
  includeItemId?: string;
  showAllHistory?: boolean;
}

export const useGlobalList = (listId: string | null, options: UseGlobalListOptions = {}) => {
  const { tenant } = usePlatform();
  const [list, setList] = useState<GlobalList | null>(null);
  const [items, setItems] = useState<GlobalListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract and memoize options
  const referenceDateValue = options.referenceDate?.getTime();
  const includeItemId = options.includeItemId;
  const showAllHistory = options.showAllHistory || false;

  const fetchListDetails = useCallback(async () => {
    if (!listId || !tenant?.id) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('global_lists')
        .select('*')
        .eq('id', listId)
        .single();
      if (fetchError) throw fetchError;
      setList(data as GlobalList);
    } catch (err: any) {
      console.error('[useGlobalList] Fetch list error:', err);
    }
  }, [listId, tenant?.id]);

  const fetchItems = useCallback(async () => {
    if (!listId || !tenant?.id) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('global_list_items')
        .select('*')
        .eq('list_id', listId)
        .order('sort_order', { ascending: true });

      if (showAllHistory) {
        // Show everything, sorted by timeline
        query = query.order('valid_from', { ascending: false });
      } else if (referenceDateValue) {
        // Point-in-time travel
        const refIso = new Date(referenceDateValue).toISOString();
        query = query
          .lte('valid_from', refIso)
          .or(`valid_to.is.null,valid_to.gt.${refIso}`);
      } else {
        // Default: Active records only (most reliable for real-time edits)
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let result = data as GlobalListItem[];

      if (includeItemId && !result.find(item => item.id === includeItemId)) {
        const { data: missingItem, error: missingError } = await supabase
          .from('global_list_items')
          .select('*')
          .eq('id', includeItemId)
          .single();

        if (!missingError && missingItem) {
          result = [...result, missingItem as GlobalListItem];
        }
      }

      setItems(result);
    } catch (err: any) {
      console.error('[useGlobalList] Fetch items error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listId, tenant?.id, referenceDateValue, includeItemId, showAllHistory]);

  useEffect(() => {
    fetchListDetails();
    fetchItems();
  }, [fetchListDetails, fetchItems]);

  const addItem = async (data: Record<string, any>) => {
    if (!listId || !tenant?.id) return;
    try {
      const { data: resultId, error: rpcError } = await supabase.rpc('add_global_list_item', {
        p_list_id: listId,
        p_tenant_id: tenant.id,
        p_data: data
      });
      if (rpcError) throw rpcError;
      toast.success('Record added successfully');
      await fetchItems();
      return resultId;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const editItem = async (itemId: string, data: Record<string, any>) => {
    if (!listId || !tenant?.id) return;
    try {
      const { data: resultId, error: rpcError } = await supabase.rpc('edit_global_list_item', {
        p_item_id: itemId,
        p_list_id: listId,
        p_tenant_id: tenant.id,
        p_data: data
      });
      if (rpcError) throw rpcError;
      
      // Don't show toast for every cell change to keep it clean, 
      // but return the result so the caller knows it succeeded
      await fetchItems();
      return resultId;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const retireItem = async (itemId: string) => {
    if (!tenant?.id) return;
    try {
      const { error: rpcError } = await supabase.rpc('retire_global_list_item', {
        p_item_id: itemId,
        p_tenant_id: tenant.id
      });
      if (rpcError) throw rpcError;
      toast.success('Record retired');
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const reorderItems = async (itemOrder: { id: string, sort_order: number }[]) => {
    if (!listId || !tenant?.id) return;
    try {
      const { error: rpcError } = await supabase.rpc('reorder_global_list_items', {
        p_list_id: listId,
        p_tenant_id: tenant.id,
        p_order_map: itemOrder
      });
      if (rpcError) throw rpcError;
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateSchema = async (columns: ListColumn[]) => {
    if (!listId) return;
    try {
      const { error } = await supabase
        .from('global_lists')
        .update({ columns })
        .eq('id', listId);
      if (error) throw error;
      toast.success('Schema updated successfully');
      await fetchListDetails();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateMetadata = async (name: string, description: string | null) => {
    if (!listId) return;
    try {
      const { error } = await supabase
        .from('global_lists')
        .update({ name, description })
        .eq('id', listId);
      if (error) throw error;
      toast.success('List updated successfully');
      await fetchListDetails();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    list,
    items,
    loading,
    error,
    refetch: fetchItems,
    addItem,
    editItem,
    retireItem,
    reorderItems,
    updateSchema,
    updateMetadata
  };
};

export const useGlobalLists = () => {
  const { tenant } = usePlatform();
  const [lists, setLists] = useState<GlobalList[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLists = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_lists')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setLists(data || []);
    } catch (err) {
      console.error('[useGlobalLists] Fetch error:', err);
      toast.error('Failed to load global lists');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const createList = async (name: string, description?: string) => {
    if (!tenant?.id) return;
    try {
      const defaultColumns: ListColumn[] = [
        { id: 'col_' + Math.random().toString(36).substr(2, 9), name: 'Title', type: 'text', required: true }
      ];

      const { data, error } = await supabase
        .from('global_lists')
        .insert([{ tenant_id: tenant.id, name, description, columns: defaultColumns }])
        .select()
        .single();
      if (error) throw error;
      toast.success('List created successfully');
      await fetchLists();
      return data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteList = async (id: string) => {
    try {
      const { error } = await supabase.from('global_lists').delete().eq('id', id);
      if (error) throw error;
      toast.success('List deleted');
      await fetchLists();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { lists, loading, refetch: fetchLists, createList, deleteList };
};

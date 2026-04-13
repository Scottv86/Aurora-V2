import React, { useState } from 'react';
import { Shield, Plus, MoreVertical, Trash2, Edit2, Users, CheckCircle2 } from 'lucide-react';
import { usePermissionGroups, PermissionGroup } from '../../../hooks/usePermissionGroups';
import { Table } from '../../UI/Table';
import { Badge, Button } from '../../UI/Primitives';
import { CreateEditGroupModal } from './CreateEditGroupModal';
import { DeleteConfirmationModal } from '../../Common/DeleteConfirmationModal';
import { toast } from 'sonner';

interface SecurityGroupsProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  searchQuery?: string;
  activeFilter?: string;
}

export const SecurityGroups = ({ isModalOpen, onCloseModal, searchQuery = '' }: SecurityGroupsProps) => {
  const { groups, loading, deleteGroup } = usePermissionGroups();
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [isModalOpenState, setIsModalOpenState] = useState(false); // internal for edit mode
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (group: PermissionGroup) => {
    setEditingGroup(group);
    setIsModalOpenState(true);
  };

  const handleDelete = async () => {
    if (!deletingGroupId) return;
    setIsDeleting(true);
    try {
      await deleteGroup(deletingGroupId);
      toast.success('Group deleted');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
      setDeletingGroupId(null);
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: (g: PermissionGroup) => (
        <div className="flex items-center gap-4 py-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 shadow-sm dark:bg-zinc-800 ring-1 ring-zinc-900/5 dark:ring-white/5">
            <Shield size={22} className="text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{g.name}</div>
            <div className="text-[11px] text-zinc-500 font-medium line-clamp-1">{g.description || 'Permission group definition'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Permissions',
      accessor: (g: PermissionGroup) => (
        <div className="flex flex-wrap gap-1.5 max-w-[350px]">
          {(g.capabilities as string[] || []).slice(0, 4).map(cap => (
            <div key={cap} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
              <CheckCircle2 size={10} className="text-blue-500" />
              {cap.replace(':', ' ')}
            </div>
          ))}
          {(g.capabilities as string[] || []).length > 4 && (
            <Badge variant="zinc" className="text-[9px] font-bold">+{(g.capabilities as string[]).length - 4} MORE</Badge>
          )}
          {(g.capabilities as string[] || []).length === 0 && (
            <span className="text-xs text-zinc-400 italic font-medium">No permissions assigned</span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (g: any) => (
        <div className="flex flex-col">
          <Badge variant="blue" className="w-fit text-[10px] font-bold uppercase tracking-widest px-2">Active</Badge>
          <span className="text-[10px] text-zinc-400 mt-1 font-medium">
            Updated {new Date(g.updatedAt || g.createdAt).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      header: '',
      accessor: (g: PermissionGroup) => (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleEdit(g); }}
            className="h-8 w-8 p-0 rounded-xl"
          >
            <Edit2 size={14} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); setDeletingGroupId(g.id); }}
            className="h-8 w-8 p-0 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

    const query = searchQuery.toLowerCase();
    const filteredGroups = groups.filter(g => 
      !query || 
      g.name.toLowerCase().includes(query) || 
      (g.description && g.description.toLowerCase().includes(query))
    );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        <Table 
          data={filteredGroups} 
          columns={columns} 
          loading={loading}
          pagination={true}
          onRowClick={handleEdit}
        />
      </div>

      <CreateEditGroupModal 
        isOpen={isModalOpen || isModalOpenState}
        onClose={() => {
          onCloseModal();
          setIsModalOpenState(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
      />

      <DeleteConfirmationModal 
        isOpen={!!deletingGroupId}
        onClose={() => setDeletingGroupId(null)}
        onConfirm={handleDelete}
        title="Delete Group"
        description="Are you sure you want to delete this group? Members in this group may lose access to certain features."
        isDeleting={isDeleting}
      />
    </div>
  );
};


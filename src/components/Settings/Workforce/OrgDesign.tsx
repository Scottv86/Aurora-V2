import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePositions, Position } from '../../../hooks/usePositions';
import { Table } from '../../UI/Table';
import { Badge, Button, Input } from '../../UI/Primitives';
import { Modal } from '../../UI/TabsAndModal';
import { Briefcase, Plus, Search, MapPin, Users, History, TreeLabels, ChevronRight } from 'lucide-react';

interface OrgDesignProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeFilter?: string;
}

export const OrgDesign = ({ isModalOpen, onCloseModal, searchQuery = '', onSearchChange, activeFilter = 'all' }: OrgDesignProps) => {
  const navigate = useNavigate();
  const { positions, loading, createPosition } = usePositions();
  const [newPosition, setNewPosition] = useState({
    positionNumber: '',
    title: '',
    description: '',
    parentId: ''
  });

  const columns = [
    {
      header: 'ID',
      accessor: (p: Position) => (
        <div className="flex items-center gap-2">
          <Badge variant="blue" className="font-mono text-[10px] tracking-tight">{p.positionNumber}</Badge>
        </div>
      )
    },
    {
      header: 'Title',
      accessor: (p: Position) => (
        <div className="flex flex-col">
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{p.title}</span>
          {p.parentTitle && (
            <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              <ChevronRight size={10} /> Reports to {p.parentTitle}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Members',
      accessor: (p: Position) => (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {p.occupantCount} {p.occupantCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      )
    },
    {
      header: 'Description',
      accessor: (p: Position) => (
        <span className="text-sm text-zinc-500 line-clamp-1">{p.description || 'No description...'}</span>
      )
    }
  ];

  const handleCreate = async () => {
    try {
      await createPosition(newPosition);
      onCloseModal();
      setNewPosition({ positionNumber: '', title: '', description: '', parentId: '' });
    } catch (err) {
      // toast handled in hook
    }
  };

  const filteredPositions = positions.filter(p => {
    // Phase 1: Contextual Filters
    let matchesFilter = true;
    if (activeFilter === 'filled') matchesFilter = p.occupantCount > 0;
    if (activeFilter === 'open') matchesFilter = p.occupantCount === 0;

    // Phase 2: Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      p.title.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query)) ||
      p.positionNumber.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-white/5 p-6 lg:p-8 shadow-2xl overflow-hidden">
        <div className="relative max-w-md mb-8 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search roles or position IDs..." 
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md shadow-sm"
          />
        </div>

        <Table 
          data={filteredPositions} 
          columns={columns} 
          loading={loading}
          pagination={true}
          onRowClick={(p) => navigate(`/workspace/settings/workforce/roles/${p.id}`)}
          emptyMessage="No roles found. Add a role to get started."
          className="bg-transparent dark:bg-transparent border-none shadow-none"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={onCloseModal}
        title="Create Role"
        footer={
          <>
            <Button variant="secondary" onClick={onCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Create Role</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="ID" 
              placeholder="e.g. POS-001" 
              value={newPosition.positionNumber}
              onChange={(e) => setNewPosition(prev => ({ ...prev, positionNumber: e.target.value }))}
            />
            <Input 
              label="Title" 
              placeholder="e.g. Senior Software Engineer" 
              value={newPosition.title}
              onChange={(e) => setNewPosition(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <Input 
            label="Description" 
            placeholder="Key responsibilities and role requirements..." 
            value={newPosition.description}
            onChange={(e) => setNewPosition(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Reporting Line (Optional)</label>
            <select
              className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              value={newPosition.parentId}
              onChange={(e) => setNewPosition(prev => ({ ...prev, parentId: e.target.value }))}
            >
              <option value="">No Reporting Line</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.positionNumber})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

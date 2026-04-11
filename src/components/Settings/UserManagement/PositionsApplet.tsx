import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePositions, Position } from '../../../hooks/usePositions';
import { Table } from '../../UI/Table';
import { Badge, Button, Input } from '../../UI/Primitives';
import { Modal } from '../../UI/TabsAndModal';
import { Briefcase, Plus, Search, MapPin, Users, History, TreeLabels, ChevronRight } from 'lucide-react';

export const PositionsApplet = () => {
  const navigate = useNavigate();
  const { positions, loading, createPosition } = usePositions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPosition, setNewPosition] = useState({
    positionNumber: '',
    title: '',
    description: '',
    parentId: ''
  });

  const columns = [
    {
      header: 'Position Number',
      accessor: (p: Position) => (
        <div className="flex items-center gap-2">
          <Badge variant="blue" className="font-mono">{p.positionNumber}</Badge>
        </div>
      )
    },
    {
      header: 'Title',
      accessor: (p: Position) => (
        <div className="flex flex-col">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</span>
          {p.parentTitle && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <ChevronRight size={12} /> reports to {p.parentTitle}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Occupants',
      accessor: (p: Position) => (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400">
            {p.occupantCount} {p.occupantCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      )
    },
    {
      header: 'Description',
      accessor: (p: Position) => (
        <span className="text-sm text-zinc-500 line-clamp-1">{p.description || 'No description provided'}</span>
      )
    }
  ];

  const handleCreate = async () => {
    try {
      await createPosition(newPosition);
      setIsModalOpen(false);
      setNewPosition({ positionNumber: '', title: '', description: '', parentId: '' });
    } catch (err) {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Organizational Positions</h3>
          <p className="text-sm text-zinc-500">Define standalone roles and slots for your workforce hierarchy.</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Create Position
        </Button>
      </div>

      <Table 
        data={positions} 
        columns={columns} 
        loading={loading}
        onRowClick={(p) => navigate(`/dashboard/settings/positions/${p.id}`)}
        emptyMessage="No positions defined yet. Create one to start building your org chart."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Position"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Create Position</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Position Number" 
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

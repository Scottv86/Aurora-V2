import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronRight, 
  Briefcase, 
  Activity, 
  Trash2, 
  Save, 
  GitMerge,
  Info,
  Users,
  Target,
  UserPlus,
  Shield
} from 'lucide-react';
import { usePosition, usePositions } from '../../hooks/usePositions';
import { useUsers } from '../../hooks/useUsers';
import { Button, Input, Select, Badge } from '../../components/UI/Primitives';
import { Tabs } from '../../components/UI/TabsAndModal';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { Table } from '../../components/UI/Table';

export const PositionDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { position, loading, updatePosition, deletePosition, updateSuccessors } = usePosition(id);
  const { positions: allPositions } = usePositions();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local form state
  const [title, setTitle] = useState('');
  const [positionNumber, setPositionNumber] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    if (position) {
      setTitle(position.title);
      setPositionNumber(position.positionNumber);
      setDescription(position.description || '');
      setParentId(position.parentId || '');
      setSuccessors(position.successors || []);
    }
  }, [position]);

  const [successors, setSuccessors] = useState<any[]>([]);
  const { members: allMembers } = useUsers();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePosition({ 
        title, 
        positionNumber, 
        description, 
        parentId: parentId || null 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!position) return;
    setIsDeleting(true);
    try {
      await deletePosition();
      navigate('/workspace/settings/workforce');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 animate-pulse font-medium">Accessing Position Records...</p>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-2xl">
        <p className="text-red-500 font-medium">Position record not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/workspace/settings/workforce')}>
          Return to Hub
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      {/* breadcrumbs */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/workspace/settings/workforce')}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} className="text-zinc-500" />
        </button>
        <div className="flex items-center text-sm font-medium">
          <span className="text-zinc-400">Settings</span>
          <ChevronRight size={14} className="mx-2 text-zinc-600" />
          <span className="text-zinc-400">Workforce</span>
          <ChevronRight size={14} className="mx-2 text-zinc-600" />
          <span className="text-zinc-900 dark:text-zinc-100">{position.title} ({position.positionNumber})</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-white shadow-xl shadow-zinc-500/10 border border-zinc-700">
            <Briefcase size={44} />
          </div>
          <div className="space-y-2">
             <div className="flex items-center gap-3">
               <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{position.title}</h1>
               <Badge variant="blue" className="font-mono">{position.positionNumber}</Badge>
             </div>
             <p className="text-zinc-500 font-medium flex items-center gap-2">
               <GitMerge size={14} /> Reports to: {position.parentTitle || 'Organization Head'}
             </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleDelete} className="gap-2 px-5">
            <Trash2 size={16} />
            Delete Position
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-6">
            {isSaving ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <Tabs 
          tabs={[
            { id: 'overview', label: 'Position Definition' },
            { id: 'occupants', label: 'Current Occupants' },
            { id: 'succession', label: 'Succession Planning' },
            { id: 'activity', label: 'Audit Log' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="col-span-2 space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <Input 
                        label="Position Title" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Senior Software Engineer"
                      />
                      <Input 
                        label="Position Slot Number" 
                        value={positionNumber} 
                        onChange={(e) => setPositionNumber(e.target.value)}
                        placeholder="e.g. ENG-001"
                      />
                   </div>
                   
                   <Select 
                     label="Reporting Line (Manager Position)" 
                     value={parentId}
                     onChange={(e) => setParentId(e.target.value)}
                     options={[
                       { label: 'None (Top Level)', value: '' },
                       ...allPositions
                          .filter(p => p.id !== position.id) // Prevent self-referential
                          .map(p => ({ label: `${p.title} (${p.positionNumber})`, value: p.id }))
                     ]}
                   />

                   <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Post Description & Requirements</label>
                      <textarea 
                        className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Describe the responsibilities associated with this role..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                       <Info size={16} /> Hierarchy Concept
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Positions define the <strong>slots</strong> in your organization. A position can be reports to another position, creating your reporting chain. 
                      Humans or Agents are then "assigned" to these slots.
                    </p>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'occupants' && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
            >
               <Table 
                 data={position.occupants || []}
                 emptyMessage="This position is currently vacant."
                 columns={[
                   {
                     header: 'Occupant',
                     accessor: (occ) => <div className="font-semibold text-zinc-900 dark:text-zinc-100">{occ.name}</div>
                   },
                   {
                     header: 'Type',
                     accessor: (occ) => <Badge variant={occ.isSynthetic ? "purple" : "zinc"}>{occ.isSynthetic ? "Agent" : "Human"}</Badge>
                   },
                   {
                     header: 'Profile',
                     accessor: (occ) => (
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-blue-500"
                         onClick={() => navigate(`/workspace/settings/workforce/member/${occ.id}`)}
                       >
                         View Detailed Record
                       </Button>
                     )
                   }
                 ]}
               />
            </motion.div>
          )}
          {activeTab === 'succession' && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-6"
            >
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-8">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                           <Target size={20} className="text-indigo-500" /> Strategic Successors
                        </h3>
                        <p className="text-sm text-zinc-500">Identify and rank individuals ready to transition into this position context.</p>
                     </div>
                     <Button variant="primary" className="gap-2" onClick={async () => {
                        await updateSuccessors(successors);
                     }}>
                        <Save size={16} /> Save Rankings
                     </Button>
                     <Button variant="ghost" className="gap-2" onClick={() => {
                        const next = [...successors, { memberId: '', ranking: successors.length + 1 }];
                        setSuccessors(next);
                     }}>
                        <UserPlus size={16} /> Add Candidate
                     </Button>
                  </div>

                  <div className="space-y-4">
                     {successors.map((suc, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl group transition-all hover:border-indigo-500/30">
                           <div className="h-10 w-10 rounded-full bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-black text-zinc-400">
                              {suc.ranking || idx + 1}
                           </div>
                           <div className="flex-1">
                              <Select 
                                value={suc.memberId}
                                onChange={e => {
                                  const next = [...successors];
                                  next[idx].memberId = e.target.value;
                                  setSuccessors(next);
                                }}
                                options={[{ label: 'Select a candidate...', value: '' }, ...allMembers.map(m => ({ label: m.name, value: m.id }))]}
                              />
                           </div>
                           <div className="w-24">
                              <Input 
                                type="number"
                                label="Rank"
                                value={suc.ranking}
                                onChange={e => {
                                  const next = [...successors];
                                  next[idx].ranking = parseInt(e.target.value);
                                  setSuccessors(next);
                                }}
                              />
                           </div>
                           <button 
                              onClick={() => setSuccessors(successors.filter((_, i) => i !== idx))}
                              className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                           >
                              <Trash2 size={18} />
                           </button>
                        </div>
                     ))}

                     {!successors.length && (
                        <div className="py-12 text-center bg-zinc-50/50 dark:bg-zinc-800/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                           <p className="text-sm text-zinc-400 italic">No succession planning has been initiated for this position.</p>
                        </div>
                     )}
                  </div>
               </div>

               <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                     <Shield size={20} />
                  </div>
                  <div className="space-y-1">
                     <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Succession Protocol</p>
                     <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 leading-relaxed">
                        Successors are monitored for skill readiness. When the primary occupant is decommissioned or moved, 
                        the highest-ranked successor is automatically flagged for transition review.
                     </p>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4"
            >
               <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                  <Activity size={32} />
               </div>
               <div className="space-y-1">
                  <h3 className="font-bold">No Audit History</h3>
                  <p className="text-sm text-zinc-500">Logs of position updates and reporting line changes will appear here.</p>
               </div>
            </motion.div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Position Slot"
        description={`Are you sure you want to permanently delete the "${position.title}" position? This action cannot be undone and may orphan reporting lines below it in the organizational hierarchy.`}
        isDeleting={isDeleting}
      />
    </div>
  );
};

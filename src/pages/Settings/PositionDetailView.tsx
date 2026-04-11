import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronRight, 
  Briefcase, 
  Settings, 
  Activity, 
  Trash2, 
  Save, 
  GitMerge,
  Info,
  Users
} from 'lucide-react';
import { usePosition, usePositions } from '../../hooks/usePositions';
import { Button, Input, Select, Badge, cn } from '../../components/UI/Primitives';
import { Tabs } from '../../components/UI/TabsAndModal';

export const PositionDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { position, loading, updatePosition, deletePosition } = usePosition(id);
  const { positions: allPositions } = usePositions();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);

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
    }
  }, [position]);

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

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to permanently delete the "${position?.title}" position? This may orphan reporting lines below it.`)) {
      await deletePosition();
      navigate('/dashboard/settings/users');
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
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/dashboard/settings/users')}>
          Return to Management
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* breadcrumbs */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard/settings/users')}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} className="text-zinc-500" />
        </button>
        <div className="flex items-center text-sm font-medium">
          <span className="text-zinc-400">Settings</span>
          <ChevronRight size={14} className="mx-2 text-zinc-600" />
          <span className="text-zinc-400">Staff</span>
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
               <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{position.title}</h1>
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
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">Occupant</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">Profile</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                     {position.occupants?.map((occ) => (
                        <tr key={occ.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                           <td className="px-6 py-4">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{occ.name}</div>
                           </td>
                           <td className="px-6 py-4">
                              <Badge variant={occ.isSynthetic ? "purple" : "zinc"}>{occ.isSynthetic ? "Agent" : "Human"}</Badge>
                           </td>
                           <td className="px-6 py-4">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-blue-500"
                                onClick={() => navigate(`/dashboard/settings/users/${occ.id}`)}
                              >
                                View Detailed Record
                              </Button>
                           </td>
                        </tr>
                     ))}
                     {!position.occupants?.length && (
                        <tr>
                           <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 italic flex flex-col items-center gap-2">
                             <Users size={24} className="text-zinc-300" />
                             This position is currently vacant.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
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
    </div>
  );
};

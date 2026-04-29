import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronRight, 
  Users, 
  Activity, 
  Trash2, 
  Save
} from 'lucide-react';
import { useTeam } from '../../hooks/useTeams';
import { Button, Input, Badge } from '../../components/UI/Primitives';
import { Tabs } from '../../components/UI/TabsAndModal';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { AvatarUpload } from '../../components/Common/AvatarUpload';
import { Table } from '../../components/UI/Table';

export const TeamDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { team, loading, updateTeam, deleteTeam } = useTeam(id);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
      setAvatarUrl(team.avatar || '');
    }
  }, [team]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTeam({ name, description, avatarUrl });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!team) return;
    setIsDeleting(true);
    try {
      await deleteTeam();
      navigate('/workspace/settings/workforce');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-8 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200/20 border-t-indigo-600" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] animate-pulse">Retrieving Team Profile</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-2xl">
        <p className="text-red-500 font-medium">Team record not found.</p>
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
          <span className="text-zinc-900 dark:text-zinc-100">{team.name} Team</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="flex items-center gap-6">
          <AvatarUpload 
            currentUrl={avatarUrl}
            onUpload={async (url) => {
              setAvatarUrl(url);
              await updateTeam({ avatarUrl: url });
            }}
            name={name}
          />
          <div className="space-y-2">
             <div className="flex items-center gap-3">
               <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{team.name}</h1>
               <Badge variant="blue">Operational Unit</Badge>
             </div>
             <p className="text-zinc-500 font-medium">
               {team.memberCount} humans • {team.agentCount} agents
             </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleDelete} className="gap-2 px-5">
            <Trash2 size={16} />
            Delete Team
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
            { id: 'overview', label: 'Overview' },
            { id: 'members', label: 'Team Roster' },
            { id: 'activity', label: 'Team Activity' }
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
                <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-8">
                  <div className="space-y-6">
                    <Input 
                      label="Team Name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Engineering, Sales, Support"
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Purpose & Mission</label>
                      <textarea 
                        className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Define the core objectives of this team..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="bg-zinc-50 dark:bg-zinc-900/40 dark:backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                    <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-widest mb-4">Organizational Stats</h4>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <span className="text-sm text-zinc-500">Total Capacity</span>
                          <span className="text-sm font-bold">{team.memberCount + team.agentCount} slots occupied</span>
                       </div>
                       <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${(team.memberCount / (team.memberCount + team.agentCount || 1)) * 100}%` }} 
                          />
                       </div>
                       <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                          <span className="text-blue-500">Human {Math.round((team.memberCount / (team.memberCount + team.agentCount || 1)) * 100)}%</span>
                          <span className="text-indigo-400">AI {Math.round((team.agentCount / (team.memberCount + team.agentCount || 1)) * 100)}%</span>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'members' && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
            >
               <Table 
                 data={team.members || []}
                 emptyMessage="No members assigned to this team yet."
                 columns={[
                   {
                     header: 'Member Name',
                     accessor: (m) => <div className="font-semibold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                   },
                   {
                     header: 'Role / Type',
                     accessor: (m) => <Badge variant={m.isSynthetic ? "purple" : "zinc"}>{m.isSynthetic ? "Agent" : "Human"}</Badge>
                   },
                   {
                     header: 'Action',
                     accessor: (m) => (
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-blue-500"
                         onClick={() => navigate(`/workspace/settings/workforce/member/${m.id}`)}
                       >
                         View Profile
                       </Button>
                     )
                   }
                 ]}
               />
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4"
            >
               <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                  <Activity size={32} />
               </div>
               <div className="space-y-1">
                  <h3 className="font-bold">No Team Activity Logs</h3>
                  <p className="text-sm text-zinc-500">Major changes to this team's configuration or membership will appear here.</p>
               </div>
            </motion.div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Team"
        description={`Are you sure you want to permanently delete the "${team.name}" team? This action cannot be undone and will impact all associated staff.`}
        isDeleting={isDeleting}
      />
    </div>
  );
};

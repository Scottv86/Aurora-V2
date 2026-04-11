import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  ChevronRight, 
  User, 
  Bot, 
  Shield, 
  Settings, 
  Activity, 
  Trash2, 
  Save, 
  Cpu, 
  Network,
  Zap,
  Mail
} from 'lucide-react';
import { useMember } from '../../hooks/useMember';
import { useTeams } from '../../hooks/useTeams';
import { Button, Input, Select, Badge, cn } from '../../components/UI/Primitives';
import { Tabs } from '../../components/UI/TabsAndModal';

export const MemberDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member, loading, updateMember, deleteMember } = useMember(id);
  const { teams } = useTeams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);

  // Local form state
  const [role, setRole] = useState('');
  const [teamId, setTeamId] = useState('');
  const [status, setStatus] = useState('');
  const [modelType, setModelType] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  // Initialize local state when member is loaded
  React.useEffect(() => {
    if (member) {
      setRole(member.role);
      setTeamId(member.teamId || '');
      setStatus(member.status);
      setModelType(member.modelType || '');
      setSystemPrompt(member.agentConfig?.systemPrompt || '');
      setTemperature(member.agentConfig?.temperature || 0.7);
    }
  }, [member]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMember({
        role,
        teamId,
        status,
        modelType,
        agentConfig: member?.isSynthetic ? {
          systemPrompt,
          temperature
        } : undefined
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to decommission this ${member?.isSynthetic ? 'agent' : 'member'}?`)) {
      await deleteMember();
      navigate('/dashboard/settings/users');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 animate-pulse font-medium">Accessing Coworker Records...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-2xl">
        <p className="text-red-500 font-medium">Coworker not found or access denied.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/dashboard/settings/users')}>
          Return to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Breadcrumbs & Navigation */}
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
          <span className="text-zinc-400">Users & Agents</span>
          <ChevronRight size={14} className="mx-2 text-zinc-600" />
          <span className="text-zinc-900 dark:text-zinc-100">{member.name}</span>
        </div>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {member.isSynthetic ? <Bot size={44} /> : <User size={44} />}
          </div>
          <div className="space-y-2">
             <div className="flex items-center gap-3">
               <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{member.name}</h1>
               <Badge variant={member.isSynthetic ? "purple" : "blue"}>
                 {member.isSynthetic ? "Digital Coworker" : "Human Employee"}
               </Badge>
             </div>
             <p className="text-zinc-500 font-medium flex items-center gap-2">
               <Mail size={14} /> {member.email}
             </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleDelete} className="gap-2 px-5">
            <Trash2 size={16} />
            Decommission
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-6">
            {isSaving ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="space-y-6">
        <Tabs 
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'configuration', label: 'Intelligence & Config' },
            { id: 'activity', label: 'Activity Logs' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="col-span-2 space-y-6">
                 <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                       <Shield size={18} className="text-blue-500" /> Professional Identity
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-xs uppercase font-bold text-zinc-500">Current Role</label>
                          <p className="text-zinc-900 dark:text-zinc-100 font-medium">{member.role}</p>
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs uppercase font-bold text-zinc-500">Organization Status</label>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", member.status === 'Active' ? "bg-green-500" : "bg-zinc-400")} />
                            <p className="text-zinc-900 dark:text-zinc-100 font-medium">{member.status}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                       <Network size={18} className="text-purple-500" /> Team Assignments
                    </h3>
                    <div className="flex flex-wrap gap-2">
                       {member.team !== "Unassigned" ? (
                         <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center gap-3">
                           <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                             <Zap size={16} />
                           </div>
                           <span className="font-semibold text-zinc-800 dark:text-zinc-200">{member.team}</span>
                         </div>
                       ) : (
                         <p className="text-sm text-zinc-500">Not currently assigned to any workspace teams.</p>
                       )}
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                    <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-widest mb-4">Metadata</h4>
                    <dl className="space-y-4">
                       <div>
                          <dt className="text-xs text-zinc-500">ID</dt>
                          <dd className="text-xs font-mono text-zinc-800 dark:text-zinc-200 mt-1">{member.id}</dd>
                       </div>
                       <div>
                          <dt className="text-xs text-zinc-500">Created At</dt>
                          <dd className="text-xs text-zinc-800 dark:text-zinc-200 mt-1">{new Date(member.createdAt).toLocaleDateString()}</dd>
                       </div>
                       <div>
                          <dt className="text-xs text-zinc-500">Last Activity</dt>
                          <dd className="text-xs text-zinc-800 dark:text-zinc-200 mt-1">{member.lastActive}</dd>
                       </div>
                    </dl>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'configuration' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl space-y-8"
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                 <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
                    <div className="space-y-1">
                       <h3 className="font-bold flex items-center gap-2">
                         <Settings size={18} /> Access & Logic 
                       </h3>
                       <p className="text-xs text-zinc-500">Configure how this {member.isSynthetic ? 'agent operates' : 'user interacts'} with the platform.</p>
                    </div>
                 </div>

                 <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                       <Select 
                         label="Platform Role" 
                         value={role} 
                         onChange={(e) => setRole(e.target.value)}
                         options={[
                           { label: 'Standard Coworker', value: 'Standard' },
                           { label: 'Team Lead', value: 'Lead' },
                           { label: 'Organization Admin', value: 'Admin' }
                         ]}
                       />
                       <Select 
                         label="Team Assignment" 
                         value={teamId}
                         onChange={(e) => setTeamId(e.target.value)}
                         options={[
                           { label: 'None', value: '' },
                           ...teams.map(t => ({ label: t.name, value: t.id }))
                         ]}
                       />
                    </div>

                    <Select 
                       label="Account Status" 
                       value={status}
                       onChange={(e) => setStatus(e.target.value)}
                       options={[
                         { label: 'Active', value: 'Active' },
                         { label: 'Inactive / Suspended', value: 'Inactive' },
                         { label: 'Away', value: 'Offline' }
                       ]}
                    />

                    {member.isSynthetic && (
                       <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
                          <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
                             <Cpu size={16} /> Digital Coworker Brain
                          </div>
                          
                          <Select 
                            label="Underlying Intelligence Model" 
                            value={modelType}
                            onChange={(e) => setModelType(e.target.value)}
                            options={[
                              { label: 'OpenClaw Sweeper (Vision)', value: 'OpenClaw Sweeper' },
                              { label: 'Gemini 2.0 Flash (Fast)', value: 'Gemini 2.0 Flash' },
                              { label: 'Gemini 1.5 Pro (Reasoning)', value: 'Gemini 1.5 Pro' },
                              { label: 'Claude 3.5 Sonnet (Logic)', value: 'Claude 3.5 Sonnet' }
                            ]}
                          />

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">System Instructions (Personality)</label>
                            <textarea 
                              className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="Describe how this agent should behave..."
                              value={systemPrompt}
                              onChange={(e) => setSystemPrompt(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5">
                             <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Creativity (Temperature)</label>
                                <span className="text-xs font-mono font-bold text-blue-500">{temperature}</span>
                             </div>
                             <input 
                               type="range" 
                               min="0" 
                               max="1" 
                               step="0.1" 
                               className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                               value={temperature}
                               onChange={(e) => setTemperature(parseFloat(e.target.value))}
                             />
                             <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
                                <span>DETERMINISTIC</span>
                                <span>CREATIVE</span>
                             </div>
                          </div>
                       </div>
                    )}
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
                  <h3 className="font-bold">No Activity Logs Found</h3>
                  <p className="text-sm text-zinc-500">Detailed events for this {member.isSynthetic ? 'agent' : 'user'} will appear here as they interact with the platform.</p>
               </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

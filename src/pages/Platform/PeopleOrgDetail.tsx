import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ChevronRight, 
  User, 
  Building2, 
  ShieldCheck, 
  Trash2, 
  Save, 
  Calendar,
  Shield,
  Clock,
  ExternalLink,
  Plus,
  GitBranch,
  Mail,
  MapPin,
  Building
} from 'lucide-react';
import { motion } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';
import { Button, Input, Select, Badge, cn } from '../../components/UI/Primitives';
import { Tabs, Modal } from '../../components/UI/TabsAndModal';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { RelationshipGraph } from '../../components/Platform/RelationshipGraph';
import { AddRelationshipModal } from '../../components/Platform/AddRelationshipModal';

export const PeopleOrgDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { session } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [relationships, setRelationships] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [isAddRelationshipModalOpen, setIsAddRelationshipModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<any>({
    status: '',
    person: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      isHumanInLoop: false
    },
    organization: {
      legalName: '',
      orgStructureType: '',
      incorporationDate: '',
      taxIdentifier: ''
    }
  });

  useEffect(() => {
    fetchParty();
    fetchExtras();
  }, [id]);

  const fetchExtras = async () => {
    try {
      setLoadingExtras(true);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenant?.id || '' 
      };

      // Fetch Relationships
      const relRes = await fetch(`${API_BASE_URL}/api/people-organisations/${id}/relationships`, { headers });
      if (relRes.ok) setRelationships(await relRes.json());

      // Fetch Audit Logs
      const auditRes = await fetch(`${API_BASE_URL}/api/audit/${id}`, { headers });
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      
    } catch (err) {
      console.error('Failed to fetch extras:', err);
    } finally {
      setLoadingExtras(false);
    }
  };

  const fetchParty = async () => {
    try {
      setLoading(true);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Failed to fetch record');
        navigate('/workspace/platform/people-organisations');
      } else {
        setParty(data);
        setFormData({
          status: data.status,
          person: {
            firstName: data.person?.firstName || '',
            lastName: data.person?.lastName || '',
            dateOfBirth: data.person?.dateOfBirth ? new Date(data.person.dateOfBirth).toISOString().split('T')[0] : '',
            isHumanInLoop: data.person?.isHumanInLoop || false
          },
          organization: {
            legalName: data.organization?.legalName || '',
            orgStructureType: data.organization?.orgStructureType || '',
            incorporationDate: data.organization?.incorporationDate ? new Date(data.organization.incorporationDate).toISOString().split('T')[0] : '',
            taxIdentifier: data.organization?.taxIdentifier || ''
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch party:', err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Update failed');
      } else {
        toast.success('Record updated successfully');
        setParty(data);
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      } else {
        toast.success('Record deleted');
        navigate('/workspace/platform/people-organisations');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 animate-pulse font-medium">Loading Record...</p>
        </div>
      </div>
    );
  }

  if (!party) return null;

  const isPerson = party.partyType === 'PERSON';
  const displayName = isPerson 
    ? `${formData.person.firstName} ${formData.person.lastName}`
    : formData.organization.legalName;

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/workspace/platform/people-organisations')}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} className="text-zinc-500" />
        </button>
        <div className="flex items-center text-sm font-medium">
          <span className="text-zinc-400">Platform</span>
          <ChevronRight size={14} className="mx-2 text-zinc-600" />
          <span className="text-zinc-400">People & Organisations</span>
          <ChevronRight size={14} className="mx-2 text-zinc-600" />
          <span className="text-zinc-900 dark:text-zinc-100">{displayName}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border transition-all ${
            isPerson 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
          }`}>
            {isPerson ? <User size={40} /> : <Building2 size={40} />}
          </div>
          <div className="space-y-4">
             <div className="flex items-center gap-3">
               <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{displayName}</h1>
                <Badge variant={isPerson ? "amber" : "indigo"}>
                  {isPerson ? "Person" : "Organisation"}
                </Badge>
                <Badge 
                  variant={formData.status === 'ACTIVE' ? 'green' : formData.status === 'PENDING_REVIEW' ? 'amber' : 'zinc'} 
                  className="font-black text-[10px]"
                >
                  {formData.status.replace('_', ' ')}
                </Badge>
             </div>
             <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-zinc-500 font-medium">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <Shield size={12} /> ID: {party.id}
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <Calendar size={12} /> Created: {new Date(party.createdAt).toLocaleDateString()}
                </span>
                {party.createdBySwarmId && (
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400">
                    <ShieldCheck size={12} /> Swarm Created
                  </span>
                )}
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={() => setShowDeleteModal(true)} className="gap-2 px-5 font-bold">
            <Trash2 size={16} />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-6 font-bold shadow-xl shadow-indigo-500/20">
            {isSaving ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <Tabs 
          tabs={[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'relationships', label: 'Relationships', icon: GitBranch },
            { id: 'activity', label: 'Activity', icon: Clock }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Info */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6 shadow-sm">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    {isPerson ? <User size={18} className="text-amber-500" /> : <Building size={18} className="text-indigo-500" />}
                    {isPerson ? 'Personal Information' : 'Organisation Information'}
                  </h3>
                  
                  <div className="space-y-4">
                    {isPerson ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label="First Name" 
                            value={formData.person.firstName} 
                            onChange={e => setFormData({
                              ...formData, 
                              person: { ...formData.person, firstName: e.target.value }
                            })} 
                          />
                          <Input 
                            label="Last Name" 
                            value={formData.person.lastName} 
                            onChange={e => setFormData({
                              ...formData, 
                              person: { ...formData.person, lastName: e.target.value }
                            })} 
                          />
                        </div>
                        <Input 
                          label="Date of Birth" 
                          type="date"
                          value={formData.person.dateOfBirth} 
                          onChange={e => setFormData({
                            ...formData, 
                            person: { ...formData.person, dateOfBirth: e.target.value }
                          })} 
                        />
                        <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <input 
                            type="checkbox" 
                            id="humanInLoop"
                            checked={formData.person.isHumanInLoop}
                            onChange={e => setFormData({
                              ...formData, 
                              person: { ...formData.person, isHumanInLoop: e.target.checked }
                            })}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <label htmlFor="humanInLoop" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Human in the Loop (Verification required)
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <Input 
                          label="Legal Name" 
                          value={formData.organization.legalName} 
                          onChange={e => setFormData({
                            ...formData, 
                            organization: { ...formData.organization, legalName: e.target.value }
                          })} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Select 
                            label="Structure Type" 
                            value={formData.organization.orgStructureType}
                            onChange={e => setFormData({
                              ...formData, 
                              organization: { ...formData.organization, orgStructureType: e.target.value }
                            })}
                            options={[
                              { label: 'Company', value: 'COMPANY' },
                              { label: 'Trust', value: 'TRUST' },
                              { label: 'Partnership', value: 'PARTNERSHIP' },
                              { label: 'Sole Trader', value: 'SOLE_TRADER' },
                              { label: 'Non-Profit', value: 'NON_PROFIT' },
                              { label: 'Government', value: 'GOVERNMENT' }
                            ]}
                          />
                          <Input 
                            label="Tax Identifier (ABN/EIN)" 
                            value={formData.organization.taxIdentifier} 
                            onChange={e => setFormData({
                              ...formData, 
                              organization: { ...formData.organization, taxIdentifier: e.target.value }
                            })} 
                          />
                        </div>
                        <Input 
                          label="Incorporation Date" 
                          type="date"
                          value={formData.organization.incorporationDate} 
                          onChange={e => setFormData({
                            ...formData, 
                            organization: { ...formData.organization, incorporationDate: e.target.value }
                          })} 
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Status & Settings */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6 shadow-sm">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <ShieldCheck size={18} className="text-emerald-500" /> Lifecycle & Status
                  </h3>
                  
                  <div className="space-y-6">
                    <Select 
                      label="Entity Status" 
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      options={[
                        { label: 'Draft', value: 'DRAFT' },
                        { label: 'Pending Review', value: 'PENDING_REVIEW' },
                        { label: 'Active', value: 'ACTIVE' },
                        { label: 'Inactive', value: 'INACTIVE' }
                      ]}
                    />
                    
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Creation Method</span>
                        <Badge variant={party.createdBySwarmId ? "purple" : "zinc"}>
                          {party.createdBySwarmId ? 'AI SWARM' : 'HUMAN OPERATOR'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Last Updated</span>
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                          {new Date(party.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {party.creationContextLog && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Creation Context</label>
                        <div className="p-4 bg-zinc-900 rounded-xl font-mono text-[10px] text-zinc-300 overflow-auto max-h-32 border border-zinc-800">
                          {party.creationContextLog}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'relationships' && (
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Relationships</h3>
                   <div className="flex items-center gap-3">
                      <Button variant="secondary" size="sm" className="gap-2" onClick={() => setIsMapModalOpen(true)}>
                        <GitBranch size={16} /> View Map
                      </Button>
                      <Button variant="secondary" size="sm" className="gap-2" onClick={() => setIsAddRelationshipModalOpen(true)}>
                        <Plus size={16} /> Add Relationship
                      </Button>
                   </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                   <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">Connections List</h4>
                   <div className="grid grid-cols-1 gap-4">
                      {relationships.map(rel => {
                         const other = rel.sourcePartyId === id ? rel.targetParty : rel.sourceParty;
                         const name = other.partyType === 'PERSON' 
                           ? `${other.person?.firstName} ${other.person?.lastName}`
                           : other.organization?.legalName;
                         
                         return (
                           <div key={rel.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:border-indigo-500/30 transition-all">
                              <div className="flex items-center gap-4">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                                   other.partyType === 'PERSON' 
                                     ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
                                     : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                                 }`}>
                                   {other.partyType === 'PERSON' ? <User size={20} /> : <Building2 size={20} />}
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{name}</p>
                                    <p className="text-xs text-zinc-500">
                                      {rel.relationshipType} • {other.partyType}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 {rel.ownershipPercentage && (
                                   <Badge variant="indigo" className="text-[10px]">
                                     {rel.ownershipPercentage}% Ownership
                                   </Badge>
                                 )}
                                 <Button variant="ghost" size="sm" className="ml-2" onClick={() => navigate(`/workspace/platform/people-organisations/${other.id}`)}>
                                   View Details
                                 </Button>
                              </div>
                           </div>
                         );
                      })}
                      {relationships.length === 0 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4">
                           <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                             <GitBranch size={32} />
                           </div>
                           <p className="text-zinc-500 max-w-md mx-auto">
                             No relationships recorded for this entity.
                           </p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'activity' && (
             <div className="space-y-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Activity Timeline</h3>
                
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 dark:before:via-zinc-800 before:to-transparent">
                   {auditLogs.map((log, idx) => (
                      <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <Clock size={16} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-bold text-zinc-900 dark:text-white text-sm capitalize">{log.action.replace(/_/g, ' ').toLowerCase()}</div>
                            <time className="font-mono text-[10px] text-zinc-400">{new Date(log.timestamp).toLocaleString()}</time>
                          </div>
                          <div className="text-zinc-500 text-xs">
                             Performed by <span className="font-medium text-zinc-700 dark:text-zinc-300">{log.actorId}</span>
                          </div>
                        </div>
                      </div>
                   ))}
                   {auditLogs.length === 0 && (
                     <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4 ml-10">
                        <p className="text-zinc-500">No activity recorded yet.</p>
                     </div>
                   )}
                </div>
             </div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={`Delete ${displayName}?`}
        description="This action cannot be undone. All associated data and relationships will be permanently removed."
        isDeleting={isDeleting}
      />

      <AddRelationshipModal 
        isOpen={isAddRelationshipModalOpen}
        onClose={() => setIsAddRelationshipModalOpen(false)}
        onSuccess={() => {
          fetchExtras();
          fetchParty();
        }}
        sourcePartyId={id!}
      />

      <Modal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title="Relationship Map"
        size="xl"
      >
        <div className="h-[600px]">
          <RelationshipGraph 
            rootId={id} 
            rootName={displayName} 
            rootType={party.partyType} 
          />
        </div>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  ChevronRight, 
  User, 
  Shield, 
  Settings, 
  Activity, 
  Trash2, 
  Save, 
  Cpu, 
  Network,
  Zap,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  MapPin,
  Plus,
  X,
  Calendar,
  Receipt,
  Clock,
  Copy,
  Contact,
  Globe,
  FileBadge,
  Smile,
  Sparkles,
  UserX,
  UserCheck
} from 'lucide-react';
import { useMember } from '../../hooks/useMember';
import { useTeams } from '../../hooks/useTeams';
import { usePositions } from '../../hooks/usePositions';
import { useUsers } from '../../hooks/useUsers';
import { usePlatform } from '../../hooks/usePlatform';
import { Button, Input, Select, Badge, cn } from '../../components/UI/Primitives';
import { Tabs } from '../../components/UI/TabsAndModal';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { PermissionsTab } from '../../components/Settings/Workforce/PermissionsTab';
import { AvatarUpload } from '../../components/Common/AvatarUpload';
import { OnboardingWizard } from '../../components/Settings/Workforce/OnboardingWizard';
import { SignaturePad } from '../../components/Settings/Workforce/SignaturePad';
import { CreateContractModal } from '../../components/Settings/Workforce/CreateContractModal';
import { RequestLeaveModal } from '../../components/Settings/Workforce/RequestLeaveModal';

export const MemberDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member, loading, updateMember, deleteMember } = useMember(id);
  const { refreshBilling } = usePlatform();
  const { teams } = useTeams();
  const { positions } = usePositions();
  const { cloneMember } = useUsers();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Workforce Hub Enhancements
  const [avatarUrl, setAvatarUrl] = useState('');
  const [aiHumour, setAiHumour] = useState(0.5);
  const [licenceType, setLicenceType] = useState('Standard');
  const [isContractor, setIsContractor] = useState(false);
  const [workEmail, setWorkEmail] = useState('');
  const [signature, setSignature] = useState('');

  // Local form state
  const [role, setRole] = useState('');
  const [teamId, setTeamId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [status, setStatus] = useState('');
  const [modelType, setModelType] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  // New Staff Details state
  const [firstName, setFirstName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [workArrangements, setWorkArrangements] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Relations state
  const [phoneNumbers, setPhoneNumbers] = useState<{ label: string; number: string }[]>([]);
  const [certifications, setCertifications] = useState<{ name: string; issuer: string; dateObtained?: string; expiryDate?: string }[]>([]);
  const [education, setEducation] = useState<{ institution: string; degree: string; fieldOfStudy: string; startDate?: string; endDate?: string }[]>([]);
  const [skills, setSkills] = useState<{ name: string; proficiencyLevel: string }[]>([]);

  const fullName = !member?.isSynthetic && (firstName || familyName) 
    ? `${firstName} ${familyName}`.trim() 
    : member?.name;

  // Initialize local state when member is loaded
  React.useEffect(() => {
    if (member) {
      setRole(member.role);
      setTeamId(member.teamId || '');
      setPositionId(member.positionId || '');
      setStatus(member.status);
      setModelType(member.modelType || '');
      setSystemPrompt(member.agentConfig?.systemPrompt || '');
      setTemperature(member.agentConfig?.temperature || 0.7);

      setFirstName(member.firstName || '');
      setOtherName(member.otherName || '');
      setFamilyName(member.familyName || '');
      setPersonalEmail(member.personalEmail || '');
      setHomeAddress(member.homeAddress || '');
      setWorkArrangements(member.workArrangements || '');
      setEmergencyContact(member.emergencyContact || '');
      setDateOfBirth(member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '');
      setGender(member.gender || '');
      setNationality(member.nationality || '');
      setStartDate(member.startDate ? new Date(member.startDate).toISOString().split('T')[0] : '');
      setEndDate(member.endDate ? new Date(member.endDate).toISOString().split('T')[0] : '');

      setAvatarUrl(member.avatarUrl || '');
      setAiHumour(member.aiHumour || 0.5);
      setLicenceType(member.licenceType || 'Standard');
      setIsContractor(member.isContractor || false);
      setWorkEmail(member.workEmail || '');
      setSignature(member.signature || '');

      setPhoneNumbers(member.phoneNumbers || []);
      setCertifications(member.certifications || []);
      setEducation(member.education || []);
      setSkills(member.skills || []);
    }
  }, [member]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMember({
        role,
        teamId,
        positionId,
        status,
        modelType,
        agentConfig: member?.isSynthetic ? {
          systemPrompt,
          temperature
        } : undefined,
        firstName,
        otherName,
        familyName,
        personalEmail,
        homeAddress,
        workArrangements,
        emergencyContact,
        dateOfBirth,
        gender,
        nationality,
        startDate,
        endDate,
        phoneNumbers,
        certifications,
        education,
        skills,
        avatarUrl,
        aiHumour,
        licenceType,
        isContractor,
        workEmail,
        signature
      });
      await refreshBilling();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!member) return;
    setIsDeleting(true);
    try {
      await deleteMember();
      navigate('/workspace/settings/workforce');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleClone = async () => {
    if (!id) return;
    setIsCloning(true);
    try {
      const cloned = await cloneMember(id);
      if (cloned) {
        navigate(`/workspace/settings/workforce/member/${cloned.id}`);
      }
    } finally {
      setIsCloning(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!member) return;
    setIsTogglingStatus(true);
    const newStatus = status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateMember({ status: newStatus });
      setStatus(newStatus);
      await refreshBilling();
    } finally {
      setIsTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 animate-pulse font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-2xl">
        <p className="text-red-500 font-medium">Member not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/workspace/settings/workforce')}>
          Back to Workforce
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      {/* Breadcrumbs & Navigation */}
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
          <span className="text-zinc-900 dark:text-zinc-100">{fullName}</span>
        </div>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="flex items-center gap-6">
          <AvatarUpload 
            currentUrl={avatarUrl}
            onUpload={async (url) => {
              setAvatarUrl(url);
              await updateMember({ avatarUrl: url });
            }}
            name={fullName}
          />
          <div className="space-y-4">
             <div className="flex items-center gap-3">
               <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{fullName}</h1>
                <Badge variant={member.isSynthetic ? "purple" : "blue"}>
                  {member.isSynthetic ? "AI Agent" : "Person"}
                </Badge>
             </div>
             <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-zinc-500 font-medium">
                <span className="flex items-center gap-2 text-sm italic">
                  <Mail size={14} /> {member.email}
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <Shield size={12} /> ID: {member.id.substring(0, 12)}
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <Calendar size={12} /> Joined: {new Date(member.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {isContractor && <Badge variant="zinc" className="uppercase tracking-widest text-[8px]">Contractor</Badge>}
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={handleClone} 
            disabled={isCloning}
            className="gap-2 px-5"
          >
            {isCloning ? (
              <div className="h-4 w-4 border-2 border-zinc-500/20 border-t-zinc-500 rounded-full animate-spin" />
            ) : (
              <Copy size={16} />
            )}
            Clone
          </Button>
          <Button 
            variant={status === 'Active' ? 'secondary' : 'primary'}
            onClick={handleToggleStatus}
            disabled={isTogglingStatus}
            className="gap-2 px-5 font-bold"
          >
            {isTogglingStatus ? (
              <div className="h-4 w-4 border-2 border-zinc-500/20 border-t-zinc-500 rounded-full animate-spin" />
            ) : status === 'Active' ? (
              <UserX size={16} />
            ) : (
              <UserCheck size={16} />
            )}
            {status === 'Active' ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="danger" onClick={handleDelete} className="gap-2 px-5 font-bold">
            <Trash2 size={16} />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-6 font-bold">
            {isSaving ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            Save
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="space-y-6">
        <Tabs 
          tabs={[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'personal', label: 'Personal', icon: Shield },
            { id: 'employment', label: 'Job', icon: Briefcase },
            { id: 'professional', label: 'Skills', icon: Sparkles },
            { id: 'contracts', label: 'Contracts', icon: Receipt },
            { id: 'leave', label: 'Time Off', icon: Clock },
            ...(member.isSynthetic ? [{ id: 'configuration', label: 'AI Settings', icon: Sparkles }] : []),
            { id: 'permissions', label: 'Permissions', icon: Shield },
            { id: 'activity', label: 'Activity', icon: Activity } 
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-8 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                     <h3 className="text-lg font-bold flex items-center gap-2">
                        <Shield size={18} className="text-blue-500" /> General Info
                     </h3>
                     <Badge 
                       variant={status === 'Active' ? 'blue' : 'zinc'} 
                       className={cn(
                         "border-none px-3",
                         status === 'Active' ? "bg-blue-500/10 text-blue-600" : "bg-zinc-500/10 text-zinc-600"
                       )}
                     >
                       {status}
                     </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Security Role</label>
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 font-bold">{member.role}</p>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Position</label>
                        {member.positionNumber ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="blue" className="font-mono text-[10px]">{member.positionNumber}</Badge>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100 font-bold">{member.position}</p>
                          </div>
                        ) : (
                          <p className="text-zinc-400 italic text-sm">Unassigned</p>
                        )}
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Work Arrangement</label>
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 font-bold">{workArrangements || 'Not Specified'}</p>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400">License Seat</label>
                        <Badge variant="zinc" className={cn(
                          "font-black border-none text-[10px]",
                          licenceType === 'Developer' ? "text-indigo-500 bg-indigo-500/10" : "text-zinc-500 bg-zinc-500/10"
                        )}>{licenceType}</Badge>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Status</label>
                        <Badge variant={status === 'Active' ? 'green' : 'zinc'} className="font-black text-[10px]">
                           {status}
                        </Badge>
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-600 px-0" onClick={() => setActiveTab('activity')}>
                       <Activity size={14} className="mr-2" /> View Activity Log
                    </Button>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Last Modified: {new Date(member.updatedAt).toLocaleTimeString()}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6 shadow-sm">
                     <h3 className="font-bold flex items-center gap-2 text-zinc-900 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <Network size={18} className="text-purple-500" /> Team
                     </h3>
                     <div className="flex flex-wrap gap-2">
                        {member.team !== "Unassigned" ? (
                          <div className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center gap-4 hover:border-indigo-500/20 transition-colors">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-sm shadow-indigo-500/10">
                              <Zap size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-black text-zinc-400 leading-none mb-1.5 tracking-widest">Assigned Team</p>
                              <span className="text-lg font-black text-zinc-800 dark:text-zinc-200 tracking-tight">{member.team}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500 italic py-4 text-center w-full">No team allocation found for this member Profile.</p>
                        )}
                     </div>
                  </div>

                  {!member.isSynthetic && (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6 shadow-sm">
                       <h3 className="font-bold flex items-center gap-2 text-zinc-900 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-800">
                          <Mail size={18} className="text-emerald-500" /> Work Contact
                       </h3>
                       <div className="grid grid-cols-1 gap-6">
                          <div>
                             <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-1.5">Email</label>
                             <div className="flex items-center gap-3 text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                                <Mail size={18} className="text-zinc-400" />
                                {member.email}
                             </div>
                          </div>
                          {phoneNumbers[1] && (
                            <div>
                               <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-1.5">Primary Contact</label>
                               <div className="flex items-center gap-3 text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                                  <Phone size={18} className="text-zinc-400" />
                                  {phoneNumbers[0].number}
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-8 shadow-sm">
                     <h3 className="text-lg font-black flex items-center gap-3 text-zinc-900 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-800">
                       <Contact size={20} className="text-blue-500" /> Personal Details
                     </h3>
                     <div className="grid grid-cols-1 gap-6">
                        <Input label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. John" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <Input label="Other / Middle Names" value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="e.g. Robert" />
                           <Input label="Family Name" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="e.g. Smith" />
                        </div>
                     </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-8 shadow-sm">
                     <h3 className="text-lg font-black flex items-center gap-3 text-zinc-900 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-800">
                       <Globe size={20} className="text-purple-500" /> Background
                     </h3>
                     <div className="grid grid-cols-1 gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <Select 
                             label="Gender" 
                             value={gender} 
                             onChange={e => setGender(e.target.value)}
                             options={[
                               { label: 'Not Specified', value: '' },
                               { label: 'Male', value: 'Male' },
                               { label: 'Female', value: 'Female' },
                               { label: 'Non-binary', value: 'Non-binary' },
                               { label: 'Other', value: 'Other' }
                             ]} 
                           />
                           <Input label="Nationality" value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. Australian" />
                        </div>
                        <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                     </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 space-y-10 shadow-sm overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-red-500/5 rounded-full" />
                   <h3 className="text-xl font-black flex items-center gap-3 text-zinc-900 dark:text-white pb-4 border-b border-zinc-100 dark:border-zinc-800 relative">
                     <MapPin size={24} className="text-red-500" /> Personal Contact Info
                   </h3>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <Input label="Personal Email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} placeholder="john.doe@example.com" />
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Home Address</label>
                            <textarea 
                              className="w-full h-32 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-shadow hover:shadow-md"
                              value={homeAddress}
                              onChange={e => setHomeAddress(e.target.value)}
                              placeholder="Mailing address..."
                            />
                         </div>
                      </div>
                      <div className="space-y-6">
                         <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                               <Phone size={14} className="text-zinc-600" /> Phone Numbers
                            </label>
                            <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-200 dark:border-zinc-800" onClick={() => setPhoneNumbers([...phoneNumbers, { label: 'Mobile', number: '' }])}>
                               <Plus size={14} className="mr-2" /> Add Phone Number
                            </Button>
                         </div>
                         <div className="space-y-3">
                            {phoneNumbers.map((phone, idx) => (
                              <div key={idx} className="flex gap-3 group">
                                <select 
                                  className="w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold uppercase tracking-tight"
                                  value={phone.label}
                                  onChange={e => {
                                    const next = [...phoneNumbers];
                                    next[idx].label = e.target.value;
                                    setPhoneNumbers(next);
                                  }}
                                >
                                  <option>Mobile</option>
                                  <option>Work</option>
                                  <option>Home</option>
                                  <option>Satellite</option>
                                </select>
                                <Input 
                                  className="h-11 font-mono tracking-wider"
                                  value={phone.number}
                                  onChange={e => {
                                    const next = [...phoneNumbers];
                                    next[idx].number = e.target.value;
                                    setPhoneNumbers(next);
                                  }}
                                />
                                <button className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" onClick={() => setPhoneNumbers(phoneNumbers.filter((_, i) => i !== idx))}>
                                  <X size={18} />
                                </button>
                              </div>
                            ))}
                            {phoneNumbers.length === 0 && <p className="text-sm font-medium text-zinc-400 italic text-center py-6 bg-zinc-50 dark:bg-black/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">No phone numbers added yet.</p>}
                         </div>
                      </div>
                   </div>
                </div>
            </motion.div>
          )}

          {activeTab === 'employment' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                 <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-6">
                       <h3 className="text-xl font-bold flex items-center gap-3">
                          <Briefcase size={24} className="text-orange-500" /> Job Details
                       </h3>
                       <Badge variant="blue" className="bg-orange-500/10 text-orange-600 border-none px-4 py-1 font-black text-[10px] tracking-widest shadow-sm shadow-orange-500/10">STATUS</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                      <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                      <Select 
                           label="Assignment Status" 
                           value={status}
                           onChange={(e) => setStatus(e.target.value)}
                           options={[
                             { label: 'Active', value: 'Active' },
                             { label: 'Inactive / Suspended', value: 'Inactive' },
                             { label: 'Pending / Onboarding', value: 'Pending' }
                           ]}
                         />
                      <Select 
                         label="Work Arrangement" 
                         value={workArrangements}
                         onChange={e => setWorkArrangements(e.target.value)}
                         options={[
                           { label: 'Not Specified', value: '' },
                           { label: 'Office Based', value: 'Office Based' },
                           { label: 'Remote / WFH', value: 'Work From Home' },
                           { label: 'Hybrid', value: 'Hybrid' },
                           { label: 'Field Based', value: 'Field Based' }
                         ]}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pt-10 border-t border-zinc-100 dark:border-zinc-800">
                       <Select 
                         label="Role" 
                         value={role} 
                         onChange={(e) => setRole(e.target.value)}
                         options={[
                           { label: 'Standard Member', value: 'Standard' },
                           { label: 'Team Lead', value: 'Lead' },
                           { label: 'Organization Admin', value: 'Admin' }
                         ]}
                       />
                       <Select 
                         label="Team" 
                         value={teamId}
                         onChange={(e) => setTeamId(e.target.value)}
                         options={[{ label: 'None', value: '' }, ...teams.map(t => ({ label: t.name, value: t.id }))]}
                       />
                       <Select 
                         label="Position" 
                         value={positionId}
                         onChange={(e) => setPositionId(e.target.value)}
                         options={[{ label: 'Unassigned', value: '' }, ...positions.map(p => ({ label: `${p.title} (${p.positionNumber})`, value: p.id }))]}
                       />
                       <Select 
                         label="License Seat" 
                         value={licenceType}
                         onChange={e => setLicenceType(e.target.value)}
                         options={[
                           { label: 'Standard Seat', value: 'Standard' },
                           { label: 'Developer Seat', value: 'Developer' },
                         ]}
                       />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-zinc-100 dark:border-zinc-800">
                       <Input label="Work Email" value={workEmail} onChange={e => setWorkEmail(e.target.value)} placeholder="e.g. system@org.ai" />
                       <Input label="Emergency Contact" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="Name and Phone Number" />
                    </div>
                    
                    <div className="pt-10 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Digital Signature</label>
                        <Badge variant="zinc" className="text-[10px] font-bold">DIGITALLY SECURED</Badge>
                      </div>
                      <SignaturePad 
                        initialSignature={signature}
                        onSave={setSignature}
                      />
                    </div>
                 </div>
            </motion.div>
          )}

          {activeTab === 'professional' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-8 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                     <h3 className="text-lg font-bold flex items-center gap-2">
                        <GraduationCap size={18} className="text-blue-500" /> Education & Certifications
                     </h3>
                     <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500" onClick={() => setEducation([...education, { institution: '', degree: '', fieldOfStudy: '' }])}>
                       <Plus size={14} className="mr-2" /> Add Education
                     </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-l-2 border-blue-500 pl-3">Education</h4>
                        <div className="space-y-4">
                           {education.map((edu, idx) => (
                             <div key={idx} className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 relative group transition-all hover:bg-white dark:hover:bg-zinc-900 hover:shadow-lg">
                                <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity" onClick={() => setEducation(education.filter((_, i) => i !== idx))}>
                                  <X size={18} />
                                </button>
                                <div className="space-y-4">
                                   <Input label="Institution" value={edu.institution} onChange={e => {
                                     const next = [...education];
                                     next[idx].institution = e.target.value;
                                     setEducation(next);
                                   }} />
                                   <div className="grid grid-cols-2 gap-4">
                                      <Input label="Degree / Qualification" value={edu.degree} onChange={e => {
                                        const next = [...education];
                                        next[idx].degree = e.target.value;
                                        setEducation(next);
                                      }} />
                                      <Input label="Field of Study" value={edu.fieldOfStudy} onChange={e => {
                                        const next = [...education];
                                        next[idx].fieldOfStudy = e.target.value;
                                        setEducation(next);
                                      }} />
                                   </div>
                                </div>
                             </div>
                           ))}
                           {education.length === 0 && <p className="text-sm text-zinc-400 italic text-center py-12 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">No education records found.</p>}
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-l-2 border-orange-500 pl-3">Certifications</h4>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setCertifications([...certifications, { name: '', issuer: '' }])}>
                             <Plus size={12} className="mr-1" /> Add Cert
                          </Button>
                        </div>
                        <div className="space-y-4">
                           {certifications.map((cert, idx) => (
                             <div key={idx} className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 relative group transition-all hover:bg-white dark:hover:bg-zinc-900 hover:shadow-lg">
                                <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity" onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}>
                                   <X size={18} />
                                </button>
                                <div className="space-y-4">
                                   <Input label="Credential Name" value={cert.name} onChange={e => {
                                      const next = [...certifications];
                                      next[idx].name = e.target.value;
                                      setCertifications(next);
                                   }} />
                                   <Input label="Issuing Authority" value={cert.issuer} onChange={e => {
                                      const next = [...certifications];
                                      next[idx].issuer = e.target.value;
                                      setCertifications(next);
                                   }} />
                                </div>
                             </div>
                           ))}
                           {certifications.length === 0 && <p className="text-sm text-zinc-400 italic text-center py-12 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">No certifications recorded.</p>}
                        </div>
                     </div>
                  </div>

                  <div className="p-10 bg-zinc-50 dark:bg-black/20 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-8 mt-12 relative overflow-hidden shadow-sm">
                     <div className="absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 bg-yellow-500/5 rounded-full" />
                     <div className="flex items-center justify-between relative">
                        <h3 className="text-xl font-black flex items-center gap-3">
                          <Zap size={24} className="text-yellow-500" /> Skills & Expertise
                        </h3>
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{skills.length} Skills Added</span>
                           <Button variant="primary" size="sm" className="bg-zinc-900 dark:bg-white dark:text-black font-black text-[10px] tracking-widest px-6" onClick={() => setSkills([...skills, { name: '', proficiencyLevel: 'Intermediate' }])}>
                             <Plus size={16} className="mr-2" /> Add Skill
                           </Button>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-4 relative">
                        {skills.map((skill, idx) => (
                          <div key={idx} className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-6 py-3 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 group hover:border-indigo-500/50 hover:shadow-indigo-500/5 transition-all">
                            <input 
                               className="bg-transparent text-sm font-black focus:outline-none w-36 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300"
                               value={skill.name}
                               placeholder="Skill Name"
                               onChange={e => {
                                 const next = [...skills];
                                 next[idx].name = e.target.value;
                                 setSkills(next);
                               }}
                            />
                            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                            <select 
                               className="bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase rounded-lg px-3 py-1 tracking-widest cursor-pointer"
                               value={skill.proficiencyLevel}
                               onChange={e => {
                                 const next = [...skills];
                                 next[idx].proficiencyLevel = e.target.value;
                                 setSkills(next);
                               }}
                            >
                              <option>Beginner</option>
                              <option>Intermediate</option>
                              <option>Advanced</option>
                              <option>Expert</option>
                            </select>
                            <button onClick={() => setSkills(skills.filter((_, i) => i !== idx))} className="text-zinc-300 hover:text-red-500 ml-2 transition-colors">
                               <X size={16} />
                            </button>
                          </div>
                        ))}
                        {skills.length === 0 && <p className="text-sm font-medium text-zinc-400 italic text-center w-full py-8">No skills added yet.</p>}
                     </div>
                  </div>
                </div>
            </div>
          )}

           {activeTab === 'contracts' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 space-y-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 bg-zinc-500/5 rounded-full" />
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-8 relative">
                    <div>
                      <h3 className="text-2xl font-black flex items-center gap-3">
                        <Receipt size={28} className="text-zinc-400" /> Contracts
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-[0.2em] font-black">View and manage employment contracts.</p>
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="gap-3 bg-zinc-900 border-none hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-black text-[10px] tracking-widest px-8 shadow-xl"
                      onClick={() => setShowContractModal(true)}
                    >
                      <Plus size={16} /> Add Contract
                    </Button>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center py-24 bg-zinc-50/50 dark:bg-black/20 rounded-[2.5rem] border border-dashed border-zinc-200 dark:border-zinc-800 relative">
                    <div className="h-24 w-24 rounded-[2rem] bg-white dark:bg-zinc-800 shadow-2xl flex items-center justify-center text-zinc-400 mb-8 rotate-3 transition-transform hover:rotate-0">
                      <FileBadge size={48} />
                    </div>
                    <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 mb-2">No Contracts Found</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-black max-w-[320px] text-center leading-relaxed">Add a contract to confirm this member's employment details.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 space-y-10 shadow-sm">
                  <div className="flex items-center justify-between pb-8 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="font-black flex items-center gap-3 text-xl">
                      <Briefcase size={24} className="text-emerald-500" /> Salary & Pay
                    </h3>
                    <Badge variant="zinc" className="text-emerald-500 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 font-black text-[10px] tracking-widest px-4 py-1">NOT SET</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block border-l-4 border-emerald-500 pl-4">Base Salary</label>
                      <div className="flex items-baseline gap-4 mt-4">
                        <span className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">$0.00</span>
                        <Badge className="bg-zinc-100 text-zinc-400 dark:bg-zinc-800 border-none font-black text-[10px] tracking-widest">USD</Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block border-l-4 border-indigo-500 pl-4">Bonus / Incentives</label>
                      <p className="text-sm font-black text-zinc-400 italic mt-6 uppercase tracking-widest">Not set</p>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block border-l-4 border-purple-500 pl-4">Status</label>
                      <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 mt-6 tracking-tight">Initial pay details not set.</p>
                    </div>
                  </div>
                </div>
            </motion.div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Annual Leave', balance: '12.4 Days', color: 'blue' },
                    { label: 'Sick Leave', balance: '5.0 Days', color: 'red' },
                    { label: 'Unpaid Leave', balance: '0.0 Days', color: 'zinc' },
                    { label: 'Banked Overtime', balance: '2.5 Hrs', color: 'green' }
                  ].map((l, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group hover:scale-[1.03] transition-all hover:shadow-xl">
                      <div className={cn(
                        "absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-5 group-hover:opacity-15 transition-opacity",
                        l.color === 'blue' ? 'bg-blue-500' : 
                        l.color === 'red' ? 'bg-red-500' : 
                        l.color === 'green' ? 'bg-emerald-500' : 'bg-zinc-500'
                      )} />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">{l.label}</p>
                      <p className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{l.balance}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-10 space-y-10 shadow-sm relative overflow-hidden">
                      <div className="absolute bottom-0 right-0 w-64 h-64 -mr-16 -mb-16 bg-orange-500/5 rounded-full" />
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-8 relative">
                        <div className="flex items-center gap-6">
                          <div className="h-16 w-16 rounded-3xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10">
                            <Clock size={32} />
                          </div>
                          <div>
                            <h3 className="font-black text-2xl tracking-tighter">Time Tracking</h3>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">Monitor active shifts and availability.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 px-6">
                            History
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700 font-black px-10 border-none shadow-2xl shadow-orange-500/30 text-[10px] tracking-widest h-11"
                            onClick={() => setShowLeaveModal(true)}
                          >
                            Add Entry
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-6 relative">
                        <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em] px-6">
                          <span>Pay Period</span>
                          <span>Total Hours</span>
                          <span>Status</span>
                        </div>
                        <div className="p-8 flex items-center justify-between bg-zinc-50 dark:bg-black/20 rounded-3xl border border-zinc-100 dark:border-zinc-800 group hover:border-orange-500/30 transition-all hover:bg-white dark:hover:bg-zinc-900 hover:shadow-xl">
                          <div className="flex flex-col gap-2">
                            <span className="text-lg font-black tracking-tight">1 Apr - 15 Apr 2026</span>
                            <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest border-l-2 border-orange-500 pl-3">Current Period</span>
                          </div>
                          <div className="text-center">
                            <span className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">72.5</span>
                            <span className="text-sm font-black text-zinc-400 ml-2">/ 76.0 HRS</span>
                          </div>
                          <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-none px-6 py-2 font-black text-[10px] tracking-[0.1em] shadow-sm">ACTIVE</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-[0_20px_50px_rgba(79,70,229,0.3)] h-full flex flex-col justify-between group">
                        <Zap size={140} className="absolute -right-8 -bottom-8 text-white/10 rotate-12 transition-transform group-hover:rotate-0 duration-700" />
                        <div className="relative">
                          <h4 className="font-black text-3xl mb-4 tracking-tighter leading-none">Plan Your Time Off</h4>
                          <p className="text-indigo-100/90 text-[11px] font-bold leading-relaxed uppercase tracking-wider">Submit a request for future leave or time away.</p>
                        </div>
                        <Button variant="secondary" className="w-full font-black py-8 bg-white text-indigo-600 hover:bg-indigo-50 border-none shadow-2xl text-[10px] uppercase tracking-[0.2em] relative" onClick={() => setShowLeaveModal(true)}>
                          Request Leave
                        </Button>
                    </div>
                  </div>
                </div>
            </div>
          )}

          {activeTab === 'configuration' && (
            <div className="space-y-8">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm relative">
                   <div className="absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 bg-zinc-500/5 rounded-full" />
                   <div className="px-10 py-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between relative">
                      <div className="space-y-2">
                         <h3 className="font-black flex items-center gap-3 text-2xl tracking-tighter">
                           <Settings size={28} className="text-zinc-400" /> Agent Controls 
                         </h3>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Configure how this AI Agent operates.</p>
                      </div>
                      <Badge variant="zinc" className="bg-zinc-100 dark:bg-zinc-800 border-none px-4 py-1 font-black text-[10px] tracking-widest text-zinc-500 uppercase">System-Level</Badge>
                   </div>

                   <div className="p-10 space-y-12 relative">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                         <Select 
                           label="Security Role" 
                           value={role} 
                           onChange={(e) => setRole(e.target.value)}
                           options={[
                             { label: 'Standard Coworker', value: 'Standard' },
                             { label: 'Team Lead', value: 'Lead' },
                             { label: 'Organization Admin', value: 'Admin' }
                           ]}
                         />
                         <Select 
                           label="Team" 
                           value={teamId}
                           onChange={(e) => setTeamId(e.target.value)}
                           options={[
                             { label: 'None', value: '' },
                             ...teams.map(t => ({ label: t.name, value: t.id }))
                           ]}
                         />
                        <Select 
                          label="Position" 
                          value={positionId}
                          onChange={(e) => setPositionId(e.target.value)}
                          options={[
                            { label: 'Unassigned', value: '' },
                            ...positions.map(p => ({ label: `${p.title} (${p.positionNumber})`, value: p.id }))
                          ]}
                        />
                        <Select 
                           label="Status" 
                           value={status}
                           onChange={(e) => setStatus(e.target.value)}
                           options={[
                             { label: 'Active', value: 'Active' },
                             { label: 'Inactive / Suspended', value: 'Inactive' },
                             { label: 'Closed', value: 'Offline' }
                           ]}
                        />
                      </div>

                      {member.isSynthetic && (
                         <div className="pt-12 border-t border-zinc-100 dark:border-zinc-800 space-y-12 relative">
                            <div className="absolute -top-1 px-4 bg-white dark:bg-zinc-900 text-purple-600 font-black text-[10px] uppercase tracking-[0.2em] -mt-1 transform -translate-y-1/2">
                               <span className="flex items-center gap-3"><Cpu size={16} /> Synthetic Intelligence Configuration</span>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                               <div className="lg:col-span-1 space-y-8">
                                  <Select 
                                    label="AI Model" 
                                    value={modelType}
                                    onChange={(e) => setModelType(e.target.value)}
                                    options={[
                                      { label: 'OpenClaw Sweeper (Vision)', value: 'OpenClaw Sweeper' },
                                      { label: 'Gemini 2.0 Flash (Fast)', value: 'Gemini 2.0 Flash' },
                                      { label: 'Gemini 1.5 Pro (Reasoning)', value: 'Gemini 1.5 Pro' },
                                      { label: 'Claude 3.5 Sonnet (Logic)', value: 'Claude 3.5 Sonnet' }
                                    ]}
                                  />
                                 <div className="space-y-6 pt-4">
                                    <div className="space-y-4">
                                       <div className="flex items-center justify-between">
                                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Creativity</label>
                                          <span className="text-xs font-mono font-black text-purple-600">{(temperature * 100).toFixed(0)}%</span>
                                       </div>
                                       <input 
                                         type="range" 
                                         min="0" 
                                         max="1" 
                                         step="0.1" 
                                         className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                         value={temperature}
                                         onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                       />
                                    </div>

                                    <div className="space-y-4">
                                       <div className="flex items-center justify-between">
                                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                             <Smile size={14} /> Humor
                                          </label>
                                          <span className="text-xs font-mono font-black text-indigo-600">{Math.round(aiHumour * 100)}%</span>
                                       </div>
                                       <input 
                                         type="range" 
                                         min="0" 
                                         max="1" 
                                         step="0.1" 
                                         className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                         value={aiHumour}
                                         onChange={(e) => setAiHumour(parseFloat(e.target.value))}
                                       />
                                    </div>
                                 </div>
                               </div>

                               <div className="lg:col-span-2 space-y-4">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                                     <span>System Instructions</span>
                                     <Sparkles size={14} className="text-purple-400 opacity-50" />
                                  </label>
                                  <textarea 
                                    className="w-full h-64 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 text-sm resize-none focus:ring-2 focus:ring-purple-500 outline-none font-medium leading-relaxed shadow-inner"
                                    placeholder="Give the agent specific instructions on how to behave..."
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                  />
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <PermissionsTab 
              memberId={member.id}
              assignedGroups={member.permissionGroups || []}
              onUpdate={(groupIds) => updateMember({ permissionGroups: groupIds })}
            />
          )}

          {activeTab === 'activity' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4">
               <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                  <Activity size={32} />
               </div>
               <div className="space-y-1">
                  <h3 className="font-bold">No activity yet</h3>
                  <p className="text-sm text-zinc-500">Activity and event logs for this {member.isSynthetic ? 'agent' : 'person'} will appear here as they interact with the platform.</p>
               </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${member.isSynthetic ? 'Agent' : 'Person'}`}
        description={`Are you sure you want to delete "${fullName}"? This action cannot be undone and will permanently remove their access and history.`}
        isDeleting={isDeleting}
      />

      <OnboardingWizard 
        isOpen={isCloning}
        onClose={() => setIsCloning(false)}
        cloneFrom={member}
      />

      <CreateContractModal 
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        memberId={id || ''}
        memberName={fullName || ''}
        onSuccess={() => {
          // In a real app, refetch data here
        }}
      />

      <RequestLeaveModal 
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        memberId={id || ''}
        onSuccess={() => {
          // In a real app, refetch data here
        }}
      />
    </div>
  );
};

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
  Mail,
  Phone,
  GraduationCap,
  Award,
  Briefcase,
  MapPin,
  Plus,
  X,
  Calendar,
  Contact,
  Globe
} from 'lucide-react';
import { useMember } from '../../hooks/useMember';
import { useTeams } from '../../hooks/useTeams';
import { usePositions } from '../../hooks/usePositions';
import { Button, Input, Select, Badge, cn } from '../../components/UI/Primitives';
import { Tabs } from '../../components/UI/TabsAndModal';

export const MemberDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member, loading, updateMember, deleteMember } = useMember(id);
  const { teams } = useTeams();
  const { positions } = usePositions();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);

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
        skills
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
          <span className="text-zinc-400">Staff</span>
          <ChevronRight size={14} className="mx-2 text-zinc-600" />
          <span className="text-zinc-900 dark:text-zinc-100">{fullName}</span>
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
               <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{fullName}</h1>
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
            { id: 'personal', label: 'Personal Records' },
            { id: 'employment', label: 'Employment' },
            { id: 'professional', label: 'Professional & Skills' },
            ...(member.isSynthetic ? [{ id: 'configuration', label: 'Intelligence' }] : []),
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
                       <Shield size={18} className="text-blue-500" /> Organizational Identity
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-xs uppercase font-bold text-zinc-500">System Role</label>
                          <p className="text-zinc-900 dark:text-zinc-100 font-medium">{member.role}</p>
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs uppercase font-bold text-zinc-500">Assigned Position</label>
                          {member.positionNumber ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="blue" className="font-mono text-[10px]">{member.positionNumber}</Badge>
                              <p className="text-zinc-900 dark:text-zinc-100 font-medium">{member.position}</p>
                            </div>
                          ) : (
                            <p className="text-zinc-400 italic">Unassigned</p>
                          )}
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs uppercase font-bold text-zinc-500">Employment Status</label>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", member.status === 'Active' ? "bg-green-500" : "bg-zinc-400")} />
                            <p className="text-zinc-900 dark:text-zinc-100 font-medium">{member.status}</p>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs uppercase font-bold text-zinc-500">Work Arrangement</label>
                          <p className="text-zinc-900 dark:text-zinc-100 font-medium">{workArrangements || 'Not Specified'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                       <Network size={18} className="text-purple-500" /> Department & Teams
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

                 {!member.isSynthetic && (
                   <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                         <Mail size={18} className="text-blue-500" /> Contact Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
                            <label className="text-[10px] uppercase font-bold text-zinc-400">Primary Email</label>
                            <p className="text-sm font-medium truncate">{member.email}</p>
                         </div>
                         {phoneNumbers[0] && (
                           <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
                              <label className="text-[10px] uppercase font-bold text-zinc-400">{phoneNumbers[0].label}</label>
                              <p className="text-sm font-medium">{phoneNumbers[0].number}</p>
                           </div>
                         )}
                      </div>
                   </div>
                 )}
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
                          <dt className="text-xs text-zinc-500">Personnel Record Created</dt>
                          <dd className="text-xs text-zinc-800 dark:text-zinc-200 mt-1">{new Date(member.createdAt).toLocaleDateString()}</dd>
                       </div>
                    </dl>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'personal' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
                   <h3 className="font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                     <Contact size={18} className="text-blue-500" /> Full Legal Name
                   </h3>
                   <div className="space-y-4">
                      <Input label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. John" />
                      <Input label="Other / Middle Names" value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="e.g. Robert" />
                      <Input label="Family Name" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="e.g. Smith" />
                   </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
                   <h3 className="font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                     <Globe size={18} className="text-purple-500" /> Identity & Origin
                   </h3>
                   <div className="space-y-4">
                      <Select 
                        label="Gender" 
                        value={gender} 
                        onChange={e => setGender(e.target.value)}
                        options={[
                          { label: 'Not Specified', value: '' },
                          { label: 'Male', value: 'Male' },
                          { label: 'Female', value: 'Female' },
                          { label: 'Non-binary', value: 'Non-binary' },
                          { label: 'Prefer not to say', value: 'Other' }
                        ]} 
                      />
                      <Input label="Nationality" value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. Australian" />
                      <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                   </div>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
                   <h3 className="font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                     <MapPin size={18} className="text-red-500" /> Residential & Private Contact
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                         <Input label="Personal Email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} placeholder="john.private@example.com" />
                         <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Home Address</label>
                            <textarea 
                              className="w-full h-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              value={homeAddress}
                              onChange={e => setHomeAddress(e.target.value)}
                              placeholder="123 Example St, City, State, Postcode"
                            />
                         </div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                               <Phone size={12} className="text-zinc-400" /> Phone Numbers
                            </label>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setPhoneNumbers([...phoneNumbers, { label: 'Mobile', number: '' }])}>
                               <Plus size={10} className="mr-1" /> Add
                            </Button>
                         </div>
                         <div className="space-y-2">
                            {phoneNumbers.map((phone, idx) => (
                              <div key={idx} className="flex gap-2">
                                <select 
                                  className="w-24 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 text-xs"
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
                                </select>
                                <Input 
                                  className="h-9"
                                  value={phone.number}
                                  onChange={e => {
                                    const next = [...phoneNumbers];
                                    next[idx].number = e.target.value;
                                    setPhoneNumbers(next);
                                  }}
                                />
                                <button className="p-2 text-zinc-400 hover:text-red-500" onClick={() => setPhoneNumbers(phoneNumbers.filter((_, i) => i !== idx))}>
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'employment' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <Input label="Commencement Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input label="Termination / End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Briefcase size={16} className="text-orange-500" /> Job Specifics
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                       <Select 
                         label="Platform Access Role" 
                         value={role} 
                         onChange={(e) => setRole(e.target.value)}
                         options={[
                           { label: 'Standard Coworker', value: 'Standard' },
                           { label: 'Team Lead', value: 'Lead' },
                           { label: 'Organization Admin', value: 'Admin' }
                         ]}
                       />
                       <Select 
                         label="Employment Status" 
                         value={status}
                         onChange={(e) => setStatus(e.target.value)}
                         options={[
                           { label: 'Active', value: 'Active' },
                           { label: 'Inactive / Suspended', value: 'Inactive' },
                           { label: 'Pending / Onboarding', value: 'Pending' }
                         ]}
                       />
                       <Select 
                         label="Assigned Team" 
                         value={teamId}
                         onChange={(e) => setTeamId(e.target.value)}
                         options={[{ label: 'None', value: '' }, ...teams.map(t => ({ label: t.name, value: t.id }))]}
                       />
                       <Select 
                         label="Organizational Position" 
                         value={positionId}
                         onChange={(e) => setPositionId(e.target.value)}
                         options={[{ label: 'Unassigned', value: '' }, ...positions.map(p => ({ label: `${p.title} (${p.positionNumber})`, value: p.id }))]}
                       />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" /> Work Arrangements
                    </h4>
                    <Select 
                      label="Arrangement Type" 
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
                    <Input label="Emergency Contact Info" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="Name and Phone Number" />
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'professional' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="font-bold flex items-center gap-2">
                         <GraduationCap size={18} className="text-blue-500" /> Education
                       </h3>
                       <Button variant="ghost" size="sm" onClick={() => setEducation([...education, { institution: '', degree: '', fieldOfStudy: '' }])}>
                         <Plus size={14} />
                       </Button>
                    </div>
                    <div className="space-y-4">
                       {education.map((edu, idx) => (
                         <div key={idx} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 relative group">
                            <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500" onClick={() => setEducation(education.filter((_, i) => i !== idx))}>
                              <X size={14} />
                            </button>
                            <div className="space-y-3">
                               <Input label="Institution" value={edu.institution} onChange={e => {
                                 const next = [...education];
                                 next[idx].institution = e.target.value;
                                 setEducation(next);
                               }} />
                               <div className="grid grid-cols-2 gap-3">
                                  <Input label="Degree" value={edu.degree} onChange={e => {
                                    const next = [...education];
                                    next[idx].degree = e.target.value;
                                    setEducation(next);
                                  }} />
                                  <Input label="Field" value={edu.fieldOfStudy} onChange={e => {
                                    const next = [...education];
                                    next[idx].fieldOfStudy = e.target.value;
                                    setEducation(next);
                                  }} />
                               </div>
                            </div>
                         </div>
                       ))}
                       {education.length === 0 && <p className="text-sm text-zinc-500 italic text-center py-4">No education history recorded.</p>}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="font-bold flex items-center gap-2">
                         <Award size={18} className="text-orange-500" /> Certifications
                       </h3>
                       <Button variant="ghost" size="sm" onClick={() => setCertifications([...certifications, { name: '', issuer: '' }])}>
                         <Plus size={14} />
                       </Button>
                    </div>
                    <div className="space-y-4">
                       {certifications.map((cert, idx) => (
                         <div key={idx} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 relative group">
                            <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500" onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}>
                               <X size={14} />
                            </button>
                            <Input label="Certificate Name" value={cert.name} onChange={e => {
                               const next = [...certifications];
                               next[idx].name = e.target.value;
                               setCertifications(next);
                            }} />
                            <Input label="Issuing Body" value={cert.issuer} onChange={e => {
                               const next = [...certifications];
                               next[idx].issuer = e.target.value;
                               setCertifications(next);
                            }} />
                         </div>
                       ))}
                       {certifications.length === 0 && <p className="text-sm text-zinc-500 italic text-center py-4">No certifications recorded.</p>}
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="font-bold flex items-center gap-2">
                         <Zap size={18} className="text-yellow-500" /> Skills & Proficiencies
                       </h3>
                       <Button variant="ghost" size="sm" onClick={() => setSkills([...skills, { name: '', proficiencyLevel: 'Intermediate' }])}>
                         <Plus size={14} />
                       </Button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                       {skills.map((skill, idx) => (
                         <div key={idx} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-xl group border border-zinc-200 dark:border-zinc-700">
                           <input 
                              className="bg-transparent text-sm font-medium focus:outline-none w-24"
                              value={skill.name}
                              placeholder="Skill name"
                              onChange={e => {
                                const next = [...skills];
                                next[idx].name = e.target.value;
                                setSkills(next);
                              }}
                           />
                           <select 
                              className="bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold uppercase rounded-md px-1"
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
                           <button onClick={() => setSkills(skills.filter((_, i) => i !== idx))} className="text-zinc-400 hover:text-red-500 ml-1">
                              <X size={14} />
                           </button>
                         </div>
                       ))}
                    </div>
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
                       <Select 
                         label="Organizational Position" 
                         value={positionId}
                         onChange={(e) => setPositionId(e.target.value)}
                         options={[
                           { label: 'Unassigned', value: '' },
                           ...positions.map(p => ({ label: `${p.title} (${p.positionNumber})`, value: p.id }))
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

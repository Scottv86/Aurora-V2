import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  ShieldCheck, 
  Sliders, 
  Bell, 
  KeyRound, 
  Building2, 
  X, 
  Copy, 
  Plus, 
  Trash2, 
  Moon, 
  Sun, 
  Globe, 
  Clock, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Shield,
  Laptop,
  CheckCircle2,
  Camera,
  Award,
  Zap,
  Check,
  BadgeCheck,
  MapPin,
  Plane,
  DollarSign,
  FileText,
  Maximize2,
  Minimize2,
  Briefcase,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useEmployeeHR } from './EmployeeHub/useEmployeeHR';
import { HROverviewTab } from './EmployeeHub/HROverviewTab';
import { LeaveTab } from './EmployeeHub/LeaveTab';
import { TimesheetTab } from './EmployeeHub/TimesheetTab';
import { WorkArrangementsTab } from './EmployeeHub/WorkArrangementsTab';
import { RemunerationTab } from './EmployeeHub/RemunerationTab';
import { RequestsTab } from './EmployeeHub/RequestsTab';
import { SkillsCertificationsTab } from './EmployeeHub/SkillsCertificationsTab';

export type TabType = 
  | 'hr-overview'
  | 'hr-leave'
  | 'hr-timesheet'
  | 'hr-arrangements'
  | 'hr-pay'
  | 'hr-requests'
  | 'hr-credentials'
  | 'profile'
  | 'security'
  | 'preferences'
  | 'notifications'
  | 'developer'
  | 'workspaces'
  | 'licence';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabType;
}

interface PersonalToken {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  expiresIn: string;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, initialTab }) => {
  const { user: authUser, isSuperAdmin, tenantIds, currentRoleId } = useAuth();
  const { user: platformUser, refetchContext } = usePlatform();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'hr-overview');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Workforce & HR Hub state & operations
  const {
    data: hrData,
    isLoading: isHRLoading,
    submitLeave,
    saveTimesheet,
    submitTimesheet,
    updateWorkArrangements,
    lodgeRequest,
    updatePersonalDetails
  } = useEmployeeHR();

  // User Name & Avatar resolution
  const platformName = (platformUser?.firstName && platformUser?.lastName)
    ? `${platformUser.firstName} ${platformUser.lastName}`
    : (platformUser?.firstName || platformUser?.lastName);

  const resolvedName = platformName 
    || authUser?.user_metadata?.full_name 
    || authUser?.user_metadata?.display_name 
    || authUser?.user_metadata?.name 
    || authUser?.email?.split('@')[0] 
    || 'Aurora User';

  const resolvedAvatarUrl = platformUser?.avatarUrl 
    || authUser?.user_metadata?.avatar_url 
    || authUser?.user_metadata?.avatar 
    || authUser?.user_metadata?.picture 
    || '';

  const activeLicence = platformUser?.licenceType || 'Developer';

  // Profile form state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        setImgError(false);
        toast.success('Image loaded! Click "Save Profile" to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Security / Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Preferences state
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(theme || 'dark');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [defaultView, setDefaultView] = useState('dashboard');

  // Notifications state
  const [notifyWorkflowFailures, setNotifyWorkflowFailures] = useState(true);
  const [notifyAITasks, setNotifyAITasks] = useState(true);
  const [notifySystemHealth, setNotifySystemHealth] = useState(false);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [emailDigest, setEmailDigest] = useState<'instant' | 'daily' | 'off'>('instant');

  // Developer Keys state
  const [tokens, setTokens] = useState<PersonalToken[]>([
    {
      id: 'pat-1',
      name: 'Antigravity CLI (laptop-work)',
      prefix: 'aurora_pat_9a8f...',
      createdAt: '2026-07-20',
      lastUsed: '2 hours ago',
      expiresIn: '90 days'
    }
  ]);
  const [newTokenName, setNewTokenName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  // Sync profile data on modal open or user state update
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else {
        setActiveTab('hr-overview');
      }
      setFirstName(platformUser?.firstName || authUser?.user_metadata?.first_name || resolvedName.split(' ')[0] || '');
      setLastName(platformUser?.lastName || authUser?.user_metadata?.last_name || resolvedName.split(' ').slice(1).join(' ') || '');
      setDisplayName(resolvedName);
      setAvatarUrl(resolvedAvatarUrl);
      setJobTitle(platformUser?.position || authUser?.user_metadata?.job_title || 'Systems Analyst');
      setBio(authUser?.user_metadata?.bio || '');
      setImgError(false);

      if (hrData?.member) {
        setEmergencyContact(hrData.member.emergencyContact || 'Sarah Powers (Spouse) - +61 400 123 456');
        setHomeAddress(hrData.member.homeAddress || 'Level 14, 200 George Street, Sydney NSW 2000');
        setPersonalEmail(hrData.member.personalEmail || 'personal.contact@example.com');
      }
    }
  }, [isOpen, initialTab, authUser, platformUser, resolvedName, resolvedAvatarUrl, hrData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const fullComputedName = `${firstName.trim()} ${lastName.trim()}`.trim() || displayName;
      const cleanAvatar = avatarUrl.trim();

      // 1. Update Supabase Auth user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullComputedName,
          display_name: displayName || fullComputedName,
          avatar_url: cleanAvatar,
          job_title: jobTitle,
          bio: bio
        }
      });
      if (error) throw error;

      // 2. Persist to Prisma DB
      const sess = await supabase.auth.getSession();
      const token = (import.meta as any).env.VITE_DEV_TOKEN || sess.data.session?.access_token;
      if (token) {
        await fetch('http://localhost:3001/api/platform/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            displayName: displayName || fullComputedName,
            avatarUrl: cleanAvatar,
            jobTitle
          })
        }).catch(() => {});
      }

      // 3. Update personal, emergency, and address records
      await updatePersonalDetails({
        emergencyContact,
        homeAddress,
        personalEmail
      });

      if (refetchContext) {
        await refetchContext();
      }

      toast.success('Profile and employee details updated!');
    } catch (err: any) {
      console.error('[AccountModal] Failed to save profile:', err);
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCreateToken = () => {
    if (!newTokenName.trim()) {
      toast.error('Please enter a token name');
      return;
    }
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const fullKey = `aurora_pat_live_${randomHex}`;
    const newToken: PersonalToken = {
      id: `pat-${Date.now()}`,
      name: newTokenName.trim(),
      prefix: `${fullKey.substring(0, 16)}...`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Just now',
      expiresIn: '90 days'
    };

    setTokens([newToken, ...tokens]);
    setGeneratedKey(fullKey);
    setNewTokenName('');
    setIsCreatingToken(false);
    toast.success('Personal access token created!');
  };

  const handleRevokeToken = (tokenId: string) => {
    setTokens(tokens.filter(t => t.id !== tokenId));
    toast.success('Token revoked');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getInitials = () => {
    const nameToUse = resolvedName || displayName;
    if (nameToUse) {
      const parts = nameToUse.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return nameToUse.substring(0, 2).toUpperCase();
    }
    return authUser?.email?.substring(0, 2).toUpperCase() || 'AU';
  };

  const activeAvatar = avatarUrl || resolvedAvatarUrl;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Backdrop Blur & Fade Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
          />

          {/* Premium Animated Modal Dialog matching Workspace Module Record Detail Modal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative z-10 w-full transition-all duration-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 ${
              isFullScreen ? 'w-[98vw] h-[96vh] max-w-none' : 'max-w-[96vw] 2xl:max-w-[1720px] h-[92vh]'
            }`}
          >
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3.5">
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-indigo-500/20 overflow-hidden shrink-0">
                  {activeAvatar && !imgError ? (
                    <img 
                      src={activeAvatar} 
                      alt={resolvedName} 
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    getInitials()
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                    {resolvedName}
                    <span className="text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      {isSuperAdmin ? 'Super Admin' : activeLicence}
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {authUser?.email || platformUser?.email || 'Account Settings'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                  title={isFullScreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
                >
                  {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body Layout (Sidebar + Tab Content) */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* Navigation Sidebar */}
              <div className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/40 dark:bg-zinc-950/40 space-y-4 overflow-y-auto">
                
                {/* SECTION 1: WORKSPACE & HR */}
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    My Workplace & HR
                  </div>

                  <button
                    onClick={() => setActiveTab('hr-overview')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'hr-overview'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles size={15} />
                    Overview
                  </button>

                  <button
                    onClick={() => setActiveTab('hr-leave')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'hr-leave'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Plane size={15} />
                    Leave & Time Off
                  </button>

                  <button
                    onClick={() => setActiveTab('hr-timesheet')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'hr-timesheet'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Clock size={15} />
                    Weekly Timesheets
                  </button>

                  <button
                    onClick={() => setActiveTab('hr-arrangements')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'hr-arrangements'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <MapPin size={15} />
                    Work Arrangements
                  </button>

                  <button
                    onClick={() => setActiveTab('hr-pay')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'hr-pay'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <DollarSign size={15} />
                    Pay & Remuneration
                  </button>

                  <button
                    onClick={() => setActiveTab('hr-requests')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'hr-requests'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText size={15} />
                    Requests & Claims
                  </button>

                  <button
                    onClick={() => setActiveTab('hr-credentials')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'hr-credentials'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Award size={15} />
                    Skills & Credentials
                  </button>
                </div>

                {/* SECTION 2: PERSONAL IDENTITY */}
                <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    My Profile
                  </div>

                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'profile'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <UserIcon size={15} />
                    Profile & Contacts
                  </button>

                  <button
                    onClick={() => setActiveTab('licence')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'licence'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <BadgeCheck size={15} />
                    Licence Type
                  </button>
                </div>

                {/* SECTION 3: SYSTEM SETTINGS */}
                <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    System & Security
                  </div>

                  <button
                    onClick={() => setActiveTab('security')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'security'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <ShieldCheck size={15} />
                    Security & Auth
                  </button>

                  <button
                    onClick={() => setActiveTab('preferences')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'preferences'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Sliders size={15} />
                    UX Preferences
                  </button>

                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'notifications'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Bell size={15} />
                    Notifications
                  </button>

                  <button
                    onClick={() => setActiveTab('developer')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'developer'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <KeyRound size={15} />
                    Developer Keys
                  </button>

                  <button
                    onClick={() => setActiveTab('workspaces')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'workspaces'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Building2 size={15} />
                    Workspaces & License
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-6 overflow-y-auto">

                {/* HR HUB TABS */}
                {activeTab === 'hr-overview' && (
                  hrData ? (
                    <HROverviewTab hrData={hrData} onNavigateTab={(tab) => setActiveTab(tab as TabType)} />
                  ) : (
                    <div className="p-12 text-center text-xs text-zinc-500 animate-pulse">
                      Loading workforce dashboard...
                    </div>
                  )
                )}

                {activeTab === 'hr-leave' && (
                  hrData ? (
                    <LeaveTab hrData={hrData} onSubmitLeave={submitLeave} />
                  ) : (
                    <div className="p-12 text-center text-xs text-zinc-500 animate-pulse">
                      Loading leave records...
                    </div>
                  )
                )}

                {activeTab === 'hr-timesheet' && (
                  hrData ? (
                    <TimesheetTab 
                      hrData={hrData} 
                      onSaveTimesheet={saveTimesheet} 
                      onSubmitTimesheet={submitTimesheet} 
                    />
                  ) : (
                    <div className="p-12 text-center text-xs text-zinc-500 animate-pulse">
                      Loading timesheet hours...
                    </div>
                  )
                )}

                {activeTab === 'hr-arrangements' && (
                  hrData ? (
                    <WorkArrangementsTab 
                      hrData={hrData} 
                      onUpdateArrangements={updateWorkArrangements} 
                    />
                  ) : (
                    <div className="p-12 text-center text-xs text-zinc-500 animate-pulse">
                      Loading work arrangements...
                    </div>
                  )
                )}

                {activeTab === 'hr-pay' && (
                  hrData ? (
                    <RemunerationTab hrData={hrData} />
                  ) : (
                    <div className="p-12 text-center text-xs text-zinc-500 animate-pulse">
                      Loading remuneration & payslips...
                    </div>
                  )
                )}

                {activeTab === 'hr-requests' && (
                  hrData ? (
                    <RequestsTab hrData={hrData} onLodgeRequest={lodgeRequest} />
                  ) : (
                    <div className="p-12 text-center text-xs text-zinc-500 animate-pulse">
                      Loading workplace requests...
                    </div>
                  )
                )}

                {activeTab === 'hr-credentials' && (
                  hrData ? (
                    <SkillsCertificationsTab hrData={hrData} />
                  ) : (
                    <div className="p-12 text-center text-xs text-zinc-500 animate-pulse">
                      Loading skills and credentials...
                    </div>
                  )
                )}

                {/* TAB 1: PROFILE */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleSaveProfile} className="w-full space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Personal Profile & Workplace Identity</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your identity, professional job details, emergency contacts, and residential records</p>
                      </div>
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 shrink-0 self-start sm:self-auto"
                      >
                        {isSavingProfile && <RefreshCw size={14} className="animate-spin" />}
                        Save Profile Changes
                      </button>
                    </div>

                    {/* Hidden File Input */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileSelect} 
                    />

                    {/* 2-Column Responsive Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full items-start">
                      
                      {/* Left Column (8 cols): Primary Profile Form */}
                      <div className="xl:col-span-8 space-y-6">
                        
                        {/* Section 1: Basic Identity Information */}
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <UserIcon size={14} className="text-indigo-500" />
                            Basic Identity
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">First Name</label>
                              <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First Name"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last Name"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Display Name</label>
                              <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="How your name appears in Aurora"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Job Title / Position</label>
                              <input
                                type="text"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="e.g. Systems Analyst"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Professional Bio / Mission</label>
                            <textarea
                              rows={3}
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Brief summary of your responsibilities, team function, or active focus..."
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Section 2: Contact Information */}
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Clock size={14} className="text-purple-500" />
                            Work & Personal Contact Details
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Primary Work Email</label>
                              <div className="relative">
                                <input
                                  type="email"
                                  disabled
                                  value={authUser?.email || platformUser?.email || ''}
                                  className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 cursor-not-allowed"
                                />
                                <span className="absolute right-2.5 top-2.5 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 rounded">
                                  Verified
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Secondary / Personal Email</label>
                              <input
                                type="email"
                                value={personalEmail}
                                onChange={(e) => setPersonalEmail(e.target.value)}
                                placeholder="personal.email@gmail.com"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                Emergency Contact (Next of Kin)
                              </label>
                              <input
                                type="text"
                                value={emergencyContact}
                                onChange={(e) => setEmergencyContact(e.target.value)}
                                placeholder="e.g. Sarah Powers (Spouse) - +61 400 123 456"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                Residential / Home Address
                              </label>
                              <input
                                type="text"
                                value={homeAddress}
                                onChange={(e) => setHomeAddress(e.target.value)}
                                placeholder="e.g. Level 14, 200 George Street, Sydney NSW 2000"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Right Column (4 cols): Profile Showcase & Employment Passport */}
                      <div className="xl:col-span-4 space-y-5">
                        
                        {/* Avatar & Photo Showcase Card */}
                        <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-center space-y-4">
                          <div className="flex flex-col items-center">
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="relative w-28 h-28 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 p-1 shadow-xl shadow-indigo-500/20 cursor-pointer group"
                            >
                              <div className="w-full h-full rounded-[22px] overflow-hidden bg-zinc-900 flex items-center justify-center text-white text-3xl font-bold relative">
                                {activeAvatar && !imgError ? (
                                  <img 
                                    src={activeAvatar} 
                                    alt={resolvedName} 
                                    onError={() => setImgError(true)}
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  getInitials()
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold">
                                  <Camera size={22} className="mb-1" />
                                  <span>Change Photo</span>
                                </div>
                              </div>
                            </div>

                            <h4 className="text-base font-bold text-zinc-900 dark:text-white mt-3">
                              {resolvedName}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {authUser?.email || platformUser?.email}
                            </p>

                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/20">
                                {jobTitle || 'Systems Analyst'}
                              </span>
                              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                                Active
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Camera size={14} />
                              Upload New Avatar Photo
                            </button>
                          </div>
                        </div>

                        {/* Employment Passport Card */}
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Briefcase size={14} className="text-amber-500" />
                            Workforce Passport
                          </h4>

                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
                              <span className="text-zinc-500">Department / Team</span>
                              <span className="font-semibold text-zinc-900 dark:text-white">Core Engineering</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
                              <span className="text-zinc-500">Contract Arrangement</span>
                              <span className="font-semibold text-zinc-900 dark:text-white">Hybrid (3/2)</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
                              <span className="text-zinc-500">Workstation / Desk</span>
                              <span className="font-semibold text-zinc-900 dark:text-white">Sydney HQ - Desk 4B</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-zinc-500">Digital Twin Delegation</span>
                              <span className="font-semibold text-purple-400 flex items-center gap-1">
                                <Sparkles size={12} /> Active & Ready
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  </form>
                )}

                {/* TAB 2: LICENCE TYPE */}
                {activeTab === 'licence' && (
                  <div className="space-y-6 w-full">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Licence Type & Capabilities</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">View your active platform licence tier, feature capabilities, and seat privileges</p>
                    </div>

                    {/* Active Licence Highlight Banner */}
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-teal-500/5 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          <Award size={18} />
                          Active Licence Tier: <span className="text-zinc-900 dark:text-white">{activeLicence}</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
                          Your enterprise seat is provisioned with full module development rights, distributed computing matrix access, Antigravity AI sub-agents, and high-frequency webhook triggers.
                        </p>
                      </div>
                      <span className="px-4 py-2 text-xs font-extrabold bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 shrink-0 self-start md:self-auto">
                        <BadgeCheck size={16} /> Enterprise {activeLicence} Tier
                      </span>
                    </div>

                    {/* 3-Column Licence Tiers Grid */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Available Platform Tiers</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                        {/* Developer Licence Card */}
                        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                          activeLicence === 'Developer'
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500/50 ring-2 ring-indigo-500/20 shadow-md'
                            : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                        }`}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                                <Zap size={16} className="text-indigo-500" />
                                Developer Licence
                              </div>
                              {activeLicence === 'Developer' ? (
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-500/20">Current Tier</span>
                              ) : (
                                <button onClick={() => toast.info('Licence upgrade request submitted to administrator')} className="text-[10px] font-bold text-indigo-600 hover:underline">Request Upgrade</button>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Designed for engineers building modules, executing CLI commands, and configuring sub-agents.</p>
                            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                              <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Module Editor & Schema Catalog</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Compute Matrix Sandboxes</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Antigravity Sub-agents & Swarms</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Personal API Tokens & CLI Access</div>
                            </div>
                          </div>
                          <div className="mt-5 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-400">
                            Seat assigned by organization admin
                          </div>
                        </div>

                        {/* Standard Licence Card */}
                        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                          activeLicence === 'Standard'
                            ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-500/50 ring-2 ring-purple-500/20 shadow-md'
                            : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                        }`}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                                <UserIcon size={16} className="text-purple-500" />
                                Standard Member
                              </div>
                              {activeLicence === 'Standard' && (
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-500/20">Current Tier</span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Ideal for team operations, automated triage queues, document workflows, and AI chat.</p>
                            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                              <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Triage & Work Queue Management</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Aurora Drive Cloud Storage</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> AI Assistant Interactive Chat</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Operational Analytics & Reports</div>
                            </div>
                          </div>
                          <div className="mt-5 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-400">
                            Standard enterprise seat
                          </div>
                        </div>

                        {/* AI Agent Seat Licence Card */}
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                                <Laptop size={16} className="text-teal-500" />
                                AI Agent Synthetic Seat
                              </div>
                              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-500/20">Autonomous Seat</span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Autonomous compute seat for background AI agents, automated handovers, and Digital Twins.</p>
                            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                              <div className="flex items-center gap-2"><Check size={14} className="text-teal-500" /> 24/7 Digital Twin Standby</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-teal-500" /> Overnight Batch Automation</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-teal-500" /> Morning Handover Synthesis</div>
                              <div className="flex items-center gap-2"><Check size={14} className="text-teal-500" /> Dedicated Background Token Pool</div>
                            </div>
                          </div>
                          <div className="mt-5 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-400">
                            Available across all enterprise plans
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SECURITY */}
                {activeTab === 'security' && (
                  <div className="space-y-6 w-full">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Security & Authentication</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your credentials, 2FA, active login sessions, and enterprise identity security</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full items-start">
                      {/* Left Column (7 cols): Password Change Form */}
                      <div className="xl:col-span-7 space-y-6">
                        <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-5">
                          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                              <Lock size={15} className="text-indigo-500" />
                              Change Account Password
                            </h4>
                            <span className="text-[11px] text-zinc-500">Last changed 42 days ago</span>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Current Password</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">New Password</label>
                              <div className="relative">
                                <input
                                  type={showNewPassword ? 'text' : 'password'}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Min 8 characters"
                                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Confirm New Password</label>
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                            <p className="font-semibold text-indigo-600 dark:text-indigo-400">Password Requirements:</p>
                            <p>• Minimum 8 characters • At least one uppercase letter and one special symbol • No common passwords</p>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={isUpdatingPassword || !newPassword}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                            >
                              {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Right Column (5 cols): 2FA & Active Sessions */}
                      <div className="xl:col-span-5 space-y-6">
                        {/* Two-Factor Authentication Status */}
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <Shield size={20} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-zinc-900 dark:text-white">Two-Factor Auth (2FA)</div>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">TOTP Authenticator Protection</div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setIs2FAEnabled(!is2FAEnabled);
                                toast.info(is2FAEnabled ? '2FA disabled for session' : '2FA verification prompt initiated');
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                is2FAEnabled
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300'
                              }`}
                            >
                              {is2FAEnabled ? 'Active' : 'Enable 2FA'}
                            </button>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Requires an authentication code from Google Authenticator, 1Password, or YubiKey whenever you log in from an untrusted browser.
                          </p>
                        </div>

                        {/* Active Sessions */}
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Active Device Sessions</h4>
                            <button
                              onClick={() => toast.success('Logged out of all other devices')}
                              className="text-[11px] text-red-500 hover:text-red-600 font-semibold"
                            >
                              Sign out others
                            </button>
                          </div>

                          <div className="space-y-2">
                            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <Laptop size={16} className="text-indigo-500" />
                                <div>
                                  <div className="font-bold text-zinc-900 dark:text-white">Current Web Browser</div>
                                  <div className="text-[11px] text-zinc-500">Windows 11 • Chrome 127 • 127.0.0.1</div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 rounded-full border border-emerald-500/20">
                                Active Now
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs opacity-75">
                              <div className="flex items-center gap-3">
                                <KeyRound size={16} className="text-purple-500" />
                                <div>
                                  <div className="font-bold text-zinc-900 dark:text-white">Antigravity CLI (agy)</div>
                                  <div className="text-[11px] text-zinc-500">CLI Daemon • Adelaide, AU</div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                                4h ago
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: PREFERENCES */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Interface & Regional Preferences</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Customize visual appearance, timezone, date conventions, and workspace default views</p>
                      </div>
                      <button
                        onClick={() => toast.success('Preferences saved successfully!')}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
                      >
                        Save Preferences
                      </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full items-start">
                      {/* Left Column (6 cols): Appearance & UI */}
                      <div className="xl:col-span-6 space-y-6">
                        <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Sun size={15} className="text-indigo-500" />
                            Theme & Appearance
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTheme('dark');
                                if (theme !== 'dark') toggleTheme();
                              }}
                              className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 text-xs font-bold transition-all ${
                                theme === 'dark'
                                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <Moon size={20} />
                              Dark Mode
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTheme('light');
                                if (theme !== 'light') toggleTheme();
                              }}
                              className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 text-xs font-bold transition-all ${
                                theme === 'light'
                                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <Sun size={20} />
                              Light Mode
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedTheme('system')}
                              className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 text-xs font-bold transition-all ${
                                selectedTheme === 'system'
                                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <Laptop size={20} />
                              System Auto
                            </button>
                          </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Sliders size={15} className="text-purple-500" />
                            Default Workspace Landing
                          </h4>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Initial View on Login</label>
                            <select
                              value={defaultView}
                              onChange={(e) => setDefaultView(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                              <option value="dashboard">Executive Dashboard (Overview & Analytics)</option>
                              <option value="triage">Triage Work Queue (Priority Actions)</option>
                              <option value="drive">Aurora Drive & Files (Document Library)</option>
                              <option value="analytics">Analytics & Metrics (System KPIs)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Right Column (6 cols): Regional & Localization */}
                      <div className="xl:col-span-6 space-y-6">
                        <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Globe size={15} className="text-amber-500" />
                            Regional & Date Formats
                          </h4>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Timezone</label>
                              <div className="relative">
                                <Globe size={15} className="absolute left-3.5 top-3 text-zinc-400" />
                                <select
                                  value={timezone}
                                  onChange={(e) => setTimezone(e.target.value)}
                                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                                  <option value="America/New_York">Eastern Time (US & Canada - UTC-5)</option>
                                  <option value="America/Los_Angeles">Pacific Time (US & Canada - UTC-8)</option>
                                  <option value="Europe/London">London (GMT/BST - UTC+0)</option>
                                  <option value="Australia/Adelaide">Australia/Adelaide (ACST - UTC+9:30)</option>
                                  <option value="Australia/Sydney">Australia/Sydney (AEST - UTC+10:00)</option>
                                  <option value="Asia/Tokyo">Tokyo (JST - UTC+9:00)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Date Display Format</label>
                              <div className="relative">
                                <Clock size={15} className="absolute left-3.5 top-3 text-zinc-400" />
                                <select
                                  value={dateFormat}
                                  onChange={(e) => setDateFormat(e.target.value)}
                                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard, e.g. 2026-11-13)</option>
                                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 13/11/2026)</option>
                                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/13/2026)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: NOTIFICATIONS */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6 w-full">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Notification Settings & Alerts</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure how and when Aurora delivers system notifications, audit alerts, and digest summaries</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full items-start">
                      {/* Left Column (8 cols): Event Subscriptions */}
                      <div className="xl:col-span-8 space-y-4">
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-white">Workflow & Module Execution Failures</div>
                            <div className="text-[11px] text-zinc-500">Instant toast and push alert when a running module pipeline encounters an exception</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifyWorkflowFailures}
                            onChange={(e) => setNotifyWorkflowFailures(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-white">AI Builder & Sub-agent Completion</div>
                            <div className="text-[11px] text-zinc-500">Notify when an async AI workflow generation or sub-agent background task concludes</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifyAITasks}
                            onChange={(e) => setNotifyAITasks(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-white">System Infrastructure & Health Warnings</div>
                            <div className="text-[11px] text-zinc-500">Alert for cluster latency spikes, quota limits, or compute node status changes</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifySystemHealth}
                            onChange={(e) => setNotifySystemHealth(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-white">Team Mentions & Leave Handover Requests</div>
                            <div className="text-[11px] text-zinc-500">Alert when a colleague delegates work items, approves leave, or requests your signoff</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifyMentions}
                            onChange={(e) => setNotifyMentions(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Right Column (4 cols): Delivery Frequency */}
                      <div className="xl:col-span-4 space-y-6">
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Bell size={14} className="text-indigo-500" />
                            Email Digest Frequency
                          </h4>
                          <select
                            value={emailDigest}
                            onChange={(e) => setEmailDigest(e.target.value as any)}
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="instant">Instant Real-Time Emails</option>
                            <option value="daily">Daily Morning Digest (08:00 AM)</option>
                            <option value="off">Off (In-App Bell Only)</option>
                          </select>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Daily summaries consolidate all unread workplace requests, timesheet approvals, and module run results into one clean briefing.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: DEVELOPER KEYS */}
                {activeTab === 'developer' && (
                  <div className="space-y-6 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Personal Access Tokens (PATs)</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Tokens for authenticating Antigravity CLI (`agy`), automated GitHub actions, and custom API pipelines</p>
                      </div>
                      <button
                        onClick={() => setIsCreatingToken(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
                      >
                        <Plus size={14} />
                        New Access Token
                      </button>
                    </div>

                    {/* Generated Token Warning Banner */}
                    {generatedKey && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={16} /> Token Generated Successfully!
                          </span>
                          <span className="text-[10px] text-emerald-500">Copy now, it won't be shown again.</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-emerald-500/30 text-xs font-mono">
                          <span className="flex-1 truncate select-all">{generatedKey}</span>
                          <button
                            onClick={() => copyToClipboard(generatedKey, 'Access token')}
                            className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <Copy size={15} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full items-start">
                      {/* Left Column (5 cols): Token Creation & CLI Quickstart */}
                      <div className="xl:col-span-5 space-y-6">
                        {/* Create Token Modal / Inline Form */}
                        {isCreatingToken ? (
                          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-indigo-500/40 shadow-xl space-y-4">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                              <KeyRound size={15} className="text-indigo-500" />
                              Generate New Access Token
                            </h4>
                            <div>
                              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Token Name / Purpose</label>
                              <input
                                type="text"
                                value={newTokenName}
                                onChange={(e) => setNewTokenName(e.target.value)}
                                placeholder="e.g. CI/CD Deployment Token"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={() => setIsCreatingToken(false)}
                                className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleCreateToken}
                                className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
                              >
                                Generate Token
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                              <Zap size={14} className="text-indigo-500" />
                              CLI Quickstart (`agy`)
                            </h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              Use personal access tokens to connect local developer workstations or terminal sessions to Aurora:
                            </p>
                            <pre className="p-3 rounded-xl bg-zinc-900 text-zinc-200 text-xs font-mono overflow-x-auto border border-zinc-800">
                              <code>agy login --token agy_live_...</code>
                            </pre>
                            <p className="text-[11px] text-zinc-500">
                              Tokens grant equivalent API privileges to your active platform user license.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right Column (7 cols): Active Tokens List */}
                      <div className="xl:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Active Tokens ({tokens.length})
                          </h4>
                          <span className="text-[11px] text-zinc-500">Auto-expires in 90 days</span>
                        </div>

                        <div className="space-y-2.5">
                          {tokens.map((t) => (
                            <div key={t.id} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs hover:border-indigo-500/40 transition-colors">
                              <div className="space-y-1">
                                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                  <KeyRound size={15} className="text-indigo-500" />
                                  {t.name}
                                </div>
                                <div className="text-[11px] text-zinc-500 font-mono">
                                  {t.prefix}•••••••••••• • Last accessed {t.lastUsed}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRevokeToken(t.id)}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                title="Revoke Token"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 7: WORKSPACES */}
                {activeTab === 'workspaces' && (
                  <div className="space-y-6 w-full">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Tenant Memberships & Scope</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Overview of your organizational tenant partitions, license entitlements, and role scopes</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
                      <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <ShieldCheck size={16} className="text-purple-500" />
                            Super Administrator Scope
                          </span>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                            isSuperAdmin 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800' 
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                          }`}>
                            {isSuperAdmin ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>

                        <div className="text-xs text-zinc-500 space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500">Active Role ID</span>
                            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{currentRoleId || platformUser?.role || 'Default Member'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500">Tenant Count</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{tenantIds.length || 1} Organization Partition(s)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500">Cluster Zone</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">ap-southeast-2 (Sydney)</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                          <Building2 size={16} /> Active Enterprise Tier ({activeLicence})
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          Your tenant account holds complete authorization for Module Builder, High-Performance Analytics Engine, Distributed Compute Matrix, and Antigravity AI Sub-agents.
                        </p>
                        <div className="pt-2 text-[11px] text-zinc-500">
                          To request additional tenant seats or custom resource allocations, contact your organization IT administrator.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

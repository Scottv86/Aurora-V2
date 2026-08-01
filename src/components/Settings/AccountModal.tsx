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
  BadgeCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'security' | 'preferences' | 'notifications' | 'developer' | 'workspaces' | 'licence';

interface PersonalToken {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  expiresIn: string;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user: authUser, isSuperAdmin, tenantIds, currentRoleId } = useAuth();
  const { user: platformUser, refetchContext } = usePlatform();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

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
      setActiveTab('profile');
      setFirstName(platformUser?.firstName || authUser?.user_metadata?.first_name || resolvedName.split(' ')[0] || '');
      setLastName(platformUser?.lastName || authUser?.user_metadata?.last_name || resolvedName.split(' ').slice(1).join(' ') || '');
      setDisplayName(resolvedName);
      setAvatarUrl(resolvedAvatarUrl);
      setJobTitle(platformUser?.position || authUser?.user_metadata?.job_title || 'Platform Engineer');
      setBio(authUser?.user_metadata?.bio || '');
      setImgError(false);
    }
  }, [isOpen, authUser, platformUser, resolvedName, resolvedAvatarUrl]);

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
        });
      }

      if (refetchContext) {
        await refetchContext();
      }

      toast.success('Profile updated successfully!');
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

          {/* Premium Animated Modal Dialog */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-4xl h-[680px] max-h-[88vh] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
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
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Layout (Sidebar + Tab Content) */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* Navigation Sidebar */}
              <div className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/40 dark:bg-zinc-950/40 space-y-1 overflow-y-auto">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'profile'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <UserIcon size={15} />
                  Profile & Avatar
                </button>

                <button
                  onClick={() => setActiveTab('licence')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'licence'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Award size={15} />
                  Licence Type
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'workspaces'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 size={15} />
                  Workspaces & License
                </button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-6 overflow-y-auto">

                {/* TAB 1: PROFILE */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Personal Profile</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your identity, name, avatar, and job details</p>
                    </div>

                    {/* Hidden File Input */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileSelect} 
                    />

                    {/* Profile Header Card */}
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20 overflow-hidden shrink-0 cursor-pointer group"
                      >
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
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                          <Camera size={18} className="text-white" />
                          <span className="text-[8px] font-bold uppercase mt-0.5">Upload</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                          {resolvedName}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {authUser?.email || platformUser?.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800/60">
                            {jobTitle || 'Platform Engineer'}
                          </span>
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                            Active User
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* First & Last Name */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">First Name</label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First Name"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Last Name</label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last Name"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Display Name */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Display Name</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="How your name appears in Aurora"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Profile Picture URL / Upload */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Profile Picture (Avatar URL or File Upload)</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={avatarUrl}
                              onChange={(e) => {
                                setAvatarUrl(e.target.value);
                                setImgError(false);
                              }}
                              placeholder="https://... or click Upload Image"
                              className="w-full px-3 py-2 pr-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <Camera size={14} className="absolute right-3 top-2.5 text-zinc-400" />
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                          >
                            <Camera size={14} />
                            <span>Upload File</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1">Upload a photo from your computer or paste an image URL.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Job Title / Position</label>
                        <input
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Lead Automation Engineer"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Primary Email</label>
                        <div className="relative">
                          <input
                            type="email"
                            disabled
                            value={authUser?.email || platformUser?.email || ''}
                            className="w-full px-3 py-2 pr-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 cursor-not-allowed"
                          />
                          <span className="absolute right-2 top-1.5 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 rounded">
                            Verified
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Bio / Notes</label>
                        <textarea
                          rows={3}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Brief note about your primary workflows or modules..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                      >
                        {isSavingProfile && <RefreshCw size={14} className="animate-spin" />}
                        Save Profile Changes
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: LICENCE TYPE */}
                {activeTab === 'licence' && (
                  <div className="space-y-6 max-w-xl">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Licence Type & Capabilities</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">View your active platform licence tier, feature capabilities, and seat privileges</p>
                    </div>

                    {/* Active Licence Highlight Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-pink-500/5 border border-indigo-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          <Award size={18} />
                          Active Licence Tier
                        </div>
                        <span className="px-2.5 py-1 text-xs font-extrabold bg-indigo-600 text-white rounded-lg shadow-sm flex items-center gap-1">
                          <BadgeCheck size={14} /> {activeLicence}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        Your account is currently assigned a <strong className="text-zinc-900 dark:text-white">{activeLicence}</strong> licence. You have full access to platform building blocks, code sandboxes, sub-agents, and developer settings.
                      </p>
                    </div>

                    {/* Licence Tiers Breakdown */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-zinc-500">Available Licence Tiers</h4>
                      
                      {/* Developer Licence Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        activeLicence === 'Developer'
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500/50 ring-1 ring-indigo-500/20'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-2">
                            <Zap size={15} className="text-indigo-500" />
                            Developer Licence
                          </div>
                          {activeLicence === 'Developer' ? (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded">Current Plan</span>
                          ) : (
                            <button onClick={() => toast.info('Licence upgrade request submitted to administrator')} className="text-[10px] font-bold text-indigo-600 hover:underline">Request Upgrade</button>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">Designed for engineers building modules, executing CLI commands, and training sub-agents.</p>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                          <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Module Editor & Catalog</div>
                          <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Compute Matrix Execution</div>
                          <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Antigravity Sub-agents</div>
                          <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Personal API Tokens</div>
                        </div>
                      </div>

                      {/* Standard Licence Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        activeLicence === 'Standard'
                          ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-500/50 ring-1 ring-purple-500/20'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-2">
                            <UserIcon size={15} className="text-purple-500" />
                            Standard Member Licence
                          </div>
                          {activeLicence === 'Standard' && (
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded">Current Plan</span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">Ideal for daily team operations, document automation, work queues, and AI assistant interaction.</p>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                          <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Triage & Work Queues</div>
                          <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Drive File Storage</div>
                          <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> AI Assistant Chat</div>
                          <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Analytics Dashboards</div>
                        </div>
                      </div>

                      {/* AI Agent Seat Licence Card */}
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 opacity-90">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-2">
                            <Laptop size={15} className="text-teal-500" />
                            AI Agent Seat Licence
                          </div>
                          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded">Synthetic Seat</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Autonomous worker seat for background AI agents, automated handovers, and Digital Twin delegates.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SECURITY */}
                {activeTab === 'security' && (
                  <div className="space-y-6 max-w-xl">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Security & Authentication</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your credentials, 2FA, and active login sessions</p>
                    </div>

                    {/* Password Change Form */}
                    <form onSubmit={handleChangePassword} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Lock size={14} className="text-indigo-500" />
                        Change Password
                      </h4>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full px-3 py-2 pr-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isUpdatingPassword || !newPassword}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Update Password
                        </button>
                      </div>
                    </form>

                    {/* Two-Factor Authentication Status */}
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <Shield size={18} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">Two-Factor Authentication (2FA)</div>
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
                        {is2FAEnabled ? 'Enabled' : 'Enable 2FA'}
                      </button>
                    </div>

                    {/* Active Sessions */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                        <span>Active Sessions</span>
                        <button
                          onClick={() => toast.success('Logged out of all other devices')}
                          className="text-[11px] text-red-500 hover:text-red-600 font-semibold"
                        >
                          Sign out all other sessions
                        </button>
                      </h4>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <Laptop size={16} className="text-indigo-500" />
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white">Current Web Browser</div>
                            <div className="text-[11px] text-zinc-500">Windows • Chrome • 127.0.0.1</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 rounded">
                          Active Now
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: PREFERENCES */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6 max-w-xl">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Interface & Regional Preferences</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Customize visual appearance, timezone, and workspace defaults</p>
                    </div>

                    {/* Theme Mode Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Theme Mode</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTheme('dark');
                            if (theme !== 'dark') toggleTheme();
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                            theme === 'dark'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Moon size={18} />
                          Dark Mode
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTheme('light');
                            if (theme !== 'light') toggleTheme();
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                            theme === 'light'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Sun size={18} />
                          Light Mode
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTheme('system')}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                            selectedTheme === 'system'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Laptop size={18} />
                          System Auto
                        </button>
                      </div>
                    </div>

                    {/* Regional & Timezone */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Timezone</label>
                        <div className="relative">
                          <Globe size={14} className="absolute left-3 top-3 text-zinc-400" />
                          <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                            <option value="America/New_York">Eastern Time (US & Canada)</option>
                            <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                            <option value="Europe/London">London (GMT/BST)</option>
                            <option value="Australia/Adelaide">Australia/Adelaide (ACST)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Date Format</label>
                        <div className="relative">
                          <Clock size={14} className="absolute left-3 top-3 text-zinc-400" />
                          <select
                            value={dateFormat}
                            onChange={(e) => setDateFormat(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Default Landing View</label>
                        <select
                          value={defaultView}
                          onChange={(e) => setDefaultView(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="dashboard">Executive Dashboard</option>
                          <option value="triage">Triage Work Queue</option>
                          <option value="drive">Aurora Drive & Files</option>
                          <option value="analytics">Analytics & Metrics</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => toast.success('Preferences saved!')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                      >
                        Save Preferences
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 5: NOTIFICATIONS */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6 max-w-xl">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Notification Settings</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure how and when Aurora notifies you of events</p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">Workflow & Automation Failures</div>
                          <div className="text-[11px] text-zinc-500">Alert immediately when an executed module throws an error</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyWorkflowFailures}
                          onChange={(e) => setNotifyWorkflowFailures(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">AI Builder Completion</div>
                          <div className="text-[11px] text-zinc-500">Notify when an async AI workflow generation finishes</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyAITasks}
                          onChange={(e) => setNotifyAITasks(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">System Health Warnings</div>
                          <div className="text-[11px] text-zinc-500">High latency or cluster compute threshold warnings</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifySystemHealth}
                          onChange={(e) => setNotifySystemHealth(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">Team Mentions & Shared Modules</div>
                          <div className="text-[11px] text-zinc-500">Alert when a teammate tags you or grants access</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyMentions}
                          onChange={(e) => setNotifyMentions(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Email Digest Frequency</label>
                      <select
                        value={emailDigest}
                        onChange={(e) => setEmailDigest(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="instant">Instant Notifications</option>
                        <option value="daily">Daily Summary Email</option>
                        <option value="off">Off (In-App Only)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TAB 6: DEVELOPER KEYS */}
                {activeTab === 'developer' && (
                  <div className="space-y-6 max-w-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Personal Access Tokens (PATs)</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Tokens for authenticating Antigravity CLI (`agy`) and personal scripts</p>
                      </div>
                      <button
                        onClick={() => setIsCreatingToken(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        <Plus size={14} />
                        New Token
                      </button>
                    </div>

                    {/* Generated Token Warning Banner */}
                    {generatedKey && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={16} /> Token Generated!
                          </span>
                          <span className="text-[10px] text-emerald-500">Copy now, it won't be shown again.</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 p-2 rounded-lg border border-emerald-500/30 text-xs font-mono">
                          <span className="flex-1 truncate">{generatedKey}</span>
                          <button
                            onClick={() => copyToClipboard(generatedKey, 'Access token')}
                            className="p-1 text-zinc-400 hover:text-indigo-500"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Create Token Modal / Inline Form */}
                    {isCreatingToken && (
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Generate Personal Access Token</h4>
                        <input
                          type="text"
                          value={newTokenName}
                          onChange={(e) => setNewTokenName(e.target.value)}
                          placeholder="e.g. CI/CD Deployment Token"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setIsCreatingToken(false)}
                            className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateToken}
                            className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                          >
                            Generate Token
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Tokens List */}
                    <div className="space-y-2">
                      {tokens.map((t) => (
                        <div key={t.id} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                              <KeyRound size={14} className="text-indigo-500" />
                              {t.name}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                              {t.prefix} • Last used: {t.lastUsed}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeToken(t.id)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Revoke Token"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 7: WORKSPACES */}
                {activeTab === 'workspaces' && (
                  <div className="space-y-6 max-w-xl">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Tenant Memberships & Roles</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Overview of your tenant organizations and active platform privileges</p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">Super Administrator Scope</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          isSuperAdmin 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800' 
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}>
                          {isSuperAdmin ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-500 space-y-1 border-t border-zinc-200 dark:border-zinc-700/50 pt-2">
                        <div><strong className="text-zinc-700 dark:text-zinc-300">Active Role ID:</strong> {currentRoleId || platformUser?.role || 'Default Member'}</div>
                        <div><strong className="text-zinc-700 dark:text-zinc-300">Tenant Count:</strong> {tenantIds.length || 1} Organization(s)</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Building2 size={15} /> Active License Tier ({activeLicence})
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300">
                        Your account holds full access to Module Builder, Analytics Engine, Compute Matrix, and Antigravity AI Sub-agents.
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

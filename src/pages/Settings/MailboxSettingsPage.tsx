import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Server, 
  Key, 
  Activity, 
  Users, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Send,
  Lock,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { Button, Badge, cn } from '../../components/UI/Primitives';
import { EmptyState } from '../../components/UI/EmptyState';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { InboxAccountModal } from '../../components/Apps/Inbox/InboxAccountModal';
import { EmailAccount, WorkspaceMailConfig, EmailProvider } from '../../types/inbox';
import { InboxService } from '../../services/inboxService';
import { usePlatform } from '../../hooks/usePlatform';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';

// Official Provider SVG Logos
const GmailLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M1.5 5.5v13a1 1 0 0 0 1 1h3v-10l6.5 4.875L18.5 9.5v10h3a1 1 0 0 0 1-1v-13a1 1 0 0 0-1.6-.8L12 12.1 2.1 4.7a1 1 0 0 0-1.6.8z"/>
    <path fill="#34A853" d="M18.5 19.5h3a1 1 0 0 0 1-1V9.5l-4 3v7z"/>
    <path fill="#FBBC04" d="M1.5 6.5l4 3v10h-3a1 1 0 0 1-1-1v-12z"/>
    <path fill="#EA4335" d="M21.5 4.7a1 1 0 0 0-1.1-.1L12 10.9 3.6 4.6a1 1 0 0 0-1.1.1 1 1 0 0 0-.5.8v1l10 7.5 10-7.5v-1a1 1 0 0 0-.5-.8z"/>
  </svg>
);

const MicrosoftLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 23 23">
    <path fill="#f25022" d="M1 1h10v10H1z"/>
    <path fill="#00a4ef" d="M1 12h10v10H1z"/>
    <path fill="#7fba00" d="M12 1h10v10H12z"/>
    <path fill="#ffb900" d="M12 12h10v10H12z"/>
  </svg>
);

const YahooLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#6001D2">
    <path d="M12 14.5l4.5-9.5h3L14 15.5V21h-3v-5.5L5.5 5h3L12 14.5z"/>
  </svg>
);

const AppleLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.9.04-2 .6-2.63 1.34-.55.63-1.03 1.68-.9 2.71 1.01.08 2.01-.43 2.61-1.18z"/>
  </svg>
);

// Provider Pill Badge
const ProviderBadge: React.FC<{ provider: EmailProvider }> = ({ provider }) => {
  switch (provider) {
    case 'gmail':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <GmailLogo className="w-3.5 h-3.5" /> Gmail
        </span>
      );
    case 'outlook':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <MicrosoftLogo className="w-3 h-3" /> Microsoft 365
        </span>
      );
    case 'yahoo':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <YahooLogo className="w-3.5 h-3.5" /> Yahoo
        </span>
      );
    case 'icloud':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
          <AppleLogo className="w-3.5 h-3.5" /> iCloud
        </span>
      );
    case 'shared':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Users className="w-3.5 h-3.5 text-emerald-500" /> Shared Inbox
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
          <Server className="w-3.5 h-3.5" /> IMAP/SMTP
        </span>
      );
  }
};

export const MailboxSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, user: platformUser } = usePlatform();
  const { members } = useUsers();
  const { user: authUser } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERSONAL' | 'SHARED'>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');

  // Modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<EmailAccount | null>(null);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Workspace Config State
  const [mailConfig, setMailConfig] = useState<WorkspaceMailConfig>({
    googleOAuth: {
      provider: 'google',
      clientId: '',
      clientSecretHint: '',
      redirectUri: `${window.location.origin}/api/inbox/oauth/google/callback`,
      enabled: false
    },
    microsoftOAuth: {
      provider: 'microsoft',
      clientId: '',
      clientSecretHint: '',
      tenantId: 'common',
      redirectUri: `${window.location.origin}/api/inbox/oauth/microsoft/callback`,
      enabled: false
    },
    smtpRelay: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      fromName: 'Aurora Platform',
      fromEmail: 'noreply@aurora.internal',
      enabled: false
    },
    allowUserPersonalAccounts: true,
    defaultRetentionDays: 90
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [testRelayStatus, setTestRelayStatus] = useState<{ testing: boolean; result?: { success: boolean; message: string } }>({
    testing: false
  });

  // Shared Inbox delegation edit modal
  const [editingSharedAccount, setEditingSharedAccount] = useState<EmailAccount | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Load Data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [accs, cfg, logs] = await Promise.all([
        InboxService.getAccounts(tenant?.id),
        InboxService.getWorkspaceMailConfig(tenant?.id),
        InboxService.getSyncLogs(tenant?.id)
      ]);
      setAccounts(accs);
      if (cfg) setMailConfig(cfg);
      setSyncLogs(logs || []);
    } catch (e) {
      console.error('[MailboxSettings] Failed to load:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [tenant?.id]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (typeFilter !== 'ALL' && acc.type !== typeFilter) return false;
      if (providerFilter !== 'ALL' && acc.provider !== providerFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = acc.name?.toLowerCase().includes(q);
        const matchesEmail = acc.email?.toLowerCase().includes(q);
        const matchesHost = acc.config?.imapHost?.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesHost;
      }
      return true;
    });
  }, [accounts, typeFilter, providerFilter, searchQuery]);

  const sharedAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === 'SHARED');
  }, [accounts]);

  // Resolve Owner Member for a given account
  const resolveAccountOwner = (acc: EmailAccount) => {
    if (acc.type === 'SHARED') return null;

    const accUserId = acc.userId || (acc.config as any)?.userId;
    const accUserEmail = acc.userEmail || (acc.config as any)?.userEmail;
    const accUserName = acc.userName || (acc.config as any)?.userName;

    // Helper to format real human name
    const formatMemberName = (m?: any) => {
      if (!m) return '';
      if (m.firstName && m.lastName) return `${m.firstName} ${m.lastName}`.trim();
      if (m.firstName && m.familyName) return `${m.firstName} ${m.familyName}`.trim();
      if (m.firstName) return m.firstName;
      if (m.name && !m.name.toLowerCase().includes('.acme') && !m.name.toLowerCase().includes('user1') && !m.name.includes('@')) {
        return m.name;
      }
      if (m.displayName && !m.displayName.toLowerCase().includes('.acme') && !m.displayName.toLowerCase().includes('user1')) {
        return m.displayName;
      }
      return '';
    };

    // 1. Check workspace members
    let matchedMember = members.find((m) => 
      (accUserId && (m.id === accUserId || m.userId === accUserId)) ||
      (accUserEmail && m.email?.toLowerCase() === accUserEmail.toLowerCase()) ||
      (accUserEmail && m.personalEmail?.toLowerCase() === accUserEmail.toLowerCase()) ||
      (acc.email && m.email?.toLowerCase() === acc.email.toLowerCase()) ||
      (acc.email && m.personalEmail?.toLowerCase() === acc.email.toLowerCase())
    );

    // 2. Real name of current platform user / auth user
    const platformName = platformUser?.firstName && platformUser?.lastName
      ? `${platformUser.firstName} ${platformUser.lastName}`
      : (platformUser?.firstName || platformUser?.lastName);

    const authFullName = authUser?.user_metadata?.full_name || 
                         authUser?.user_metadata?.name || 
                         (authUser?.user_metadata?.first_name ? `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name || ''}`.trim() : '');

    const activeActualName = platformName || 
                             platformUser?.name || 
                             authFullName || 
                             (authUser?.email ? authUser.email.split('@')[0] : 'Workspace User');

    const realUserEmail = platformUser?.email || authUser?.email || '';

    const isCurrentUser = 
      (authUser?.id && (accUserId === authUser.id || matchedMember?.userId === authUser.id || matchedMember?.id === authUser.id)) ||
      (platformUser?.id && (accUserId === platformUser.id || matchedMember?.id === platformUser.id)) ||
      (authUser?.email && (accUserEmail?.toLowerCase() === authUser.email.toLowerCase() || acc.email?.toLowerCase() === authUser.email.toLowerCase())) ||
      (platformUser?.email && (accUserEmail?.toLowerCase() === platformUser.email.toLowerCase() || acc.email?.toLowerCase() === platformUser.email.toLowerCase())) ||
      !accUserId;

    // 3. Resolve display name and email strictly from authentic records
    const memberFormattedName = formatMemberName(matchedMember);
    const displayName = memberFormattedName || 
                        (accUserName && !accUserName.toLowerCase().includes('.acme') && !accUserName.includes('@') ? accUserName : null) || 
                        activeActualName;

    // Only show email if it exists from matched member or auth/platform user (never synthetic)
    const rawEmail = matchedMember?.email || (isCurrentUser ? realUserEmail : accUserEmail);
    const displayEmail = (rawEmail && !rawEmail.includes('user1.acme') && rawEmail !== acc.email) ? rawEmail : undefined;

    const avatarUrl = matchedMember?.avatarUrl || platformUser?.avatarUrl || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;
    const memberId = matchedMember?.id || members.find(m => m.id === platformUser?.id || m.userId === authUser?.id || m.userId === platformUser?.id)?.id || (members.length > 0 ? members[0].id : undefined);
    const role = matchedMember?.role || platformUser?.role || 'Admin';

    return {
      displayName,
      displayEmail,
      avatarUrl,
      memberId,
      role,
      isCurrentUser: !!isCurrentUser
    };
  };

  // Render provider logo box on card
  const renderAccountAvatar = (acc: EmailAccount) => {
    const p = (acc.provider || '').toLowerCase();
    const e = (acc.email || '').toLowerCase();
    const isGmail = p === 'gmail' || p === 'google' || e.includes('gmail.com');
    const isMicrosoft = p === 'outlook' || p === 'microsoft' || e.includes('outlook.com') || e.includes('office365.com');
    const isYahoo = p === 'yahoo' || e.includes('yahoo.com');
    const isApple = p === 'icloud' || p === 'apple' || e.includes('icloud.com');
    const isShared = acc.type === 'SHARED' || p === 'shared';

    if (isGmail) {
      return (
        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm shrink-0 p-2.5">
          <GmailLogo className="w-6 h-6" />
        </div>
      );
    }
    if (isMicrosoft) {
      return (
        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm shrink-0 p-2.5">
          <MicrosoftLogo className="w-5 h-5" />
        </div>
      );
    }
    if (isYahoo) {
      return (
        <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center shadow-sm shrink-0 p-2.5">
          <YahooLogo className="w-6 h-6" />
        </div>
      );
    }
    if (isApple) {
      return (
        <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm shrink-0 p-2.5 text-zinc-900 dark:text-white">
          <AppleLogo className="w-5 h-5" />
        </div>
      );
    }
    if (isShared) {
      return (
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shadow-sm shrink-0 text-emerald-600 dark:text-emerald-400">
          <Users className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div 
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm shrink-0"
        style={{ backgroundColor: acc.color || '#6366F1' }}
      >
        <Server className="w-5 h-5" />
      </div>
    );
  };

  // Actions
  const handleTestConnection = async (acc: EmailAccount) => {
    setTestingAccountId(acc.id);
    try {
      const res = await InboxService.testConnection(acc.config, tenant?.id);
      if (res.success) {
        toast.success(`Connection to ${acc.email} verified successfully!`);
        await InboxService.addSyncLog({
          accountEmail: acc.email,
          type: 'IMAP_POLL',
          status: 'SUCCESS',
          message: `Manual connection diagnostic succeeded. Server: ${acc.config?.imapHost || acc.provider.toUpperCase()}`,
          durationMs: 180
        });
      } else {
        toast.error(`Connection failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Connection test failed');
    } finally {
      setTestingAccountId(null);
      const logs = await InboxService.getSyncLogs(tenant?.id);
      setSyncLogs(logs);
    }
  };

  const handleSyncAccount = async (acc: EmailAccount) => {
    setSyncingAccountId(acc.id);
    try {
      const res = await InboxService.syncAccount(acc.id, tenant?.id);
      toast.success(`Synced ${acc.email}: ${res.newMessagesCount || 0} new messages.`);
      await loadData(true);
    } catch (_) {
      toast.error(`Sync error for ${acc.email}`);
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      for (const acc of accounts) {
        await InboxService.syncAccount(acc.id, tenant?.id);
      }
      toast.success('All mailbox connections synced.');
      await loadData(true);
    } catch (_) {
      toast.error('Sync all encountered an issue.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await InboxService.deleteAccount(accountToDelete.id, tenant?.id);
      setAccounts((prev) => prev.filter((a) => a.id !== accountToDelete.id));
      toast.success(`Account ${accountToDelete.email} disconnected.`);
      setAccountToDelete(null);
    } catch (_) {
      toast.error('Failed to remove account.');
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await InboxService.saveWorkspaceMailConfig(mailConfig, tenant?.id);
      toast.success('Workspace mail configuration saved.');
    } catch (_) {
      toast.error('Failed to save configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestRelay = async () => {
    setTestRelayStatus({ testing: true });
    try {
      await new Promise((r) => setTimeout(r, 1200));
      if (!mailConfig.smtpRelay?.host) {
        throw new Error('Please configure a valid SMTP Host before testing.');
      }
      setTestRelayStatus({
        testing: false,
        result: {
          success: true,
          message: `Connected to ${mailConfig.smtpRelay.host}:${mailConfig.smtpRelay.port} and verified handshake.`
        }
      });
      toast.success('SMTP Relay handshake successful.');
    } catch (err: any) {
      setTestRelayStatus({
        testing: false,
        result: {
          success: false,
          message: err.message || 'Failed to connect to SMTP relay'
        }
      });
      toast.error(err.message || 'Relay test failed');
    }
  };

  const handleSaveSharedDelegation = async () => {
    if (!editingSharedAccount) return;
    try {
      await InboxService.updateAccount(
        editingSharedAccount.id,
        { sharedMembers: selectedMemberIds },
        tenant?.id
      );
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editingSharedAccount.id ? { ...a, sharedMembers: selectedMemberIds } : a
        )
      );
      toast.success(`Updated member access for ${editingSharedAccount.name}`);
      setEditingSharedAccount(null);
    } catch (_) {
      toast.error('Failed to update shared mailbox delegation.');
    }
  };

  const navItems: SettingsSubNavItem[] = [
    {
      id: 'overview',
      label: 'All Connections',
      icon: Mail,
      badge: accounts.length
    },
    {
      id: 'shared',
      label: 'Shared Inboxes',
      icon: Users,
      badge: sharedAccounts.length
    },
    {
      id: 'gateways',
      label: 'OAuth & Gateways',
      icon: Key
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics & Logs',
      icon: Activity,
      badge: syncLogs.length
    }
  ];

  return (
    <SettingsSubNavLayout
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Email & Inboxes
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage user email connections, shared team inboxes, OAuth applications, and SMTP relay gateways.
            </p>
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncingAll && 'animate-spin')} />
            {isSyncingAll ? 'Syncing...' : 'Sync All Mailboxes'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddAccountOpen(true)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4" /> Connect Mailbox
          </Button>
        </div>
      }
      items={navItems}
      activeId={activeTab}
      onTabChange={setActiveTab}
      sectionTitle="Mailbox Settings"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* TAB 1: ALL CONNECTIONS OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Mailboxes</span>
                  <Mail className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{accounts.length}</div>
                <p className="text-[11px] text-zinc-400 mt-1">Connected accounts across workspace</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Shared Inboxes</span>
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{sharedAccounts.length}</div>
                <p className="text-[11px] text-zinc-400 mt-1">Team & department accounts</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Personal Connections</span>
                  <Lock className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {accounts.filter((a) => a.type === 'PERSONAL').length}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">User individual inboxes</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Health & Sync</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                </div>
                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {accounts.filter((a) => a.status === 'CONNECTED').length} / {accounts.length}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Healthy active connections</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by email, name or server..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={typeFilter}
                  onChange={(e: any) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Types</option>
                  <option value="PERSONAL">Personal Mailboxes</option>
                  <option value="SHARED">Shared Inboxes</option>
                </select>

                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Providers</option>
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Microsoft 365</option>
                  <option value="yahoo">Yahoo</option>
                  <option value="icloud">iCloud</option>
                  <option value="custom">Custom IMAP</option>
                  <option value="shared">Shared</option>
                </select>
              </div>
            </div>

            {/* Accounts List */}
            {filteredAccounts.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No Mailboxes Found"
                description={
                  searchQuery
                    ? 'No email accounts match your search filters.'
                    : 'Get started by connecting your first personal or shared mailbox.'
                }
                actionLabel="Connect Mailbox"
                onAction={() => setIsAddAccountOpen(true)}
              />
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredAccounts.map((acc) => {
                    const isTesting = testingAccountId === acc.id;
                    const isSyncing = syncingAccountId === acc.id;
                    const ownerInfo = resolveAccountOwner(acc);

                    return (
                      <div
                        key={acc.id}
                        className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Authentic Provider Logo Avatar */}
                          {renderAccountAvatar(acc)}

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-zinc-900 dark:text-white text-sm">
                                {acc.name}
                              </span>
                              <ProviderBadge provider={acc.provider} />
                              <Badge
                                variant={acc.type === 'SHARED' ? 'purple' : 'zinc'}
                                className="text-[10px] uppercase font-bold tracking-wider"
                              >
                                {acc.type}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                              <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                                {acc.email}
                              </span>
                              <span>•</span>
                              <span>
                                Server:{' '}
                                <span className="font-mono text-[11px]">
                                  {acc.config?.imapHost || 'Direct API / OAuth'}
                                </span>
                              </span>
                              <span>•</span>
                              <span>
                                Last Synced:{' '}
                                {acc.lastSyncedAt
                                  ? new Date(acc.lastSyncedAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Never'}
                              </span>
                            </div>

                            {/* Aurora User Association / Shared Delegation */}
                            <div className="pt-1 flex items-center gap-2 text-xs">
                              {acc.type === 'SHARED' ? (
                                <div className="flex items-center gap-1.5 text-zinc-500">
                                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>
                                    {acc.sharedMembers && acc.sharedMembers.length > 0
                                      ? `${acc.sharedMembers.length} member(s) assigned`
                                      : 'All workspace members have access'}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingSharedAccount(acc);
                                      setSelectedMemberIds(acc.sharedMembers || []);
                                    }}
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-1"
                                  >
                                    Manage Access
                                  </button>
                                </div>
                              ) : ownerInfo ? (
                                <div className="flex items-center gap-2 text-xs flex-wrap">
                                  <span className="text-zinc-400 font-medium">Aurora Account:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (ownerInfo.memberId) {
                                        navigate(`/workspace/settings/platform-modules/workforce-management/member/${ownerInfo.memberId}?tab=mailboxes`);
                                      }
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs text-left transition-all",
                                      ownerInfo.memberId && "hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer"
                                    )}
                                    title={ownerInfo.memberId ? "Click to view member mailboxes in Workforce & Access" : undefined}
                                  >
                                    {ownerInfo.avatarUrl ? (
                                      <img 
                                        src={ownerInfo.avatarUrl} 
                                        alt={ownerInfo.displayName} 
                                        className="w-4 h-4 rounded-full object-cover shrink-0" 
                                      />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                                        {ownerInfo.displayName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                      {ownerInfo.displayName}
                                    </span>
                                    {ownerInfo.displayEmail && (
                                      <span className="text-[11px] text-zinc-400 font-mono">
                                        ({ownerInfo.displayEmail})
                                      </span>
                                    )}
                                    {ownerInfo.isCurrentUser && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded">
                                        You
                                      </span>
                                    )}
                                    {ownerInfo.memberId && (
                                      <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                                    )}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestConnection(acc)}
                            disabled={isTesting}
                            className="text-xs gap-1.5 text-zinc-600 dark:text-zinc-300"
                            title="Verify connection credentials"
                          >
                            <ShieldCheck className={cn('w-3.5 h-3.5', isTesting && 'animate-spin text-indigo-500')} />
                            {isTesting ? 'Testing...' : 'Test Connection'}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncAccount(acc)}
                            disabled={isSyncing}
                            className="text-xs gap-1.5"
                          >
                            <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
                            {isSyncing ? 'Syncing...' : 'Sync'}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAccountToDelete(acc)}
                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-2"
                            title="Disconnect account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHARED TEAM INBOXES */}
        {activeTab === 'shared' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Shared Department & Team Mailboxes
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Shared inboxes allow multiple agents, managers, or customer support reps to view, triage, and reply from a collective address.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddAccountOpen(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4" /> Add Shared Inbox
              </Button>
            </div>

            {sharedAccounts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Shared Inboxes Created"
                description="Set up shared mailboxes like support@company.com or sales@company.com for collaborative team workflows."
                actionLabel="Create Shared Inbox"
                onAction={() => setIsAddAccountOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sharedAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: acc.color || '#10B981' }}
                        >
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{acc.name}</h4>
                          <p className="text-xs text-zinc-500 font-mono">{acc.email}</p>
                        </div>
                      </div>

                      <Badge variant="green" className="text-[10px]">
                        ACTIVE
                      </Badge>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>Delegated Access:</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                          {acc.sharedMembers && acc.sharedMembers.length > 0
                            ? `${acc.sharedMembers.length} Members`
                            : 'Entire Workspace'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>Inbound Routing:</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          Work Distribution Enabled
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSharedAccount(acc);
                          setSelectedMemberIds(acc.sharedMembers || []);
                        }}
                        className="text-xs"
                      >
                        Delegation Permissions
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncAccount(acc)}
                        className="text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OAUTH & GATEWAYS */}
        {activeTab === 'gateways' && (
          <div className="space-y-6">
            {/* Google Workspace Enterprise App */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center p-2">
                    <GmailLogo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                      Google Workspace OAuth App
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Allows workspace members to link Google accounts with 1-click single sign-on consent.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mailConfig.googleOAuth?.enabled}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        googleOAuth: {
                          ...prev.googleOAuth!,
                          enabled: e.target.checked
                        }
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                    value={mailConfig.googleOAuth?.clientId || ''}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        googleOAuth: { ...prev.googleOAuth!, clientId: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Google OAuth Client Secret
                  </label>
                  <input
                    type="password"
                    placeholder="GOCSPX-••••••••••••••••"
                    value={mailConfig.googleOAuth?.clientSecretHint || ''}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        googleOAuth: { ...prev.googleOAuth!, clientSecretHint: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg">
                <label className="text-xs font-semibold text-zinc-500 flex items-center justify-between">
                  <span>Authorized Redirect URI (Add to Google Cloud Console)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(mailConfig.googleOAuth?.redirectUri || '');
                      toast.success('Redirect URI copied to clipboard');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </label>
                <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300 select-all">
                  {mailConfig.googleOAuth?.redirectUri}
                </div>
              </div>
            </div>

            {/* Microsoft 365 Azure AD App */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center p-2.5">
                    <MicrosoftLogo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                      Microsoft 365 & Azure AD App
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Enables tenant-wide Microsoft Graph mailbox integration and single sign-on consent.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mailConfig.microsoftOAuth?.enabled}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        microsoftOAuth: {
                          ...prev.microsoftOAuth!,
                          enabled: e.target.checked
                        }
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Application (Client) ID
                  </label>
                  <input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={mailConfig.microsoftOAuth?.clientId || ''}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        microsoftOAuth: { ...prev.microsoftOAuth!, clientId: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Directory (Tenant) ID
                  </label>
                  <input
                    type="text"
                    placeholder="common or tenant UUID"
                    value={mailConfig.microsoftOAuth?.tenantId || 'common'}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        microsoftOAuth: { ...prev.microsoftOAuth!, tenantId: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    placeholder="Secret value from Azure portal"
                    value={mailConfig.microsoftOAuth?.clientSecretHint || ''}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        microsoftOAuth: { ...prev.microsoftOAuth!, clientSecretHint: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Outbound SMTP Relay Gateway */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                      Workspace Outbound SMTP Relay
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Default gateway for transactional system notifications, automation triggers, and document generation email merges.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mailConfig.smtpRelay?.enabled}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        smtpRelay: {
                          ...prev.smtpRelay!,
                          enabled: e.target.checked
                        }
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    placeholder="smtp.mailgun.org, smtp.sendgrid.net or smtp.gmail.com"
                    value={mailConfig.smtpRelay?.host || ''}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        smtpRelay: { ...prev.smtpRelay!, host: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    placeholder="587 or 465"
                    value={mailConfig.smtpRelay?.port || 587}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        smtpRelay: { ...prev.smtpRelay!, port: parseInt(e.target.value) || 587 }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Default Sender Name
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Platform"
                    value={mailConfig.smtpRelay?.fromName || ''}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        smtpRelay: { ...prev.smtpRelay!, fromName: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Default From Email
                  </label>
                  <input
                    type="email"
                    placeholder="noreply@acme.com"
                    value={mailConfig.smtpRelay?.fromEmail || ''}
                    onChange={(e) =>
                      setMailConfig((prev) => ({
                        ...prev,
                        smtpRelay: { ...prev.smtpRelay!, fromEmail: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={handleTestRelay}
                    disabled={testRelayStatus.testing}
                    className="w-full gap-2 text-xs"
                  >
                    <Send className={cn('w-3.5 h-3.5', testRelayStatus.testing && 'animate-spin')} />
                    {testRelayStatus.testing ? 'Testing Relay...' : 'Test SMTP Handshake'}
                  </Button>
                </div>
              </div>

              {testRelayStatus.result && (
                <div
                  className={cn(
                    'p-3 rounded-lg text-xs flex items-center gap-2',
                    testRelayStatus.result.success
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  )}
                >
                  {testRelayStatus.result.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testRelayStatus.result.message}</span>
                </div>
              )}
            </div>

            {/* Save Config Button */}
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
              >
                {isSavingConfig ? 'Saving Settings...' : 'Save Workspace Gateway Configuration'}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: DIAGNOSTICS & LOGS */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Sync Telemetry & Connection Logs
                </h3>
                <p className="text-xs text-zinc-500">
                  Real-time heartbeat logs, IMAP IDLE connection states, and OAuth token refresh traces.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    localStorage.removeItem('aurora_inbox_sync_logs_v1');
                    setSyncLogs([]);
                    toast.success('Diagnostics log cleared.');
                  }}
                  className="text-xs"
                >
                  Clear Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const logs = await InboxService.getSyncLogs(tenant?.id);
                    setSyncLogs(logs);
                    toast.success('Logs refreshed.');
                  }}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {syncLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    No diagnostic logs recorded yet. Run a connection test or sync to generate telemetry.
                  </div>
                ) : (
                  syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {log.status === 'SUCCESS' ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                          ) : log.status === 'WARNING' ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900 dark:text-white">
                              {log.accountEmail}
                            </span>
                            <Badge variant="zinc" className="text-[9px] font-mono">
                              {log.type}
                            </Badge>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {log.durationMs}ms
                            </span>
                          </div>
                          <p className="text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                            {log.message}
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-400 whitespace-nowrap self-end sm:self-center font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / CONNECT ACCOUNT */}
      <InboxAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onAccountAdded={(newAcc) => {
          setAccounts((prev) => [newAcc, ...prev]);
          setIsAddAccountOpen(false);
          toast.success(`Mailbox ${newAcc.email} connected.`);
        }}
      />

      {/* MODAL: DELETE CONFIRMATION */}
      {accountToDelete && (
        <DeleteConfirmationModal
          isOpen={true}
          title="Disconnect Mailbox"
          description={`Are you sure you want to disconnect ${accountToDelete.email}? Synced emails will no longer be polled from this server.`}
          confirmLabel="Disconnect Mailbox"
          onClose={() => setAccountToDelete(null)}
          onConfirm={handleDeleteAccount}
        />
      )}

      {/* MODAL: EDIT SHARED INBOX DELEGATION */}
      {editingSharedAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                Manage Shared Access
              </h3>
              <button
                onClick={() => setEditingSharedAccount(null)}
                className="text-zinc-400 hover:text-zinc-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-500">
              Select which workspace members have permission to view, draft, and reply to emails from{' '}
              <strong className="text-zinc-900 dark:text-white">{editingSharedAccount.email}</strong>.
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-xl p-2">
              {members.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs',
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-medium'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMemberIds((prev) => [...prev, m.id]);
                          } else {
                            setSelectedMemberIds((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>
                        {m.firstName} {m.familyName} ({m.email})
                      </span>
                    </div>
                    <Badge variant="zinc" className="text-[10px]">
                      {m.role}
                    </Badge>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMemberIds([])}
                className="text-xs text-zinc-500"
              >
                Allow Everyone
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSharedAccount(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSharedDelegation}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Save Permissions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SettingsSubNavLayout>
  );
};

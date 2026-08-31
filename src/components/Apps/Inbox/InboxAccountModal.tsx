import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  ShieldCheck, 
  Key, 
  Server, 
  Check, 
  AlertCircle, 
  Loader2, 
  HelpCircle, 
  ExternalLink, 
  Users, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EmailAccount, EmailProvider, AccountType } from '../../../types/inbox';
import { InboxService, autoDetectEmailSettings } from '../../../services/inboxService';
import { usePlatform } from '../../../hooks/usePlatform';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface InboxAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded?: (acc: EmailAccount) => void;
}

export const InboxAccountModal: React.FC<InboxAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountAdded
}) => {
  const { tenant } = usePlatform();

  const [accountType, setAccountType] = useState<AccountType>('PERSONAL');
  const [provider, setProvider] = useState<EmailProvider>('gmail');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [color, setColor] = useState('#3B82F6');

  // Advanced Server Settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imapHost, setImapHost] = useState('imap.gmail.com');
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(465);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleProviderSelect = (p: EmailProvider) => {
    setProvider(p);
    if (p === 'gmail') {
      setImapHost('imap.gmail.com');
      setImapPort(993);
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(465);
      setColor('#EA4335');
    } else if (p === 'outlook') {
      setImapHost('outlook.office365.com');
      setImapPort(993);
      setSmtpHost('smtp.office365.com');
      setSmtpPort(587);
      setColor('#0078D4');
    } else if (p === 'yahoo') {
      setImapHost('imap.mail.yahoo.com');
      setImapPort(993);
      setSmtpHost('smtp.mail.yahoo.com');
      setSmtpPort(465);
      setColor('#6001D2');
    } else if (p === 'icloud') {
      setImapHost('imap.mail.me.com');
      setImapPort(993);
      setSmtpHost('smtp.mail.me.com');
      setSmtpPort(587);
      setColor('#3B82F6');
    } else if (p === 'shared') {
      setColor('#10B981');
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setTestResult(null);
    if (provider !== 'shared' && val.includes('@')) {
      const auto = autoDetectEmailSettings(val);
      if (auto.imapHost) setImapHost(auto.imapHost);
      if (auto.imapPort) setImapPort(auto.imapPort);
      if (auto.smtpHost) setSmtpHost(auto.smtpHost);
      if (auto.smtpPort) setSmtpPort(auto.smtpPort);
      if (auto.provider && auto.provider !== 'custom') {
        setProvider(auto.provider as EmailProvider);
      }
    }
  };

  const handleTestConnection = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await InboxService.testConnection({
        email: email.trim(),
        password: password.trim(),
        provider,
        imapHost,
        imapPort: Number(imapPort),
        smtpHost,
        smtpPort: Number(smtpPort)
      }, tenant?.id);

      setTestResult(res);
      toast.success(res.message);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsSaving(true);
      const newAcc = await InboxService.addAccount({
        email: email.trim(),
        name: name.trim() || email.split('@')[0],
        provider,
        type: accountType,
        color,
        config: {
          email: email.trim(),
          password: password.trim(),
          provider,
          imapHost,
          imapPort: Number(imapPort),
          smtpHost,
          smtpPort: Number(smtpPort)
        }
      }, tenant?.id);

      toast.success(`Account "${newAcc.name}" connected successfully!`);
      if (onAccountAdded) onAccountAdded(newAcc);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Connect Email Account</h3>
                  <p className="text-xs text-zinc-500">Connect personal mailboxes or collaborate with shared team inboxes</p>
                </div>
              </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto custom-scrollbar flex-1">
          
          {/* Account Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
            <button
              onClick={() => {
                setAccountType('PERSONAL');
                if (provider === 'shared') handleProviderSelect('gmail');
              }}
              className={cn(
                "py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                accountType === 'PERSONAL'
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Mail size={14} />
              <span>Personal Mailbox</span>
            </button>

            <button
              onClick={() => {
                setAccountType('SHARED');
                handleProviderSelect('shared');
              }}
              className={cn(
                "py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                accountType === 'SHARED'
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Users size={14} />
              <span>Shared Team Inbox</span>
            </button>
          </div>

          {/* Provider Selector (if personal) */}
          {accountType === 'PERSONAL' && (
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Select Provider Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'gmail', label: 'Gmail / Google', color: '#EA4335' },
                  { id: 'outlook', label: 'Outlook / M365', color: '#0078D4' },
                  { id: 'yahoo', label: 'Yahoo Mail', color: '#6001D2' },
                  { id: 'custom', label: 'Custom IMAP', color: '#6366F1' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderSelect(p.id as any)}
                    className={cn(
                      "p-3 rounded-2xl border text-center transition-all cursor-pointer font-bold",
                      provider === p.id
                        ? "border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Account Label / Display Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={accountType === 'SHARED' ? 'e.g. Customer Support' : 'e.g. Work Gmail'}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder={accountType === 'SHARED' ? 'support@yourdomain.com' : 'you@company.com'}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {accountType === 'PERSONAL' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Password / App Password *
                  </label>
                  {provider === 'gmail' && (
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>Create Google App Password</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="••••••••••••••••"
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
            )}
          </div>

          {/* Google / Microsoft App Password Notice */}
          {provider === 'gmail' && accountType === 'PERSONAL' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
              <Key size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Using Gmail:</span> Generate a 16-character <strong>Google App Password</strong> in your Google Account security settings (Security &gt; 2-Step Verification &gt; App Passwords) for instant direct connection.
              </div>
            </div>
          )}

          {/* Advanced Server Settings Toggle */}
          {accountType === 'PERSONAL' && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Server size={14} /> Server Host & Port Configurations
                </span>
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAdvanced && (
                <div className="p-4 space-y-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">IMAP Host</label>
                      <input
                        type="text"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">IMAP Port</label>
                      <input
                        type="number"
                        value={imapPort}
                        onChange={(e) => setImapPort(Number(e.target.value))}
                        className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">SMTP Port</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Connection Output */}
          {testResult && (
            <div className={cn(
              "p-3 rounded-2xl border flex items-start gap-2.5",
              testResult.success
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200"
            )}>
              {testResult.success ? (
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-[11px] leading-relaxed font-semibold">
                {testResult.message}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
          {accountType === 'PERSONAL' ? (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !email.trim() || !password.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              <span>Test Connection</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveAccount}
              disabled={isSaving || !email.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Connect Account</span>
            </button>
          </div>
        </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

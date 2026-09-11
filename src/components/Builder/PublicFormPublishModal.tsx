import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Globe, 
  Code, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  Palette, 
  Sliders, 
  Share2,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface PublicFormPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleName: string;
  formId?: string;
  formName?: string;
}

export const PublicFormPublishModal: React.FC<PublicFormPublishModalProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleName,
  formId,
  formName = 'Standard Intake Form'
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'security' | 'styling'>('link');
  const [isPublicEnabled, setIsPublicEnabled] = useState(true);
  const [enableCaptcha, setEnableCaptcha] = useState(true);
  const [rateLimitPerHour, setRateLimitPerHour] = useState(30);
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark' | 'indigo'>('auto');
  const [hideHeader, setHideHeader] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedReact, setCopiedReact] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.aurora.io';
  const publicUrl = origin + '/public/portal/' + moduleId + (formId ? '?formId=' + formId : '');
  const iframeSnippet = '<iframe\n  src="' + publicUrl + (hideHeader ? (publicUrl.includes('?') ? '&' : '?') + 'minimal=true' : '') + '"\n  width="100%"\n  height="720px"\n  frameBorder="0"\n  allow="camera; microphone; geolocation"\n  style={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.1)" }}\n/>';
  const reactSnippet = 'import { AuroraPublicForm } from "@aurora/forms-react";\n\nexport default function ContactPage() {\n  return (\n    <AuroraPublicForm\n      moduleId="' + moduleId + '"' + (formId ? '\n      formId="' + formId + '"' : '') + '\n      theme="' + themeMode + '"' + (hideHeader ? '\n      minimal={true}' : '') + '\n      onSuccess={(submissionId) => console.log("Success:", submissionId)}\n    />\n  );\n}';

  const handleCopy = (text: string, type: 'link' | 'iframe' | 'react') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'iframe') {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    } else {
      setCopiedReact(true);
      setTimeout(() => setCopiedReact(false), 2000);
    }
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm">
              <Globe size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                  Public Form Publishing & Embed Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Publish <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formName}</span> for external intake with zero authentication
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100/40 dark:bg-zinc-950/40">
          <div className="flex items-center gap-1">
            {[
              { id: 'link', label: 'Share Link', icon: Share2 },
              { id: 'embed', label: 'iFrame & Embed', icon: Code },
              { id: 'security', label: 'Security & Anti-Spam', icon: ShieldCheck },
              { id: 'styling', label: 'Styling & Themes', icon: Palette }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === tab.id
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200/80 dark:border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => window.open(publicUrl, '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ExternalLink size={12} />
            <span>Open Live Portal</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                    Direct Public Intake URL
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    HTTPS Encrypted
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(publicUrl, 'link')}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-500/10"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Globe size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Public Access Switch</h5>
                    <p className="text-[11px] text-zinc-500">Allow external visitors to view and submit records through this URL</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublicEnabled}
                    onChange={(e) => setIsPublicEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-tight flex items-center gap-1.5">
                    <Code size={14} className="text-indigo-500" />
                    <span>Responsive HTML iFrame Embed</span>
                  </label>
                  <button
                    onClick={() => handleCopy(iframeSnippet, 'iframe')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {copiedIframe ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedIframe ? 'Copied' : 'Copy iFrame'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-zinc-950 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto border border-zinc-800 leading-relaxed">
                  {iframeSnippet}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-tight flex items-center gap-1.5">
                    <Terminal size={14} className="text-indigo-500" />
                    <span>React Component SDK</span>
                  </label>
                  <button
                    onClick={() => handleCopy(reactSnippet, 'react')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {copiedReact ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedReact ? 'Copied' : 'Copy Component'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-zinc-950 text-indigo-300 font-mono text-xs rounded-2xl overflow-x-auto border border-zinc-800 leading-relaxed">
                  {reactSnippet}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                      Cloudflare Turnstile Anti-Bot Protection
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Silently verifies human visitors to eliminate spam submissions without frustrating image puzzles.
                    </p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={enableCaptcha}
                    onChange={(e) => setEnableCaptcha(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                      Rate Limiting Threshold
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Maximum allowable form submissions per IP address per hour.
                    </p>
                  </div>
                  <select
                    value={rateLimitPerHour}
                    onChange={(e) => setRateLimitPerHour(Number(e.target.value))}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-bold"
                  >
                    <option value={10}>10 submissions / hr</option>
                    <option value={30}>30 submissions / hr</option>
                    <option value={60}>60 submissions / hr</option>
                    <option value={120}>120 submissions / hr</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'styling' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">
                  Form Embed Color Theme
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'auto', label: 'Auto (System)' },
                    { id: 'light', label: 'Clean Light' },
                    { id: 'dark', label: 'Midnight Dark' },
                    { id: 'indigo', label: 'Aurora Indigo' }
                  ].map(thm => (
                    <button
                      key={thm.id}
                      onClick={() => setThemeMode(thm.id as any)}
                      className={cn(
                        "p-3 rounded-2xl border text-xs font-bold text-center transition-all",
                        themeMode === thm.id
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                      )}
                    >
                      {thm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Minimalist Mode (Hide Header)</h4>
                  <p className="text-[11px] text-zinc-500">Omits title headers and portal navigation for seamless inline embedding</p>
                </div>
                <input 
                  type="checkbox"
                  checked={hideHeader}
                  onChange={(e) => setHideHeader(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>

          <button
            onClick={() => {
              toast.success('Public form publishing settings saved!');
              onClose();
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <CheckCircle2 size={14} />
            <span>Save & Publish Live</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

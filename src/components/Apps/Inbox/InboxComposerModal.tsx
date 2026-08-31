import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Minus, 
  Maximize2, 
  Minimize2, 
  Send, 
  Paperclip, 
  Sparkles, 
  FileText, 
  FolderPlus, 
  ChevronDown, 
  Trash2, 
  Loader2, 
  Check, 
  Layers,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Quote,
  RemoveFormatting,
  Palette,
  Type,
  Undo,
  Redo,
  Code
} from 'lucide-react';
import { EmailAccount, EmailAttachment, EmailSnippet } from '../../../types/inbox';
import { InboxService } from '../../../services/inboxService';
import { DocumentService } from '../../../services/documentService';
import { DriveService } from '../../../services/driveService';
import { InboxSnippetsModal } from './InboxSnippetsModal';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface InboxComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: EmailAccount[];
  initialAccountId?: string;
  initialTo?: string[];
  initialSubject?: string;
  initialBody?: string;
  threadId?: string;
  onSentSuccess?: () => void;
}

export const InboxComposerModal: React.FC<InboxComposerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  initialAccountId,
  initialTo,
  initialSubject,
  initialBody,
  threadId,
  onSentSuccess
}) => {
  const { tenant, user: platformUser } = usePlatform();
  const { user } = useAuth();

  const [accountId, setAccountId] = useState<string>(initialAccountId || accounts[0]?.id || '');
  const [toInput, setToInput] = useState<string>(initialTo?.join(', ') || '');
  const [ccInput, setCcInput] = useState<string>('');
  const [bccInput, setBccInput] = useState<string>('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState<string>(initialSubject || '');
  const [bodyText, setBodyText] = useState<string>(initialBody || '');
  const [bodyHtml, setBodyHtml] = useState<string>(initialBody ? `<p>${initialBody}</p>` : '');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Rich Formatting Toolbar State
  const editorRef = useRef<HTMLDivElement>(null);
  const [showFormattingBar, setShowFormattingBar] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Send Later & Snippets State
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showSnippetsModal, setShowSnippetsModal] = useState(false);

  // Template Picker State
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Drive Picker State
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [showDriveMenu, setShowDriveMenu] = useState(false);

  // AI Assistant State
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'direct' | 'concise' | 'executive'>('professional');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // AI Smart Compose (Ghost Completion) State
  const [smartComposeText, setSmartComposeText] = useState<string | null>(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const composeDebounceRef = useRef<any>(null);

  // Sync initial body into editor
  useEffect(() => {
    if (initialAccountId) setAccountId(initialAccountId);
    if (initialTo) setToInput(initialTo.join(', '));
    if (initialSubject) setSubject(initialSubject);
    if (initialBody) {
      setBodyText(initialBody);
      setBodyHtml(`<p>${initialBody.replace(/\n/g, '<br/>')}</p>`);
      if (editorRef.current) {
        editorRef.current.innerHTML = `<p>${initialBody.replace(/\n/g, '<br/>')}</p>`;
      }
    }
  }, [initialAccountId, initialTo, initialSubject, initialBody]);

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const txt = editorRef.current.innerText;
    const html = editorRef.current.innerHTML;
    setBodyText(txt);
    setBodyHtml(html);
    setSmartComposeText(null);

    if (composeDebounceRef.current) clearTimeout(composeDebounceRef.current);
    if (txt.trim().length >= 8) {
      composeDebounceRef.current = setTimeout(async () => {
        try {
          setIsFetchingSuggestion(true);
          const suggestion = await InboxService.generateSmartComposeSuggestion(txt, subject);
          if (suggestion) {
            setSmartComposeText(suggestion);
          }
        } catch (_) {}
        finally {
          setIsFetchingSuggestion(false);
        }
      }, 500);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && smartComposeText) {
      e.preventDefault();
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand('insertText', false, ` ${smartComposeText}`);
        setBodyText(editorRef.current.innerText);
        setBodyHtml(editorRef.current.innerHTML);
        setSmartComposeText(null);
      }
    } else if (e.key === 'Escape') {
      setSmartComposeText(null);
    }
  };

  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, val);
    setBodyHtml(editorRef.current.innerHTML);
    setBodyText(editorRef.current.innerText);
  };

  const handleInsertLink = () => {
    const url = prompt('Enter the link URL (e.g. https://example.com):');
    if (url) {
      execCmd('createLink', url);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Load templates
      DocumentService.getTemplates(tenant?.id || 'default')
        .then(t => setTemplates(t))
        .catch(() => setTemplates([]));

      // Load Drive files
      try {
        const items = DriveService.getAllItems();
        setDriveFiles(items.filter(i => i.type === 'FILE' && i.status === 'ACTIVE'));
      } catch (_) {}
    }
  }, [isOpen, tenant?.id]);

  if (!isOpen) return null;

  const handleSend = async () => {
    const toRecipients = toInput.split(',').map(s => s.trim()).filter(Boolean);
    if (!toRecipients.length) {
      toast.error('Please enter at least one recipient email');
      return;
    }

    try {
      setIsSending(true);
      const activeAcc = accounts.find(a => a.id === accountId);
      const userFullName = 
        platformUser?.name ||
        (platformUser?.firstName ? `${platformUser.firstName} ${platformUser.lastName || ''}`.trim() : '') ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        (user?.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() : '') ||
        user?.email?.split('@')[0] ||
        'Kenny Powers';

      const senderName = userFullName;
      const senderEmail = activeAcc?.email || platformUser?.email || user?.email || 'kenny.powers@aurora.internal';
      const senderAvatarUrl = 
        platformUser?.avatarUrl || 
        user?.user_metadata?.avatar_url || 
        user?.user_metadata?.avatar || 
        user?.user_metadata?.picture || 
        '';

      const req = {
        accountId,
        fromName: senderName,
        fromEmail: senderEmail,
        fromAvatarUrl: senderAvatarUrl || undefined,
        to: toRecipients,
        cc: ccInput ? ccInput.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        bcc: bccInput ? bccInput.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        subject: subject || 'No Subject',
        bodyText: editorRef.current?.innerText || bodyText,
        bodyHtml: editorRef.current?.innerHTML || (bodyHtml || `<div style="font-family: sans-serif; white-space: pre-wrap; line-height: 1.6;">${bodyText}</div>`),
        threadId,
        scheduledSendAt: scheduledTime || undefined,
        attachments: attachments.map(a => ({
          filename: a.filename,
          contentType: a.contentType,
          contentBase64: a.contentBase64 || ''
        }))
      };

      if (scheduledTime) {
        await InboxService.scheduleEmail(accountId, req, scheduledTime, tenant?.id);
        toast.success(`Email scheduled to send at ${new Date(scheduledTime).toLocaleString()}`);
      } else {
        await InboxService.sendEmail(req, tenant?.id);
        toast.success('Email transmitted successfully!');
      }

      if (onSentSuccess) onSentSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleInsertSnippet = (snip: EmailSnippet) => {
    const interpolated = InboxService.interpolateTemplate(snip.content, {
      'user.name': user?.name || user?.firstName || 'Staff',
      'user.email': user?.email || '',
      'tenant.name': tenant?.name || 'Aurora'
    });
    setBodyText(prev => prev ? `${prev}\n\n${interpolated}` : interpolated);
    if (editorRef.current) {
      editorRef.current.innerHTML = editorRef.current.innerHTML 
        ? `${editorRef.current.innerHTML}<p>${interpolated.replace(/\n/g, '<br/>')}</p>` 
        : `<p>${interpolated.replace(/\n/g, '<br/>')}</p>`;
      setBodyHtml(editorRef.current.innerHTML);
    }
    toast.success(`Inserted snippet "${snip.title}"`);
  };

  const handleInsertTemplate = (tpl: any) => {
    const context = {
      'party.firstName': toInput.split('@')[0] || 'Customer',
      'tenant.name': tenant?.name || 'Aurora',
      'user.name': user?.name || user?.firstName || 'Representative',
      'system.currentDate': new Date().toLocaleDateString()
    };
    const rawContent = tpl.content || '';
    const interpolated = InboxService.interpolateTemplate(rawContent, context);
    setBodyText(interpolated.replace(/<[^>]+>/g, ''));
    setBodyHtml(interpolated);
    if (editorRef.current) {
      editorRef.current.innerHTML = interpolated;
    }
    setShowTemplateMenu(false);
    toast.success(`Inserted template "${tpl.name}"`);
  };

  const handleAttachDriveFile = (file: any) => {
    const newAtt: EmailAttachment = {
      id: `att_${Date.now()}_${file.id}`,
      filename: file.name,
      contentType: file.mimeType || 'application/pdf',
      size: file.size || 2048,
      driveItemId: file.id
    };
    setAttachments(prev => [...prev, newAtt]);
    setShowDriveMenu(false);
    toast.success(`Attached "${file.name}" from Aurora Drive`);
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] || '';
        const newAtt: EmailAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          contentBase64: base64
        };
        setAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setIsGeneratingAi(true);
      const draft = await InboxService.draftReplyWithAI(aiPrompt, aiTone, bodyText || subject);
      setBodyText(draft);
      setBodyHtml(`<p>${draft.replace(/\n/g, '<br/>')}</p>`);
      if (editorRef.current) {
        editorRef.current.innerHTML = `<p>${draft.replace(/\n/g, '<br/>')}</p>`;
      }
      setShowAiToolbar(false);
      setAiPrompt('');
      toast.success('AI draft generated!');
    } catch (_) {
      toast.error('Failed to generate AI draft');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl flex flex-col transition-all overflow-hidden",
            isFullscreen 
              ? "inset-4 md:inset-10" 
              : isMinimized 
                ? "bottom-0 right-10 w-80 h-12" 
                : "bottom-4 right-10 w-[640px] max-w-[90vw] h-[600px] max-h-[85vh]"
          )}
        >
      
      {/* Header Bar */}
      <div className="px-4 py-3 bg-zinc-900 text-white flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-xs font-bold truncate">
            {subject || 'New Message'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-zinc-400">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setIsMinimized(false);
            }}
            className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-white rounded hover:bg-zinc-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Body (hidden when minimized) */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col overflow-hidden text-xs">
          
          {/* Account From Selector */}
          <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <span className="text-zinc-400 font-semibold w-12 shrink-0">From:</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="flex-1 bg-transparent text-zinc-800 dark:text-zinc-200 font-bold focus:outline-none cursor-pointer"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="dark:bg-zinc-900">
                  {acc.name} &lt;{acc.email}&gt; {acc.type === 'SHARED' ? '(Shared)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* To Recipient */}
          <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <span className="text-zinc-400 font-semibold w-12 shrink-0">To:</span>
            <input
              type="text"
              placeholder="recipients@example.com"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="flex-1 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
            />
            <button
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
            >
              Cc/Bcc
            </button>
          </div>

          {/* Cc & Bcc Optional Rows */}
          {showCcBcc && (
            <>
              <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <span className="text-zinc-400 font-semibold w-12 shrink-0">Cc:</span>
                <input
                  type="text"
                  placeholder="cc@example.com"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  className="flex-1 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <span className="text-zinc-400 font-semibold w-12 shrink-0">Bcc:</span>
                <input
                  type="text"
                  placeholder="bcc@example.com"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  className="flex-1 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Subject Line */}
          <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <span className="text-zinc-400 font-semibold w-12 shrink-0">Subject:</span>
            <input
              type="text"
              placeholder="Message Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-transparent font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          {/* AI Assistance Toolbar Panel */}
          {showAiToolbar && (
            <div className="p-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-b border-indigo-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  AI Co-Pilot Composer
                </span>
                <button 
                  onClick={() => setShowAiToolbar(false)}
                  className="text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="What would you like the AI to write? (e.g. Schedule call for tomorrow, thank for the demo...)"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />

                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value as any)}
                  className="bg-white dark:bg-zinc-900 border border-indigo-500/30 rounded-xl px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="direct">Direct</option>
                  <option value="concise">Concise</option>
                  <option value="executive">Executive</option>
                </select>

                <button
                  onClick={handleGenerateAiDraft}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl flex items-center gap-1 border border-zinc-200 dark:border-zinc-700/80 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAi ? <Loader2 size={13} className="animate-spin text-zinc-500" /> : <Sparkles size={13} className="text-zinc-500" />}
                  <span>Generate</span>
                </button>
              </div>
            </div>
          )}

          {/* Rich Formatting Toolbar */}
          {showFormattingBar && (
            <div className="px-3 py-1.5 bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1 flex-wrap text-xs select-none">
              
              {/* Undo / Redo */}
              <button
                type="button"
                onClick={() => execCmd('undo')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={14} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('redo')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={14} />
              </button>

              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

              {/* Font Family Selector */}
              <select
                onChange={(e) => execCmd('fontName', e.target.value)}
                className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                defaultValue="sans-serif"
              >
                <option value="sans-serif">Sans Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier</option>
              </select>

              {/* Font Size Selector */}
              <select
                onChange={(e) => execCmd('fontSize', e.target.value)}
                className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                defaultValue="3"
              >
                <option value="1">Small</option>
                <option value="3">Normal</option>
                <option value="5">Large</option>
                <option value="7">Huge</option>
              </select>

              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

              {/* Bold */}
              <button
                type="button"
                onClick={() => execCmd('bold')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold cursor-pointer"
                title="Bold (Ctrl+B)"
              >
                <Bold size={14} />
              </button>

              {/* Italic */}
              <button
                type="button"
                onClick={() => execCmd('italic')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 italic cursor-pointer"
                title="Italic (Ctrl+I)"
              >
                <Italic size={14} />
              </button>

              {/* Underline */}
              <button
                type="button"
                onClick={() => execCmd('underline')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 underline cursor-pointer"
                title="Underline (Ctrl+U)"
              >
                <Underline size={14} />
              </button>

              {/* Strikethrough */}
              <button
                type="button"
                onClick={() => execCmd('strikeThrough')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 line-through cursor-pointer"
                title="Strikethrough"
              >
                <Strikethrough size={14} />
              </button>

              {/* Color Palette Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  title="Text Color"
                >
                  <Palette size={14} />
                </button>

                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 flex items-center gap-1.5">
                    {['#000000', '#4B5563', '#2563EB', '#4F46E5', '#059669', '#DC2626', '#D97706', '#9333EA'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          execCmd('foreColor', c);
                          setShowColorPicker(false);
                        }}
                        style={{ backgroundColor: c }}
                        className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 hover:scale-110 transition-transform cursor-pointer"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

              {/* Alignment */}
              <button
                type="button"
                onClick={() => execCmd('justifyLeft')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Align Left"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyCenter')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyRight')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Align Right"
              >
                <AlignRight size={14} />
              </button>

              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

              {/* Lists */}
              <button
                type="button"
                onClick={() => execCmd('insertUnorderedList')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Bulleted List"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('insertOrderedList')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered size={14} />
              </button>

              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

              {/* Link */}
              <button
                type="button"
                onClick={handleInsertLink}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Insert Link (Ctrl+K)"
              >
                <Link size={14} />
              </button>

              {/* Quote */}
              <button
                type="button"
                onClick={() => execCmd('formatBlock', 'blockquote')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Quote Block"
              >
                <Quote size={14} />
              </button>

              {/* Clear Formatting */}
              <button
                type="button"
                onClick={() => execCmd('removeFormat')}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                title="Clear Formatting"
              >
                <RemoveFormatting size={14} />
              </button>

            </div>
          )}

          {/* Email Rich WYSIWYG Editable Surface */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            onKeyDown={handleEditorKeyDown}
            data-placeholder="Type your message here..."
            className="flex-1 p-4 bg-transparent text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed focus:outline-none overflow-y-auto custom-scrollbar min-h-[160px] empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 prose dark:prose-invert max-w-none"
          />

          {/* AI Smart Compose (Ghost Autocomplete Banner) */}
          {smartComposeText && (
            <div className="px-4 py-1.5 bg-zinc-100/90 dark:bg-zinc-800/90 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs text-zinc-800 dark:text-zinc-200 animate-in fade-in slide-in-from-bottom-1 duration-150 select-none">
              <div className="flex items-center gap-2 truncate">
                <Sparkles size={13} className="text-zinc-500 shrink-0" />
                <span className="truncate">
                  Autocomplete: <span className="font-semibold text-zinc-900 dark:text-zinc-100">"...{smartComposeText}"</span>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (editorRef.current) {
                      editorRef.current.focus();
                      document.execCommand('insertText', false, ` ${smartComposeText}`);
                      setBodyText(editorRef.current.innerText);
                      setBodyHtml(editorRef.current.innerHTML);
                      setSmartComposeText(null);
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all border border-zinc-300 dark:border-zinc-600"
                >
                  <span>Accept</span>
                  <kbd className="px-1 py-0.2 bg-zinc-300 dark:bg-zinc-800 rounded text-[10px] text-zinc-700 dark:text-zinc-300">Tab ⇥</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => setSmartComposeText(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Attachments Preview Chips */}
          {attachments.length > 0 && (
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-2 flex-wrap">
              {attachments.map(att => (
                <div
                  key={att.id}
                  className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center gap-2 text-[11px]"
                >
                  <Paperclip size={12} className="text-zinc-400" />
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[160px]">{att.filename}</span>
                  <button
                    onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                    className="text-zinc-400 hover:text-rose-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between gap-3 shrink-0">
            
            {/* Left Integration Buttons */}
            <div className="flex items-center gap-1.5 relative">
              
              {/* Send Button & Send Later Group */}
              <div className="flex items-center rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm overflow-hidden">
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{scheduledTime ? 'Schedule Send' : 'Send'}</span>
                </button>

                <button
                  onClick={() => setShowScheduleMenu(!showScheduleMenu)}
                  className="p-2 border-l border-zinc-700 dark:border-zinc-300 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Send Later options"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Schedule Dropdown */}
              {showScheduleMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1 z-50 text-xs">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1 block">
                    Schedule Send
                  </span>
                  <button
                    onClick={() => {
                      setScheduledTime(null);
                      setShowScheduleMenu(false);
                      toast.success('Send mode: Immediately');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-medium"
                  >
                    🚀 Send Immediately
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(9, 0, 0, 0);
                      setScheduledTime(d.toISOString());
                      setShowScheduleMenu(false);
                      toast.success(`Scheduled for Tomorrow at 9:00 AM`);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-medium"
                  >
                    🌅 Tomorrow Morning (9:00 AM)
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
                      d.setHours(9, 0, 0, 0);
                      setScheduledTime(d.toISOString());
                      setShowScheduleMenu(false);
                      toast.success(`Scheduled for Monday at 9:00 AM`);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-medium"
                  >
                    📅 Next Week (Monday 9:00 AM)
                  </button>
                </div>
              )}

              {/* Formatting Options Toggle */}
              <button
                type="button"
                onClick={() => setShowFormattingBar(!showFormattingBar)}
                className={cn(
                  "p-2 rounded-xl text-xs transition-colors cursor-pointer",
                  showFormattingBar ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
                title="Formatting options"
              >
                <Type size={16} />
              </button>

              {/* AI Trigger */}
              <button
                onClick={() => setShowAiToolbar(!showAiToolbar)}
                className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                title="AI Co-pilot Drafting"
              >
                <Sparkles size={16} />
              </button>

              {/* Snippets / Slash Commands Trigger */}
              <button
                onClick={() => setShowSnippetsModal(true)}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs font-mono font-bold"
                title="Insert Canned Snippet (/)"
              >
                /
              </button>

              {/* Template Picker */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowTemplateMenu(!showTemplateMenu);
                    setShowDriveMenu(false);
                  }}
                  className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Insert Document Template"
                >
                  <FileText size={16} />
                </button>

                {showTemplateMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1 block">
                      Insert Template
                    </span>
                    {templates.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 p-2">No templates configured.</p>
                    ) : (
                      templates.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => handleInsertTemplate(tpl)}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold truncate transition-colors cursor-pointer"
                        >
                          {tpl.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Aurora Drive File Picker */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowDriveMenu(!showDriveMenu);
                    setShowTemplateMenu(false);
                  }}
                  className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Attach from Aurora Drive"
                >
                  <FolderPlus size={16} />
                </button>

                {showDriveMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1 block">
                      Attach from Aurora Drive
                    </span>
                    {driveFiles.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 p-2">No files in Drive.</p>
                    ) : (
                      driveFiles.map(file => (
                        <button
                          key={file.id}
                          onClick={() => handleAttachDriveFile(file)}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold truncate transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <span className="truncate">{file.name}</span>
                          <span className="text-[10px] text-zinc-400 ml-2">{Math.round((file.size || 1024) / 1024)}KB</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Local File Attachment */}
              <label className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                <Paperclip size={16} />
                <input type="file" multiple onChange={handleLocalFileUpload} className="hidden" />
              </label>
            </div>

            {/* Right Discard Draft */}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Discard Draft"
            >
              <Trash2 size={16} />
            </button>

          </div>

        </div>
      )}

        {/* Snippets / Slash Shortcuts Modal */}
        <InboxSnippetsModal
          isOpen={showSnippetsModal}
          onClose={() => setShowSnippetsModal(false)}
          onSelectSnippet={handleInsertSnippet}
        />

        </motion.div>
      )}
    </AnimatePresence>
  );
};

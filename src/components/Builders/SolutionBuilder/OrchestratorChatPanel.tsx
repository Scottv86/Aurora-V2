import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Sparkles,
  Loader2,
  X,
  Check,
  AtSign,
  Layers,
  Database,
  FileText,
} from 'lucide-react';
import {
  SolutionChatMessage,
  ContextSource,
  PinnedChatContext,
  GuidedDiscoveryCard,
} from '../../../types/solutions';
import { CollapsibleSourcesTray } from './CollapsibleSourcesTray';
import { AgentExecutionTrace } from '../../AI/AgentExecutionTrace';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../lib/utils';

const parseInlineMarkdown = (str: string): React.ReactNode[] => {
  const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-zinc-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return (
        <del key={i} className="line-through opacity-75">
          {part.slice(2, -2)}
        </del>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isSafe = /^(https?:\/\/|mailto:|\/)/i.test(href.trim());
      if (isSafe) {
        return (
          <a
            key={i}
            href={href.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            {label}
          </a>
        );
      }
      return <span key={i}>{label}</span>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

const FormattedChatMarkdown: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (keyPrefix: string) => {
    if (tableRows.length === 0) return;
    const header = tableRows[0];
    const body = tableRows.slice(1);
    elements.push(
      <div
        key={`table-${keyPrefix}`}
        className="my-2 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
      >
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-zinc-100/80 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              {header.map((cell, ci) => (
                <th key={ci} className="px-2 py-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                  {parseInlineMarkdown(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {body.map((row, ri) => (
              <tr key={ri} className="bg-white dark:bg-zinc-950/60">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1.5 text-zinc-700 dark:text-zinc-300">
                    {parseInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      flushTable(`pre-${idx}`);
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
        codeLines = [];
      } else {
        elements.push(
          <div
            key={`code-${idx}`}
            className="my-2 rounded-lg bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 overflow-hidden"
          >
            {codeLang && (
              <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-400 border-b border-zinc-800 bg-zinc-950/60">
                {codeLang}
              </div>
            )}
            <pre className="p-2.5 overflow-x-auto text-[11px] font-mono text-zinc-100 leading-relaxed">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeLang = '';
        codeLines = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    // Markdown table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c));
      if (!isSeparator) {
        tableRows.push(cells);
      }
      return;
    } else if (tableRows.length > 0) {
      flushTable(`end-${idx}`);
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="h-1.5" />);
      return;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${idx}`} className="my-2 border-zinc-200 dark:border-zinc-800" />
      );
      return;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const headingClass =
        level === 1
          ? 'text-[13px] font-bold text-zinc-900 dark:text-white mt-2 mb-1'
          : level === 2
            ? 'text-xs font-bold text-zinc-900 dark:text-white mt-2 mb-1'
            : 'text-xs font-semibold text-zinc-800 dark:text-zinc-100 mt-1.5 mb-0.5';
      elements.push(
        <div key={`h-${idx}`} className={headingClass}>
          {parseInlineMarkdown(content)}
        </div>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${idx}`}
          className="pl-2.5 border-l-2 border-indigo-400 dark:border-indigo-500 text-zinc-600 dark:text-zinc-400 italic my-1.5"
        >
          {parseInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Ordered list
    const numMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numMatch) {
      const indent = Math.min(Math.floor(numMatch[1].length / 2), 3);
      elements.push(
        <div
          key={`ol-${idx}`}
          className="flex items-start gap-1.5 my-0.5"
          style={{ paddingLeft: `${indent * 12}px` }}
        >
          <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 select-none">
            {numMatch[2]}.
          </span>
          <div className="flex-1 min-w-0">{parseInlineMarkdown(numMatch[3])}</div>
        </div>
      );
      return;
    }

    // Unordered list
    const bulletMatch = rawLine.match(/^(\s*)[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const indent = Math.min(Math.floor(bulletMatch[1].length / 2), 3);
      elements.push(
        <div
          key={`ul-${idx}`}
          className="flex items-start gap-1.5 my-0.5"
          style={{ paddingLeft: `${indent * 12 + 2}px` }}
        >
          <span className="text-indigo-500 dark:text-indigo-400 shrink-0 select-none">•</span>
          <div className="flex-1 min-w-0">{parseInlineMarkdown(bulletMatch[2])}</div>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${idx}`} className="my-0.5 leading-relaxed">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (tableRows.length > 0) {
    flushTable('eof');
  }
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre
        key="code-eof"
        className="my-2 p-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 overflow-x-auto text-[11px] font-mono text-zinc-100"
      >
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5 break-words">{elements}</div>;
};

export interface OrchestratorChatPanelProps {
  messages: SolutionChatMessage[];
  sources?: ContextSource[];
  onAddSource?: (source: ContextSource) => void;
  onRemoveSource?: (id: string) => void;
  onSendMessage: (text: string, model: string) => void;
  onApplySuggestedAction: (actionText: string) => void;
  onAnswerGuidedDiscovery?: (card: GuidedDiscoveryCard, answer: string, skipped?: boolean) => void;
  onSaveToNote?: (text: string) => void;
  pinnedContext?: PinnedChatContext | null;
  onClearPinnedContext?: () => void;
  onCollapsePanel?: () => void;
  isThinking?: boolean;
  liveStatus?: string | null;
  liveTrace?: Array<{ name: string; arguments?: any; result?: any; status: 'running' | 'done' }>;
  workspaceContextNote?: string | null;
  thinkingSteps?: { id: string; label: string; status: 'pending' | 'active' | 'completed' }[];
}

export const OrchestratorChatPanel: React.FC<OrchestratorChatPanelProps> = ({
  messages,
  sources = [],
  onAddSource,
  onRemoveSource,
  onSendMessage,
  onApplySuggestedAction,
  onAnswerGuidedDiscovery,
  pinnedContext,
  onClearPinnedContext,
  onCollapsePanel,
  isThinking = false,
  liveStatus = null,
  liveTrace = [],
  workspaceContextNote = null,
}) => {
  const { user: platformUser } = usePlatform();
  const { user: authUser } = useAuth();
  const currentUser: any = platformUser || authUser;

  const userName = (() => {
    if (currentUser) {
      const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      if (fullName) return fullName;
      if (currentUser.name) return currentUser.name;
      if (currentUser.email) return currentUser.email.split('@')[0];
    }
    return 'You';
  })();

  const userAvatarUrl =
    currentUser?.avatarUrl ||
    currentUser?.avatar_url ||
    currentUser?.user_metadata?.avatar_url;

  const userInitials = userName
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [inputText, setInputText] = useState('');
  const [customDraftByCard, setCustomDraftByCard] = useState<Record<string, string>>({});
  const [openCustomCardId, setOpenCustomCardId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Focus input automatically when an element is pinned via Select -> Ask AI
  useEffect(() => {
    if (pinnedContext) {
      inputRef.current?.focus();
    }
  }, [pinnedContext]);

  const handleSend = () => {
    if (!inputText.trim() || isThinking) return;
    const finalPrompt = pinnedContext
      ? `[Context: ${pinnedContext.artifactType} "${pinnedContext.label}"] ${inputText.trim()}`
      : inputText.trim();
    onSendMessage(finalPrompt, 'default');
    setInputText('');
    if (onClearPinnedContext) onClearPinnedContext();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Slim Panel Header */}
      <div className="h-11 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Solution Chat
          </h3>
        </div>
        {onCollapsePanel && (
          <button
            type="button"
            onClick={onCollapsePanel}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Collapse Chat Panel"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Collapsible Sources Tray */}
      {onAddSource && onRemoveSource && (
        <CollapsibleSourcesTray
          sources={sources}
          onAddSource={onAddSource}
          onRemoveSource={onRemoveSource}
        />
      )}

      {/* Subtle Preloaded Workspace & KB Sync Strip */}
      {workspaceContextNote && (
        <div className="px-3.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">{workspaceContextNote}</span>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => {
          const isAurora = msg.role === 'aurora';
          return (
            <div
              key={msg.id}
              className={cn('flex items-start gap-2.5', !isAurora && 'flex-row-reverse')}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-semibold border overflow-hidden',
                  isAurora
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200/80 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                    : 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900'
                )}
              >
                {isAurora ? (
                  <Sparkles size={13} />
                ) : userAvatarUrl ? (
                  <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>

              {/* Message Content */}
              <div className={cn('max-w-[86%] space-y-2 min-w-0', !isAurora && 'items-end flex flex-col')}>
                {/* Collapsible Workspace-Assistant-style Execution Trace */}
                {isAurora && Array.isArray(msg.steps) && msg.steps.length > 0 && (
                  <AgentExecutionTrace steps={msg.steps} compact={false} className="mb-1" />
                )}

                <div
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-xs leading-relaxed border',
                    isAurora
                      ? 'bg-zinc-50 dark:bg-zinc-950/70 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                      : 'bg-indigo-600 border-indigo-600 text-white'
                  )}
                >
                  {msg.pinnedContext && (
                    <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-medium">
                      <AtSign size={10} />
                      <span>{msg.pinnedContext.label}</span>
                    </div>
                  )}
                  {isAurora ? (
                    <FormattedChatMarkdown text={msg.text} />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}

                  {/* Quiet Grounding Attribution */}
                  {isAurora && msg.groundedSources && msg.groundedSources.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800/80 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                      {msg.groundedSources.map((src, idx) => {
                        const isDbCheck = /^(Checked|Inspected|Queried|Reviewed|Searched)/i.test(src);
                        return (
                          <span key={idx} className="inline-flex items-center gap-1">
                            {isDbCheck ? <Database size={9} className="shrink-0" /> : <FileText size={9} className="shrink-0" />}
                            <span>{src}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* AI Proposal / Assembly Matrix Card */}
                {isAurora && msg.proposalCard && (
                  <div className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                      <Layers size={13} className="text-indigo-500" />
                      <span>{msg.proposalCard.title}</span>
                    </div>
                    {msg.proposalCard.summary && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {msg.proposalCard.summary}
                      </p>
                    )}
                    <div className="space-y-1">
                      {msg.proposalCard.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800"
                        >
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                            {item.origin === 'CORE' ? 'Core' : item.origin === 'TEMPLATE' ? 'Blueprint' : 'AI Gen'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stepped Guided Discovery Card */}
                {isAurora && msg.guidedDiscovery && (
                  <div className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 space-y-2.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {msg.guidedDiscovery.question}
                      </div>
                      {msg.guidedDiscovery.status === 'ANSWERED' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                          <Check size={10} />
                          <span>Applied</span>
                        </span>
                      )}
                      {msg.guidedDiscovery.status === 'SKIPPED' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                          Skipped
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {msg.guidedDiscovery.options.map((opt) => {
                        const isResolved =
                          msg.guidedDiscovery?.status === 'ANSWERED' ||
                          msg.guidedDiscovery?.status === 'SKIPPED';
                        const isSelected =
                          msg.guidedDiscovery?.selectedOptionId === opt.id ||
                          (!isResolved && !msg.guidedDiscovery?.selectedOptionId && opt.isDefault);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isResolved}
                            onClick={() =>
                              onAnswerGuidedDiscovery
                                ? onAnswerGuidedDiscovery(msg.guidedDiscovery!, opt.label, false)
                                : onApplySuggestedAction(opt.label)
                            }
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between',
                              isResolved ? 'cursor-default opacity-80' : 'cursor-pointer',
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                                : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                            )}
                          >
                            <span>{opt.label}</span>
                            {isResolved && msg.guidedDiscovery?.selectedOptionId === opt.id ? (
                              <Check size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                            ) : !isResolved && opt.isDefault ? (
                              <span className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400">
                                Recommended
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {msg.guidedDiscovery.status === 'ANSWERED' && msg.guidedDiscovery.customValue && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-500/10 px-2.5 py-1.5 rounded-lg">
                        Custom: {msg.guidedDiscovery.customValue}
                      </div>
                    )}

                    {msg.guidedDiscovery.status !== 'ANSWERED' &&
                      msg.guidedDiscovery.status !== 'SKIPPED' &&
                      (openCustomCardId === msg.guidedDiscovery.id ? (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={customDraftByCard[msg.guidedDiscovery.id] || ''}
                          onChange={(e) =>
                            setCustomDraftByCard((prev) => ({
                              ...prev,
                              [msg.guidedDiscovery!.id]: e.target.value,
                            }))
                          }
                          placeholder="Type custom answer..."
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = (customDraftByCard[msg.guidedDiscovery!.id] || '').trim();
                            if (!val) return;
                            if (onAnswerGuidedDiscovery) {
                              onAnswerGuidedDiscovery(msg.guidedDiscovery!, val, false);
                            } else {
                              onApplySuggestedAction(val);
                            }
                            setOpenCustomCardId(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setOpenCustomCardId(msg.guidedDiscovery!.id)}
                          className="py-1.5 rounded-lg text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Custom...
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onAnswerGuidedDiscovery
                              ? onAnswerGuidedDiscovery(msg.guidedDiscovery!, 'Skip', true)
                              : onApplySuggestedAction('Skip this step and keep smart defaults')
                          }
                          className="py-1.5 rounded-lg text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Skip
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Suggested Action Chips */}
                {isAurora && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onApplySuggestedAction(action)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/40 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Unified Antigravity-style Live Execution Trace + Minimal Thinking Dots */}
        {isThinking && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Loader2 size={13} className="animate-spin" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              {liveTrace.length > 0 ? (
                <AgentExecutionTrace
                  liveTrace={liveTrace}
                  thought={liveStatus || undefined}
                  isLive={true}
                  compact={false}
                />
              ) : (
                <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 inline-flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {liveStatus && <span>{liveStatus}</span>}
                  <span className="inline-flex items-center gap-1 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Bottom Composer with Pinned @Component Chip */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 space-y-2">
        {pinnedContext && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
            <span className="flex items-center gap-1.5 truncate">
              <AtSign size={12} className="shrink-0" />
              <span className="truncate">{pinnedContext.label}</span>
            </span>
            {onClearPinnedContext && (
              <button
                type="button"
                onClick={onClearPinnedContext}
                className="p-0.5 rounded hover:bg-indigo-200/50 dark:hover:bg-indigo-500/20 cursor-pointer shrink-0"
                title="Remove pinned element"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <Paperclip size={14} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pinnedContext
                ? `Ask AI to update ${pinnedContext.label}...`
                : 'Describe your system or request a change...'
            }
            className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 py-1"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isThinking}
            className={cn(
              'p-1.5 rounded-lg transition-colors shrink-0',
              inputText.trim() && !isThinking
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                : 'text-zinc-400 cursor-not-allowed'
            )}
            title="Send message"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

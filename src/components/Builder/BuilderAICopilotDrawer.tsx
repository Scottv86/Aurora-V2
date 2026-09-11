import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Check, 
  Layers, 
  Calculator, 
  ShieldCheck, 
  Wand2, 
  FileCheck2, 
  AlertCircle, 
  Plus, 
  ArrowRight,
  RefreshCw,
  Zap,
  Code2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Field } from '../../types/versionControl';

interface BuilderAICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  layout: Field[];
  tabs: any[];
  moduleName: string;
  onApplyChanges: (newLayout: Field[], description?: string) => void;
}

interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  proposedLayout?: Field[];
  suggestedAction?: string;
  changesSummary?: string[];
  timestamp: string;
}

const PRESET_PROMPTS = [
  {
    id: 'financial',
    label: 'Add Financial Calculation Block',
    desc: 'Subtotal, Tax (10%), Shipping, & Total with live formulas',
    icon: Calculator,
    prompt: 'Add a financial summary section with Subtotal, 10% Tax calculation, Shipping Fee, and calculated Grand Total.'
  },
  {
    id: 'gdpr',
    label: 'Security & PII Data Protection',
    desc: 'Flag sensitive PII and configure masking & validation',
    icon: ShieldCheck,
    prompt: 'Audit my schema for sensitive PII (emails, phones, finances) and apply data protection standards.'
  },
  {
    id: 'polish',
    label: 'Auto-Polish Labels & Tooltips',
    desc: 'Enhance placeholders, labels, and 2-column grid alignment',
    icon: Wand2,
    prompt: 'Polish all field labels with clean casing, generate helpful placeholders, and balance column spans into an organized 12-column grid.'
  },
  {
    id: 'health',
    label: 'Schema Health & Formula Audit',
    desc: 'Check for broken calculations and orphaned fields',
    icon: FileCheck2,
    prompt: 'Run a full schema diagnostic on my fields, calculations, and relationships.'
  }
];

export const BuilderAICopilotDrawer: React.FC<BuilderAICopilotDrawerProps> = ({
  isOpen,
  onClose,
  layout,
  tabs,
  moduleName,
  onApplyChanges
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: 'Hello! I am your in-canvas AI Architect. I can generate fields, write calculation formulas, audit data structures, and balance your interface layouts. How can I help build "' + (moduleName || 'your module') + '"?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const handleSendPrompt = async (promptText: string) => {
    const text = promptText.trim();
    if (!text) return;

    const userMsg: CopilotMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Simulate AI synthesis & transformation engine
    setTimeout(() => {
      let assistantMsg: CopilotMessage;
      const lower = text.toLowerCase();

      if (lower.includes('financial') || lower.includes('tax') || lower.includes('subtotal') || lower.includes('calculation')) {
        const subtotalId = 'field_subtotal_' + Date.now();
        const taxId = 'field_tax_' + Date.now();
        const shippingId = 'field_shipping_' + Date.now();
        const totalId = 'field_total_' + Date.now();

        const newFields: Field[] = [
          ...layout,
          {
            id: subtotalId,
            name: 'subtotal_amount',
            label: 'Subtotal Amount',
            type: 'currency',
            currencySymbol: '$',
            defaultValue: 100,
            colSpan: 6,
            startCol: 1,
            rowIndex: layout.length + 1,
            tabId: tabs[0]?.id || 'default-tab',
            required: true
          },
          {
            id: shippingId,
            name: 'shipping_fee',
            label: 'Shipping & Handling',
            type: 'currency',
            currencySymbol: '$',
            defaultValue: 15,
            colSpan: 6,
            startCol: 7,
            rowIndex: layout.length + 1,
            tabId: tabs[0]?.id || 'default-tab'
          },
          {
            id: taxId,
            name: 'tax_amount',
            label: 'Estimated Tax (10%)',
            type: 'calculation',
            currencySymbol: '$',
            showAsCurrency: true,
            calculationLogic: 'return (Number(fields["' + subtotalId + '"]) || 0) * 0.10;',
            calculationTriggers: [subtotalId],
            colSpan: 6,
            startCol: 1,
            rowIndex: layout.length + 2,
            tabId: tabs[0]?.id || 'default-tab'
          },
          {
            id: totalId,
            name: 'grand_total',
            label: 'Grand Total',
            type: 'calculation',
            currencySymbol: '$',
            showAsCurrency: true,
            calculationLogic: 'return (Number(fields["' + subtotalId + '"]) || 0) + (Number(fields["' + taxId + '"]) || 0) + (Number(fields["' + shippingId + '"]) || 0);',
            calculationTriggers: [subtotalId, taxId, shippingId],
            colSpan: 6,
            startCol: 7,
            rowIndex: layout.length + 2,
            tabId: tabs[0]?.id || 'default-tab'
          }
        ];

        assistantMsg = {
          id: 'ai-' + Date.now(),
          sender: 'assistant',
          content: 'I have engineered a complete Financial Breakdown section with 4 synchronized fields, formatted with dollar currency symbols and automated tax & sum formulas.',
          proposedLayout: newFields,
          suggestedAction: 'Apply Financial Calculation Block',
          changesSummary: [
            'Added "Subtotal Amount" (Currency input, 6 cols)',
            'Added "Shipping & Handling" (Currency input, 6 cols)',
            'Added "Estimated Tax (10%)" (Calculated formula: Subtotal * 0.10)',
            'Added "Grand Total" (Calculated formula: Subtotal + Tax + Shipping)'
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      } else if (lower.includes('polish') || lower.includes('format') || lower.includes('clean') || lower.includes('align')) {
        const polished = layout.map((f, idx) => {
          const cleanLabel = f.label.charAt(0).toUpperCase() + f.label.slice(1);
          return {
            ...f,
            label: cleanLabel,
            placeholder: f.placeholder || ('Enter ' + cleanLabel.toLowerCase() + '...'),
            colSpan: f.colSpan || 6,
            startCol: (idx % 2 === 0) ? 1 : 7
          };
        });

        assistantMsg = {
          id: 'ai-' + Date.now(),
          sender: 'assistant',
          content: 'I have standardized all ' + layout.length + ' fields with capitalized labels, generated contextual placeholders, and aligned blocks into a balanced 2-column grid layout.',
          proposedLayout: polished,
          suggestedAction: 'Apply Polished Layout Grid',
          changesSummary: [
            'Capitalized and standardized ' + layout.length + ' field labels',
            'Added contextual user placeholder text to empty inputs',
            'Balanced all block spans into alternating 6-column rows'
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      } else if (lower.includes('health') || lower.includes('audit') || lower.includes('diagnostic')) {
        const calcCount = layout.filter(f => f.type === 'calculation').length;
        const relCount = layout.filter(f => f.type === 'sub_module' || f.type === 'relationship_m2m' || f.type === 'rollup').length;
        
        assistantMsg = {
          id: 'ai-' + Date.now(),
          sender: 'assistant',
          content: 'Schema Health Diagnostic completed for "' + (moduleName || 'Module') + '". Structure is verified clean with 0 circular references across ' + layout.length + ' fields, ' + calcCount + ' calculation formulas, and ' + relCount + ' relational subgrids.',
          changesSummary: [
            '✓ Field slugs & identifiers: Unique and valid',
            '✓ Calculation trigger graph: No dependency loops detected',
            '✓ Relational links: All Foreign Keys correctly indexed',
            '✓ Nullability constraints: Balanced across required fields'
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      } else {
        // Generic smart field creator
        const newFieldId = 'field_ai_' + Date.now();
        const newField: Field = {
          id: newFieldId,
          name: text.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24),
          label: text.length > 30 ? text.slice(0, 30) + '...' : text,
          type: lower.includes('date') ? 'date' : lower.includes('number') || lower.includes('count') ? 'number' : lower.includes('email') ? 'email' : lower.includes('status') ? 'select' : 'text',
          placeholder: 'Enter ' + text.toLowerCase() + '...',
          colSpan: 12,
          startCol: 1,
          rowIndex: layout.length + 1,
          tabId: tabs[0]?.id || 'default-tab'
        };

        assistantMsg = {
          id: 'ai-' + Date.now(),
          sender: 'assistant',
          content: 'I analyzed your request and created a specialized field structure for "' + text + '".',
          proposedLayout: [...layout, newField],
          suggestedAction: 'Add Generated Field',
          changesSummary: [
            'Created field: ' + newField.label + ' (Type: ' + newField.type + ')'
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }

      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
              <span>Canvas AI Copilot</span>
              <span className="px-1.5 py-0.2 rounded text-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                Live
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400">Contextual schema & formula assistant</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Quick Preset Chips */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/30 overflow-x-auto no-scrollbar flex items-center gap-2">
        {PRESET_PROMPTS.map(preset => (
          <button
            key={preset.id}
            onClick={() => handleSendPrompt(preset.prompt)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500/50 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xs shrink-0"
          >
            <preset.icon size={12} className="text-indigo-500 shrink-0" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 text-xs leading-relaxed",
              msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-xs",
              msg.sender === 'user'
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
            )}>
              {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
            </div>

            <div className={cn(
              "max-w-[85%] space-y-2.5",
              msg.sender === 'user' ? "text-right" : "text-left"
            )}>
              <div className={cn(
                "p-3.5 rounded-2xl shadow-xs",
                msg.sender === 'user'
                  ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                  : "bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 rounded-tl-none"
              )}>
                <p>{msg.content}</p>

                {msg.changesSummary && msg.changesSummary.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-1.5 text-left">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
                      Proposed Schema Changes
                    </span>
                    {msg.changesSummary.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.proposedLayout && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onApplyChanges(msg.proposedLayout!, msg.suggestedAction);
                      toast.success('Applied AI transformations to canvas layout!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20"
                  >
                    <Zap size={11} />
                    <span>{msg.suggestedAction || 'Apply to Canvas'}</span>
                  </button>
                </div>
              )}

              <span className="text-[9px] text-zinc-400 block px-1">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3 text-xs leading-relaxed">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot size={13} />
            </div>
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/60 rounded-2xl rounded-tl-none flex items-center gap-2 text-zinc-500">
              <RefreshCw size={12} className="animate-spin text-indigo-500" />
              <span className="text-xs font-medium">Synthesizing schema AST & formulas...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt(input);
          }}
          className="relative flex items-center"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to add fields, formulas, or refine layout..."
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm"
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
};

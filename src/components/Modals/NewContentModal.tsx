import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Mail, 
  FileText, 
  Globe, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { ContentType } from '../../types/platform';
import { cn } from '../../lib/utils';

interface NewContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: ContentType) => void;
}

interface ContentTypeCard {
  type: ContentType;
  label: string;
  badge: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  hoverBorder: string;
  desc: string;
  highlights: string[];
}

const CONTENT_TYPES: ContentTypeCard[] = [
  {
    type: 'email',
    label: 'Email Message',
    badge: 'HTML & Responsive',
    icon: Mail,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    hoverBorder: 'hover:border-indigo-500/60 hover:bg-indigo-500/[0.04]',
    desc: 'Author responsive HTML emails, onboarding sequences, alerts, and newsletters with interactive CTA buttons.',
    highlights: ['Email frame preview', 'Subject & Preheader', 'CTA buttons & tables']
  },
  {
    type: 'letter',
    label: 'Letter & Document',
    badge: 'Print & PDF Ready',
    icon: FileText,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    hoverBorder: 'hover:border-sky-500/60 hover:bg-sky-500/[0.04]',
    desc: 'Design formal printable agreements, NDAs, contracts, invoices, and employment offer letters.',
    highlights: ['A4 / US Letter layout', 'Official letterhead branding', 'Data repeaters & signatures']
  },
  {
    type: 'page',
    label: 'Site & Portal Page',
    badge: 'Web Component',
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-500/60 hover:bg-emerald-500/[0.04]',
    desc: 'Create reusable portal pages, knowledge base articles, announcement banners, and notice layouts.',
    highlights: ['Browser simulator frame', 'Slug routing & meta', 'Hero & callout blocks']
  },
  {
    type: 'message',
    label: 'SMS & Message',
    badge: 'Mobile Instant',
    icon: MessageSquare,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    hoverBorder: 'hover:border-amber-500/60 hover:bg-amber-500/[0.04]',
    desc: 'Compose high-impact short-form transactional SMS reminders, 2FA codes, and urgent alerts.',
    highlights: ['Smartphone preview', 'Character / segment counter', 'Instant merge variables']
  }
];

export const NewContentModal: React.FC<NewContentModalProps> = ({
  isOpen,
  onClose,
  onSelectType
}) => {
  if (!isOpen) return null;

  const modalNode = (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Create Content Item</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Select a content format to launch the template builder</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body: 2x2 Format Cards */}
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CONTENT_TYPES.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => onSelectType(item.type)}
                    className={cn(
                      "p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-left flex flex-col justify-between transition-all group cursor-pointer",
                      item.hoverBorder,
                      "hover:shadow-lg"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn("p-2 rounded-lg border", item.bg, item.border, item.color)}>
                          <Icon size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                          {item.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                        <span>{item.label}</span>
                        <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-1">
                      {item.highlights.map((hl, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <span className="w-1 h-1 rounded-full bg-indigo-500/70 shrink-0" />
                          <span className="truncate">{hl}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-zinc-900/40 border-t border-zinc-800/60 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-zinc-500">
              Tip: You can switch content formats anytime inside the editor.
            </span>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalNode, document.body);
};

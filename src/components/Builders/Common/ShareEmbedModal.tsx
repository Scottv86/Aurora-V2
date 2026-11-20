import React, { useState } from 'react';
import { Copy, Check, Code, Globe, Terminal, ExternalLink } from 'lucide-react';
import { Modal } from '../../UI/TabsAndModal';
import { toast } from 'sonner';

export interface ShareEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityId: string;
  entityType: 'Form' | 'Report' | 'Workflow';
  moduleId?: string;
}

export const ShareEmbedModal: React.FC<ShareEmbedModalProps> = ({
  isOpen,
  onClose,
  entityName,
  entityId,
  entityType,
  moduleId,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'iframe' | 'react'>('link');
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://app.aurora.io';

  const publicUrl =
    entityType === 'Form'
      ? moduleId
        ? `${origin}/portal?moduleId=${encodeURIComponent(moduleId)}&formId=${encodeURIComponent(entityId)}`
        : `${origin}/public/forms/${encodeURIComponent(entityId)}`
      : `${origin}/public/${entityType.toLowerCase()}/${encodeURIComponent(entityId)}`;

  const iframeSnippet = `<iframe\n  src="${publicUrl}"\n  width="100%"\n  height="680px"\n  frameborder="0"\n  style="border-radius: 16px; border: 1px solid rgba(0,0,0,0.08);"\n></iframe>`;
  const reactSnippet = `import { FormRenderer } from '@aurora/forms-react';\n\nexport const EmbeddedForm = () => (\n  <FormRenderer\n    formId="${entityId}"${moduleId ? `\n    moduleId="${moduleId}"` : ''}\n  />\n);`;

  const getActiveSnippet = () => {
    if (activeTab === 'link') return publicUrl;
    if (activeTab === 'iframe') return iframeSnippet;
    return reactSnippet;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveSnippet());
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share & Embed: ${entityName}`}
      size="md"
    >
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Export live share links and embed snippets for {entityName}
          </p>
          {entityType === 'Form' && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Open Live Form</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Export Tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
          {[
            { id: 'link', label: 'Public Link', icon: Globe },
            { id: 'iframe', label: 'HTML iFrame', icon: Code },
            { id: 'react', label: 'React Component', icon: Terminal },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Snippet Code Box */}
        <div className="relative">
          <textarea
            readOnly
            rows={5}
            value={getActiveSnippet()}
            className="w-full font-mono text-xs p-4 bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-2xl focus:outline-none resize-none leading-relaxed"
          />

          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-3 top-3 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {activeTab === 'link' &&
            'Direct shareable URL accessible by external users, applicants, or clients.'}
          {activeTab === 'iframe' &&
            'Standard HTML embed code for Webflow, WordPress, intranets, or external sites.'}
          {activeTab === 'react' &&
            'React component snippet for embedding inside custom portals or applications.'}
        </p>
      </div>
    </Modal>
  );
};

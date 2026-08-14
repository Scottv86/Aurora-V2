import React, { useState } from 'react';
import { Copy, Check, Code, Globe, Terminal } from 'lucide-react';
import { Modal } from '../../UI/TabsAndModal';
import { toast } from 'sonner';

export interface ShareEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityId: string;
  entityType: 'Form' | 'Report' | 'Workflow';
}

export const ShareEmbedModal: React.FC<ShareEmbedModalProps> = ({
  isOpen,
  onClose,
  entityName,
  entityId,
  entityType
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'iframe' | 'react'>('link');
  const [copied, setCopied] = useState(false);

  const publicUrl = `https://app.aurora.io/public/${entityType.toLowerCase()}/${entityId}`;
  const iframeSnippet = `<iframe src="${publicUrl}" width="100%" height="600px" frameborder="0"></iframe>`;
  const reactSnippet = `import { AuroraForm } from '@aurora/react';\n\nexport const MyPage = () => (\n  <AuroraForm formId="${entityId}" theme="auto" />\n);`;

  const getActiveSnippet = () => {
    if (activeTab === 'link') return publicUrl;
    if (activeTab === 'iframe') return iframeSnippet;
    return reactSnippet;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveSnippet());
    setCopied(true);
    toast.success('Copied snippet to clipboard!');
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
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Export share links and code snippets for {entityType}</p>

        {/* Export Tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
          {[
            { id: 'link', label: 'Public Link', icon: Globe },
            { id: 'iframe', label: 'HTML iFrame', icon: Code },
            { id: 'react', label: 'React Component', icon: Terminal }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
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
            rows={4}
            value={getActiveSnippet()}
            className="w-full font-mono text-xs p-4 bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-2xl focus:outline-none resize-none leading-relaxed"
          />

          <button
            onClick={handleCopy}
            className="absolute right-3 top-3 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {activeTab === 'link' && 'Direct shareable URL accessible by external users or clients.'}
          {activeTab === 'iframe' && 'Standard HTML embed code for Webflow, WordPress, or external sites.'}
          {activeTab === 'react' && 'Native React component export for custom frontend web apps.'}
        </p>
      </div>
    </Modal>
  );
};

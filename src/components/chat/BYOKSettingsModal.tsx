import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export interface BYOKSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export const BYOKSettingsModal: React.FC<BYOKSettingsModalProps> = ({ isOpen, onClose, tenantId }) => {
  const [provider, setProvider] = useState('openai');
  const [keyAlias, setKeyAlias] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      toast.error('API Key is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/antigravity/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          provider,
          alias: keyAlias || `${provider.toUpperCase()} Key`,
          apiKey,
          isDefault: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save API Key to Vault');
      }

      toast.success('Key encrypted and saved securely to Supabase Vault');
      setApiKey('');
      setKeyAlias('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error saving key');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold">BYOK Key Vault</h3>
              <p className="text-xs text-zinc-400">Encrypted at rest with Supabase Vault (pgsodium)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveKey} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="openai">OpenAI (GPT-4o, o3-mini)</option>
              <option value="anthropic">Anthropic Claude (3.5 Sonnet)</option>
              <option value="google">Google Gemini (3.5 Flash / Pro)</option>
              <option value="groq">Groq (Llama 3.3)</option>
              <option value="openrouter">OpenRouter (Multi-Model Gateway)</option>
              <option value="ollama">Ollama / Custom Endpoint</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Key Alias Name</label>
            <input
              type="text"
              placeholder="e.g. Production OpenAI Key"
              value={keyAlias}
              onChange={(e) => setKeyAlias(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">API Key Secret</label>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Encrypting & Saving...' : 'Save to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

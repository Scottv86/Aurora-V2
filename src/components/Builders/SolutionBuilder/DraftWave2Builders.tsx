import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  ExternalLink,
  Palette,
  Compass,
  ListTodo,
  Mail,
  Globe,
  BarChart2,
} from 'lucide-react';
import { SolutionArtifact } from '../../../types/solutions';
import { normalizeArtifactType } from './solutionComponentCatalog';

interface BaseDraftProps {
  artifact: SolutionArtifact;
  allArtifacts: SolutionArtifact[];
  onSaveDraft: (name: string, content: any, description?: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onOpenStandalone: () => void;
}

/** 1. MENUS (NAVIGATION) — 100% Draft-Isolated Visual Menu Builder */
export const DraftMenuBuilder: React.FC<BaseDraftProps> = ({
  artifact,
  allArtifacts,
  onSaveDraft,
  onDirtyChange,
  onOpenStandalone,
}) => {
  const [name, setName] = useState(artifact.name || 'App Menu');
  const [layoutStyle, setLayoutStyle] = useState<'sidebar' | 'top'>(
    artifact.content?.layoutStyle || 'sidebar'
  );
  const [items, setItems] = useState<Array<{ id: string; label: string; targetId: string }>>(() =>
    Array.isArray(artifact.content?.items)
      ? artifact.content.items
      : [{ id: '__home__', label: 'Home Overview', targetId: '__home__' }]
  );

  const availableTargets = [
    { id: '__home__', label: 'Home Overview', type: 'HOME' },
    ...allArtifacts
      .filter((a) =>
        ['MODULE', 'FORM', 'PAGE', 'QUEUE', 'REPORT', 'SITE'].includes(normalizeArtifactType(a.type))
      )
      .map((a) => ({ id: a.id, label: a.name, type: a.type })),
  ];

  const moveItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    const copy = [...items];
    const [removed] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, removed);
    setItems(copy);
    onDirtyChange(true);
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Compass size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Menu Builder (Draft)</h3>
              <p className="text-xs text-zinc-500">Controls the navigation menu inside Live Preview and deploys with this Solution.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenStandalone} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 cursor-pointer">
            <span>Global Menus</span>
            <ExternalLink size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Menu Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); onDirtyChange(true); }}
              className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Layout Style</label>
            <select
              value={layoutStyle}
              onChange={(e) => { setLayoutStyle(e.target.value as any); onDirtyChange(true); }}
              className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500"
            >
              <option value="sidebar">Left Sidebar</option>
              <option value="top">Top Navigation Bar</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Menu Items ({items.length})</span>
            <button
              type="button"
              onClick={() => {
                const first = availableTargets[0];
                setItems((prev) => [...prev, { id: `mi_${Date.now()}`, label: first.label, targetId: first.id }]);
                onDirtyChange(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-medium cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id + idx} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setItems(next);
                    onDirtyChange(true);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500"
                  placeholder="Label"
                />
                <select
                  value={item.targetId}
                  onChange={(e) => {
                    const target = availableTargets.find((t) => t.id === e.target.value);
                    const next = [...items];
                    next[idx] = { ...next[idx], targetId: e.target.value, label: target?.label || next[idx].label };
                    setItems(next);
                    onDirtyChange(true);
                  }}
                  className="w-48 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none"
                >
                  {availableTargets.map((t) => (
                    <option key={t.id} value={t.id}>{t.label} ({t.type})</option>
                  ))}
                </select>
                <button type="button" onClick={() => moveItem(idx, -1)} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"><ArrowUp size={12} /></button>
                <button type="button" onClick={() => moveItem(idx, 1)} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"><ArrowDown size={12} /></button>
                <button type="button" onClick={() => { setItems(items.filter((_, i) => i !== idx)); onDirtyChange(true); }} className="p-1.5 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 cursor-pointer"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => onSaveDraft(name, { ...(artifact.content || {}), name, layoutStyle, items })}
            className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={13} />
            <span>Save Menu to Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/** 2. LISTS (GLOBAL_LIST) — 100% Draft-Isolated Picklist Builder */
export const DraftListBuilder: React.FC<BaseDraftProps> = ({ artifact, onSaveDraft, onDirtyChange, onOpenStandalone }) => {
  const [name, setName] = useState(artifact.name || 'Picklist');
  const [options, setOptions] = useState<string[]>(() =>
    Array.isArray(artifact.content?.options) ? artifact.content.options : ['Option 1', 'Option 2']
  );
  const [newOption, setNewOption] = useState('');

  return (
    <div className="h-full overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 flex items-center justify-center"><ListTodo size={16} /></div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">List Builder (Draft)</h3>
              <p className="text-xs text-zinc-500">Reusable choice options staged in Solution draft.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenStandalone} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 cursor-pointer"><span>Global Lists</span><ExternalLink size={12} /></button>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">List Name</label>
          <input type="text" value={name} onChange={(e) => { setName(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Values ({options.length})</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newOption.trim()) {
                  e.preventDefault();
                  setOptions((p) => [...p, newOption.trim()]);
                  setNewOption('');
                  onDirtyChange(true);
                }
              }}
              placeholder="Add option and press Enter..."
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!newOption.trim()) return;
                setOptions((p) => [...p, newOption.trim()]);
                setNewOption('');
                onDirtyChange(true);
              }}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium cursor-pointer"
            >
              Add
            </button>
          </div>
          <div className="space-y-1.5 pt-1">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
                <span>{opt}</span>
                <button type="button" onClick={() => { setOptions(options.filter((_, i) => i !== idx)); onDirtyChange(true); }} className="text-zinc-400 hover:text-rose-600 cursor-pointer"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => onSaveDraft(name, { ...(artifact.content || {}), name, options })} className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"><Save size={13} /><span>Save List to Draft</span></button>
        </div>
      </div>
    </div>
  );
};

/** 3. BRANDS (BRAND) — 100% Draft-Isolated Brand Kit Builder */
export const DraftBrandBuilder: React.FC<BaseDraftProps> = ({ artifact, onSaveDraft, onDirtyChange, onOpenStandalone }) => {
  const [name, setName] = useState(artifact.name || 'Brand Kit');
  const [primary, setPrimary] = useState(artifact.content?.colors?.primary || '#4f46e5');
  const [secondary, setSecondary] = useState(artifact.content?.colors?.secondary || '#0f172a');
  const [accent, setAccent] = useState(artifact.content?.colors?.accent || '#10b981');
  const [headingFont, setHeadingFont] = useState(artifact.content?.typography?.headingFont || 'Inter');
  const [tagline, setTagline] = useState(artifact.content?.voiceAndTone?.tagline || '');

  return (
    <div className="h-full overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 flex items-center justify-center"><Palette size={16} /></div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Brand Kit Builder (Draft)</h3>
              <p className="text-xs text-zinc-500">Immediately themes your Live Preview without modifying global tenant branding.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenStandalone} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 cursor-pointer"><span>Brand Studio</span><ExternalLink size={12} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Brand Name</label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Heading Font</label>
            <select value={headingFont} onChange={(e) => { setHeadingFont(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none">
              <option value="Inter">Inter</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="DM Sans">DM Sans</option>
              <option value="Geist">Geist</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Primary Color', val: primary, set: setPrimary },
            { label: 'Secondary Color', val: secondary, set: setSecondary },
            { label: 'Accent Color', val: accent, set: setAccent },
          ].map((c) => (
            <div key={c.label} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{c.label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={c.val} onChange={(e) => { c.set(e.target.value); onDirtyChange(true); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" />
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{c.val}</span>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Brand Tagline / Voice</label>
          <input type="text" value={tagline} onChange={(e) => { setTagline(e.target.value); onDirtyChange(true); }} placeholder="e.g. Clean, reliable solar operations" className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              onSaveDraft(name, {
                ...(artifact.content || {}),
                name,
                colors: { ...(artifact.content?.colors || {}), primary, secondary, accent },
                typography: { ...(artifact.content?.typography || {}), headingFont, bodyFont: headingFont },
                voiceAndTone: { ...(artifact.content?.voiceAndTone || {}), tagline },
              })
            }
            className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={13} />
            <span>Save Brand to Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/** 4. CONTENT (Document / Email Templates) — 100% Draft-Isolated */
export const DraftContentBuilder: React.FC<BaseDraftProps> = ({ artifact, onSaveDraft, onDirtyChange, onOpenStandalone }) => {
  const [name, setName] = useState(artifact.name || 'Document Template');
  const [templateType, setTemplateType] = useState(artifact.content?.type || 'email');
  const [subject, setSubject] = useState(artifact.content?.metadata?.subject || artifact.name || '');
  const [body, setBody] = useState(
    typeof artifact.content?.content === 'string'
      ? artifact.content.content
      : 'Hi {{client_name}},\n\nYour request {{reference_number}} has been updated to {{status}}.\n\nRegards,\nOperations Team'
  );

  const tokens = ['{{client_name}}', '{{reference_number}}', '{{status}}', '{{site_address}}', '{{estimated_value}}'];

  return (
    <div className="h-full overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 flex items-center justify-center"><Mail size={16} /></div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Content Template Builder (Draft)</h3>
              <p className="text-xs text-zinc-500">Email, PDF, and notice templates with dynamic merge tokens.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenStandalone} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 cursor-pointer"><span>Content Studio</span><ExternalLink size={12} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Template Name</label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Channel / Type</label>
            <select value={templateType} onChange={(e) => { setTemplateType(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none">
              <option value="email">Email Notification</option>
              <option value="letter">Official Letter / PDF</option>
              <option value="certificate">Certificate / Receipt</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Subject / Heading</label>
          <input type="text" value={subject} onChange={(e) => { setSubject(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Body Content</label>
            <div className="flex flex-wrap gap-1">
              {tokens.map((tok) => (
                <button key={tok} type="button" onClick={() => { setBody((b: string) => `${b} ${tok}`); onDirtyChange(true); }} className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono cursor-pointer">{tok}</button>
              ))}
            </div>
          </div>
          <textarea rows={9} value={body} onChange={(e) => { setBody(e.target.value); onDirtyChange(true); }} className="w-full p-3 text-xs font-mono rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => onSaveDraft(name, { ...(artifact.content || {}), name, type: templateType, content: body, metadata: { ...(artifact.content?.metadata || {}), subject } })} className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"><Save size={13} /><span>Save Content to Draft</span></button>
        </div>
      </div>
    </div>
  );
};

/** 5. SITES (Portals & Public Sites) — 100% Draft-Isolated */
export const DraftSiteBuilder: React.FC<BaseDraftProps> = ({ artifact, allArtifacts, onSaveDraft, onDirtyChange, onOpenStandalone }) => {
  const [name, setName] = useState(artifact.name || 'Customer Portal');
  const [domain, setDomain] = useState(artifact.content?.domain || `${(artifact.slug || 'portal')}.aurora.app`);
  const [access, setAccess] = useState(artifact.content?.access || 'Public');
  const [linkedFormId, setLinkedFormId] = useState(artifact.content?.linkedFormId || '');
  const forms = allArtifacts.filter((a) => normalizeArtifactType(a.type) === 'FORM');

  return (
    <div className="h-full overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 flex items-center justify-center"><Globe size={16} /></div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Site & Portal Builder (Draft)</h3>
              <p className="text-xs text-zinc-500">External client portal configuration staged in Solution draft.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenStandalone} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 cursor-pointer"><span>Full Site Studio</span><ExternalLink size={12} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Portal Name</label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Domain</label>
            <input type="text" value={domain} onChange={(e) => { setDomain(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Access Policy</label>
            <select value={access} onChange={(e) => { setAccess(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none">
              <option value="Public">Public (Anonymous Intake)</option>
              <option value="Authenticated">Authenticated Portal Users</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Primary Embedded Form</label>
            <select value={linkedFormId} onChange={(e) => { setLinkedFormId(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none">
              <option value="">None</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => onSaveDraft(name, { ...(artifact.content || {}), name, domain, access, linkedFormId })} className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"><Save size={13} /><span>Save Site to Draft</span></button>
        </div>
      </div>
    </div>
  );
};

/** 6. REPORTS (BI Analytics) — 100% Draft-Isolated */
export const DraftReportBuilder: React.FC<BaseDraftProps> = ({ artifact, allArtifacts, onSaveDraft, onDirtyChange, onOpenStandalone }) => {
  const [name, setName] = useState(artifact.name || 'Analytics Report');
  const [chartType, setChartType] = useState(artifact.content?.chartType || 'bar');
  const [sourceModuleId, setSourceModuleId] = useState(artifact.content?.sourceModuleId || '');
  const [groupBy, setGroupBy] = useState(artifact.content?.groupBy || 'status');
  const modules = allArtifacts.filter((a) => normalizeArtifactType(a.type) === 'MODULE');

  return (
    <div className="h-full overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 flex items-center justify-center"><BarChart2 size={16} /></div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Report Builder (Draft)</h3>
              <p className="text-xs text-zinc-500">Visual report configuration staged in Solution draft.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenStandalone} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 cursor-pointer"><span>Reports Studio</span><ExternalLink size={12} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Report Title</label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Visualization Type</label>
            <select value={chartType} onChange={(e) => { setChartType(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none">
              <option value="bar">Bar Chart</option>
              <option value="line">Trend Line</option>
              <option value="pie">Donut / Pie</option>
              <option value="table">Summary Table</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Source Module</label>
            <select value={sourceModuleId} onChange={(e) => { setSourceModuleId(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none">
              <option value="">Primary Solution Module</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Group By Field</label>
            <input type="text" value={groupBy} onChange={(e) => { setGroupBy(e.target.value); onDirtyChange(true); }} className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => onSaveDraft(name, { ...(artifact.content || {}), name, chartType, sourceModuleId, groupBy })} className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"><Save size={13} /><span>Save Report to Draft</span></button>
        </div>
      </div>
    </div>
  );
};

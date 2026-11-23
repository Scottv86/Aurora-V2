import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import { motion, AnimatePresence } from 'motion/react';
import '@xyflow/react/dist/style.css';
import { 
  GitFork, Zap, Activity, Clock, Play, Settings2, Trash2, Bug, Info, ChevronLeft, ChevronRight, 
  Search, Layout as LayoutIcon, Wand2, Mail, MessageSquare, RefreshCw, FileText, Globe, Sparkles as SparklesIcon, X as CloseIcon,
  Bot, Target, CheckSquare, Plus, ChevronUp, ChevronDown, Workflow as WorkflowIcon,
  FilePlus2, Bell, CreditCard, Table, Pin, CheckCircle2
} from 'lucide-react';
import { Workflow, WorkflowNodeType, WorkflowSubstep } from '../../../types/platform';
import { WorkflowDebugger } from './WorkflowDebugger';
import { CustomWorkflowNode } from './CustomNode';
import { CustomWorkflowEdge } from './CustomEdge';
import { CustomWorkflowZone } from './CustomZone';
import { cn } from '../../../lib/utils';
import dagre from 'dagre';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { builderCache } from '../../../utils/builderCache';
import { API_BASE_URL } from '@/src/config';
import { getDocumentTemplates } from '../../../services/documentService';

const ACTION_CATEGORIES = [
  'All',
  'Records & Data',
  'Communication & Notes',
  'Reminders',
  'Documents & Billing',
  'AI & Intelligence',
  'Integrations & Automation',
] as const;

const ACTION_COLOR_CLASSES: Record<string, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  blue: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  violet: 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
  rose: 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
  zinc: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
};

const ACTION_LIBRARY = [
  // Records & Data
  { id: 'CREATE_RECORD', label: 'Create Record', category: 'Records & Data', desc: 'Create a new record in this or another module with mapped fields.', icon: FilePlus2, color: 'indigo' },
  { id: 'UPDATE', label: 'Update Record', category: 'Records & Data', desc: 'Automatically modify fields on the current record.', icon: RefreshCw, color: 'blue' },
  { id: 'ROUTE_TO_MODULE', label: 'Route to Module', category: 'Records & Data', desc: 'Triage and create a linked workflow record in another module.', icon: GitFork, color: 'indigo' },

  // Communication & Notes
  { id: 'EMAIL', label: 'Send Email', category: 'Communication & Notes', desc: 'Dispatch templated emails via configured SMTP or workspace mailer.', icon: Mail, color: 'indigo' },
  { id: 'NOTIFY', label: 'In-App Notification', category: 'Communication & Notes', desc: 'Broadcast real-time notifications and channel alerts to users.', icon: Bell, color: 'amber' },
  { id: 'SLACK', label: 'Slack / Channel Alert', category: 'Communication & Notes', desc: 'Post updates to a Slack webhook or internal workspace channel.', icon: MessageSquare, color: 'emerald' },
  { id: 'CREATE_NOTE', label: 'Create Record Note', category: 'Communication & Notes', desc: 'Append an automated operational note onto the current record.', icon: FileText, color: 'blue' },
  { id: 'PIN_RECORD_NOTE', label: 'Pin Record Note', category: 'Communication & Notes', desc: 'Create and pin a high-visibility note on the record.', icon: Pin, color: 'amber' },

  // Reminders
  { id: 'CREATE_REMINDER', label: 'Create Reminder', category: 'Reminders', desc: 'Schedule a follow-up reminder with due date and priority.', icon: Clock, color: 'indigo' },
  { id: 'COMPLETE_REMINDER', label: 'Complete Reminder', category: 'Reminders', desc: 'Automatically mark matching record reminders as completed.', icon: CheckCircle2, color: 'emerald' },

  // Documents & Billing
  { id: 'PDF', label: 'Generate PDF', category: 'Documents & Billing', desc: 'Create professional PDF documents from record templates.', icon: FileText, color: 'rose' },
  { id: 'STRIPE_PAYMENT_LINK', label: 'Stripe Payment Link', category: 'Documents & Billing', desc: 'Generate a Stripe checkout payment link and record transaction.', icon: CreditCard, color: 'emerald' },

  // AI & Intelligence
  { id: 'AI_SUMMARIZE', label: 'AI Summarize', category: 'AI & Intelligence', desc: 'Generate intelligent summaries of record fields using Gemini.', icon: SparklesIcon, color: 'amber' },
  { id: 'GEMINI_PROMPT', label: 'Gemini AI Prompt', category: 'AI & Intelligence', desc: 'Run a custom Gemini prompt and write the output to a field.', icon: Wand2, color: 'violet' },
  { id: 'AI_AGENT', label: 'Trigger AI Agent', category: 'AI & Intelligence', desc: 'Hand off the record to an autonomous agent for reasoning.', icon: Bot, color: 'violet' },

  // Integrations & Automation
  { id: 'WEBHOOK', label: 'Outbound Webhook', category: 'Integrations & Automation', desc: 'Push JSON payloads to external systems and REST APIs.', icon: Globe, color: 'zinc' },
  { id: 'GOOGLE_SHEETS_SYNC', label: 'Google Sheets Sync', category: 'Integrations & Automation', desc: 'Append or sync record data into a Google Spreadsheet.', icon: Table, color: 'emerald' },
  { id: 'RUN_AUTOMATION', label: 'Run Automation', category: 'Integrations & Automation', desc: 'Execute a reusable saved automation pipeline.', icon: Play, color: 'indigo' },
];

interface GraphEditorProps {
  workflow?: Workflow;
  onChange: (workflow: Workflow) => void;
  showDebugger: boolean;
  setShowDebugger: (show: boolean) => void;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  selectedEdgeId: string | null;
  onEdgeSelect: (id: string | null) => void;
  rightSidebarTab: 'inspector' | 'debugger' | 'architect';
  setRightSidebarTab: (tab: 'inspector' | 'debugger' | 'architect') => void;
  showGridlines?: boolean;
  fields?: any[];
}

const nodeTypes = {
  workflowNode: CustomWorkflowNode,
  workflowZone: CustomWorkflowZone,
};

const edgeTypes = {
  workflowEdge: CustomWorkflowEdge,
};

interface ActionConfigPanelProps {
  nodeId: string;
  actionType: string;
  config: Record<string, any>;
  updateNodeConfig: (nodeId: string, updated: Record<string, any>) => void;
  automations: any[];
  flatFields: any[];
}

const ActionConfigPanel: React.FC<ActionConfigPanelProps> = ({
  nodeId,
  actionType,
  config,
  updateNodeConfig,
  automations,
  flatFields
}) => {
  const [tempFieldKey, setTempFieldKey] = React.useState('');
  const [tempFieldValue, setTempFieldValue] = React.useState('');
  const [tempParamKey, setTempParamKey] = React.useState('');
  const [tempParamValue, setTempParamValue] = React.useState('');

  const handleAddParam = () => {
    if (!tempParamKey.trim()) return;
    const currentInputs = config.inputs || {};
    updateNodeConfig(nodeId, {
      inputs: {
        ...currentInputs,
        [tempParamKey.trim()]: tempParamValue
      }
    });
    setTempParamKey('');
    setTempParamValue('');
  };

  const handleRemoveParam = (key: string) => {
    const currentInputs = { ...(config.inputs || {}) };
    delete currentInputs[key];
    updateNodeConfig(nodeId, { inputs: currentInputs });
  };

  const insertParamVariable = (variableName: string) => {
    setTempParamValue(prev => prev + `{{${variableName}}}`);
  };

  const handleAddFieldUpdate = () => {
    if (!tempFieldKey) return;
    const currentFields = config.fields || {};
    updateNodeConfig(nodeId, {
      fields: {
        ...currentFields,
        [tempFieldKey]: tempFieldValue
      }
    });
    setTempFieldKey('');
    setTempFieldValue('');
  };

  const handleRemoveFieldUpdate = (key: string) => {
    const currentFields = { ...(config.fields || {}) };
    delete currentFields[key];
    updateNodeConfig(nodeId, { fields: currentFields });
  };

  const insertVariable = (targetField: string, variableName: string) => {
    const currentVal = config[targetField] || '';
    const newVal = currentVal + `{{${variableName}}}`;
    updateNodeConfig(nodeId, { [targetField]: newVal });
  };

  switch (actionType) {
    case 'RUN_AUTOMATION':
      const mappedParams = config.inputs || {};
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Select Automation</label>
            <select
              value={config.automationId || ''}
              onChange={(e) => updateNodeConfig(nodeId, { automationId: e.target.value, inputs: {} })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="">-- Choose Automation --</option>
              {automations.map((aut: any) => (
                <option key={aut.id} value={aut.id}>
                  {aut.name} {aut.description ? `(${aut.description})` : ''}
                </option>
              ))}
            </select>
            {automations.length === 0 && (
              <p className="text-[10px] text-zinc-500 italic px-1">No automations found.</p>
            )}
          </div>

          {config.automationId && (
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Input Parameters</label>

              {Object.keys(mappedParams).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(mappedParams).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <div className="truncate pr-2">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{key}</span>
                        <span className="mx-1 text-zinc-400">→</span>
                        <span className="text-xs font-mono text-indigo-500">{String(val)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveParam(key)}
                        className="text-rose-500 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 italic px-1">No input parameters mapped.</p>
              )}

              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Key (e.g. email)"
                    value={tempParamKey}
                    onChange={(e) => setTempParamKey(e.target.value)}
                    className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={tempParamValue}
                    onChange={(e) => setTempParamValue(e.target.value)}
                    className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {flatFields.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Insert record variable</label>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                      {flatFields.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => insertParamVariable(f.name)}
                          className="px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[8px] font-mono hover:border-indigo-500 transition-colors"
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddParam}
                  disabled={!tempParamKey}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg py-1.5 text-xs font-bold transition-colors"
                >
                  Add Parameter
                </button>
              </div>
            </div>
          )}
        </div>
      );

    case 'EMAIL':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Recipient (To)</label>
            <input
              type="text"
              placeholder="e.g. customer@example.com or {{email}}"
              value={config.to || ''}
              onChange={(e) => updateNodeConfig(nodeId, { to: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Subject</label>
            <input
              type="text"
              placeholder="e.g. Action Required: {{title}}"
              value={config.subject || ''}
              onChange={(e) => updateNodeConfig(nodeId, { subject: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Body</label>
            <textarea
              rows={4}
              placeholder="Write email contents..."
              value={config.body || ''}
              onChange={(e) => updateNodeConfig(nodeId, { body: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-sans resize-y"
            />
          </div>

          {flatFields.length > 0 && (
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Insert variable into Body</label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                {flatFields.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => insertVariable('body', f.name)}
                    className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[9px] font-mono hover:border-indigo-500 transition-colors"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'SLACK':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Slack Channel</label>
            <input
              type="text"
              placeholder="#general"
              value={config.channel || ''}
              onChange={(e) => updateNodeConfig(nodeId, { channel: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Message Template</label>
            <textarea
              rows={3}
              placeholder="e.g. New record: {{name}}"
              value={config.message || ''}
              onChange={(e) => updateNodeConfig(nodeId, { message: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-sans resize-y"
            />
          </div>

          {flatFields.length > 0 && (
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Insert variable</label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                {flatFields.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => insertVariable('message', f.name)}
                    className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[9px] font-mono hover:border-indigo-500 transition-colors"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'UPDATE':
      return (
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Field Updates</label>

          {Object.keys(config.fields || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(config.fields || {}).map(([key, val]: [string, any]) => {
                const fieldDef = flatFields.find(f => f.name === key || f.id === key);
                const fieldLabel = fieldDef?.label || key;
                return (
                  <div key={key} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <div className="truncate pr-2">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{fieldLabel}</span>
                      <span className="mx-1 text-zinc-400">→</span>
                      <span className="text-xs font-mono text-indigo-500">{String(val)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFieldUpdate(key)}
                      className="text-rose-500 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 italic px-1">No field updates defined.</p>
          )}

          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={tempFieldKey}
                onChange={(e) => setTempFieldKey(e.target.value)}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-900 dark:text-white focus:outline-none"
              >
                <option value="">-- Field --</option>
                {flatFields.map(f => (
                  <option key={f.id} value={f.name || f.id}>{f.label}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Value"
                value={tempFieldValue}
                onChange={(e) => setTempFieldValue(e.target.value)}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddFieldUpdate}
              disabled={!tempFieldKey}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg py-1.5 text-xs font-bold transition-colors"
            >
              Add Field Update
            </button>
          </div>
        </div>
      );

    case 'PDF': {
      const docTemplates = getDocumentTemplates();
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Document Template</label>
            <select
              value={config.templateId || ''}
              onChange={(e) => updateNodeConfig(nodeId, { templateId: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-semibold"
            >
              <option value="">-- Choose Template --</option>
              {docTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-1">Or Direct Template ID</label>
            <input
              type="text"
              placeholder="e.g. tmpl_nda_standard"
              value={config.templateId || ''}
              onChange={(e) => updateNodeConfig(nodeId, { templateId: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
            />
          </div>
        </div>
      );
    }

    case 'WEBHOOK':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Webhook URL</label>
            <input
              type="text"
              placeholder="https://api.example.com/webhook"
              value={config.url || ''}
              onChange={(e) => updateNodeConfig(nodeId, { url: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Method</label>
            <select
              value={config.method || 'POST'}
              onChange={(e) => updateNodeConfig(nodeId, { method: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
      );

    case 'AI_SUMMARIZE':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Source Field</label>
            <select
              value={config.sourceField || ''}
              onChange={(e) => updateNodeConfig(nodeId, { sourceField: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="">-- Choose Field --</option>
              {flatFields.map(f => (
                <option key={f.id} value={f.name || f.id}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      );

    case 'AI_AGENT': {
      const savedAgents = builderCache.get<any[]>('agents_default') || [];
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Assigned Autonomous Agent</label>
            <select
              value={config.agentId || ''}
              onChange={(e) => {
                const selected = savedAgents.find(a => a.id === e.target.value);
                updateNodeConfig(nodeId, { 
                  agentId: e.target.value,
                  agentName: selected?.name || '',
                  agentRole: selected?.roleTitle || ''
                });
              }}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-semibold"
            >
              <option value="">-- General Autonomous Agent --</option>
              {savedAgents.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.roleTitle || 'Digital Coworker'})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Task / Step Directives</label>
            <textarea
              rows={4}
              placeholder="e.g. Evaluate this record for payment discrepancies, check Stripe status, and flag for supervisor review..."
              value={config.task || ''}
              onChange={(e) => updateNodeConfig(nodeId, { task: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-sans resize-y"
            />
          </div>
        </div>
      );
    }

    case 'CREATE_RECORD':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Target Module (ID, slug, or name)</label>
            <input
              type="text"
              placeholder="Leave blank for current module, or enter module slug/ID"
              value={config.targetModule || ''}
              onChange={(e) => updateNodeConfig(nodeId, { targetModule: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Initial Field Values (JSON)</label>
            <textarea
              rows={4}
              placeholder={'{\n  "title": "{{title}}",\n  "status": "New"\n}'}
              value={config.payloadJson || ''}
              onChange={(e) => updateNodeConfig(nodeId, { payloadJson: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all resize-y"
            />
          </div>
        </div>
      );

    case 'NOTIFY':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Channel</label>
            <input
              type="text"
              placeholder="general"
              value={config.channel || ''}
              onChange={(e) => updateNodeConfig(nodeId, { channel: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Notification Message</label>
            <textarea
              rows={3}
              placeholder="e.g. {{title}} requires attention."
              value={config.message || ''}
              onChange={(e) => updateNodeConfig(nodeId, { message: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all resize-y"
            />
          </div>
        </div>
      );

    case 'CREATE_NOTE':
    case 'PIN_RECORD_NOTE':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Note Content</label>
            <textarea
              rows={3}
              placeholder="e.g. Escalated automatically for {{title}}"
              value={config.content || ''}
              onChange={(e) => updateNodeConfig(nodeId, { content: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all resize-y"
            />
          </div>
        </div>
      );

    case 'CREATE_REMINDER':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Reminder Title</label>
            <input
              type="text"
              placeholder="e.g. Follow up on {{title}}"
              value={config.title || ''}
              onChange={(e) => updateNodeConfig(nodeId, { title: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Due Expression</label>
              <input
                type="text"
                placeholder="e.g. in 2 days"
                value={config.dueDate || ''}
                onChange={(e) => updateNodeConfig(nodeId, { dueDate: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Priority</label>
              <select
                value={config.priority || 'MEDIUM'}
                onChange={(e) => updateNodeConfig(nodeId, { priority: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'GEMINI_PROMPT':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Prompt Template</label>
            <textarea
              rows={4}
              placeholder="e.g. Categorize this request: {{description}}"
              value={config.prompt || ''}
              onChange={(e) => updateNodeConfig(nodeId, { prompt: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all resize-y"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Target Field</label>
            <select
              value={config.targetField || ''}
              onChange={(e) => updateNodeConfig(nodeId, { targetField: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="">-- Optional: Store in field --</option>
              {flatFields.map(f => (
                <option key={f.id} value={f.name || f.id}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      );

    case 'STRIPE_PAYMENT_LINK':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Amount</label>
              <input
                type="number"
                min={0}
                placeholder="100"
                value={config.amount ?? ''}
                onChange={(e) => updateNodeConfig(nodeId, { amount: e.target.value ? Number(e.target.value) : '' })}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Currency</label>
              <input
                type="text"
                placeholder="USD"
                value={config.currency || 'USD'}
                onChange={(e) => updateNodeConfig(nodeId, { currency: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Description</label>
            <input
              type="text"
              placeholder="Payment for {{title}}"
              value={config.description || ''}
              onChange={(e) => updateNodeConfig(nodeId, { description: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      );

    case 'GOOGLE_SHEETS_SYNC':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Spreadsheet ID</label>
            <input
              type="text"
              placeholder="Google Sheet ID"
              value={config.spreadsheetId || ''}
              onChange={(e) => updateNodeConfig(nodeId, { spreadsheetId: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Range</label>
            <input
              type="text"
              placeholder="Sheet1!A1"
              value={config.range || ''}
              onChange={(e) => updateNodeConfig(nodeId, { range: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      );

    case 'ROUTE_TO_MODULE':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Target Module ID</label>
            <input
              type="text"
              placeholder="Target module UUID"
              value={config.targetModuleId || ''}
              onChange={(e) => updateNodeConfig(nodeId, { targetModuleId: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
          No configuration required.
        </div>
      );
  }
};

export const WorkflowGraphEditorContent: React.FC<GraphEditorProps> = ({ 
  workflow, 
  onChange, 
  showDebugger, 
  setShowDebugger,
  selectedNodeId,
  onNodeSelect,
  selectedEdgeId,
  onEdgeSelect,
  rightSidebarTab,
  setRightSidebarTab,
  showGridlines,
  fields
}) => {
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [leftPanelWidth, setLeftPanelWidth] = React.useState(256);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = React.useState(false);
  const [rightPanelWidth, setRightPanelWidth] = React.useState(320);
  const [resizingPanel, setResizingPanel] = React.useState<'left' | 'right' | null>(null);

  const startPanelResize = React.useCallback((panel: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panel === 'left' ? leftPanelWidth : rightPanelWidth;
    setResizingPanel(panel);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      if (panel === 'left') {
        setLeftPanelWidth(Math.max(200, Math.min(400, startWidth + delta)));
      } else {
        setRightPanelWidth(Math.max(260, Math.min(500, startWidth - delta)));
      }
    };

    const onMouseUp = () => {
      setResizingPanel(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [leftPanelWidth, rightPanelWidth]);
  const [actionSearchQuery, setActionSearchQuery] = React.useState('');
  const [actionCategory, setActionCategory] = React.useState<string>('All');
  const [showActionModal, setShowActionModal] = React.useState(false);

  React.useEffect(() => {
    if (!showActionModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowActionModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showActionModal]);

  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [automations, setAutomations] = React.useState<any[]>([]);
  const [newSubstepText, setNewSubstepText] = React.useState('');
  const [isNewSubstepRequired, setIsNewSubstepRequired] = React.useState(true);

  const handleAddSubstep = (nodeId: string) => {
    if (!newSubstepText.trim()) return;
    const newStep: WorkflowSubstep = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: newSubstepText.trim(),
      required: isNewSubstepRequired,
      allowOverride: true
    };

    setNodes(nds => nds.map(node => {
      if (node.id !== nodeId) return node;
      const existing = (node.data.substeps as WorkflowSubstep[]) || [];
      return {
        ...node,
        data: {
          ...node.data,
          substeps: [...existing, newStep]
        }
      };
    }));

    setNewSubstepText('');
  };

  const handleUpdateSubstep = (nodeId: string, substepId: string, updates: Partial<WorkflowSubstep>) => {
    setNodes(nds => nds.map(node => {
      if (node.id !== nodeId) return node;
      const existing = (node.data.substeps as WorkflowSubstep[]) || [];
      return {
        ...node,
        data: {
          ...node.data,
          substeps: existing.map(s => s.id === substepId ? { ...s, ...updates } : s)
        }
      };
    }));
  };

  const handleDeleteSubstep = (nodeId: string, substepId: string) => {
    setNodes(nds => nds.map(node => {
      if (node.id !== nodeId) return node;
      const existing = (node.data.substeps as WorkflowSubstep[]) || [];
      return {
        ...node,
        data: {
          ...node.data,
          substeps: existing.filter(s => s.id !== substepId)
        }
      };
    }));
  };

  const handleReorderSubstep = (nodeId: string, index: number, direction: 'up' | 'down') => {
    setNodes(nds => nds.map(node => {
      if (node.id !== nodeId) return node;
      const existing = [...((node.data.substeps as WorkflowSubstep[]) || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= existing.length) return node;
      const [moved] = existing.splice(index, 1);
      existing.splice(targetIndex, 0, moved);
      return {
        ...node,
        data: {
          ...node.data,
          substeps: existing
        }
      };
    }));
  };

  React.useEffect(() => {
    const loadAutomations = async () => {
      if (!tenant?.id) return;
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
        const res = await fetch(`${API_BASE_URL}/api/automations`, {
          headers: {
            'x-tenant-id': tenant.id,
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAutomations(data);
        }
      } catch (err) {
        console.error('Failed to fetch automations:', err);
      }
    };
    loadAutomations();
  }, [tenant?.id, session?.access_token]);

  const flatFields = React.useMemo(() => {
    const flatten = (items: any[]): any[] => {
      const res: any[] = [];
      (items || []).forEach(item => {
        if (item.id && item.name) {
          res.push(item);
        }
        if (item.fields && Array.isArray(item.fields)) {
          res.push(...flatten(item.fields));
        }
      });
      return res;
    };
    return flatten(fields || []);
  }, [fields]);

  const initialNodes = useMemo(() => 
    workflow?.nodes.map(n => ({
      id: n.id,
      type: n.type === 'ZONE' ? 'workflowZone' : 'workflowNode',
      data: { 
        label: n.name, 
        type: n.type,
        actionType: (n as any).actionType || n.config?.actionType,
        color: (n as any).color || n.config?.color,
        config: n.config || {},
        isStage: n.isStage,
        stageDescription: n.stageDescription,
        stageOrder: n.stageOrder,
        substeps: n.substeps || [],
        onDelete: (id: string) => setNodes((nds) => nds.filter(node => node.id !== id))
      },
      position: n.position || { x: 0, y: 0 },
      ...(n.type === 'ZONE' ? { width: 600, height: 400 } : {})
    })) || [], [workflow]);

  const initialEdges = useMemo(() => 
    workflow?.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || e.condition,
      type: 'workflowEdge',
      animated: true,
      className: "stroke-zinc-400 dark:stroke-zinc-600",
      data: {
        isPrimary: e.isPrimary,
        actionButtonLabel: e.actionButtonLabel,
        buttonVariant: e.buttonVariant,
        requiredFieldIds: e.requiredFieldIds
      }
    })) || [], [workflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const updateNodeConfig = useCallback((nodeId: string, updatedConfig: Record<string, any>) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            config: {
              ...(node.data.config || {}),
              ...updatedConfig
            }
          }
        };
      }
      return node;
    }));
  }, [setNodes]);

  const onLayout = useCallback((direction: 'TB' | 'LR' = 'TB') => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranker: 'network-simplex', nodesep: 100, ranksep: 100 });

    currentNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 220, height: 100 });
    });

    currentEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = currentNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 110,
          y: nodeWithPosition.y - 50,
        },
      };
    });

    setNodes(layoutedNodes as any);
  }, [getNodes, getEdges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'workflowEdge', animated: true }, eds)),
    [setEdges]
  );

  const addNode = useCallback((type: WorkflowNodeType, position = { x: 100, y: 100 }, parentId?: string) => {
    const id = `node-${Date.now()}`;
    const newNode: any = {
      id,
      type: type === 'ZONE' ? 'workflowZone' : 'workflowNode',
      position,
      parentId,
      extent: parentId ? 'parent' : undefined,
      data: { 
        label: `New ${type}`, 
        type,
        actionType: undefined as string | undefined,
        color: undefined as string | undefined,
        config: {} as Record<string, any>,
        onDelete: (id: string) => setNodes((nds) => nds.filter(node => node.id !== id))
      },
      ...(type === 'ZONE' ? { width: 600, height: 400 } : {})
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Check if dropped inside a Zone
      const zones = getNodes().filter(n => n.type === 'workflowZone');
      const parentZone = zones.find(zone => {
        const { x, y } = zone.position;
        const width = zone.width || 600;
        const height = zone.height || 400;
        return (
          position.x >= x && 
          position.x <= x + width && 
          position.y >= y && 
          position.y <= y + height
        );
      });

      if (parentZone) {
        const relativePosition = {
          x: position.x - parentZone.position.x,
          y: position.y - parentZone.position.y,
        };
        addNode(type, relativePosition, parentZone.id);
      } else {
        addNode(type, position);
      }
    },
    [screenToFlowPosition, addNode, getNodes]
  );

  const onNodeDragStop = useCallback((_: any, node: any) => {
    if (node.type === 'workflowZone') return;

    const zones = getNodes().filter(n => n.type === 'workflowZone' && n.id !== node.id);
    const parentZone = zones.find(zone => {
      const { x, y } = zone.position;
      const width = zone.width || 600;
      const height = zone.height || 400;
      
      // Use absolute position for check
      const absPos = node.parentId 
        ? { x: node.position.x + x, y: node.position.y + y }
        : node.position;

      return (
        absPos.x >= x && 
        absPos.x <= x + width && 
        absPos.y >= y && 
        absPos.y <= y + height
      );
    });

    if (parentZone && node.parentId !== parentZone.id) {
      // Move into Zone
      setNodes(nds => nds.map(n => {
        if (n.id === node.id) {
          return {
            ...n,
            parentId: parentZone.id,
            position: {
              x: node.position.x - parentZone.position.x,
              y: node.position.y - parentZone.position.y,
            },
            extent: 'parent'
          };
        }
        return n;
      }));
    } else if (!parentZone && node.parentId) {
      // Move out of Zone
      const parent = getNodes().find(n => n.id === node.parentId);
      if (parent) {
        setNodes(nds => nds.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              parentId: undefined,
              position: {
                x: node.position.x + parent.position.x,
                y: node.position.y + parent.position.y,
              },
              extent: undefined
            } as any;
          }
          return n;
        }));
      }
    }
  }, [getNodes, setNodes]);

  // Sync changes back to parent
  React.useEffect(() => {
    const updatedWorkflow: Workflow = {
      id: workflow?.id || `wf-${Date.now()}`,
      name: workflow?.name || 'New Workflow',
      nodes: nodes.map(n => ({
        id: n.id,
        name: n.data.label as string,
        type: n.data.type as WorkflowNodeType,
        position: n.position,
        isStage: n.data.isStage,
        stageDescription: n.data.stageDescription,
        stageOrder: n.data.stageOrder,
        substeps: n.data.substeps || [],
        config: {
          ...(n.data.config || {}),
          actionType: n.data.actionType,
          color: n.data.color
        }
      })),
      edges: edges.map(e => {
        const edgeLabel = typeof e.label === 'string' ? e.label : (e.label as any)?.props?.children || '';
        const edgeData = (e as any).data || {};
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: edgeLabel,
          condition: edgeLabel,
          isPrimary: edgeData.isPrimary,
          actionButtonLabel: edgeData.actionButtonLabel,
          buttonVariant: edgeData.buttonVariant,
          requiredFieldIds: edgeData.requiredFieldIds
        };
      })
    };
    
    // Avoid circular updates by comparing serialized content
    const currentSerialized = JSON.stringify(updatedWorkflow);
    const previousSerialized = JSON.stringify(workflow);
    
    if (currentSerialized !== previousSerialized) {
      onChange(updatedWorkflow);
    }
  }, [nodes, edges, onChange, workflow]);

  // Re-initialize when switching workflows
  React.useEffect(() => {
    if (workflow) {
      const newNodes = workflow.nodes.map(n => ({
        id: n.id,
        type: n.type === 'ZONE' ? 'workflowZone' : 'workflowNode',
        data: { 
          label: n.name, 
          type: n.type,
          actionType: (n as any).actionType || n.config?.actionType,
          color: (n as any).color || n.config?.color,
          config: n.config || {},
          isStage: n.isStage,
          stageDescription: n.stageDescription,
          stageOrder: n.stageOrder,
          substeps: n.substeps || [],
          onDelete: (id: string) => setNodes((nds) => nds.filter(node => node.id !== id))
        },
        position: n.position || { x: 0, y: 0 },
        ...(n.type === 'ZONE' ? { width: 600, height: 400 } : {})
      }));
      
      const newEdges = workflow.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label || e.condition,
        type: 'workflowEdge',
        animated: true,
        className: "stroke-zinc-400 dark:stroke-zinc-600",
        data: {
          isPrimary: e.isPrimary,
          actionButtonLabel: e.actionButtonLabel,
          buttonVariant: e.buttonVariant,
          requiredFieldIds: e.requiredFieldIds
        }
      }));

      // Only update if the workflow ID has changed, signifying a new module load
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [workflow?.id]);

  return (
    <div className="h-full w-full bg-transparent flex flex-col relative overflow-hidden">

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Compact Resizable & Collapsible Node Library */}
        <motion.div
          initial={false}
          animate={{
            width: leftPanelCollapsed ? 0 : leftPanelWidth,
            opacity: leftPanelCollapsed ? 0 : 1,
          }}
          transition={resizingPanel === 'left' ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "relative shrink-0 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden",
            !leftPanelCollapsed && "border-r border-zinc-200 dark:border-zinc-800"
          )}
        >
          {!leftPanelCollapsed && (
            <div
              onMouseDown={(e) => startPanelResize('left', e)}
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-500/60 transition-colors z-30"
              title="Drag to resize node library"
            />
          )}
          <div className="h-11 px-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search nodes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 bg-zinc-100/80 dark:bg-zinc-800/80 border border-transparent rounded-lg pl-8 pr-2.5 text-xs text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setLeftPanelCollapsed(true)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              title="Collapse node library"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
            <div className="px-1.5 pt-0.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">Nodes</span>
              <span className="text-[10px] text-zinc-400">Drag or click</span>
            </div>
            
            <div className="space-y-1">
            {[
              { type: 'START', icon: Play, label: 'Entry Point', color: 'indigo', desc: 'Start of journey' },
              { type: 'STATUS', icon: Activity, label: 'State Node', color: 'indigo', desc: 'Workflow stage' },
              { type: 'DECISION', icon: GitFork, label: 'Decision Gate', color: 'amber', desc: 'Conditional branch' },
              { type: 'ACTION', icon: Zap, label: 'Action Module', color: 'emerald', desc: 'Automated action' },
              { type: 'DELAY', icon: Clock, label: 'Wait / SLA', color: 'zinc', desc: 'Timed pause' },
              { type: 'ZONE', icon: LayoutIcon, label: 'Logical Zone', color: 'indigo', desc: 'Group steps' },
              { type: 'END', icon: Trash2, label: 'Exit Point', color: 'rose', desc: 'End of journey' },
            ].filter(item => 
              item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
              item.desc.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((item) => (
              <button
                key={item.type}
                draggable
                onDragStart={(event) => onDragStart(event, item.type)}
                onClick={() => addNode(item.type as WorkflowNodeType)}
                className="w-full group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 cursor-pointer"
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors", `bg-${item.color}-500/10 text-${item.color}-500 group-hover:bg-${item.color}-500 group-hover:text-white`)}>
                  <item.icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-zinc-900 dark:text-white truncate">{item.label}</div>
                  <div className="text-[11px] text-zinc-400 truncate">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Action Selection Modal */}
      <AnimatePresence>
        {showActionModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/60 backdrop-blur-xs"
            onClick={() => setShowActionModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[84vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Google-Style Header */}
              <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Zap size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      Automation Library
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      Choose an action to execute when this workflow step is reached.
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  title="Close (Esc)"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="px-6 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-3 shrink-0">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Search actions (e.g. Create record, Email, Slack, Approval, AI...)"
                    value={actionSearchQuery}
                    onChange={(e) => setActionSearchQuery(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-8 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                  {actionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setActionSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      title="Clear search"
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {ACTION_CATEGORIES.map((cat) => {
                    const active = actionCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActionCategory(cat)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer border',
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/40'
                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Grid */}
              <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
                {(() => {
                  const q = actionSearchQuery.trim().toLowerCase();
                  const filteredActions = ACTION_LIBRARY.filter((action) => {
                    const matchesCategory = actionCategory === 'All' || action.category === actionCategory;
                    const matchesSearch =
                      !q ||
                      action.label.toLowerCase().includes(q) ||
                      action.desc.toLowerCase().includes(q) ||
                      action.category.toLowerCase().includes(q);
                    return matchesCategory && matchesSearch;
                  });
                  const currentActionType = nodes.find(n => n.id === selectedNodeId)?.data.actionType;

                  if (filteredActions.length === 0) {
                    return (
                      <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">No matching actions found</p>
                        <p className="text-[11px] text-zinc-400 mt-1">Try a different search term or clear the category filter.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredActions.map((action) => {
                        const isSelected = currentActionType === action.id;
                        const badgeClasses = ACTION_COLOR_CLASSES[action.color] || ACTION_COLOR_CLASSES.indigo;
                        return (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => {
                              setNodes(nds => nds.map(node => 
                                node.id === selectedNodeId 
                                  ? { ...node, data: { ...node.data, actionType: action.id } }
                                  : node
                              ));
                              setShowActionModal(false);
                            }}
                            className={cn(
                              "group flex flex-col gap-2.5 p-4 rounded-xl border text-left transition-all cursor-pointer",
                              isSelected
                                ? "bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-400 dark:border-indigo-500/60 ring-1 ring-indigo-500/30"
                                : "bg-white dark:bg-zinc-900/60 border-zinc-200/90 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-zinc-50/60 dark:hover:bg-zinc-900"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", badgeClasses)}>
                                <action.icon size={16} />
                              </div>
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-medium">
                                  <CheckCircle2 size={10} />
                                  Active
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                                  {action.category}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {action.label}
                              </h3>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                                {action.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between shrink-0">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {ACTION_LIBRARY.length} actions available
                </p>
                <button 
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Center Top Bar (aligned with h-11 sidebars) */}
          <div className="h-11 px-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {leftPanelCollapsed && (
                <button
                  type="button"
                  onClick={() => setLeftPanelCollapsed(false)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors shrink-0 cursor-pointer"
                  title="Expand node library"
                >
                  <ChevronRight size={13} />
                  <span>Nodes</span>
                </button>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <WorkflowIcon size={14} className="text-indigo-500 shrink-0" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {workflow?.name || 'Workflow'}
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                  {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} · {edges.length} {edges.length === 1 ? 'edge' : 'edges'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onLayout('TB')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                title="Auto-arrange workflow nodes"
              >
                <Wand2 size={13} className="text-indigo-500" />
                <span>Auto-layout</span>
              </button>

              {!showDebugger && (
                <button
                  type="button"
                  onClick={() => setShowDebugger(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer"
                  title="Expand properties & test panel"
                >
                  <ChevronLeft size={13} />
                  <span>Properties</span>
                </button>
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex-1 relative bg-zinc-100/70 dark:bg-zinc-950",
              showGridlines !== false &&
                "bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px]"
            )}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onSelectionChange={({ nodes, edges }) => {
                if (nodes.length > 0) {
                  onNodeSelect(nodes[0].id);
                  onEdgeSelect(null);
                  setRightSidebarTab('inspector');
                  setShowDebugger(true);
                } else if (edges.length > 0) {
                  onEdgeSelect(edges[0].id);
                  onNodeSelect(null);
                  setRightSidebarTab('inspector');
                  setShowDebugger(true);
                }
              }}
              onPaneClick={() => {
                onNodeSelect(null);
                onEdgeSelect(null);
              }}
              fitView
              fitViewOptions={{ padding: 0.5, maxZoom: 0.6 }}
            >
              <Controls className="!bg-white dark:!bg-zinc-900 !border-zinc-200 dark:!border-zinc-800 !rounded-xl !shadow-sm" />
              <MiniMap 
                className="!bg-white/95 dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-xl !shadow-sm overflow-hidden" 
                nodeStrokeColor={() => 'transparent'}
                nodeColor={(n: any) => {
                  if (n.data?.type === 'STATUS') return '#4f46e5';
                  if (n.data?.type === 'DECISION') return '#f59e0b';
                  if (n.data?.type === 'ACTION') return '#10b981';
                  return '#a1a1aa';
                }}
                maskColor="rgba(113, 113, 122, 0.12)"
              />
            </ReactFlow>
          </div>
        </div>

        {/* Right Sidebar: Resizable & Collapsible Properties / Test & Runs */}
        <AnimatePresence initial={false}>
          {showDebugger && workflow && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={resizingPanel === 'right' ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
              className="relative shrink-0 h-full z-20 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden"
            >
              <div
                onMouseDown={(e) => startPanelResize('right', e)}
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-500/60 transition-colors z-30"
                title="Drag to resize properties panel"
              />
              {/* Tab Switcher */}
              <div className="h-11 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 px-2 bg-zinc-50/50 dark:bg-transparent shrink-0">
                <div className="flex-1 grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
                  {[
                    { id: 'inspector', label: 'Properties', icon: Settings2 },
                    { id: 'debugger', label: 'Test & Runs', icon: Play },
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => setRightSidebarTab(tab.id as any)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1 rounded-md text-xs font-medium transition-colors",
                        rightSidebarTab === tab.id 
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" 
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <tab.icon size={13} className={rightSidebarTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : ""} />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowDebugger(false)}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                  title="Collapse properties panel"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {rightSidebarTab === 'inspector' ? (
                  <div className="p-3.5 space-y-4">
                    {!selectedNodeId && !selectedEdgeId ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                          <Settings2 size={24} className="text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">Nothing Selected</p>
                          <p className="text-[10px] text-zinc-500">Select a node or connection on the canvas to configure properties.</p>
                        </div>
                      </div>
                    ) : selectedNodeId ? (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {nodes.find(n => n.id === selectedNodeId)?.type === 'workflowZone' ? (
                          /* Zone Specific Configuration */
                          <div className="space-y-6">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Zone Configuration</h4>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Zone Name</label>
                                <input 
                                  type="text"
                                  value={nodes.find(n => n.id === selectedNodeId)?.data.label || ''}
                                  onChange={(e) => {
                                    const newLabel = e.target.value;
                                    setNodes((nds) => nds.map((node) => {
                                      if (node.id === selectedNodeId) {
                                        return { ...node, data: { ...node.data, label: newLabel } };
                                      }
                                      return node;
                                    }));
                                  }}
                                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  placeholder="e.g. Finance Team"
                                />
                              </div>

                              <div className="space-y-3">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Theme Color</label>
                                <div className="grid grid-cols-6 gap-2">
                                  {['indigo', 'emerald', 'amber', 'rose', 'violet', 'zinc'].map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => {
                                        setNodes((nds) => nds.map((node) => {
                                          if (node.id === selectedNodeId) {
                                            return { ...node, data: { ...node.data, color } };
                                          }
                                          return node;
                                        }));
                                      }}
                                      className={cn(
                                        "h-8 rounded-lg transition-all border-2",
                                        color === 'indigo' && "bg-indigo-500 border-indigo-400",
                                        color === 'emerald' && "bg-emerald-500 border-emerald-400",
                                        color === 'amber' && "bg-amber-500 border-amber-400",
                                        color === 'rose' && "bg-rose-500 border-rose-400",
                                        color === 'violet' && "bg-violet-500 border-violet-400",
                                        color === 'zinc' && "bg-zinc-500 border-zinc-400",
                                        nodes.find(n => n.id === selectedNodeId)?.data.color === color ? "ring-4 ring-indigo-500/20 scale-110" : "opacity-40 hover:opacity-100"
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Standard Node Configuration */
                          <div className="space-y-4">
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Node configuration</h4>
                          
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Name</label>
                            <input 
                              type="text"
                              value={nodes.find(n => n.id === selectedNodeId)?.data.label as string}
                              onChange={(e) => {
                                setNodes(nds => nds.map(node => 
                                  node.id === selectedNodeId 
                                    ? { ...node, data: { ...node.data, label: e.target.value } }
                                    : node
                                ));
                              }}
                              className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>

                          {/* Stage Progression Ribbon Settings */}
                          {(nodes.find(n => n.id === selectedNodeId)?.data.type === 'STATUS' || nodes.find(n => n.id === selectedNodeId)?.data.type === 'START') && (
                            <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-medium text-zinc-900 dark:text-white">Show in stage ribbon</p>
                                  <p className="text-[11px] text-zinc-500">Display as an official stage in the ribbon</p>
                                </div>
                                <input 
                                  type="checkbox"
                                  checked={nodes.find(n => n.id === selectedNodeId)?.data.isStage !== false}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setNodes(nds => nds.map(node => 
                                      node.id === selectedNodeId 
                                        ? { ...node, data: { ...node.data, isStage: checked } }
                                        : node
                                    ));
                                  }}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                                />
                              </div>

                              <div className="space-y-1 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Guidance tooltip</label>
                                <input 
                                  type="text"
                                  value={nodes.find(n => n.id === selectedNodeId)?.data.stageDescription || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNodes(nds => nds.map(node => 
                                      node.id === selectedNodeId 
                                        ? { ...node, data: { ...node.data, stageDescription: val } }
                                        : node
                                    ));
                                  }}
                                  placeholder="e.g. Awaiting client review and signature"
                                  className="w-full h-8 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* Stage Subtasks Checklist Section */}
                          {(nodes.find(n => n.id === selectedNodeId)?.data.type === 'STATUS' || nodes.find(n => n.id === selectedNodeId)?.data.type === 'START') && (
                            <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <CheckSquare size={13} className="text-indigo-500" />
                                  <label className="text-xs font-medium text-zinc-900 dark:text-white">
                                    Stage subtasks
                                  </label>
                                </div>
                                <span className="text-[11px] text-zinc-400">
                                  {((nodes.find(n => n.id === selectedNodeId)?.data.substeps as WorkflowSubstep[]) || []).length} items
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 leading-relaxed">
                                Define discrete checklist tasks required within this stage before advancing.
                              </p>

                              {/* Existing Substeps List */}
                              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                                {((nodes.find(n => n.id === selectedNodeId)?.data.substeps as WorkflowSubstep[]) || []).map((step, idx, arr) => (
                                  <div
                                    key={step.id}
                                    className="p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 shadow-2xs group"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-zinc-400 w-4 text-center shrink-0">
                                        {idx + 1}
                                      </span>
                                      <input
                                        type="text"
                                        value={step.label}
                                        onChange={(e) => handleUpdateSubstep(selectedNodeId!, step.id, { label: e.target.value })}
                                        placeholder="Subtask title..."
                                        className="flex-1 bg-transparent text-xs font-medium text-zinc-900 dark:text-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                                      />
                                      <div className="flex items-center gap-1 shrink-0">
                                        {idx > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleReorderSubstep(selectedNodeId!, idx, 'up')}
                                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                                            title="Move up"
                                          >
                                            <ChevronUp size={11} />
                                          </button>
                                        )}
                                        {idx < arr.length - 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleReorderSubstep(selectedNodeId!, idx, 'down')}
                                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                                            title="Move down"
                                          >
                                            <ChevronDown size={11} />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSubstep(selectedNodeId!, step.id)}
                                          className="text-zinc-400 hover:text-rose-500 p-0.5 rounded cursor-pointer transition-colors"
                                          title="Delete subtask"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-900 text-[10px]">
                                      <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={step.required !== false}
                                          onChange={(e) => handleUpdateSubstep(selectedNodeId!, step.id, { required: e.target.checked })}
                                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                                        />
                                        <span className={step.required !== false ? "font-bold text-rose-500 dark:text-rose-400" : ""}>
                                          Required to advance
                                        </span>
                                      </label>

                                      <label className="flex items-center gap-1.5 text-zinc-500 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={step.allowOverride !== false}
                                          onChange={(e) => handleUpdateSubstep(selectedNodeId!, step.id, { allowOverride: e.target.checked })}
                                          className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                                        />
                                        <span>Allow bypass</span>
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Add New Subtask Input */}
                              <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={newSubstepText}
                                    onChange={(e) => setNewSubstepText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSubstep(selectedNodeId!);
                                      }
                                    }}
                                    placeholder="+ Add subtask checklist item..."
                                    className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                                  />
                                  <button
                                    type="button"
                                    disabled={!newSubstepText.trim()}
                                    onClick={() => handleAddSubstep(selectedNodeId!)}
                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span>Add</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 px-1">
                                  <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isNewSubstepRequired}
                                      onChange={(e) => setIsNewSubstepRequired(e.target.checked)}
                                      className="w-3 h-3 rounded text-indigo-600 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                                    />
                                    <span>Make required by default</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Node Specific Config (only shown for ACTION nodes) */}
                        {nodes.find(n => n.id === selectedNodeId)?.data.type === 'ACTION' && (
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                           <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Action configuration</h4>
                           <div className="space-y-3">
                               <div className="space-y-1.5">
                                 <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Action type</label>
                                 <button 
                                   onClick={() => setShowActionModal(true)}
                                   className="w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-xs transition-colors hover:border-indigo-500 group"
                                 >
                                   <div className="flex items-center gap-2.5">
                                     <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-md group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                       {(() => {
                                         const currentAction = ACTION_LIBRARY.find(a => a.id === nodes.find(n => n.id === selectedNodeId)?.data.actionType);
                                         const Icon = currentAction?.icon || Zap;
                                         return <Icon size={14} />;
                                       })()}
                                     </div>
                                     <div className="text-left">
                                       <p className="text-xs font-medium text-zinc-900 dark:text-white">
                                         {ACTION_LIBRARY.find(a => a.id === nodes.find(n => n.id === selectedNodeId)?.data.actionType)?.label || 'Select an Action'}
                                       </p>
                                       <p className="text-[10px] text-zinc-500">Click to change</p>
                                     </div>
                                   </div>
                                   <ChevronRight size={13} className="text-zinc-400" />
                                 </button>
                               </div>

                               {nodes.find(n => n.id === selectedNodeId)?.data.actionType ? (
                                 <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2.5">
                                   <ActionConfigPanel
                                     nodeId={selectedNodeId!}
                                     actionType={nodes.find(n => n.id === selectedNodeId)?.data.actionType!}
                                     config={nodes.find(n => n.id === selectedNodeId)?.data.config || {}}
                                     updateNodeConfig={updateNodeConfig}
                                     automations={automations}
                                     flatFields={flatFields}
                                   />
                                 </div>
                               ) : (
                                 <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center">
                                    <Zap size={20} className="text-zinc-300 dark:text-zinc-700 mb-2" />
                                    <p className="text-[11px] text-zinc-400">Select an action type above</p>
                                 </div>
                               )}
                             </div>
                        </div>
                        )}

                        {/* Wait / SLA Configuration (only shown for DELAY nodes) */}
                        {nodes.find(n => n.id === selectedNodeId)?.data.type === 'DELAY' && (() => {
                          const delayNode = nodes.find(n => n.id === selectedNodeId);
                          const delayConfig = (delayNode?.data.config || {}) as Record<string, any>;
                          const waitMode = delayConfig.waitMode || 'duration';
                          const duration = delayConfig.duration ?? 24;
                          const unit = delayConfig.unit || 'hours';

                          return (
                            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Wait / SLA configuration</h4>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                                  <Clock size={10} />
                                  {waitMode === 'field'
                                    ? (delayConfig.targetDateField ? `Until ${delayConfig.targetDateField}` : 'Until date')
                                    : `${duration} ${unit}`}
                                </span>
                              </div>

                              <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Wait mode</label>
                                  <div className="grid grid-cols-2 gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
                                    {[
                                      { id: 'duration', label: 'Fixed duration' },
                                      { id: 'field', label: 'Until date field' },
                                    ].map((mode) => (
                                      <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => updateNodeConfig(selectedNodeId!, { waitMode: mode.id })}
                                        className={cn(
                                          'py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                                          waitMode === mode.id
                                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                                        )}
                                      >
                                        {mode.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {waitMode === 'duration' ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Duration</label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={duration}
                                        onChange={(e) =>
                                          updateNodeConfig(selectedNodeId!, {
                                            duration: Math.max(1, Number(e.target.value) || 1),
                                          })
                                        }
                                        className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Unit</label>
                                      <select
                                        value={unit}
                                        onChange={(e) => updateNodeConfig(selectedNodeId!, { unit: e.target.value })}
                                        className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                      >
                                        <option value="minutes">Minutes</option>
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                        <option value="weeks">Weeks</option>
                                      </select>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Target date field</label>
                                    <select
                                      value={delayConfig.targetDateField || ''}
                                      onChange={(e) => updateNodeConfig(selectedNodeId!, { targetDateField: e.target.value })}
                                      className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                    >
                                      <option value="">-- Select date field --</option>
                                      {flatFields.map((f) => (
                                        <option key={f.id} value={f.name || f.id}>
                                          {f.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <label className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800 cursor-pointer">
                                  <div>
                                    <p className="text-xs font-medium text-zinc-900 dark:text-white">Business hours only</p>
                                    <p className="text-[10px] text-zinc-500">Pause timer outside Mon–Fri working hours</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(delayConfig.businessHoursOnly)}
                                    onChange={(e) => updateNodeConfig(selectedNodeId!, { businessHoursOnly: e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                                  />
                                </label>

                                <label className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800 cursor-pointer">
                                  <div>
                                    <p className="text-xs font-medium text-zinc-900 dark:text-white">Enforce as SLA deadline</p>
                                    <p className="text-[10px] text-zinc-500">Track breach status and trigger escalation</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(delayConfig.isSla)}
                                    onChange={(e) => updateNodeConfig(selectedNodeId!, { isSla: e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                                  />
                                </label>

                                {delayConfig.isSla && (
                                  <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">On SLA breach</label>
                                      <select
                                        value={delayConfig.breachAction || 'notify'}
                                        onChange={(e) => updateNodeConfig(selectedNodeId!, { breachAction: e.target.value })}
                                        className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                      >
                                        <option value="notify">Send breach notification</option>
                                        <option value="escalate">Escalate & continue workflow</option>
                                        <option value="none">Mark breached only</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Escalation channel / recipient</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. #sla-alerts or manager@company.com"
                                        value={delayConfig.slaTarget || ''}
                                        onChange={(e) => updateNodeConfig(selectedNodeId!, { slaTarget: e.target.value })}
                                        className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                          </div>
                        )}
                      </div>
                    ) : selectedEdgeId ? (
                      /* Edge Inspector */
                      <div className="space-y-6">
                        <div className="space-y-6">
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Connection Path</h4>
                          
                          {/* From/To Nodes Display */}
                          <div className="flex items-center gap-3 px-1">
                            <div className="flex-1 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                              <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1">From Step</p>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {nodes.find(n => n.id === edges.find(e => e.id === selectedEdgeId)?.source)?.data.label as string || 'Unknown'}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-300" />
                            <div className="flex-1 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                              <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1">To Step</p>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {nodes.find(n => n.id === edges.find(e => e.id === selectedEdgeId)?.target)?.data.label as string || 'Unknown'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Action Button & Next Step</h4>

                            {/* Button Label */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Action Button Label</label>
                              <input 
                                type="text"
                                value={((edges.find(e => e.id === selectedEdgeId) as any)?.data?.actionButtonLabel) || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEdges(eds => eds.map(edge => 
                                    edge.id === selectedEdgeId 
                                      ? { ...edge, data: { ...((edge as any).data || {}), actionButtonLabel: val } }
                                      : edge
                                  ));
                                }}
                                placeholder="e.g. Submit for Approval, Mark Delivered"
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                              />
                              <p className="text-[10px] text-zinc-500 italic px-1">
                                Text displayed on the primary action button for this step.
                              </p>
                            </div>

                            {/* Mark as Primary Action */}
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-zinc-900 dark:text-white">Primary Action</p>
                                <p className="text-[10px] text-zinc-500">Highlight this path as the default next step.</p>
                              </div>
                              <input 
                                type="checkbox"
                                checked={Boolean(((edges.find(e => e.id === selectedEdgeId) as any)?.data?.isPrimary))}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEdges(eds => eds.map(edge => 
                                    edge.id === selectedEdgeId 
                                      ? { ...edge, data: { ...((edge as any).data || {}), isPrimary: checked } }
                                      : edge
                                  ));
                                }}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                              />
                            </div>

                            {/* Button Style / Variant */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Button Color</label>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[
                                  { id: 'primary', label: 'Indigo', bg: 'bg-indigo-600' },
                                  { id: 'success', label: 'Emerald', bg: 'bg-emerald-600' },
                                  { id: 'destructive', label: 'Rose', bg: 'bg-rose-600' },
                                  { id: 'outline', label: 'Outline', bg: 'bg-zinc-400' }
                                ].map(variant => {
                                  const currentVariant = ((edges.find(e => e.id === selectedEdgeId) as any)?.data?.buttonVariant) || 'primary';
                                  const isSelected = currentVariant === variant.id;
                                  return (
                                    <button
                                      key={variant.id}
                                      type="button"
                                      onClick={() => {
                                        setEdges(eds => eds.map(edge => 
                                          edge.id === selectedEdgeId 
                                            ? { ...edge, data: { ...((edge as any).data || {}), buttonVariant: variant.id as any } }
                                            : edge
                                        ));
                                      }}
                                      className={cn(
                                        "py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-1",
                                        isSelected 
                                          ? "border-indigo-500 ring-2 ring-indigo-500/20 text-zinc-900 dark:text-white" 
                                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                      )}
                                    >
                                      <span className={cn("w-2 h-2 rounded-full", variant.bg)} />
                                      <span>{variant.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Required Transition Fields Guardrail */}
                            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Required Transition Fields</label>
                                <span className="text-[10px] text-zinc-400">
                                  {(((edges.find(e => e.id === selectedEdgeId) as any)?.data?.requiredFieldIds) || []).length} required
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 leading-relaxed px-1">
                                Records must have values in these fields before this transition can be executed.
                              </p>

                              {/* Selected Fields Badges */}
                              {(((edges.find(e => e.id === selectedEdgeId) as any)?.data?.requiredFieldIds) || []).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                  {(((edges.find(e => e.id === selectedEdgeId) as any)?.data?.requiredFieldIds) || []).map((fId: string) => {
                                    const fieldObj = flatFields.find(f => f.id === fId || f.name === fId);
                                    const fLabel = fieldObj?.label || fieldObj?.name || fId;
                                    return (
                                      <span
                                        key={fId}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 rounded-md text-[10px] font-medium"
                                      >
                                        <span className="truncate max-w-[120px]">{fLabel}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEdges(eds => eds.map(edge => {
                                              if (edge.id !== selectedEdgeId) return edge;
                                              const existingIds: string[] = (edge as any).data?.requiredFieldIds || [];
                                              return {
                                                ...edge,
                                                data: {
                                                  ...((edge as any).data || {}),
                                                  requiredFieldIds: existingIds.filter(id => id !== fId)
                                                }
                                              };
                                            }));
                                          }}
                                          className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 cursor-pointer"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Add Field Dropdown */}
                              {flatFields.length > 0 && (
                                <select
                                  value=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    setEdges(eds => eds.map(edge => {
                                      if (edge.id !== selectedEdgeId) return edge;
                                      const existingIds: string[] = (edge as any).data?.requiredFieldIds || [];
                                      if (existingIds.includes(val)) return edge;
                                      return {
                                        ...edge,
                                        data: {
                                          ...((edge as any).data || {}),
                                          requiredFieldIds: [...existingIds, val]
                                        }
                                      };
                                    }));
                                  }}
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                  <option value="">+ Add required field...</option>
                                  {flatFields
                                    .filter(f => !(((edges.find(e => e.id === selectedEdgeId) as any)?.data?.requiredFieldIds) || []).includes(f.id))
                                    .map(f => (
                                      <option key={f.id} value={f.id}>
                                        {f.label || f.name} ({f.type || 'text'})
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Branching Logic</h4>
                            
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Condition Expression</label>
                              <textarea 
                                value={edges.find(e => e.id === selectedEdgeId)?.label as string || ''}
                                onChange={(e) => {
                                  setEdges(eds => eds.map(edge => 
                                    edge.id === selectedEdgeId 
                                      ? { ...edge, label: e.target.value }
                                      : edge
                                  ));
                                }}
                                placeholder="e.g. amount > 5000"
                                className="w-full h-32 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-indigo-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                              />
                              <p className="text-[10px] text-zinc-500 italic px-1">
                                This logic determines if a record follows this path. Leave empty for unconditional transitions.
                              </p>
                            </div>

                            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2">
                               <div className="flex items-center gap-2 text-amber-500">
                                 <SparklesIcon size={12} />
                                 <span className="text-[10px] font-bold uppercase tracking-widest">AI Tip</span>
                               </div>
                               <p className="text-[10px] text-zinc-500 leading-relaxed">
                                 You can use any record field here. Example: <code className="text-amber-600 font-bold">priority === 'High'</code>
                               </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <WorkflowDebugger
                    workflow={workflow}
                    fields={flatFields}
                    onHighlightPath={(passedIds, failedId) => {
                      const passedSet = new Set(passedIds);
                      setNodes((nds) =>
                        nds.map((n) => ({
                          ...n,
                          data: {
                            ...n.data,
                            testStatus:
                              failedId === n.id
                                ? 'failed'
                                : passedSet.has(n.id)
                                  ? 'passed'
                                  : undefined,
                          },
                        }))
                      );
                    }}
                    onSelectNode={(nodeId) => {
                      onNodeSelect(nodeId);
                      onEdgeSelect(null);
                      setRightSidebarTab('inspector');
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export const WorkflowGraphEditor: React.FC<GraphEditorProps> = (props) => (
  <ReactFlowProvider>
    <WorkflowGraphEditorContent {...props} />
  </ReactFlowProvider>
);



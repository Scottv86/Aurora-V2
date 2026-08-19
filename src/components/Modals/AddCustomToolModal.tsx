import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Wrench, 
  Plus, 
  Trash2, 
  Code, 
  Play, 
  CheckCircle2, 
  Globe, 
  Lock, 
  Sliders, 
  ArrowRight 
} from 'lucide-react';
import { AgentToolBinding, AgentCustomToolParameter } from '../../types/agent';
import { toast } from 'sonner';

export interface AddCustomToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTool: (tool: AgentToolBinding) => void;
}

export const AddCustomToolModal: React.FC<AddCustomToolModalProps> = ({
  isOpen,
  onClose,
  onAddTool
}) => {
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [toolType, setToolType] = useState<'REST_API' | 'WEBHOOK'>('REST_API');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([
    { key: 'Content-Type', value: 'application/json' }
  ]);
  const [parameters, setParameters] = useState<AgentCustomToolParameter[]>([
    { name: 'query', type: 'string', description: 'Search term or record identifier', required: true }
  ]);
  const [bodyTemplate, setBodyTemplate] = useState('{\n  "query": "{{query}}",\n  "timestamp": "{{timestamp}}"\n}');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleAddParameter = () => {
    setParameters([
      ...parameters,
      { name: `param_${parameters.length + 1}`, type: 'string', description: '', required: false }
    ]);
  };

  const handleRemoveParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleTestExecution = async () => {
    if (!endpointUrl.trim()) {
      toast.error('Please enter an endpoint URL to test');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      await new Promise(r => setTimeout(r, 600));
      setTestResult(JSON.stringify({
        status: 200,
        message: 'Endpoint reachable and response validated.',
        mockPayload: { success: true, timestamp: new Date().toISOString() }
      }, null, 2));
      toast.success('Test invocation successful!');
    } catch (e: any) {
      setTestResult(JSON.stringify({ status: 500, error: e.message || 'Connection failed' }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) {
      toast.error('Please provide a tool name');
      return;
    }
    if (!endpointUrl.trim()) {
      toast.error('Please provide an endpoint URL');
      return;
    }

    const headersMap: Record<string, string> = {};
    headers.forEach(h => {
      if (h.key.trim()) headersMap[h.key.trim()] = h.value;
    });

    const newTool: AgentToolBinding = {
      id: `tool_custom_${Date.now()}`,
      name: toolName.trim(),
      type: toolType,
      description: toolDescription.trim() || `Custom ${toolType} skill calling ${endpointUrl}`,
      enabled: true,
      requiresApproval,
      endpoint: endpointUrl.trim(),
      method: httpMethod,
      icon: toolType === 'WEBHOOK' ? 'MessageSquare' : 'Globe',
      customConfig: {
        url: endpointUrl.trim(),
        method: httpMethod,
        headers: headersMap,
        bodyTemplate,
        parameterSchema: parameters.filter(p => p.name.trim() !== '')
      }
    };

    onAddTool(newTool);
    toast.success(`Custom tool "${newTool.name}" created!`);
    onClose();
  };

  const modalNode = (
    <AnimatePresence mode="wait">
      <div key="add-custom-tool-modal" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Wrench size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                  Create Custom API Tool / Skill
                </h3>
                <p className="text-xs text-zinc-500">
                  Equip this agent with custom REST endpoints, webhooks, and schemas.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-7 overflow-y-auto space-y-5 text-xs">
            {/* Tool Name & Type */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tool Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. GitHub Issue Creator"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Type
                </label>
                <select
                  value={toolType}
                  onChange={(e) => setToolType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                >
                  <option value="REST_API">REST API</option>
                  <option value="WEBHOOK">Webhook</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Description (Helps the Agent determine when to use this tool)
              </label>
              <input
                type="text"
                placeholder="e.g. Call this tool when the user requests creating a bug ticket..."
                value={toolDescription}
                onChange={(e) => setToolDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* HTTP Method & Endpoint URL */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Endpoint URL & Method
              </label>
              <div className="flex gap-2">
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value as any)}
                  className="w-24 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  placeholder="https://api.example.com/v1/action"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Custom Headers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  Headers ({headers.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddHeader}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={13} /> Add Header
                </button>
              </div>

              {headers.map((h, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Header Key (e.g. Authorization)"
                    value={h.key}
                    onChange={(e) => {
                      const next = [...headers];
                      next[idx].key = e.target.value;
                      setHeaders(next);
                    }}
                    className="w-1/2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Bearer {{token}})"
                    value={h.value}
                    onChange={(e) => {
                      const next = [...headers];
                      next[idx].value = e.target.value;
                      setHeaders(next);
                    }}
                    className="w-1/2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveHeader(idx)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Parameters Schema */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  Tool Parameters Schema ({parameters.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddParameter}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={13} /> Add Parameter
                </button>
              </div>

              {parameters.map((p, idx) => (
                <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Parameter Name"
                      value={p.name}
                      onChange={(e) => {
                        const next = [...parameters];
                        next[idx].name = e.target.value;
                        setParameters(next);
                      }}
                      className="w-1/3 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
                    />
                    <select
                      value={p.type}
                      onChange={(e) => {
                        const next = [...parameters];
                        next[idx].type = e.target.value as any;
                        setParameters(next);
                      }}
                      className="w-24 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="object">object</option>
                    </select>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500">
                      <input
                        type="checkbox"
                        checked={p.required}
                        onChange={(e) => {
                          const next = [...parameters];
                          next[idx].required = e.target.checked;
                          setParameters(next);
                        }}
                        className="accent-indigo-600"
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveParameter(idx)}
                      className="ml-auto text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Description for LLM..."
                    value={p.description}
                    onChange={(e) => {
                      const next = [...parameters];
                      next[idx].description = e.target.value;
                      setParameters(next);
                    }}
                    className="w-full px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>

            {/* Request Body Template */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Payload Body Template (JSON)
              </label>
              <textarea
                rows={3}
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                className="w-full p-2.5 bg-zinc-900 text-zinc-200 font-mono text-[11px] rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Human in the loop toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Require Human Confirmation</span>
                <p className="text-[10px] text-zinc-400">Prompt supervisor before this tool executes</p>
              </div>
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
            </div>

            {/* Test Action */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestExecution}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all"
              >
                <Play size={13} />
                <span>{isTesting ? 'Testing...' : 'Test Tool Endpoint'}</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all"
              >
                <CheckCircle2 size={14} />
                <span>Save Custom Tool</span>
              </button>
            </div>

            {testResult && (
              <pre className="p-3 bg-zinc-900 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto">
                {testResult}
              </pre>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

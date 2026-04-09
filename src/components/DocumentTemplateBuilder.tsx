import React, { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { 
  Save, 
  Plus, 
  X, 
  Variable,
  Type,
  Table as TableIcon,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DocumentTemplate } from '../types/platform';
import { DocumentService } from '../services/documentService';
import { generateDocumentTemplate } from '../services/aiService';
import { usePlatform } from '../hooks/usePlatform';
import { toast } from 'sonner';

interface DocumentTemplateBuilderProps {
  template?: DocumentTemplate;
  moduleId?: string;
  onSave?: (template: DocumentTemplate) => void;
  onCancel?: () => void;
}

export const DocumentTemplateBuilder: React.FC<DocumentTemplateBuilderProps> = ({
  template,
  moduleId,
  onSave,
  onCancel
}) => {
  const { tenant, user } = usePlatform();
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');
  const [status, setStatus] = useState<DocumentTemplate['status']>(template?.status || 'Draft');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'history'>('editor');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const modules = [
    { id: 'text', label: 'Text Block', icon: Type, snippet: '<p>Enter text here...</p>' },
    { id: 'field', label: 'Merge Field', icon: Variable, snippet: '{{field_name}}' },
    { id: 'condition', label: 'Conditional Section', icon: CheckSquare, snippet: '[[IF condition]]\n<p>Visible if condition is true</p>\n[[ENDIF]]' },
    { id: 'repeater', label: 'Repeater Section', icon: TableIcon, snippet: '[[REPEAT list]]\n<p>{{item_field}}</p>\n[[ENDREPEAT]]' },
  ];

  const handleSave = async () => {
    if (!tenant || !user) return;
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const savedTemplate = await DocumentService.saveTemplate(tenant.id, {
        ...template,
        name,
        content,
        status,
        moduleId,
        createdBy: user.id
      });
      toast.success('Template saved successfully');
      onSave?.(savedTemplate);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe the document you want to generate');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateDocumentTemplate(aiPrompt, moduleId);
      setName(result.name);
      setContent(result.content);
      toast.success('Template generated successfully');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Failed to generate template with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const insertSnippet = (snippet: string) => {
    setContent(prev => prev + snippet);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template Name"
              className="text-xl font-bold text-white bg-transparent border-none focus:ring-0 p-0 placeholder-zinc-600"
            />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              {template ? `Version ${template.version}` : 'New Template'} • {status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mr-4">
            <button
              onClick={() => setActiveTab('editor')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all",
                activeTab === 'editor' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all",
                activeTab === 'preview' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Preview
            </button>
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="text-xs font-bold bg-zinc-900 border-zinc-800 text-zinc-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-1.5"
          >
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-500/20"
          >
            <Save className="w-4 h-4" />
            Save Template
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-zinc-800 bg-zinc-950 overflow-y-auto p-6">
          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">
                Content Blocks
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {modules.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => insertSnippet(m.snippet)}
                    className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-900 transition-all text-left group"
                  >
                    <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-indigo-500/10 transition-colors">
                      <m.icon className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400" />
                    </div>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-white">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">AI Assistant</span>
              </div>
              <p className="text-[10px] text-zinc-400 mb-3 leading-relaxed">
                Describe the document and I'll generate a draft for you.
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., A standard NDA for consultants..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-transparent mb-3 min-h-[60px] resize-none"
              />
              <button 
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="w-full py-2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Generate Draft
                  </>
                )}
              </button>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">
                Merge Fields
              </h3>
              <div className="space-y-1">
                {['id', 'name', 'status', 'createdAt', 'updatedAt'].map(field => (
                  <button
                    key={field}
                    onClick={() => insertSnippet(`{{${field}}}`)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-indigo-400 rounded-lg transition-all group"
                  >
                    <span>{field}</span>
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto bg-zinc-900 p-12">
          <div className="max-w-4xl mx-auto bg-zinc-950 shadow-2xl rounded-xl min-h-[1056px] flex flex-col text-zinc-200 overflow-hidden border border-zinc-800">
            {activeTab === 'editor' ? (
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                className="flex-1 flex flex-col h-full quill-dark-toolbar"
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                  ],
                }}
              />
            ) : (
              <div className="p-16 prose prose-invert prose-indigo max-w-none">
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

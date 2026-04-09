import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  X,
  Eye,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DocumentTemplate, GeneratedDocument } from '../types/platform';
import { DocumentService } from '../services/documentService';
import { usePlatform } from '../hooks/usePlatform';
import { toast } from 'sonner';

interface DocumentGeneratorModalProps {
  recordData: any;
  moduleId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerated?: (doc: GeneratedDocument) => void;
}

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = ({
  recordData,
  moduleId,
  isOpen,
  onClose,
  onGenerated
}) => {
  const { tenant, user } = usePlatform();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && tenant) {
      loadTemplates();
    }
  }, [isOpen, tenant, moduleId]);

  const loadTemplates = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const tmpls = await DocumentService.getTemplates(tenant.id, moduleId);
      setTemplates(tmpls.filter(t => t.status === 'Published'));
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!tenant || !user || !selectedTemplate) return;
    setGenerating(true);
    try {
      const doc = await DocumentService.generateDocument(tenant.id, selectedTemplate, recordData, user.id);
      toast.success('Document generated successfully');
      onGenerated?.(doc);
      onClose();
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-zinc-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Generate Document</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Template Selection */}
          <div className="w-1/3 border-r border-zinc-800 overflow-y-auto p-6 bg-zinc-950">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
              Select Template
            </h4>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : templates.length > 0 ? (
                templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left group",
                      selectedTemplate?.id === t.id 
                        ? "bg-zinc-900 border-indigo-500 shadow-lg ring-2 ring-indigo-500/20" 
                        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      selectedTemplate?.id === t.id ? "bg-indigo-500/10" : "bg-zinc-800 group-hover:bg-indigo-500/10"
                    )}>
                      <FileText className={cn(
                        "w-4 h-4 transition-colors",
                        selectedTemplate?.id === t.id ? "text-indigo-400" : "text-zinc-500 group-hover:text-indigo-400"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-zinc-500">v{t.version}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-zinc-500">No published templates found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-900">
            {selectedTemplate ? (
              <div className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-800 shadow-2xl rounded-xl p-12 min-h-[800px] prose prose-invert prose-indigo text-zinc-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Preview Mode</span>
                  <span className="text-[10px] text-zinc-500 italic">Data merged from current record</span>
                </div>
                <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="p-6 bg-zinc-950 rounded-full shadow-inner mb-4">
                  <Eye className="w-12 h-12 text-zinc-800" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Select a template to preview</h4>
                <p className="text-sm text-zinc-500 max-w-xs">
                  Choose a template from the list on the left to see how it will look with your data.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 font-bold hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate || generating}
            className={cn(
              "flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/20",
              (!selectedTemplate || generating) && "opacity-50 cursor-not-allowed"
            )}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate & Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

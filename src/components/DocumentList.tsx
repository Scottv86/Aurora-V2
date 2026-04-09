import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Mail, 
  Trash2, 
  Search, 
  Filter, 
  Plus,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GeneratedDocument, DocumentTemplate } from '../types/platform';
import { DocumentService } from '../services/documentService';
import { usePlatform } from '../hooks/usePlatform';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DocumentListProps {
  recordId?: string;
  moduleId?: string;
  onGenerateNew?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  recordId,
  moduleId,
  onGenerateNew
}) => {
  const { tenant } = usePlatform();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocument | null>(null);

  useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant, recordId]);

  const loadData = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const [docs, tmpls] = await Promise.all([
        DocumentService.getDocuments(tenant.id, recordId),
        DocumentService.getTemplates(tenant.id, moduleId)
      ]);
      setDocuments(docs);
      setTemplates(tmpls);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: GeneratedDocument['status']) => {
    switch (status) {
      case 'Draft': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      case 'Final': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Issued': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Approved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-200">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors">
            <Filter className="w-4 h-4 text-zinc-400" />
          </button>
          {onGenerateNew && (
            <button
              onClick={onGenerateNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Generate
            </button>
          )}
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/30 border-b border-zinc-800">
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Document Name</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Generated</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc: GeneratedDocument) => (
                <tr key={doc.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-indigo-500/10 transition-colors">
                        <FileText className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{doc.name}</p>
                        <p className="text-xs text-zinc-500">
                          Template: {templates.find(t => t.id === doc.templateId)?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      getStatusColor(doc.status)
                    )}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-300">
                        {doc.generatedAt && typeof doc.generatedAt === 'object' && 'seconds' in doc.generatedAt 
                          ? format(new Date((doc.generatedAt as any).seconds * 1000), 'MMM d, yyyy') : 'N/A'}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {doc.generatedAt && typeof doc.generatedAt === 'object' && 'seconds' in doc.generatedAt 
                          ? format(new Date((doc.generatedAt as any).seconds * 1000), 'h:mm a') : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setSelectedDoc(doc)}
                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors" title="Email">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-zinc-900 rounded-full">
                      <FileText className="w-8 h-8 text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 font-bold">No documents generated yet</p>
                    <button 
                      onClick={onGenerateNew}
                      className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-colors"
                    >
                      Generate your first document
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">{selectedDoc.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 bg-zinc-900">
              <div className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 shadow-2xl rounded-xl p-12 min-h-[1056px] prose prose-invert prose-indigo text-zinc-200">
                <div dangerouslySetInnerHTML={{ __html: selectedDoc.content || '' }} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950">
              <button className="px-4 py-2 text-zinc-400 font-bold hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">
                Download PDF
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                Email Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


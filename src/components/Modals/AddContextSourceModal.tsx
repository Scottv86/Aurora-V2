import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  BookOpen, 
  HardDrive, 
  BarChart2, 
  Search, 
  Plus, 
  Check,
  Globe,
  Link2
} from 'lucide-react';
import { ContextSource } from '../../types/solutions';
import { AppContextService, AppContextItem } from '../../services/appContextService';
import { toast } from 'sonner';

export interface AddContextSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLocalFiles: (files: FileList) => void;
  onAddContextSource: (source: ContextSource) => void;
}

export const AddContextSourceModal: React.FC<AddContextSourceModalProps> = ({
  isOpen,
  onClose,
  onAddLocalFiles,
  onAddContextSource
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'website' | 'kb' | 'drive' | 'apps'>('kb');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [webUrl, setWebUrl] = useState('');
  const [webTitle, setWebTitle] = useState('');

  if (!isOpen) return null;

  const handleAddWebLink = () => {
    if (!webUrl.trim()) {
      toast.error('Please enter a valid website URL.');
      return;
    }

    let formattedUrl = webUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let defaultName = 'Web Document Source';
    try {
      const urlObj = new URL(formattedUrl);
      defaultName = urlObj.hostname.replace(/^www\./, '');
    } catch (err) {}

    const newSource: ContextSource = {
      id: `src_web_${Date.now()}`,
      name: webTitle.trim() || defaultName,
      type: 'other',
      size: 'Web Link',
      uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'PROCESSED',
      sourceOrigin: 'WEBSITE',
      contentSummary: `Web Documentation URL: ${formattedUrl}`,
      rawText: `Web Context Source URL: ${formattedUrl}\nTitle: ${webTitle.trim() || defaultName}\nIndexed Content: External web page documentation referenced as context ground for solution architecture.`
    };

    onAddContextSource(newSource);
    toast.success(`Imported website context "${newSource.name}"!`);
    setWebUrl('');
    setWebTitle('');
    onClose();
  };

  const handleImportAction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeTab === 'website') {
      handleAddWebLink();
    } else {
      handleImportSelected();
    }
  };



  const kbArticles = AppContextService.getKnowledgeBaseArticles();
  const driveDocs = AppContextService.getDriveDocuments();
  const appSources = AppContextService.getPlatformAppSources();

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleImportSelected = () => {
    let importedCount = 0;
    const allItems: AppContextItem[] = [...kbArticles, ...driveDocs, ...appSources];

    selectedItemIds.forEach(id => {
      const item = allItems.find(i => i.id === id);
      if (item) {
        const source = AppContextService.convertToContextSource(item);
        onAddContextSource(source);
        importedCount++;
      }
    });

    if (importedCount > 0) {
      toast.success(`Imported ${importedCount} context source(s) into Solution Builder.`);
    }

    setSelectedItemIds([]);
    onClose();
  };

  const modalNode = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl transition-opacity"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[32px] shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl overflow-hidden z-10 flex flex-col my-auto h-[600px] max-h-[90vh]"
        >
          {/* Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />

          {/* Modal Header Bar */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-zinc-200/60 dark:border-zinc-800 shrink-0 relative z-10">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Add Context Source</span>
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Connect documents from repositories, web URLs, or local files to ground AI solution blueprints.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2-Column Split Body */}
          <div className="flex-1 flex min-h-0 relative z-10 overflow-hidden">
            {/* Left Sidebar Category Navigation */}
            <div className="w-60 border-r border-zinc-200/60 dark:border-zinc-800/80 p-4 space-y-6 shrink-0 bg-zinc-50/60 dark:bg-zinc-950/40 overflow-y-auto custom-scrollbar">
              {/* Repositories Group */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 block mb-1">
                  Repositories
                </span>
                {[
                  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, count: kbArticles.length },
                  { id: 'drive', label: 'Aurora Drive', icon: HardDrive, count: driveDocs.length },
                  { id: 'apps', label: 'Apps & Reports', icon: BarChart2, count: appSources.length }
                ].map((nav) => {
                  const IconComp = nav.icon;
                  const isActive = activeTab === nav.id;

                  return (
                    <button
                      key={nav.id}
                      onClick={() => setActiveTab(nav.id as any)}
                      className={`w-full px-3 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComp size={15} className={isActive ? 'text-white' : 'text-indigo-500'} />
                        <span>{nav.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}>
                        {nav.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* External & Local Inputs Group */}
              <div className="space-y-1 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 block mb-1">
                  External & Local
                </span>
                {[
                  { id: 'website', label: 'Web Link', icon: Globe },
                  { id: 'upload', label: 'Local File Upload', icon: Upload }
                ].map((nav) => {
                  const IconComp = nav.icon;
                  const isActive = activeTab === nav.id;

                  return (
                    <button
                      key={nav.id}
                      onClick={() => setActiveTab(nav.id as any)}
                      className={`w-full px-3 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 group cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <IconComp size={15} className={isActive ? 'text-white' : 'text-sky-500'} />
                      <span>{nav.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {/* Repository Search Bar Header */}
              {activeTab !== 'upload' && activeTab !== 'website' && (
                <div className="relative w-full shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab === 'kb' ? 'Knowledge Base' : activeTab === 'drive' ? 'Aurora Drive' : 'Apps & Reports'} sources...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                  />
                </div>
              )}

              {/* Active Tab Body Content */}
              {activeTab === 'website' ? (
                <form onSubmit={handleImportAction} className="border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 space-y-5 bg-zinc-50/50 dark:bg-zinc-950/50">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      <Globe size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Add Website or Online Documentation Link</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Ground solution architecture on external web specs, API guides, or online documentation pages.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                        <Link2 size={13} className="text-sky-500" /> Website URL <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        value={webUrl}
                        onChange={(e) => setWebUrl(e.target.value)}
                        placeholder="https://docs.stripe.com/api or https://en.wikipedia.org/wiki/..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-sky-500 transition-all shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Source Name / Title <span className="text-zinc-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={webTitle}
                        onChange={(e) => setWebTitle(e.target.value)}
                        placeholder="e.g. Stripe API Integration Reference"
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-sky-500 transition-all shadow-xs"
                      />
                    </div>
                  </div>
                </form>
              ) : activeTab === 'upload' ? (
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-4 hover:border-indigo-500/50 transition-all bg-zinc-50/50 dark:bg-zinc-950/50 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Upload size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Upload Specification Documents</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      Drag and drop your local DOCX, PDF, PNG wireframes, TXT, or JSON files.
                    </p>
                  </div>
                  <label className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer">
                    <span>Browse Local Files</span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".docx,.doc,.pdf,.png,.jpg,.jpeg,.txt,.md,.json"
                      onChange={(e) => {
                        if (e.target.files) {
                          onAddLocalFiles(e.target.files);
                          onClose();
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    let items: AppContextItem[] = [];
                    if (activeTab === 'kb') items = kbArticles;
                    else if (activeTab === 'drive') items = driveDocs;
                    else items = appSources;

                    const filtered = items.filter(item => 
                      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.typeLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.content.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 text-zinc-400 text-xs">
                          No context items found for "{searchQuery}".
                        </div>
                      );
                    }

                    return filtered.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItem(item.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-zinc-900 dark:text-white shadow-sm'
                              : 'bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-500/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl border shrink-0 ${
                              isSelected
                                ? 'bg-indigo-500 text-white border-indigo-500'
                                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
                            }`}>
                              {activeTab === 'kb' ? <BookOpen size={18} /> : activeTab === 'drive' ? <HardDrive size={18} /> : <BarChart2 size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{item.title}</h4>
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  {item.typeLabel}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
                                {item.content}
                              </p>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
                          }`}>
                            {isSelected && <Check size={13} />}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          {activeTab !== 'upload' && (
            <div className="px-8 py-4 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between relative z-10 bg-white/80 dark:bg-zinc-900/80 shrink-0">
              <span className="text-xs font-bold text-zinc-500">
                {activeTab === 'website'
                  ? (webUrl.trim() ? '1 web link ready' : '0 item(s) selected')
                  : `${selectedItemIds.length} item(s) selected`}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleImportAction()}
                  disabled={activeTab === 'website' ? !webUrl.trim() : selectedItemIds.length === 0}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Import</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

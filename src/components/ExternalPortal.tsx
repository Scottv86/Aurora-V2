import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  CloudUpload,
  FileText,
  Search,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const ExternalPortal = () => {
  const [view, setView] = useState<'SUBMIT' | 'TRACK'>('SUBMIT');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    type: 'Community Grant Application',
    description: ''
  });

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email || !formData.description) return;
    
    setIsSubmitting(true);
    const caseId = `C-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      // NOTE: Firestore case submission removed.
      // In the future, this should call a public API endpoint.
      console.log(`[ExternalPortal] Submitting case ${caseId}`, formData);
      
      // Artificial delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmittedId(caseId);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Submission Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 selection:bg-indigo-500/30">
      <nav className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">Acme Portal</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('SUBMIT')}
            className={cn("text-sm font-medium transition-colors", view === 'SUBMIT' ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
          >
            New Submission
          </button>
          <button 
            onClick={() => setView('TRACK')}
            className={cn("text-sm font-medium transition-colors", view === 'TRACK' ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
          >
            Track Status
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-16 px-6">
        <AnimatePresence mode="wait">
          {view === 'SUBMIT' ? (
            !isSubmitted ? (
              <motion.div 
                key="submit"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Submit a Request</h1>
                  <p className="text-zinc-500 dark:text-zinc-400 text-lg">Provide the details below and our team (assisted by Aurora AI) will process your request.</p>
                </div>

                <div className="space-y-8 p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                      <input 
                        type="text" 
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Request Type</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                    >
                      <option>Community Grant Application</option>
                      <option>Service Maintenance Request</option>
                      <option>Business License Renewal</option>
                      <option>General Enquiry</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full h-32 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Supporting Documents</label>
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group">
                      <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <CloudUpload size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Click to upload or drag and drop</p>
                        <p className="text-xs text-zinc-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Submit Request</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Request Submitted!</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">Your request has been received and assigned ID <span className="text-zinc-900 dark:text-white font-bold">{submittedId}</span>. You can track its progress using this ID.</p>
                </div>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-700 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Submit Another
                  </button>
                  <button 
                    onClick={() => setView('TRACK')}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
                  >
                    Track Status
                  </button>
                </div>
              </motion.div>
            )
          ) : (
            <motion.div 
              key="track"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Track your Request</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">Enter your reference ID to see the current status and history.</p>
              </div>

              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="e.g. C-1084" 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">
                  Track
                </button>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recent Requests</h3>
                {[
                  { id: 'C-1001', title: 'Community Grant Application', status: 'In Review', date: '2 days ago' },
                  { id: 'C-0982', title: 'Street Light Maintenance', status: 'Completed', date: '1 week ago' },
                ].map((req, i) => (
                  <div key={i} className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{req.title}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{req.id} • {req.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", 
                        req.status === 'Completed' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {req.status}
                      </span>
                      <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-700" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

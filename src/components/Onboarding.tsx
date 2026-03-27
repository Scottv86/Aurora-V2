import { 
  Sparkles, 
  Globe, 
  Layers, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  ChevronLeft,
  Building2,
  Briefcase,
  Users,
  CloudUpload,
  Cpu,
  LayoutDashboard
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const INDUSTRIES = [
  { id: 'gov', name: 'Government & Public Sector', icon: Building2 },
  { id: 'fin', name: 'Financial Services', icon: Briefcase },
  { id: 'edu', name: 'Education & Training', icon: Users },
  { id: 'health', name: 'Healthcare & Wellness', icon: HeartPulse },
  { id: 'retail', name: 'Retail & Commerce', icon: ShoppingBag },
  { id: 'pro', name: 'Professional Services', icon: Briefcase },
];

function HeartPulse(props: any) {
  return <Users {...props} />;
}
function ShoppingBag(props: any) {
  return <Users {...props} />;
}

export const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    industry: '',
    description: ''
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleComplete = async () => {
    setIsSubmitting(true);
    const tenantId = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-');
    
    try {
      await setDoc(doc(db, 'tenants', tenantId), {
        id: tenantId,
        name: formData.name,
        slug: tenantId,
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        industry: formData.industry,
        description: formData.description,
        createdAt: serverTimestamp(),
        environments: ['DEV', 'PROD'],
        currentEnvironment: 'DEV',
        ownerId: auth.currentUser?.uid
      });
      
      navigate('/workspace');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenantId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
      <div className="w-full max-w-2xl space-y-12">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Aurora</span>
        </div>

        <div className="flex items-center justify-between px-12 relative">
          <div className="absolute left-12 right-12 top-1/2 -translate-y-1/2 h-[1px] bg-zinc-200 dark:bg-zinc-800 z-0" />
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 border transition-all duration-300",
                step === s ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-110" :
                step > s ? "bg-emerald-500 border-emerald-400 text-white" :
                "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
              )}
            >
              {step > s ? <CheckCircle2 size={16} /> : s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Welcome to Aurora</h2>
                <p className="text-zinc-500 dark:text-zinc-400">Let's set up your new business operating workspace.</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Workspace Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Corp" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Workspace Slug</label>
                  <div className="flex items-center">
                    <input 
                      type="text" 
                      placeholder="acme" 
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value})}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-l-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 border-l-0 rounded-r-xl px-4 py-3 text-zinc-500 text-sm font-medium">
                      .aurora.app
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={nextStep}
                disabled={!formData.name || !formData.slug}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Select your Industry</h2>
                <p className="text-zinc-500 dark:text-zinc-400">We'll recommend modules and workflows based on your sector.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => setFormData({...formData, industry: ind.id})}
                    className={cn(
                      "p-6 rounded-2xl border transition-all text-left group",
                      formData.industry === ind.id 
                        ? "bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500" 
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                      formData.industry === ind.id ? "bg-indigo-600 text-white" : "bg-white dark:bg-zinc-950 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                    )}>
                      <ind.icon size={20} />
                    </div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{ind.name}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={prevStep}
                  className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-xl font-bold hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={nextStep}
                  disabled={!formData.industry}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">AI-Assisted Setup</h2>
                <p className="text-zinc-500 dark:text-zinc-400">Describe your core business process or upload requirements.</p>
              </div>
              <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-6">
                <textarea 
                  placeholder="Describe how you want to run your business..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full h-40 bg-transparent text-lg text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed"
                />
                <div className="flex items-center gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                    <CloudUpload size={18} />
                    <span>Upload Requirements</span>
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={prevStep}
                  className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-xl font-bold hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={nextStep}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
                >
                  Generate Solution
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Ready to Launch</h2>
                <p className="text-zinc-500 dark:text-zinc-400">We've architected your workspace. Review the components below.</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { name: 'Core CRM Suite', type: 'Capability Suite', icon: Users },
                  { name: 'Service Requests', type: 'Module', icon: Globe },
                  { name: 'Intake Workflow', type: 'Process', icon: Zap },
                  { name: 'Customer Portal', type: 'Portal', icon: LayoutDashboard },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{item.type}</p>
                      </div>
                    </div>
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  </div>
                ))}
              </div>
              <button 
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Launch Workspace</span>
                    <Sparkles size={18} />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

import { 
  Sparkles, 
  Cpu, 
  CloudUpload, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Workflow,
  Layers,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generateSolution, AISolution } from '../services/aiService';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export const AIBuilder = () => {
  const { tenant } = usePlatform();
  const { user, session } = useAuth();
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [result, setResult] = useState<AISolution | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  
  useEffect(() => {
    if (retryCountdown <= 0) return;
    
    const timer = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [retryCountdown > 0]);
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
      return;
    }

    setIsGenerating(true);
    try {
      const solution = await generateSolution(prompt);
      setResult(solution);
      setStep(2);
    } catch (error: any) {
      console.error("AI Generation Error (Raw):", error);
      
      const errorMsg = error?.message || "";
      const isQuotaError = errorMsg.toLowerCase().includes("429") || 
                          errorMsg.toLowerCase().includes("resource_exhausted") || 
                          errorMsg.toLowerCase().includes("quota");

      if (isQuotaError) {
        const match = errorMsg.match(/retry in ([\d.]+)/i);
        const delay = match ? Math.ceil(parseFloat(match[1])) + 2 : 62;
        
        setRetryCountdown(delay);
        toast.error(`AI Quota reached. Please wait ${delay}s for the next request.`, {
          description: "Free tier models have strict limits. Your countdown is active.",
          duration: 5000,
        });
      } else {
        const message = errorMsg || "Failed to generate solution. Please try again.";
        toast.error(message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!result || !tenant?.id || !user) return;
    setIsDeploying(true);
    
    try {
      console.log("AI Builder: Deployment requested for", result);
      
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

      // Deploy each module defined in the AI result
      const promises = result.modules.map(async (m: any) => {
        const payload = {
          name: m.name,
          category: 'Custom',
          iconName: 'Box',
          type: 'RECORD',
          layout: m.layout || [],
          // Convert simpler AI steps to a more formal structure if needed
          workflows: result.workflows
            .filter((wf: any) => wf.modules?.includes(m.name) || !wf.modules) // Attach if specified
            .map((wf: any) => ({
              id: `wf-${Math.random().toString(36).substring(7)}`,
              name: wf.name,
              steps: wf.steps.map((s: string) => ({ id: `step-${Math.random().toString(36).substring(7)}`, label: s, type: 'status' }))
            }))
        };

        const response = await fetch('http://localhost:3001/api/data/modules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Failed to deploy module: ${m.name}`);
        }

        return response.json();
      });

      await Promise.all(promises);

      toast.success("Solution architected and deployed successfully!");
      setStep(3);
      setPrompt('');
      setResult(null);
    } catch (error: any) {
      console.error("AI Deployment Error:", error);
      toast.error(error.message || "Failed to deploy solution.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest">
          <Sparkles size={14} />
          <span>AI-Native Solution Builder</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">What are you building today?</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          Describe your business process, upload requirements, or paste a legacy form. Aurora will architect the modules, workflows, and logic for you.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl dark:shadow-none relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-zinc-900 dark:text-white">
                <Cpu size={200} />
              </div>
              
              <textarea 
                placeholder="e.g. I need a system to manage citizen grant applications. It needs a public portal for submissions, an internal review process with three approval stages, and automated email notifications..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-48 bg-transparent text-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed"
              />

              <div className="mt-8 flex items-center justify-between pt-8 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm dark:shadow-none">
                    <CloudUpload size={18} />
                    <span>Upload Docs</span>
                  </button>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600 font-medium italic">Supports PDF, DOCX, CSV, Images</span>
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={!prompt || isGenerating || retryCountdown > 0}
                  className={cn(
                    "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-xl",
                    prompt && !isGenerating && retryCountdown === 0
                      ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20" 
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Architecting...</span>
                    </>
                  ) : retryCountdown > 0 ? (
                    <>
                      <span>Retry in {retryCountdown}s</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Solution</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                "Grant Management System",
                "Employee Onboarding Flow",
                "Customer Support Desk"
              ].map((template, i) => (
                <button 
                  key={i}
                  onClick={() => setPrompt(`I need a ${template.toLowerCase()}...`)}
                  className="p-4 bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-left hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all group shadow-sm dark:shadow-none"
                >
                  <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Template</p>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{template}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ) : step === 2 ? (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-8 shadow-xl dark:shadow-none relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative flex items-start gap-4 p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                <Sparkles className="text-indigo-600 dark:text-indigo-400 shrink-0" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">AI Recommendation</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed font-medium">{result?.reasoning}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Layers size={14} />
                      Suggested Modules
                    </h4>
                    <div className="space-y-4">
                      {result?.modules.map((m: any, i: number) => (
                        <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-500" />
                            <div className="flex-1">
                              <span className="text-sm font-bold text-zinc-900 dark:text-white block">{m.name}</span>
                              {m.isCustom && (
                                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Custom Module</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {m.layout?.flatMap((row: any) => row.columns.flatMap((col: any) => col.fields)).map((f: any, j: number) => (
                              <span key={j} className="text-[9px] px-1.5 py-0.5 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
                                {f.label} ({f.type})
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Workflow size={14} />
                      Workflows
                    </h4>
                    <div className="space-y-3">
                      {result?.workflows.map((wf: any, i: number) => (
                        <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-2">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">{wf.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {wf.steps.map((s: string, j: number) => (
                              <div key={j} className="flex items-center gap-2">
                                <span className="text-[10px] font-medium px-2 py-0.5 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">{s}</span>
                                {j < wf.steps.length - 1 && <ArrowRight size={10} className="text-zinc-300 dark:text-zinc-700" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Zap size={14} />
                      Automations
                    </h4>
                    <div className="space-y-3">
                      {result?.automations.map((auto: any, i: number) => (
                        <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                            <span>{auto.trigger}</span>
                            <ChevronRight size={10} />
                            <span>{auto.action}</span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{auto.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-6 left-0 right-0 z-50 mt-8">
              <div className="mx-auto max-w-2xl px-4">
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="text-sm font-bold text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors px-4"
                  >
                    Back
                  </button>
                  <div className="flex gap-3">
                    <button className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                      Customize
                    </button>
                    <button 
                      onClick={handleDeploy}
                      disabled={isDeploying}
                      className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isDeploying ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Deploying...</span>
                        </>
                      ) : (
                        <>
                          <span>Deploy to Workspace</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 space-y-8 text-center"
          >
            <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-500">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Deployment Successful!</h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Your new solution has been architected and deployed. You can now access your new modules and workflows from the sidebar.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setStep(1)}
                className="px-8 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm dark:shadow-none"
              >
                Build Something Else
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

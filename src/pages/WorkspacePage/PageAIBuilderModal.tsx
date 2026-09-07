import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Cpu, X, ArrowRight } from 'lucide-react';
import { Button } from '../../components/UI/Primitives';
import { executeServerCompletion } from '../../services/aiService';
import { PLATFORM_MODULES } from '../../config/platformModules';
import { toast } from 'sonner';

interface PageAIBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLayoutGenerated: (widgets: any[]) => void;
  modules: any[];
}

export const PageAIBuilderModal = ({ isOpen, onClose, onLayoutGenerated, modules }: PageAIBuilderModalProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      // Catalog of modules present in the system
      const moduleCatalog = modules
        .filter((m: any) => {
          if (m.type === 'PAGE') return false;
          const isPlatform = PLATFORM_MODULES.some(pm => pm.id === m.id || pm.id === m.templateId || pm.name === m.name || pm.slug === m.templateId);
          if (isPlatform) return false;
          if (m.isGlobal || m.isIntakeTriage || m.config?.isIntakeTriage) return false;
          return true;
        })
        .map((m: any) => ({ id: m.id, name: m.name, category: m.category }));

      const systemInstruction = `You are Aurora AI, the visual builder assistant for a business workspace platform.
A user wants to design a workspace dashboard/page layouts for: "${prompt}".

The workspace contains the following data modules (use their exact IDs if you reference them in widgets):
${JSON.stringify(moduleCatalog, null, 2)}

Recommend a grid layout consisting of widgets.
Widget types allowed:
- "stats-grid": Displays overview statistics of cases and workloads. Width (w) should be 12.
- "active-workflows": Renders progress summaries of active workflows. Width (w) should be 12.
- "work-queue": Renders the user's personal actionable inbox list. Width (w) should be 12.
- "module-table": Renders a data list for a chosen custom module. Must include "moduleId" in properties. Width (w) can be 6, 8, or 12.
- "module-creator": Renders a form to submit entries to a chosen custom module. Must include "moduleId" in properties. Width (w) can be 6 or 12.
- "rich-text": Displays styled noticeboard text. Must include "content" (HTML string) in properties. Width (w) can be 6 or 12.
- "chart": Renders line/bar volume chart of record creation rates. Must include "moduleId" and "chartType" ("bar" or "line") in properties. Width (w) can be 6 or 12.

Arrange the layout cleanly, putting widgets next to each other by setting their widths (w) logically (e.g. two half-width widgets "w: 6" side-by-side).

Provide your response strictly in structured JSON format with a root "widgets" array.`;

      const responseText = await executeServerCompletion(
        `Generate page layout for: "${prompt}"`,
        systemInstruction,
        'application/json',
        'gemini-2.5-flash',
        'ai:page_builder'
      );

      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.widgets) && parsed.widgets.length > 0) {
        const cleanWidgets = parsed.widgets.map((w: any) => ({
          ...w,
          id: `${w.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
        }));
        onLayoutGenerated(cleanWidgets);
        setPrompt('');
        toast.success("AI generated page layout successfully!");
        onClose();
      } else {
        toast.error("Could not parse layout from AI response. Please try again.");
      }
    } catch (err: any) {
      console.error("AI Page generation error:", err);
      toast.error(err.message || "Failed to generate page layout.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-indigo-500" />
                AI Page Layout Architect
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Describe how you want this workspace page structured. Tell us what lists, charts, noticeboards, or stats you want to display, and Aurora AI will arrange the grid layout.
              </p>

              <textarea
                placeholder="e.g. I need a citizen dashboard showing summary metrics, a side-by-side split layout with a support ticket submission form on the left, and a list of active support tickets on the right, followed by a volume chart showing ticket filings."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                disabled={isGenerating}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isGenerating}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerate} 
                  loading={isGenerating}
                  disabled={!prompt.trim() || isGenerating}
                  className="gap-2 shadow-lg shadow-indigo-500/10 font-bold"
                >
                  <Cpu size={14} />
                  <span>Generate Layout</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

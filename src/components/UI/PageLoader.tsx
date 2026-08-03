import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface PageLoaderProps {
  label?: string;
  fullscreen?: boolean;
  className?: string;
}

export const PageLoader = ({ label = "Loading", fullscreen = true, className }: PageLoaderProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300",
      fullscreen 
        ? "fixed inset-0 z-[100] bg-zinc-50/80 dark:bg-zinc-950/85 backdrop-blur-xl" 
        : "w-full min-h-[320px] p-8 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md",
      className
    )}>
      <div className="relative flex flex-col items-center gap-5 z-10">
        {/* Animated Dual Rings */}
        <div className="relative w-14 h-14">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-3 border-indigo-500/15 border-t-indigo-600 dark:border-t-indigo-400 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border-3 border-teal-500/15 border-t-teal-500 dark:border-t-teal-400 rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [0.95, 1.15, 0.95],
              opacity: [0.25, 0.55, 0.25]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-3 bg-gradient-to-tr from-indigo-500/20 to-teal-500/20 rounded-full blur-md"
          />
        </div>

        {label && (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.2em] animate-pulse">
              {label}
            </p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                  className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

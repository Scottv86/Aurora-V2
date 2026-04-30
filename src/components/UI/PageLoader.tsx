import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface PageLoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export const PageLoader = ({ label = "Loading", fullscreen = true }: PageLoaderProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center relative overflow-hidden",
      fullscreen ? "fixed inset-0 z-[100] bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl" : "h-full w-full p-12"
    )}>
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated Rings */}
        <div className="relative w-16 h-16">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border-4 border-teal-500/10 border-t-teal-500 rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-4 bg-indigo-500/20 rounded-full blur-md"
          />
        </div>

        {label && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
              {label}
            </p>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-1 h-1 bg-indigo-500 rounded-full"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

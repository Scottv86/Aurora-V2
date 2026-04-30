import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({ 
  className, 
  variant = 'rectangular', 
  width, 
  height 
}: SkeletonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={cn(
        "relative overflow-hidden bg-zinc-200 dark:bg-zinc-800/50",
        {
          "h-4 w-full": variant === 'text',
          "rounded-full": variant === 'circular',
          "rounded-2xl": variant === 'rounded',
        },
        className
      )}
      style={{ width, height }}
    >
      <motion.div 
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent"
      />
    </motion.div>
  );
};

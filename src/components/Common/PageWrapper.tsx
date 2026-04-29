import { ReactNode } from 'react';
import { motion } from 'motion/react';

const pageVariants = {
  initial: {
    opacity: 1, // Keep parent opaque to avoid compounding opacity issues
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const itemVariants = {
  initial: { opacity: 1, y: 0, scale: 1 }, 
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0
    }
  }
};

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export const PageWrapper = ({ children, className }: PageWrapperProps) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
};

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface AuroraModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  drawer?: boolean;
  closeOnBackdropClick?: boolean;
}

/**
 * AuroraModal provides a centralized, portal-backed modal and drawer dialog
 * ensuring that modals always pop over the entire viewport (including headers,
 * sidebars, and nested navigation shells) with the signature Aurora spring animation.
 */
export const AuroraModal: React.FC<AuroraModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  containerClassName,
  drawer = false,
  closeOnBackdropClick = true,
}) => {
  // Prevent body scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[9999]",
            drawer
              ? "flex justify-end overflow-hidden"
              : "flex items-center justify-center p-4 sm:p-6 overflow-y-auto",
            containerClassName
          )}
        >
          {/* Aurora Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md cursor-pointer"
          />

          {/* Modal / Drawer Animated Card */}
          <motion.div
            initial={
              drawer
                ? { opacity: 0, x: '100%' }
                : { opacity: 0, scale: 0.95, y: 15 }
            }
            animate={
              drawer
                ? { opacity: 1, x: 0 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              drawer
                ? { opacity: 0, x: '100%' }
                : { opacity: 0, scale: 0.95, y: 15 }
            }
            transition={{
              type: 'spring',
              damping: drawer ? 28 : 25,
              stiffness: 300,
            }}
            className={cn(
              "relative z-10",
              drawer
                ? "h-full w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
                : "w-full overflow-hidden shadow-2xl",
              className
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AuroraModal;

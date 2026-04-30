import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const TransitionBar = () => {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start navigation progress
    setIsNavigating(true);
    setProgress(30);

    const timer = setTimeout(() => {
      setProgress(100);
      const finishTimer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(finishTimer);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none overflow-hidden"
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{
              width: { duration: 0.5, ease: "easeOut" },
              opacity: { duration: 0.2 }
            }}
            className="h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          >
            {/* Glowing lead edge */}
            <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-r from-transparent to-white/30 blur-sm" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

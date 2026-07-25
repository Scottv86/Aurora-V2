import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CarouselItem {
  id: string;
  url: string;
  caption?: string;
  title?: string;
}

export interface MediaCarouselProps {
  items: CarouselItem[];
  title?: string;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({ items, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeLightbox, setActiveLightbox] = useState<CarouselItem | null>(null);

  if (!items || items.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const currentItem = items[currentIndex];

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/80 shadow-lg backdrop-blur-md">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-indigo-400" />
            {title}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {currentIndex + 1} / {items.length}
          </span>
        </div>
      )}

      {/* Slide Container */}
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-slate-950">
        <img
          src={currentItem.url}
          alt={currentItem.caption || 'Carousel slide'}
          className="max-h-full max-w-full object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
          onClick={() => setActiveLightbox(currentItem)}
        />

        {/* Lightbox Zoom Trigger */}
        <button
          onClick={() => setActiveLightbox(currentItem)}
          className="absolute right-3 top-3 rounded-lg bg-slate-900/70 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white backdrop-blur-md"
          title="Fullscreen preview"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 rounded-full bg-slate-900/80 p-2 text-slate-300 hover:bg-slate-800 hover:text-white backdrop-blur-md transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 rounded-full bg-slate-900/80 p-2 text-slate-300 hover:bg-slate-800 hover:text-white backdrop-blur-md transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Caption & Indicators */}
      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2.5 bg-slate-900/60">
        <p className="text-xs text-slate-300 truncate">
          {currentItem.title && <span className="font-semibold text-indigo-300 mr-2">{currentItem.title}:</span>}
          {currentItem.caption || `Slide ${currentIndex + 1}`}
        </p>

        {/* Bullet indicators */}
        {items.length > 1 && (
          <div className="flex items-center gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-4 bg-indigo-500' : 'w-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {activeLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setActiveLightbox(null)}
          >
            <button
              onClick={() => setActiveLightbox(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activeLightbox.url}
              alt={activeLightbox.caption || 'Lightbox view'}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Eraser, Download, Check } from 'lucide-react';

interface SignaturePadProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.strokeStyle = '#6366f1';
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        setCtx(context);
      }

      // Handle resize
      const handleResize = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // Re-apply context settings after resize
        if (context) {
          context.strokeStyle = '#6366f1';
          context.lineWidth = 2;
          context.lineCap = 'round';
          context.lineJoin = 'round';
        }
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx?.lineTo(pos.x, pos.y);
    ctx?.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL());
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clear = () => {
    if (canvasRef.current && ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      onChange('');
    }
  };

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col",
      className
    )}>
      <div className="flex-1 min-h-[200px] relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full"
        />
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Sign here</span>
          </div>
        )}
      </div>

      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <button
          onClick={clear}
          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all uppercase tracking-widest"
        >
          <Eraser size={12} />
          Clear
        </button>
        <div className="flex items-center gap-2">
          {value && <Check size={14} className="text-emerald-500" />}
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {value ? 'Signature Captured' : 'Pending Signature'}
          </span>
        </div>
      </div>
    </div>
  );
};

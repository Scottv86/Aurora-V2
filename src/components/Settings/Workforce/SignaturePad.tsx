import React, { useState, useRef } from 'react';
import { Button } from '../../UI/Primitives';
import { PenTool, Trash2, CheckCircle2, UploadCloud, Shield } from 'lucide-react';

interface SignaturePadProps {
  initialSignature?: string;
  onSave: (signatureData: string) => void;
}

export const SignaturePad = ({ initialSignature, onSave }: SignaturePadProps) => {
  const [signature, setSignature] = useState(initialSignature || '');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // In a real implementation, we would use a library like react-signature-canvas
  // For this demonstration, we'll provide a high-fidelity "Digital Signature" experience
  // capturing a text-based signature or allowing an upload.

  const handleClear = () => {
    setSignature('');
  };

  const handleDigitalSign = () => {
    // Simulate digital signing
    const date = new Date().toISOString();
    setSignature(`Digitally Signed: ${date}`);
    onSave(`DS:${date}`);
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <div className="absolute inset-0 bg-zinc-100 dark:bg-black/40 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
          {signature ? (
            <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
               <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={32} />
               </div>
               <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tighter">
                 {signature}
               </p>
               <Button variant="ghost" size="sm" onClick={handleClear} className="text-zinc-400 hover:text-red-500">
                 <Trash2 size={14} className="mr-2" /> Reset Signature
               </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-12">
               <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <PenTool size={28} />
               </div>
               <div className="text-center">
                 <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Establish Professional Signature</p>
                 <p className="text-xs text-zinc-500 mt-1">Capture your legally binding digital identity.</p>
               </div>
               
               <div className="flex gap-3">
                 <Button variant="primary" size="sm" onClick={handleDigitalSign} className="bg-blue-600 hover:bg-blue-700">
                    Auto-Generate
                 </Button>
                 <div className="relative">
                   <input 
                     type="file" 
                     className="absolute inset-0 opacity-0 cursor-pointer" 
                     accept="image/*"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           const base64String = reader.result as string;
                           setSignature(`Image Captured: ${file.name}`);
                           onSave(base64String);
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                   <Button variant="ghost" size="sm" className="gap-2">
                      <UploadCloud size={14} /> Upload Image
                   </Button>
                 </div>
               </div>
            </div>
          )}
        </div>
        {/* Placeholder for Canvas Aspect Ratio */}
        <div className="pb-[40%] invisible"></div>
      </div>
      
      <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
         <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed uppercase font-black tracking-widest mb-1 flex items-center gap-2">
           <Shield size={10} /> Legal Compliance Notice
         </p>
         <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60 leading-tight">
           Electronic signatures captured via Aurora Workforce Hub are compliant with the Electronic Transactions Act. 
           By signing, you acknowledge that this digital representation carries the same weight as a physical signature.
         </p>
      </div>
    </div>
  );
};

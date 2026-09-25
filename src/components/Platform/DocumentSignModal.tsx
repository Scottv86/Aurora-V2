import React, { useState, useRef } from 'react';
import { 
  FileCheck, 
  X, 
  PenTool, 
  Type, 
  Stamp, 
  ShieldCheck, 
  RotateCcw, 
  Loader2,
  Lock
} from 'lucide-react';
import { UniversalDocument } from '../../types/document';
import { DocumentClientService } from '../../services/documentClientService';
import { toast } from 'sonner';

interface DocumentSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UniversalDocument;
  onSigned: (updatedDoc: UniversalDocument) => void;
}

export const DocumentSignModal: React.FC<DocumentSignModalProps> = ({
  isOpen,
  onClose,
  document,
  onSigned
}) => {
  const [tab, setTab] = useState<'DRAW' | 'TYPE' | 'STAMP'>('DRAW');
  const [signerName, setSignerName] = useState('Sarah Jenkins');
  const [signerEmail, setSignerEmail] = useState('s.jenkins@acme.corp');
  const [typedSignature, setTypedSignature] = useState('Sarah Jenkins');
  const [note, setNote] = useState('Approved and verified for execution');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleApplySignature = async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error('Signer name and email are required');
      return;
    }

    let dataUrl: string | undefined;
    if (tab === 'DRAW') {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        dataUrl = canvas.toDataURL('image/png');
      }
    }

    try {
      setIsSubmitting(true);
      const updated = await DocumentClientService.signDocument(document.id, {
        signatureType: tab,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        signatureDataUrl: dataUrl,
        note: note.trim()
      });

      toast.success('Document digitally signed and locked');
      onSigned(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Signing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/60">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                Sign & Authorise File
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                  Immutable
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {document.name} • Applies cryptographic tamper-evident seal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setTab('DRAW')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'DRAW'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Draw Signature
          </button>
          <button
            onClick={() => setTab('TYPE')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'TYPE'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Type Signature
          </button>
          <button
            onClick={() => setTab('STAMP')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'STAMP'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            Official Stamp
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Signer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Signer Full Name
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => {
                  setSignerName(e.target.value);
                  setTypedSignature(e.target.value);
                }}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Signer Email
              </label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Interactive Pad by Mode */}
          {tab === 'DRAW' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Draw with mouse / stylus:</span>
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <RotateCcw className="w-3 h-3" /> Clear Pad
                </button>
              </div>
              <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-950 p-1 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="bg-white dark:bg-zinc-900 rounded-lg cursor-crosshair shadow-inner"
                />
              </div>
            </div>
          )}

          {tab === 'TYPE' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Cursive Typography Preview
              </label>
              <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-950 text-center">
                <span className="text-2xl font-serif italic text-indigo-700 dark:text-indigo-400 font-semibold tracking-wide">
                  {typedSignature || 'Signature Preview'}
                </span>
                <p className="text-[10px] text-zinc-400 mt-2">
                  Legally recognized digitized electronic representation
                </p>
              </div>
            </div>
          )}

          {tab === 'STAMP' && (
            <div className="p-4 border border-emerald-200 dark:border-emerald-800/60 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-emerald-500 flex flex-col items-center justify-center text-emerald-700 dark:text-emerald-300 text-center leading-tight">
                <Stamp className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] font-bold uppercase">APPROVED</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Corporate Verification & Approval Seal
                </h4>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Applies tenant executive authority stamp with ISO 15489 compliant audit logging.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Approval Attestation Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Cryptographic Compliance Callout */}
          <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
              Signing produces a new immutable revision <span className="font-mono text-zinc-900 dark:text-white font-semibold">v{(document.versions?.[0]?.versionNumber || 1) + 1}</span> stamped with a SHA-256 seal and records the signer's credentials permanently.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleApplySignature}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            Stamp & Lock Document
          </button>
        </div>
      </div>
    </div>
  );
};

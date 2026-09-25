import React, { useState } from 'react';
import { 
  MessageSquare, 
  CheckCircle2, 
  Send, 
  X, 
  Check, 
  CornerDownRight, 
  AlertCircle 
} from 'lucide-react';
import { DocumentAnnotation, UniversalDocument } from '../../types/document';
import { DocumentClientService } from '../../services/documentClientService';
import { toast } from 'sonner';

interface DocumentAnnotationsOverlayProps {
  document: UniversalDocument;
  isAnnotating: boolean;
  onAnnotationAdded: (updatedDoc: UniversalDocument) => void;
  scale?: number;
}

export const DocumentAnnotationsOverlay: React.FC<DocumentAnnotationsOverlayProps> = ({
  document,
  isAnnotating,
  onAnnotationAdded,
  scale = 1
}) => {
  const annotations: DocumentAnnotation[] = (document.aiMetadata as any)?.annotations || [];
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [newPinDraft, setNewPinDraft] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    setNewPinDraft({ xPercent, yPercent });
    setActivePinId(null);
    setCommentText('');
  };

  const handleCreateAnnotation = async () => {
    if (!newPinDraft || !commentText.trim()) return;

    try {
      setIsSubmitting(true);
      const newAnn = await DocumentClientService.addAnnotation(document.id, {
        xPercent: newPinDraft.xPercent,
        yPercent: newPinDraft.yPercent,
        comment: commentText.trim(),
        authorName: 'Reviewer'
      });

      const updatedAnnotations = [...annotations, newAnn];
      const updatedDoc: UniversalDocument = {
        ...document,
        aiMetadata: {
          ...document.aiMetadata,
          annotations: updatedAnnotations
        }
      };

      onAnnotationAdded(updatedDoc);
      setNewPinDraft(null);
      setCommentText('');
      toast.success('Pin annotation placed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add annotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleResolve = async (annotationId: string, currentResolved: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await DocumentClientService.resolveAnnotation(document.id, annotationId, !currentResolved);
      const updatedAnnotations = annotations.map(a => 
        a.id === annotationId ? { ...a, isResolved: !currentResolved } : a
      );
      const updatedDoc: UniversalDocument = {
        ...document,
        aiMetadata: {
          ...document.aiMetadata,
          annotations: updatedAnnotations
        }
      };
      onAnnotationAdded(updatedDoc);
      toast.success(!currentResolved ? 'Annotation resolved' : 'Annotation reopened');
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div 
      className={`absolute inset-0 z-20 ${isAnnotating ? 'cursor-crosshair' : 'pointer-events-none'}`}
      onClick={handleCanvasClick}
    >
      {/* Existing Pins */}
      {annotations.map((ann, idx) => {
        const isSelected = activePinId === ann.id;
        const initialComment = ann.comments[0]?.content || '';
        const author = ann.comments[0]?.authorName || 'Reviewer';
        const isResolved = ann.isResolved;

        return (
          <div
            key={ann.id}
            style={{
              left: `${ann.xPercent}%`,
              top: `${ann.yPercent}%`,
              transform: 'translate(-50%, -50%)'
            }}
            className="absolute pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              setActivePinId(isSelected ? null : ann.id);
              setNewPinDraft(null);
            }}
          >
            {/* Marker Pin */}
            <button
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shadow-lg transition-transform hover:scale-110 ${
                isResolved
                  ? 'bg-zinc-400 text-white border-2 border-white dark:border-zinc-900 opacity-60'
                  : 'bg-indigo-600 text-white border-2 border-white dark:border-zinc-900 ring-2 ring-indigo-400/50'
              }`}
            >
              {isResolved ? <Check className="w-3.5 h-3.5" /> : idx + 1}
            </button>

            {/* Popover Card */}
            {isSelected && (
              <div 
                className="absolute z-30 left-1/2 -translate-x-1/2 top-9 w-64 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center">
                      {author.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      {author}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleToggleResolve(ann.id, isResolved, e)}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                        isResolved
                          ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      {isResolved ? 'Reopen' : 'Resolve'}
                    </button>
                    <button
                      onClick={() => setActivePinId(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {initialComment}
                </p>

                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                  <span>{isResolved ? '✓ Resolved' : 'Open Thread'}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* New Pin Draft Popover */}
      {newPinDraft && (
        <div
          style={{
            left: `${newPinDraft.xPercent}%`,
            top: `${newPinDraft.yPercent}%`,
            transform: 'translate(-50%, -50%)'
          }}
          className="absolute z-30 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-lg animate-bounce">
            +
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 top-9 w-64 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                Add Pin Note
              </span>
              <button 
                onClick={() => setNewPinDraft(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              autoFocus
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Leave feedback on this section..."
              className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />

            <div className="mt-2 flex items-center justify-end gap-1.5">
              <button
                onClick={() => setNewPinDraft(null)}
                className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAnnotation}
                disabled={!commentText.trim() || isSubmitting}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

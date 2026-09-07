import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Bold, 
  Italic, 
  Code, 
  Link2, 
  Mic, 
  X,
  FileText
} from 'lucide-react';
import { useChat } from '../../../context/ChatContext';
import { ChatAttachment } from '../../../types/chat';
import { cn } from '../../../lib/utils';

interface ChatComposerProps {
  placeholder?: string;
  parentMessageId?: string;
  autoFocus?: boolean;
}

const EMOJI_LIST = ['👍', '❤️', '🔥', '🚀', '🎉', '😂', '👀', '💯', '✨', '⚡', '🙌', '💡', '☕', '💪', '🤝', '🥳', '😎', '🙏'];

export const ChatComposer: React.FC<ChatComposerProps> = ({ 
  placeholder = 'Send a message...', 
  parentMessageId,
  autoFocus = false 
}) => {
  const { sendMessage, setTyping } = useChat();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Voice recording timer simulation
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecordingVoice]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return;

    const textToSend = content.trim();
    const attsToSend = [...attachments];

    setContent('');
    setAttachments([]);
    setShowEmojiPicker(false);
    setTyping(false);

    await sendMessage(textToSend, attsToSend, parentMessageId);
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
      }
    }, 0);
  };

  const handleAddEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ChatAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type.startsWith('image/') ? 'image' : 'file',
      size: f.size,
      mimeType: f.type
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleVoiceSend = () => {
    const voiceMsgContent = `🎙️ Voice Note (${recordingSeconds}s)`;
    setIsRecordingVoice(false);
    sendMessage(voiceMsgContent, [], parentMessageId);
  };

  return (
    <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900 relative">
      <div className="max-w-4xl mx-auto w-full">
        {/* Attachments Preview Bar */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs"
            >
              <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium text-zinc-900 dark:text-white truncate max-w-[150px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="text-zinc-400 hover:text-rose-500 rounded p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Recording Bar */}
      {isRecordingVoice ? (
        <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Recording Voice Note... ({recordingSeconds}s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecordingVoice(false)}
              className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleVoiceSend}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/20"
            >
              Send Audio
            </button>
          </div>
        </div>
      ) : (
        /* Main Composer Box */
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all overflow-hidden">
          {/* Formatting Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80 text-zinc-400 bg-zinc-50/80 dark:bg-zinc-900/60">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                title="Bold"
                className="p-1 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                title="Italic"
                className="p-1 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```typescript\n', '\n```')}
                title="Code block"
                className="p-1 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded"
              >
                <Code size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[', '](url)')}
                title="Link"
                className="p-1 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded"
              >
                <Link2 size={13} />
              </button>
            </div>

            <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">
              Return to send, Shift + Return for new line
            </span>
          </div>

          {/* Textarea */}
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={2}
              className="w-full bg-transparent text-xs text-zinc-900 dark:text-white placeholder-zinc-400 resize-none focus:outline-none custom-scrollbar"
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <div className="flex items-center gap-1 text-zinc-400 relative">
              {/* Attachment File Picker */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
                className="p-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Paperclip size={16} />
              </button>

              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Insert emoji"
                className="p-1.5 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Smile size={16} />
              </button>

              {/* Emoji Popover */}
              {showEmojiPicker && (
                <div className="absolute bottom-10 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 grid grid-cols-6 gap-1 z-50 w-64 animate-in fade-in zoom-in-95">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleAddEmoji(emoji)}
                      className="p-2 text-base hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Voice Memo Button */}
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                title="Record voice memo"
                className="p-1.5 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Mic size={16} />
              </button>
            </div>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!content.trim() && attachments.length === 0}
              className={cn(
                "px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md",
                content.trim() || attachments.length > 0
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 cursor-pointer"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none"
              )}
            >
              <span>Send</span>
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

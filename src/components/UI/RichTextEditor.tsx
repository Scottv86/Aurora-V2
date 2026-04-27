import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import { 
  Bold, Italic, List, ListOrdered, Link, 
  AlignLeft, AlignCenter, AlignRight, 
  Type, Quote, Code
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all",
      className
    )}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <ToolbarButton onClick={() => execCommand('bold')} icon={<Bold size={14} />} title="Bold" />
        <ToolbarButton onClick={() => execCommand('italic')} icon={<Italic size={14} />} title="Italic" />
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} icon={<List size={14} />} title="Bullet List" />
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} icon={<ListOrdered size={14} />} title="Numbered List" />
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <ToolbarButton onClick={() => execCommand('justifyLeft')} icon={<AlignLeft size={14} />} title="Align Left" />
        <ToolbarButton onClick={() => execCommand('justifyCenter')} icon={<AlignCenter size={14} />} title="Align Center" />
        <ToolbarButton onClick={() => execCommand('justifyRight')} icon={<AlignRight size={14} />} title="Align Right" />
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <ToolbarButton onClick={() => {
          const url = prompt('Enter URL');
          if (url) execCommand('createLink', url);
        }} icon={<Link size={14} />} title="Insert Link" />
      </div>

      {/* Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: value }}
        className="p-5 min-h-[150px] text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none prose prose-zinc dark:prose-invert max-w-none"
        placeholder={placeholder}
      />
    </div>
  );
};

const ToolbarButton = ({ onClick, icon, title }: { onClick: () => void, icon: React.ReactNode, title: string }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all"
  >
    {icon}
  </button>
);

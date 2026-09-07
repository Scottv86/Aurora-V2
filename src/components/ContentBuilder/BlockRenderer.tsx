import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { 
  Type, 
  Heading as HeadingIcon, 
  Layout, 
  PenTool, 
  Table as TableIcon, 
  AlertCircle, 
  Columns, 
  MousePointerClick, 
  Minus, 
  Quote as QuoteIcon, 
  Code as CodeIcon
} from 'lucide-react';
import { ContentBlock } from '../../types/platform';
import { getFontFamilyCSS } from './contentCompiler';
import { cn } from '../../lib/utils';

interface BlockRendererProps {
  block: ContentBlock;
  isDarkCanvas: boolean;
  globalFont: string;
  onUpdateData: (newData: Record<string, any>) => void;
  onUpdateStyles: (newStyles: Record<string, any>) => void;
  onInsertTag?: (tag: string) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  isDarkCanvas,
  globalFont,
  onUpdateData,
  onUpdateStyles,
  onInsertTag
}) => {
  const styles = block.styles || {};
  const currentFont = getFontFamilyCSS(styles.fontFamily || globalFont);

  switch (block.type) {
    case 'heading': {
      const level = block.data.level || 'h2';
      const defaultSize = level === 'h1' ? '28px' : level === 'h3' ? '18px' : '22px';
      return (
        <div 
          className="space-y-2 rounded-xl transition-all"
          style={{
            fontFamily: currentFont,
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined,
            textAlign: styles.align || 'left'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            {(['h1', 'h2', 'h3'] as const).map(h => (
              <button
                key={h}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateData({ level: h });
                  onUpdateStyles({
                    fontSize: h === 'h1' ? '28px' : h === 'h3' ? '18px' : '22px',
                    fontWeight: '700'
                  });
                }}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-colors cursor-pointer",
                  level === h 
                    ? "bg-indigo-600 text-white" 
                    : isDarkCanvas ? "bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                )}
              >
                {h.toUpperCase()}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={block.data.text || ''}
            onChange={(e) => onUpdateData({ text: e.target.value })}
            placeholder="Type heading title..."
            style={{
              fontSize: styles.fontSize || defaultSize,
              fontWeight: styles.fontWeight || '700',
              textAlign: styles.align || 'left',
              color: styles.textColor || (isDarkCanvas ? '#f4f4f5' : '#18181b'),
              fontFamily: currentFont
            }}
            className={cn(
              "w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0 font-bold",
              isDarkCanvas ? "placeholder-zinc-600" : "placeholder-zinc-400"
            )}
          />
        </div>
      );
    }

    case 'text': {
      return (
        <div 
          className={cn(
            "w-full transition-colors rounded-xl overflow-hidden content-block-quill", 
            isDarkCanvas && "quill-dark-toolbar"
          )}
          style={{
            fontFamily: currentFont,
            fontSize: styles.fontSize || '14px',
            fontWeight: styles.fontWeight || '400',
            textAlign: styles.align || 'left',
            color: styles.textColor || (isDarkCanvas ? '#f4f4f5' : '#3f3f46'),
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <ReactQuill
            theme="snow"
            value={block.data.html || ''}
            onChange={(html) => onUpdateData({ html })}
            placeholder="Write paragraph text or insert merge tags..."
            className="min-h-[120px]"
          />
        </div>
      );
    }

    case 'letterhead': {
      const accent = block.data.accentColor || '#4f46e5';
      return (
        <div 
          className="pb-4 mb-2 border-b-2 transition-colors rounded-xl"
          style={{ 
            borderColor: accent, 
            fontFamily: currentFont,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            color: styles.textColor,
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {block.data.showLogo !== false && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/30 shrink-0">
                  {block.data.companyName?.charAt(0) || 'A'}
                </div>
              )}
              <div className="space-y-1">
                <input
                  type="text"
                  value={block.data.companyName || ''}
                  onChange={(e) => onUpdateData({ companyName: e.target.value })}
                  placeholder="Company Name"
                  style={{
                    fontFamily: currentFont,
                    fontSize: styles.fontSize || '18px',
                    fontWeight: styles.fontWeight || '900',
                    color: styles.textColor || (isDarkCanvas ? '#ffffff' : '#18181b')
                  }}
                  className="font-black tracking-tight bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                />
                <input
                  type="text"
                  value={block.data.subtitle || ''}
                  onChange={(e) => onUpdateData({ subtitle: e.target.value })}
                  placeholder="Official Communications / Tagline"
                  style={{
                    fontFamily: currentFont,
                    fontSize: '12px',
                    color: isDarkCanvas ? '#a1a1aa' : '#71717a'
                  }}
                  className="block bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
            <div className={cn("text-right text-xs space-y-1", isDarkCanvas ? "text-zinc-400" : "text-zinc-500")}>
              <div className="flex items-center justify-end gap-1">
                <span className="font-semibold">Date:</span>
                <input
                  type="text"
                  value={block.data.dateTag || ''}
                  onChange={(e) => onUpdateData({ dateTag: e.target.value })}
                  style={{ fontFamily: currentFont }}
                  className="bg-transparent border-none p-0 text-right text-xs w-28 focus:outline-none font-medium"
                />
              </div>
              <div className="flex items-center justify-end gap-1">
                <span className="font-semibold">Ref:</span>
                <input
                  type="text"
                  value={block.data.refTag || ''}
                  onChange={(e) => onUpdateData({ refTag: e.target.value })}
                  style={{ fontFamily: currentFont }}
                  className="bg-transparent border-none p-0 text-right text-xs w-28 focus:outline-none font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'signature_block': {
      return (
        <div 
          className="pt-6 pb-2 rounded-xl transition-all"
          style={{ 
            fontFamily: currentFont,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            color: styles.textColor,
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <div className="grid grid-cols-2 gap-8">
            <div className={cn("p-4 rounded-xl border", isDarkCanvas ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-200 bg-zinc-50/50")}>
              <p className={cn("text-xs mb-6", isDarkCanvas ? "text-zinc-400" : "text-zinc-500")} style={{ fontFamily: currentFont }}>Sincerely,</p>
              <div className="border-t border-zinc-500 pt-3 space-y-1">
                <input
                  type="text"
                  value={block.data.disclosingName || ''}
                  onChange={(e) => onUpdateData({ disclosingName: e.target.value })}
                  placeholder="Signer Name (e.g. {{tenant_signer_name}})"
                  style={{
                    fontFamily: currentFont,
                    fontSize: styles.fontSize || '13px',
                    fontWeight: styles.fontWeight || '700',
                    color: styles.textColor || (isDarkCanvas ? '#ffffff' : '#18181b')
                  }}
                  className="w-full bg-transparent border-none p-0 focus:outline-none"
                />
                <input
                  type="text"
                  value={block.data.disclosingSubtitle || ''}
                  onChange={(e) => onUpdateData({ disclosingSubtitle: e.target.value })}
                  placeholder="Title / Position"
                  style={{ fontFamily: currentFont }}
                  className={cn("w-full text-[11px] bg-transparent border-none p-0 focus:outline-none", isDarkCanvas ? "text-zinc-400" : "text-zinc-500")}
                />
                <p className="text-[10px] text-zinc-400 uppercase font-mono" style={{ fontFamily: currentFont }}>{block.data.disclosingTitle || 'Authorized Signature'}</p>
              </div>
            </div>

            <div className={cn("p-4 rounded-xl border", isDarkCanvas ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-200 bg-zinc-50/50")}>
              <p className={cn("text-xs mb-6", isDarkCanvas ? "text-zinc-400" : "text-zinc-500")} style={{ fontFamily: currentFont }}>Acknowledged & Accepted By:</p>
              <div className="border-t border-zinc-500 pt-3 space-y-1">
                <input
                  type="text"
                  value={block.data.receivingName || ''}
                  onChange={(e) => onUpdateData({ receivingName: e.target.value })}
                  placeholder="Recipient Name (e.g. {{recipient_name}})"
                  style={{
                    fontFamily: currentFont,
                    fontSize: styles.fontSize || '13px',
                    fontWeight: styles.fontWeight || '700',
                    color: styles.textColor || (isDarkCanvas ? '#ffffff' : '#18181b')
                  }}
                  className="w-full bg-transparent border-none p-0 focus:outline-none"
                />
                <input
                  type="text"
                  value={block.data.receivingSubtitle || ''}
                  onChange={(e) => onUpdateData({ receivingSubtitle: e.target.value })}
                  placeholder="Date: ________________________"
                  style={{ fontFamily: currentFont }}
                  className={cn("w-full text-[11px] bg-transparent border-none p-0 focus:outline-none", isDarkCanvas ? "text-zinc-400" : "text-zinc-500")}
                />
                <p className="text-[10px] text-zinc-400 uppercase font-mono" style={{ fontFamily: currentFont }}>{block.data.receivingTitle || 'Authorized Signature'}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'table_repeater': {
      const cols = block.data.columns || [];
      return (
        <div 
          className="my-3 space-y-2 rounded-xl transition-all"
          style={{ 
            fontFamily: currentFont,
            fontSize: styles.fontSize,
            color: styles.textColor,
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold flex items-center gap-1.5" style={{ fontFamily: currentFont }}>
              <TableIcon size={13} className="text-indigo-400" />
              <span>Repeater Table: [[REPEAT {block.data.collection || 'items'}]]</span>
            </span>
          </div>
          <div className={cn(
            "rounded-xl border overflow-hidden",
            isDarkCanvas ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"
          )}>
            <div className={cn("grid grid-cols-4 p-3 border-b text-xs font-bold", isDarkCanvas ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700")}>
              {cols.map((col: any, idx: number) => (
                <div key={idx} style={{ textAlign: col.align || 'left', fontFamily: currentFont }}>
                  {col.title}
                </div>
              ))}
            </div>
            <div className={cn("grid grid-cols-4 p-3 text-xs font-mono border-b border-dashed", isDarkCanvas ? "border-zinc-800/80 text-indigo-400 bg-zinc-900/30" : "border-zinc-200 text-indigo-600 bg-indigo-50/20")}>
              {cols.map((col: any, idx: number) => (
                <div key={idx} style={{ textAlign: col.align || 'left' }}>
                  {`{{${col.key}}}`}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'callout': {
      return (
        <div 
          className={cn(
            "p-4 rounded-xl border-l-4 my-2 transition-all space-y-1.5",
            isDarkCanvas 
              ? "bg-indigo-950/20 border-indigo-500 text-zinc-200" 
              : "bg-indigo-50 border-indigo-600 text-indigo-950"
          )}
          style={{ 
            fontFamily: currentFont,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            textAlign: styles.align || 'left',
            color: styles.textColor,
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-indigo-500 shrink-0" />
            <input
              type="text"
              value={block.data.title || ''}
              onChange={(e) => onUpdateData({ title: e.target.value })}
              placeholder="Callout Title"
              style={{
                fontFamily: currentFont,
                fontSize: styles.fontSize || '13px',
                fontWeight: styles.fontWeight || '700',
                color: styles.textColor || 'inherit'
              }}
              className="bg-transparent border-none p-0 focus:outline-none w-full"
            />
          </div>
          <textarea
            value={block.data.message || ''}
            onChange={(e) => onUpdateData({ message: e.target.value })}
            placeholder="Callout message or notice details..."
            rows={2}
            style={{
              fontFamily: currentFont,
              fontSize: styles.fontSize || '12px',
              color: styles.textColor || 'inherit'
            }}
            className="bg-transparent border-none p-0 focus:outline-none w-full resize-none leading-relaxed opacity-90"
          />
        </div>
      );
    }

    case 'hero_banner': {
      return (
        <div 
          className="p-8 rounded-2xl text-center space-y-3 my-2 shadow-lg transition-all"
          style={{ 
            fontFamily: currentFont,
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : '#4f46e5',
            color: styles.textColor || '#ffffff',
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : '32px 24px',
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : '16px',
            textAlign: styles.align || 'center'
          }}
        >
          <input
            type="text"
            value={block.data.title || ''}
            onChange={(e) => onUpdateData({ title: e.target.value })}
            placeholder="Hero Title"
            style={{
              fontFamily: currentFont,
              fontSize: styles.fontSize || '26px',
              fontWeight: styles.fontWeight || '900',
              color: styles.textColor || '#ffffff',
              textAlign: styles.align || 'center'
            }}
            className="font-black bg-transparent border-none p-0 focus:outline-none w-full placeholder-white/60"
          />
          <input
            type="text"
            value={block.data.subtitle || ''}
            onChange={(e) => onUpdateData({ subtitle: e.target.value })}
            placeholder="Hero Subtitle or Tagline"
            style={{
              fontFamily: currentFont,
              fontSize: '13px',
              color: styles.textColor || 'rgba(255,255,255,0.9)',
              textAlign: styles.align || 'center'
            }}
            className="bg-transparent border-none p-0 focus:outline-none w-full placeholder-white/60"
          />
          <div className="pt-2">
            <input
              type="text"
              value={block.data.buttonText || ''}
              onChange={(e) => onUpdateData({ buttonText: e.target.value })}
              placeholder="Button Label (e.g. Access Portal →)"
              style={{ fontFamily: currentFont }}
              className="inline-block px-5 py-2 bg-white text-indigo-600 font-bold text-xs rounded-xl shadow-md border-none text-center focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      );
    }

    case 'grid_2col': {
      return (
        <div 
          className="grid grid-cols-2 gap-3 my-2 rounded-xl transition-all"
          style={{ 
            fontFamily: currentFont,
            fontSize: styles.fontSize,
            color: styles.textColor,
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined,
            textAlign: styles.align || 'left'
          }}
        >
          <div className={cn("p-4 rounded-xl border space-y-2", isDarkCanvas ? "bg-zinc-900/60 border-zinc-800 text-zinc-200" : "bg-zinc-100 border-zinc-200 text-zinc-800")}>
            <input
              type="text"
              value={block.data.col1Title || ''}
              onChange={(e) => onUpdateData({ col1Title: e.target.value })}
              placeholder="Column 1 Title"
              style={{
                fontFamily: currentFont,
                fontSize: styles.fontSize || '12px',
                fontWeight: styles.fontWeight || '700'
              }}
              className="uppercase tracking-wider bg-transparent border-none p-0 focus:outline-none text-zinc-400 w-full"
            />
            <textarea
              value={block.data.col1Content || ''}
              onChange={(e) => onUpdateData({ col1Content: e.target.value })}
              placeholder="Column 1 content..."
              rows={3}
              style={{
                fontFamily: currentFont,
                fontSize: styles.fontSize || '12px'
              }}
              className="bg-transparent border-none p-0 focus:outline-none w-full resize-none font-mono"
            />
          </div>

          <div className={cn("p-4 rounded-xl border space-y-2", isDarkCanvas ? "bg-zinc-900/60 border-zinc-800 text-zinc-200" : "bg-zinc-100 border-zinc-200 text-zinc-800")}>
            <input
              type="text"
              value={block.data.col2Title || ''}
              onChange={(e) => onUpdateData({ col2Title: e.target.value })}
              placeholder="Column 2 Title"
              style={{
                fontFamily: currentFont,
                fontSize: styles.fontSize || '12px',
                fontWeight: styles.fontWeight || '700'
              }}
              className="uppercase tracking-wider bg-transparent border-none p-0 focus:outline-none text-zinc-400 w-full"
            />
            <textarea
              value={block.data.col2Content || ''}
              onChange={(e) => onUpdateData({ col2Content: e.target.value })}
              placeholder="Column 2 content..."
              rows={3}
              style={{
                fontFamily: currentFont,
                fontSize: styles.fontSize || '12px'
              }}
              className="bg-transparent border-none p-0 focus:outline-none w-full resize-none font-mono"
            />
          </div>
        </div>
      );
    }

    case 'button': {
      return (
        <div 
          className="my-4 space-y-2 rounded-xl transition-all"
          style={{ 
            textAlign: styles.align || 'center',
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <input
            type="text"
            value={block.data.text || ''}
            onChange={(e) => onUpdateData({ text: e.target.value })}
            placeholder="Button Text"
            style={{
              fontFamily: currentFont,
              fontSize: styles.fontSize || '14px',
              fontWeight: styles.fontWeight || '700',
              color: styles.textColor || '#ffffff',
              backgroundColor: '#4f46e5',
              padding: '12px 28px',
              borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : '8px'
            }}
            className="inline-block hover:opacity-90 shadow-lg shadow-indigo-600/30 border-none text-center focus:outline-none cursor-pointer"
          />
          <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-400">
            <span>Link URL:</span>
            <input
              type="text"
              value={block.data.url || ''}
              onChange={(e) => onUpdateData({ url: e.target.value })}
              placeholder="{{action_link}} or https://..."
              style={{ fontFamily: currentFont }}
              className="bg-transparent border-b border-zinc-700 text-[11px] text-zinc-300 px-1 focus:outline-none w-48 text-center font-mono"
            />
          </div>
        </div>
      );
    }

    case 'divider': {
      return (
        <div 
          className="py-3"
          style={{
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined
          }}
        >
          <hr 
            style={{ borderColor: styles.borderColor || undefined }}
            className={cn("border-t", isDarkCanvas ? "border-zinc-800" : "border-zinc-300")} 
          />
        </div>
      );
    }

    case 'spacer': {
      const h = block.data.height || 24;
      return (
        <div 
          className={cn("border border-dashed rounded-lg flex items-center justify-center text-[10px] text-zinc-400", isDarkCanvas ? "border-zinc-800 bg-zinc-950/40" : "border-zinc-300 bg-zinc-50")} 
          style={{ 
            height: `${h}px`,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <span>Spacer ({h}px)</span>
        </div>
      );
    }

    case 'quote': {
      return (
        <div 
          className={cn("p-4 border-l-4 border-indigo-500 my-2 space-y-2 italic rounded-r-xl transition-all", isDarkCanvas ? "bg-zinc-900/40 text-zinc-200" : "bg-zinc-50 text-zinc-700")}
          style={{ 
            fontFamily: currentFont,
            fontSize: styles.fontSize || '15px',
            fontWeight: styles.fontWeight || '400',
            textAlign: styles.align || 'left',
            color: styles.textColor,
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <textarea
            value={block.data.text || ''}
            onChange={(e) => onUpdateData({ text: e.target.value })}
            placeholder="Quote text..."
            rows={2}
            style={{
              fontFamily: currentFont,
              fontSize: styles.fontSize || '15px',
              fontWeight: styles.fontWeight || '400',
              textAlign: styles.align || 'left',
              color: styles.textColor || 'inherit'
            }}
            className="w-full bg-transparent border-none p-0 focus:outline-none resize-none"
          />
          <input
            type="text"
            value={block.data.author || ''}
            onChange={(e) => onUpdateData({ author: e.target.value })}
            placeholder="Author / Attribution"
            style={{
              fontFamily: currentFont,
              fontSize: '12px',
              textAlign: styles.align || 'left'
            }}
            className="not-italic font-bold text-zinc-400 bg-transparent border-none p-0 focus:outline-none w-full"
          />
        </div>
      );
    }

    case 'code': {
      return (
        <div 
          className="my-2 rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs transition-all"
          style={{
            fontFamily: currentFont || "'JetBrains Mono', monospace",
            fontSize: styles.fontSize || '12px',
            color: styles.textColor || '#a5b4fc',
            backgroundColor: styles.bgColor && styles.bgColor !== 'None' ? styles.bgColor : undefined,
            padding: styles.padding && styles.padding !== 'default' ? styles.padding : undefined,
            borderRadius: styles.borderRadius && styles.borderRadius !== 'default' ? styles.borderRadius : undefined
          }}
        >
          <textarea
            value={block.data.code || ''}
            onChange={(e) => onUpdateData({ code: e.target.value })}
            placeholder="Paste code or JSON..."
            rows={4}
            style={{
              fontFamily: currentFont || "'JetBrains Mono', monospace",
              fontSize: styles.fontSize || '12px',
              color: styles.textColor || '#a5b4fc'
            }}
            className="w-full bg-transparent border-none p-0 focus:outline-none resize-none font-mono"
          />
        </div>
      );
    }

    default:
      return <div>Unknown Block Type</div>;
  }
};

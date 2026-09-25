import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  MapPin, 
  Camera, 
  Calendar, 
  User, 
  Cpu, 
  HardDrive, 
  Hash, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ShieldCheck,
  Compass,
  Maximize,
  Clock,
  Code
} from 'lucide-react';
import { UniversalDocument, FileTechnicalMetadata } from '../../types/document';
import { DocumentClientService } from '../../services/documentClientService';
import { toast } from 'sonner';

interface DocumentMetadataInspectorProps {
  document: UniversalDocument;
}

export const DocumentMetadataInspector: React.FC<DocumentMetadataInspectorProps> = ({ document }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [metadata, setMetadata] = useState<FileTechnicalMetadata | null>(
    document.aiMetadata?.technicalMetadata || null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If not already in aiMetadata, fetch on demand
    if (!document.aiMetadata?.technicalMetadata) {
      setLoading(true);
      DocumentClientService.getDocumentMetadata(document.id)
        .then(res => {
          if (res) setMetadata(res);
        })
        .finally(() => setLoading(false));
    } else {
      setMetadata(document.aiMetadata.technicalMetadata);
    }
  }, [document.id, document.aiMetadata?.technicalMetadata]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${key} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exif = metadata?.exif;
  const gps = metadata?.gps;
  const dimensions = metadata?.dimensions;
  const pdfInfo = metadata?.pdfInfo;
  const textStats = metadata?.textStats;

  // Format bytes nicely
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Quick Specs Pill Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400">File Type</span>
          <p className="font-semibold text-zinc-900 dark:text-white truncate">
            {document.mimeType || 'Unknown'}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Exact File Size</span>
          <p className="font-semibold text-zinc-900 dark:text-white font-mono">
            {formatBytes(document.sizeBytes)} ({document.sizeBytes.toLocaleString()} B)
          </p>
        </div>

        {dimensions && (
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Dimensions</span>
            <p className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
              {dimensions.width} × {dimensions.height} {dimensions.megapixels ? `(${dimensions.megapixels})` : ''}
            </p>
          </div>
        )}

        {pdfInfo?.pageCount && (
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Page Count</span>
            <p className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
              {pdfInfo.pageCount} {pdfInfo.pageCount === 1 ? 'Page' : 'Pages'}
            </p>
          </div>
        )}

        {textStats && (
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Text Count</span>
            <p className="font-semibold text-zinc-900 dark:text-white font-mono">
              {textStats.linesCount} lines • {textStats.wordsCount} words
            </p>
          </div>
        )}
      </div>

      {/* GPS & Geospatial Coordinates Card (if present) */}
      {gps && (
        <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2.5">
          <div className="flex items-center justify-between text-blue-900 dark:text-blue-300 font-bold">
            <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Geospatial GPS Coordinates
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-medium">
              EXIF Geotag
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-white dark:bg-zinc-900/80 border border-blue-100 dark:border-blue-900/40">
              <span className="text-[9px] uppercase font-sans text-zinc-400 block">Latitude</span>
              <span className="text-zinc-900 dark:text-white font-bold">{gps.latitude}°</span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-zinc-900/80 border border-blue-100 dark:border-blue-900/40">
              <span className="text-[9px] uppercase font-sans text-zinc-400 block">Longitude</span>
              <span className="text-zinc-900 dark:text-white font-bold">{gps.longitude}°</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={gps.mapsUrl || `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <ExternalLink className="w-3 h-3" />
              View on Google Maps
            </a>
            <button
              onClick={() => copyToClipboard(`${gps.latitude}, ${gps.longitude}`, 'GPS Coordinates')}
              className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 transition-colors"
              title="Copy Coordinates"
            >
              {copiedKey === 'GPS Coordinates' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Camera & EXIF Capture Specs Card */}
      {exif && (exif.make || exif.model || exif.dateTimeOriginal) && (
        <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-2.5">
          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold uppercase text-[10px] tracking-wider pb-1 border-b border-zinc-100 dark:border-zinc-800">
            <Camera className="w-3.5 h-3.5 text-indigo-500" />
            Camera & Capture Device
          </div>

          <div className="space-y-1.5 text-[11px]">
            {(exif.make || exif.model) && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Device Model</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {exif.make ? `${exif.make} ` : ''}{exif.model || 'Unknown'}
                </span>
              </div>
            )}
            {exif.dateTimeOriginal && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Date Taken</span>
                <span className="font-mono text-zinc-900 dark:text-white">
                  {exif.dateTimeOriginal}
                </span>
              </div>
            )}
            {exif.software && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Firmware / Software</span>
                <span className="text-zinc-900 dark:text-white truncate max-w-[180px]">
                  {exif.software}
                </span>
              </div>
            )}
            {exif.lensModel && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Lens Model</span>
                <span className="text-zinc-900 dark:text-white truncate max-w-[180px]">
                  {exif.lensModel}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document & Author Properties Card */}
      {pdfInfo && (pdfInfo.author || pdfInfo.creator || pdfInfo.creationDate || pdfInfo.version) && (
        <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-2.5">
          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold uppercase text-[10px] tracking-wider pb-1 border-b border-zinc-100 dark:border-zinc-800">
            <User className="w-3.5 h-3.5 text-emerald-500" />
            Document Author & Creator Info
          </div>

          <div className="space-y-1.5 text-[11px]">
            {pdfInfo.author && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Author</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {pdfInfo.author}
                </span>
              </div>
            )}
            {pdfInfo.creator && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Creator Application</span>
                <span className="text-zinc-900 dark:text-white truncate max-w-[180px]">
                  {pdfInfo.creator}
                </span>
              </div>
            )}
            {pdfInfo.producer && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">PDF Producer</span>
                <span className="text-zinc-900 dark:text-white truncate max-w-[180px]">
                  {pdfInfo.producer}
                </span>
              </div>
            )}
            {pdfInfo.creationDate && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Creation Date</span>
                <span className="font-mono text-zinc-900 dark:text-white">
                  {pdfInfo.creationDate}
                </span>
              </div>
            )}
            {pdfInfo.version && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Format Version</span>
                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                  {pdfInfo.version}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cryptographic & Storage Provenance Card */}
      <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-2.5">
        <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold uppercase text-[10px] tracking-wider pb-1 border-b border-zinc-100 dark:border-zinc-800">
          <HardDrive className="w-3.5 h-3.5 text-purple-500" />
          Cryptographic & Storage Provenance
        </div>

        <div className="space-y-2 text-[11px]">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span>SHA-256 Checksum</span>
              <button
                onClick={() => copyToClipboard(document.sha256 || '', 'SHA-256 Checksum')}
                className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {copiedKey === 'SHA-256 Checksum' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                Copy Hash
              </button>
            </div>
            <p className="font-mono text-[10px] p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 break-all select-all">
              {document.sha256 || 'None computed'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-zinc-400 text-[10px] block">Storage Tier</span>
              <span className="font-semibold text-zinc-900 dark:text-white uppercase font-mono text-[10px]">
                {document.storageProvider || 'Local Disk'}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 text-[10px] block">Security Tier</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-[10px]">
                {document.classification}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-zinc-400 text-[10px] block">Uploaded At</span>
              <span className="font-mono text-zinc-900 dark:text-white text-[10px]">
                {new Date(document.createdAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 text-[10px] block">WORM Immutability</span>
              <span className="font-semibold text-emerald-600 text-[10px]">
                {document.isWormLocked ? 'Enforced' : 'Unlocked'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Raw JSON Inspector Accordion */}
      <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full px-3.5 py-2 flex items-center justify-between font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-zinc-400" />
            Raw Technical Metadata (JSON)
          </span>
          {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showRawJson && (
          <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-950 font-mono text-[10px] text-emerald-400 max-h-56 overflow-y-auto">
            <div className="flex justify-end pb-1.5">
              <button
                onClick={() => copyToClipboard(JSON.stringify(metadata || document.aiMetadata || {}, null, 2), 'Raw JSON')}
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy JSON
              </button>
            </div>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(metadata || document.aiMetadata || {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

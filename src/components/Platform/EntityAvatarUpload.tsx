import React, { useState, useRef } from 'react';
import { Camera, Loader2, User, Building2, Trash2, Upload } from 'lucide-react';
import { cn } from '../UI/Primitives';
import { toast } from 'sonner';

const MAX_RAW_FILE_SIZE = 10 * 1024 * 1024; // 10MB raw file limit
const TARGET_MAX_DIMENSION = 400; // 400x400 px crisp retina avatar

interface EntityAvatarUploadProps {
  avatarUrl?: string | null;
  partyType: 'PERSON' | 'ORGANIZATION';
  displayName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onChange: (newAvatarUrl: string | null) => Promise<void> | void;
  showControlsBeside?: boolean;
  className?: string;
}

/**
 * Optimizes an uploaded image file into a compact, crisp Data URL (~15-40KB)
 * preserving alpha transparency for corporate logos and high quality for portraits.
 */
async function processImageFileToDataUrl(file: File): Promise<string> {
  // Keep SVGs as direct data URLs so vector logos stay infinitely sharp
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > TARGET_MAX_DIMENSION || height > TARGET_MAX_DIMENSION) {
            if (width >= height) {
              height = Math.round((height * TARGET_MAX_DIMENSION) / width);
              width = TARGET_MAX_DIMENSION;
            } else {
              width = Math.round((width * TARGET_MAX_DIMENSION) / height);
              height = TARGET_MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Try WebP first (supports alpha transparency + great compression), fallback to PNG
          let dataUrl = canvas.toDataURL('image/webp', 0.88);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/png');
          }
          resolve(dataUrl);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const EntityAvatarUpload: React.FC<EntityAvatarUploadProps> = ({
  avatarUrl,
  partyType,
  displayName,
  size = 'lg',
  onChange,
  showControlsBeside = false,
  className,
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPerson = partyType === 'PERSON';
  const initials = (displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP, GIF, or SVG)');
      return;
    }
    if (file.size > MAX_RAW_FILE_SIZE) {
      toast.error('Image size exceeds the 10MB limit');
      return;
    }

    setUploading(true);
    try {
      const optimizedDataUrl = await processImageFileToDataUrl(file);
      await onChange(optimizedDataUrl);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploading(true);
    try {
      await onChange(null);
    } finally {
      setUploading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-11 h-11 rounded-xl',
    md: 'w-14 h-14 rounded-2xl',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl',
    xl: 'w-24 h-24 rounded-3xl',
  }[size];

  const iconSize = {
    sm: 18,
    md: 24,
    lg: 34,
    xl: 40,
  }[size];

  const avatarBox = (
    <div
      className={cn('relative group/avatar shrink-0 select-none', className)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
    >
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        title={
          avatarUrl
            ? 'Click or drop image to change profile picture'
            : `Click or drop image to upload ${isPerson ? 'profile photo' : 'organisation logo'}`
        }
        className={cn(
          sizeClasses,
          'flex items-center justify-center border shadow-inner relative overflow-hidden cursor-pointer transition-all',
          isDragOver
            ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105'
            : avatarUrl
            ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
            : isPerson
            ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
            : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400'
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName || (isPerson ? 'Person avatar' : 'Organisation logo')}
            className="w-full h-full object-cover"
          />
        ) : initials && isPerson ? (
          <span
            className={cn(
              'font-black tracking-tight',
              size === 'sm' ? 'text-xs' : size === 'md' ? 'text-base' : 'text-xl'
            )}
          >
            {initials}
          </span>
        ) : isPerson ? (
          <User size={iconSize} />
        ) : (
          <Building2 size={iconSize} />
        )}

        {/* Loading Spinner Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-white" size={20} />
          </div>
        )}

        {/* Hover Upload Overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white p-1 text-center">
            <Camera size={size === 'sm' ? 14 : 18} />
            {size !== 'sm' && (
              <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">
                {avatarUrl ? 'Change' : 'Upload'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Remove Button when an image is present */}
      {avatarUrl && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
          title="Remove profile picture"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900/90 dark:bg-zinc-800 text-white hover:bg-rose-600 border border-white/20 shadow-md flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all z-20 cursor-pointer"
        >
          <Trash2 size={10} />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );

  if (!showControlsBeside) {
    return avatarBox;
  }

  return (
    <div className="flex items-center gap-4">
      {avatarBox}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <Upload size={13} />
            <span>
              {avatarUrl
                ? isPerson
                  ? 'Change Photo'
                  : 'Change Logo'
                : isPerson
                ? 'Upload Profile Photo'
                : 'Upload Company Logo'}
            </span>
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Remove</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Click or drag & drop PNG, JPG, WebP, or SVG (auto-optimized for 360° cards).
        </p>
      </div>
    </div>
  );
};

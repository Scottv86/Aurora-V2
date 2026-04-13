import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button, cn } from '../UI/Primitives';

interface AvatarUploadProps {
  currentUrl?: string;
  onUpload: (url: string) => Promise<void>;
  name?: string;
  className?: string;
}

export const AvatarUpload = ({ currentUrl, onUpload, name, className }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await onUpload(base64String);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("relative group", className)}>
      <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden">
        {currentUrl ? (
          <img src={currentUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl font-bold">{name?.[0]?.toUpperCase()}</span>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="animate-spin text-white" size={24} />
          </div>
        )}

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-white"
        >
          <Camera size={18} />
          Update
        </button>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MessageSquare, 
  Users, 
  Sparkles,
  Volume2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useChat } from '../../../context/ChatContext';
import { cn } from '../../../lib/utils';

export const AudioCallModal: React.FC = () => {
  const { activeChannel, isCallingOpen, setIsCallingOpen, users } = useChat();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallingOpen) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallingOpen]);

  if (!isCallingOpen || !activeChannel) return null;

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const channelTitle = activeChannel.type === 'direct' 
    ? (activeChannel.dmRecipient?.name || activeChannel.name)
    : `#${activeChannel.name}`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={() => setIsCallingOpen(false)}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden flex flex-col items-center p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Call Info */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold mb-3 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Live Huddle • {formatDuration(callDuration)}</span>
          </div>
          <h2 className="text-xl font-bold">{channelTitle}</h2>
          <p className="text-xs text-zinc-400 mt-1">High Definition Encrypted Audio Channel</p>
        </div>

        {/* Video / Audio Avatars Grid */}
        <div className="grid grid-cols-2 gap-6 w-full max-w-lg mb-10">
          {/* Current User Tile */}
          <div className="relative aspect-video bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-4 shadow-inner overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-xl font-bold shadow-lg ring-4 ring-indigo-500/20 animate-pulse">
              You
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] font-semibold text-zinc-200">
              {isMuted ? <MicOff size={12} className="text-rose-400" /> : <Mic size={12} className="text-emerald-400" />}
              <span>You (Speaking)</span>
            </div>
          </div>

          {/* Participant Tile */}
          <div className="relative aspect-video bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-4 shadow-inner overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-xl font-bold shadow-lg ring-4 ring-amber-500/20">
              {activeChannel.dmRecipient?.name?.charAt(0) || 'T'}
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] font-semibold text-zinc-200">
              <Volume2 size={12} className="text-indigo-400" />
              <span>{activeChannel.dmRecipient?.name || 'Team Member'}</span>
            </div>
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 px-6 py-3 rounded-full shadow-2xl">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-3 rounded-full transition-all",
              isMuted
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={cn(
              "p-3 rounded-full transition-all",
              isVideoOn
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
            )}
            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={() => setIsSharingScreen(!isSharingScreen)}
            className={cn(
              "p-3 rounded-full transition-all",
              isSharingScreen
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
            )}
            title="Share screen"
          >
            <Monitor size={20} />
          </button>

          {/* End Call Button */}
          <button
            onClick={() => setIsCallingOpen(false)}
            className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-lg shadow-rose-600/30 ml-2"
            title="Leave Huddle"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

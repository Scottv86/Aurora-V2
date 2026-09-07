import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Save, 
  Volume2, 
  Radio, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Layers, 
  Sparkles, 
  Check, 
  Music, 
  Sliders,
  Play,
  VolumeX
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/UI/Primitives';
import { usePlatform } from '../../hooks/usePlatform';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { ToastPosition, ToastNotificationConfig, SoundNotificationConfig, ChimeSoundId } from '../../types/platform';
import { CHIME_LIBRARY, playChimeSound } from '../../lib/audioNotification';

const POSITION_OPTIONS: { id: ToastPosition; label: string; quadrant: string }[] = [
  { id: 'top-left', label: 'Top Left', quadrant: 'top-left' },
  { id: 'top-center', label: 'Top Center', quadrant: 'top-center' },
  { id: 'top-right', label: 'Top Right', quadrant: 'top-right' },
  { id: 'bottom-left', label: 'Bottom Left', quadrant: 'bottom-left' },
  { id: 'bottom-center', label: 'Bottom Center', quadrant: 'bottom-center' },
  { id: 'bottom-right', label: 'Bottom Right', quadrant: 'bottom-right' },
];

export const NotificationSettingsPage = () => {
  const { tenant, updateTenant } = usePlatform();
  const [activeTab, setActiveTab] = useState('toasts');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [playingChimeId, setPlayingChimeId] = useState<string | null>(null);

  // Toast settings state
  const [toastConfig, setToastConfig] = useState<ToastNotificationConfig>({
    position: 'bottom-left',
    duration: 4000,
    closeButton: true,
    expand: false,
  });

  // Sound settings state
  const [soundConfig, setSoundConfig] = useState<SoundNotificationConfig>({
    enabled: true,
    volume: 0.22,
    defaultChime: 'aurora',
    toastChime: 'aurora',
  });

  const subNavItems: SettingsSubNavItem[] = [
    { 
      id: 'toasts', 
      label: 'Toast Notifications', 
      icon: Bell, 
      description: 'Positioning & toast behavior' 
    },
    { 
      id: 'sounds', 
      label: 'Sound & Chimes', 
      icon: Volume2, 
      description: '10-tone library & volume' 
    },
    { 
      id: 'channels', 
      label: 'Channels & Broadcasts', 
      icon: Radio, 
      description: 'In-app and external alerts' 
    },
  ];

  // Initialize from tenant configuration
  useEffect(() => {
    if (tenant && !initialized) {
      const existingNotifs = tenant.workspaceSettings?.notifications;
      const existingBrandingPos = tenant.branding?.toastPosition;

      if (existingNotifs?.toasts || existingBrandingPos) {
        setToastConfig({
          position: existingNotifs?.toasts?.position || existingBrandingPos || 'bottom-left',
          duration: existingNotifs?.toasts?.duration ?? 4000,
          closeButton: existingNotifs?.toasts?.closeButton ?? true,
          expand: existingNotifs?.toasts?.expand ?? false,
        });
      }

      if (existingNotifs?.sounds) {
        setSoundConfig({
          enabled: existingNotifs.sounds.enabled ?? true,
          volume: existingNotifs.sounds.volume ?? 0.22,
          defaultChime: existingNotifs.sounds.defaultChime || 'aurora',
          toastChime: existingNotifs.sounds.toastChime || 'aurora',
        });
      }

      setInitialized(true);
    }
  }, [tenant, initialized]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTenant({
        workspaceSettings: {
          ...tenant?.workspaceSettings,
          notifications: {
            toasts: toastConfig,
            sounds: soundConfig,
          }
        },
        branding: {
          ...tenant?.branding,
          toastPosition: toastConfig.position,
        }
      });
      toast.success('Notification settings saved successfully', {
        position: toastConfig.position,
        duration: toastConfig.duration || 4000,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePlayChime = (chimeId: ChimeSoundId) => {
    setPlayingChimeId(chimeId);
    playChimeSound(chimeId, soundConfig.volume ?? 0.22);
    setTimeout(() => {
      setPlayingChimeId(null);
    }, 800);
  };

  const triggerSampleToast = (type: 'success' | 'info' | 'warning' | 'error') => {
    const positionLabel = POSITION_OPTIONS.find(p => p.id === toastConfig.position)?.label || 'Bottom Left';
    
    // Play selected toast chime if sound enabled
    if (soundConfig.enabled) {
      playChimeSound(soundConfig.defaultChime || 'aurora', soundConfig.volume ?? 0.22);
    }

    const toastOptions = {
      description: `Rendered at ${positionLabel} (${toastConfig.duration || 4000}ms)`,
      position: toastConfig.position,
      duration: toastConfig.duration || 4000,
    };

    switch (type) {
      case 'success':
        toast.success(`Success Toast Triggered`, toastOptions);
        break;
      case 'info':
        toast.info(`System Information Alert`, {
          ...toastOptions,
          description: `Previewing notification layout at ${positionLabel}`,
        });
        break;
      case 'warning':
        toast.warning(`Workspace Notice`, {
          ...toastOptions,
          description: `Check your workspace preferences and quota limits.`,
        });
        break;
      case 'error':
        toast.error(`Action Failed Sample`, {
          ...toastOptions,
          description: `This demonstrates an error alert at ${positionLabel}.`,
        });
        break;
    }
  };

  return (
    <SettingsSubNavLayout
      title="Notification Settings"
      description="Configure toast alert positioning, sound chimes, display durations, and workspace notification behavior."
      icon={Bell}
      items={subNavItems}
      activeId={activeTab}
      onTabChange={setActiveTab}
      actions={
        <Button 
          onClick={handleSave} 
          loading={saving} 
          className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/20"
        >
          <Save size={18} />
          Save Changes
        </Button>
      }
    >
      <div className="max-w-5xl space-y-8">
        <AnimatePresence mode="wait">
          {/* TAB 1: TOAST NOTIFICATIONS */}
          {activeTab === 'toasts' && (
            <motion.div
              key="toasts-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Toast Position Selector */}
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders size={18} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
                      Toast Screen Placement
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Select the default screen quadrant where system toasts and action notifications will pop up.
                  </p>
                </div>

                {/* Visual Viewport Wireframe */}
                <div className="p-6 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200/70 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="ml-2 font-mono text-[11px] text-zinc-400">Aurora Viewport Preview</span>
                    </span>
                    <span className="font-mono text-indigo-500 dark:text-indigo-400 text-xs">
                      Active: {POSITION_OPTIONS.find(p => p.id === toastConfig.position)?.label}
                    </span>
                  </div>

                  {/* 3x2 Grid for 6 positions */}
                  <div className="grid grid-cols-3 gap-3 min-h-[180px] p-4 bg-zinc-200/50 dark:bg-black/30 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800">
                    {POSITION_OPTIONS.map((pos) => {
                      const isSelected = toastConfig.position === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setToastConfig((prev: ToastNotificationConfig) => ({ ...prev, position: pos.id }))}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25 scale-[1.02]'
                              : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:bg-white dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check size={14} className="stroke-[3]" />}
                            <span>{pos.label}</span>
                          </div>
                          <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-zinc-400'}`}>
                            {pos.id === 'bottom-left' ? 'Default' : pos.quadrant}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Live Preview Controls */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                      Test Active Positioning
                    </span>
                    <span className="text-[11px] text-zinc-400">Triggers an instant sample notification</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => triggerSampleToast('success')}
                      className="gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <CheckCircle2 size={14} />
                      Test Success
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => triggerSampleToast('info')}
                      className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                      <Info size={14} />
                      Test Info
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => triggerSampleToast('warning')}
                      className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <AlertTriangle size={14} />
                      Test Warning
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => triggerSampleToast('error')}
                      className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <XCircle size={14} />
                      Test Error
                    </Button>
                  </div>
                </div>
              </div>

              {/* Behavior & Display Duration */}
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
                      Toast Duration & Behavior
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Fine-tune how long alerts stay visible and how multiple toasts stack.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Duration Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                      Auto-Dismiss Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '2.5s', value: 2500 },
                        { label: '4.0s (Std)', value: 4000 },
                        { label: '6.0s', value: 6000 },
                        { label: '8.0s', value: 8000 },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setToastConfig((prev: ToastNotificationConfig) => ({ ...prev, duration: item.value }))}
                          className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                            (toastConfig.duration || 4000) === item.value
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                              : 'bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Close Button Toggle */}
                  <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Show Dismiss Button</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Renders a small close icon on all toast popups.</p>
                    </div>
                    <div 
                      onClick={() => setToastConfig((prev: ToastNotificationConfig) => ({ ...prev, closeButton: !prev.closeButton }))}
                      className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${toastConfig.closeButton ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-white/10'}`}
                    >
                      <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${toastConfig.closeButton ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                </div>

                {/* Stacking / Expansion Toggle */}
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-indigo-500" />
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Expand Multi-Toasts</p>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Expand multiple simultaneous toasts into a full visible list rather than stacking.</p>
                  </div>
                  <div 
                    onClick={() => setToastConfig((prev: ToastNotificationConfig) => ({ ...prev, expand: !prev.expand }))}
                    className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${toastConfig.expand ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-white/10'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${toastConfig.expand ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: SOUND & CHIMES */}
          {activeTab === 'sounds' && (
            <motion.div
              key="sounds-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Audio Controls Master Card */}
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Music size={18} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
                      System Audio Cues & Master Volume
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Procedurally synthesized Web Audio chimes for incoming mail, chat messages, and background task completions.
                  </p>
                </div>

                {/* Audio Master Toggle */}
                <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">Enable Audio Notifications</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
                      Plays subtle harmonic chimes when important system events, emails, or chat updates arrive.
                    </p>
                  </div>
                  <div 
                    onClick={() => setSoundConfig((prev: SoundNotificationConfig) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${soundConfig.enabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-white/10'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${soundConfig.enabled ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {soundConfig.volume && soundConfig.volume > 0.4 ? (
                        <Volume2 size={16} className="text-indigo-500" />
                      ) : soundConfig.volume && soundConfig.volume > 0.05 ? (
                        <Volume2 size={16} className="text-zinc-400" />
                      ) : (
                        <VolumeX size={16} className="text-zinc-400" />
                      )}
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                        Chime Master Volume ({Math.round((soundConfig.volume ?? 0.22) * 100)}%)
                      </label>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">Synthesized Web Audio API</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.01"
                    value={soundConfig.volume ?? 0.22}
                    onChange={(e) => setSoundConfig((prev: SoundNotificationConfig) => ({ ...prev, volume: parseFloat(e.target.value) }))}
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                  />
                </div>
              </div>

              {/* 10-Chime Sound Library Grid */}
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-indigo-500" />
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
                        Chime Tone Library (10 Synthesized Tones)
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Choose the default acoustic tone for workspace notifications, email alerts, and system chimes.
                    </p>
                  </div>
                  <div className="text-xs font-mono text-indigo-500 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">
                    Selected: {CHIME_LIBRARY.find(c => c.id === (soundConfig.defaultChime || 'aurora'))?.name}
                  </div>
                </div>

                {/* 2-Column or 3-Column Chime Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {CHIME_LIBRARY.map((chime) => {
                    const isSelected = (soundConfig.defaultChime || 'aurora') === chime.id;
                    const isPlaying = playingChimeId === chime.id;

                    return (
                      <div
                        key={chime.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                            : 'bg-white/50 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                                {chime.name}
                              </h4>
                              {chime.badge && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full">
                                  {chime.badge}
                                </span>
                              )}
                            </div>
                            <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-zinc-400 font-mono">
                              {chime.category}
                            </span>
                          </div>

                          {/* Listen Preview Button */}
                          <button
                            type="button"
                            onClick={() => handlePlayChime(chime.id)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                              isPlaying
                                ? 'bg-indigo-600 text-white border-indigo-600 scale-110 shadow-lg shadow-indigo-500/30'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                            title="Play sample tone"
                          >
                            <Play size={14} className={isPlaying ? 'fill-current' : ''} />
                          </button>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {chime.description}
                        </p>

                        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setSoundConfig((prev: SoundNotificationConfig) => ({ ...prev, defaultChime: chime.id }));
                              handlePlayChime(chime.id);
                            }}
                            className={`flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${
                              isSelected
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-zinc-300 dark:border-zinc-600'
                            }`}>
                              {isSelected && <Check size={10} className="stroke-[3]" />}
                            </div>
                            <span>{isSelected ? 'Default Tone Active' : 'Set as Default'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePlayChime(chime.id)}
                            className="text-[11px] text-zinc-400 hover:text-indigo-500 font-mono transition-colors"
                          >
                            Listen Preview →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CHANNELS & BROADCASTS */}
          {activeTab === 'channels' && (
            <motion.div
              key="channels-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="p-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Radio size={32} />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="font-bold text-zinc-900 dark:text-white">External Notification Channels & Webhooks</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Configure webhooks, SMS alerts, Slack/Discord dispatchers, and automated email summary digests across your organisation.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                  <Sparkles size={13} />
                  Ready for Extension
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SettingsSubNavLayout>
  );
};

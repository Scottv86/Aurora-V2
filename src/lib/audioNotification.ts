import { ChimeSoundId } from '../types/platform';

export interface ChimeInfo {
  id: ChimeSoundId;
  name: string;
  category: 'Harmonic & Ambient' | 'Crisp & Modern' | 'Subtle & Tactile' | 'Acoustic & Warm';
  description: string;
  badge?: string;
}

export const CHIME_LIBRARY: ChimeInfo[] = [
  {
    id: 'aurora',
    name: 'Aurora Harmony',
    category: 'Harmonic & Ambient',
    description: 'Multi-harmonic rising glass chime with sparkling sparkle overtone.',
    badge: 'Default'
  },
  {
    id: 'crystal',
    name: 'Crystal Bell',
    category: 'Crisp & Modern',
    description: 'Bright crystalline bell with pure frequency ring and long decay.'
  },
  {
    id: 'breeze',
    name: 'Gentle Breeze',
    category: 'Harmonic & Ambient',
    description: 'Soft ascending dual-tone sweep with smooth analog sine envelope.'
  },
  {
    id: 'pop',
    name: 'Tactile Pop',
    category: 'Subtle & Tactile',
    description: 'Minimalist micro-click tactile blip for unobtrusive feedback.'
  },
  {
    id: 'ping',
    name: 'Modern Ping',
    category: 'Crisp & Modern',
    description: 'Clean digital bell tone with instant transient and tight tail.'
  },
  {
    id: 'zen',
    name: 'Zen Resonance',
    category: 'Acoustic & Warm',
    description: 'Deep singing bowl gong with soothing harmonic undertones.'
  },
  {
    id: 'celestial',
    name: 'Celestial Triad',
    category: 'Harmonic & Ambient',
    description: 'Ethereal three-voice major chord shimmer with staggered entry.'
  },
  {
    id: 'ripple',
    name: 'Digital Ripple',
    category: 'Crisp & Modern',
    description: 'Rapid 3-note cascade sequence inspired by fluid interfaces.'
  },
  {
    id: 'marimba',
    name: 'Warm Marimba',
    category: 'Acoustic & Warm',
    description: 'Organic wooden double-tap bar strike with natural acoustic timbre.'
  },
  {
    id: 'apex',
    name: 'Apex Pulse',
    category: 'Crisp & Modern',
    description: 'High-energy futuristic tech fanfare with rising harmonic drive.'
  }
];

function getAudioContext(): AudioContext | null {
  try {
    const isMuted = typeof window !== 'undefined' && localStorage.getItem('aurora_sound_muted') === 'true';
    if (isMuted) return null;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  } catch (e) {
    console.warn('[AudioNotification] Context init inhibited:', e);
    return null;
  }
}

/**
 * Procedurally synthesize and play one of the 10 built-in chime sounds
 */
export function playChimeSound(soundId: ChimeSoundId = 'aurora', volume = 0.22) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (soundId) {
      case 'aurora': {
        // C5 (523.25) -> E5 (659.25) -> C6 (1046.5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.8, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.08);
        gain2.gain.setValueAtTime(0, now + 0.08);
        gain2.gain.linearRampToValueAtTime(volume, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.55);

        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(1046.5, now + 0.12);
        gain3.gain.setValueAtTime(0, now + 0.12);
        gain3.gain.linearRampToValueAtTime(volume * 0.35, now + 0.14);
        gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now + 0.12);
        osc3.stop(now + 0.45);
        break;
      }

      case 'crystal': {
        // High crystalline bell at 1318.5 Hz (E6) with harmonic at 2637 Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1318.5, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.9, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);

        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(2637, now);
        shimmerGain.gain.setValueAtTime(0, now);
        shimmerGain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.01);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        shimmer.start(now);
        shimmer.stop(now + 0.4);
        break;
      }

      case 'breeze': {
        // Smooth ascending glide from 440 Hz (A4) to 659.25 Hz (E5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.85, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }

      case 'pop': {
        // Tactile micro-blip pitch dive from 750 Hz to 200 Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      case 'ping': {
        // Crisp 880 Hz (A5) digital ping with tight envelope
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
        break;
      }

      case 'zen': {
        // Deep singing bowl: 329.6 Hz (E4) + 493.88 Hz (B4) with rich warm ring
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(329.6, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.9, now + 0.03);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.85);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(493.88, now + 0.02);
        gain2.gain.setValueAtTime(0, now + 0.02);
        gain2.gain.linearRampToValueAtTime(volume * 0.35, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.02);
        osc2.stop(now + 0.7);
        break;
      }

      case 'celestial': {
        // F#5 (739.99), A#5 (932.33), C#6 (1108.73) dreamy major triad
        const notes = [739.99, 932.33, 1108.73];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startOffset = idx * 0.04;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + startOffset);
          gain.gain.setValueAtTime(0, now + startOffset);
          gain.gain.linearRampToValueAtTime(volume * 0.6, now + startOffset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + 0.6);
        });
        break;
      }

      case 'ripple': {
        // Fast 3-note ascending cascade: 523.25, 659.25, 783.99
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startOffset = idx * 0.035;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + startOffset);
          gain.gain.setValueAtTime(0, now + startOffset);
          gain.gain.linearRampToValueAtTime(volume * 0.75, now + startOffset + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + 0.22);
        });
        break;
      }

      case 'marimba': {
        // Organic wooden double tap: 440 Hz -> 554.37 Hz
        [440, 554.37].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startOffset = idx * 0.07;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + startOffset);
          gain.gain.setValueAtTime(0, now + startOffset);
          gain.gain.linearRampToValueAtTime(volume * 0.85, now + startOffset + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + 0.28);
        });
        break;
      }

      case 'apex': {
        // Dynamic modern tech fanfare: 587.33 (D5) -> 880 (A5) -> 1174.66 (D6)
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startOffset = idx * 0.045;
          osc.type = idx === 2 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now + startOffset);
          gain.gain.setValueAtTime(0, now + startOffset);
          gain.gain.linearRampToValueAtTime(volume * (idx === 2 ? 0.9 : 0.6), now + startOffset + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + 0.45);
        });
        break;
      }
    }

    // Clean up AudioContext
    setTimeout(() => {
      try {
        ctx.close();
      } catch (_) {}
    }, 1200);
  } catch (e) {
    console.warn('[AudioNotification] Chime playback inhibited:', e);
  }
}

/**
 * Backward compatibility alias for email chimes
 */
export function playEmailNotificationSound(volume = 0.22) {
  playChimeSound('aurora', volume);
}

/**
 * Backward compatibility alias for chat chimes
 */
export function playChatNotificationSound(volume = 0.25) {
  playChimeSound('apex', volume);
}

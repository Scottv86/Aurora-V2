/**
 * Synthesizes a subtle, pleasant incoming email chime using Web Audio API
 */
export function playEmailNotificationSound(volume = 0.22) {
  try {
    const isMuted = localStorage.getItem('aurora_sound_muted') === 'true';
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Harmonic Note 1: 523.25 Hz (C5)
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

    // Harmonic Note 2: 659.25 Hz (E5) (plays slightly delayed for chime feel)
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

    // Harmonic Note 3 (Sparkle overtone): 1046.5 Hz (C6)
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

    // Clean up AudioContext after sound finishes
    setTimeout(() => {
      try {
        ctx.close();
      } catch (_) {}
    }, 1000);
  } catch (e) {
    console.warn('[AudioNotification] Sound playback inhibited:', e);
  }
}

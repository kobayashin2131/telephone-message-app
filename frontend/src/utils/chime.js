// A short two-tone chime synthesized with the Web Audio API — no audio
// file to load, works the moment the tab has had one user interaction.
let audioCtx = null;

export function playChime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    [{ freq: 880, start: 0 }, { freq: 1108.73, start: 0.12 }].forEach(({ freq, start }) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.22, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.55);
    });
  } catch (e) {
    console.error('chime playback failed', e);
  }
}

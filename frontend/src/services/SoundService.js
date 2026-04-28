/**
 * SoundService.js
 * Generates alert chimes using Web Audio API — zero dependencies, no audio files.
 * Different tones for different urgency levels.
 */

class SoundService {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _getContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  _playTone(frequency, duration, gain = 0.4, type = 'sine', delay = 0) {
    try {
      const ctx = this._getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.05);
    } catch (e) {
      console.warn('SoundService: could not play tone', e);
    }
  }

  /**
   * Play alert based on urgency level
   * @param {string} urgency - 'critical' | 'high' | 'medium' | 'low'
   */
  playAlert(urgency = 'medium') {
    if (!this.enabled) return;

    switch (urgency) {
      case 'critical':
        // Urgent descending three-tone chime (emergency siren feel)
        this._playTone(1046, 0.18, 0.5, 'square', 0.0);
        this._playTone(880,  0.18, 0.5, 'square', 0.2);
        this._playTone(698,  0.30, 0.5, 'square', 0.4);
        break;

      case 'high':
        // Two-tone alert ping
        this._playTone(880, 0.15, 0.35, 'sine', 0.0);
        this._playTone(1046, 0.25, 0.35, 'sine', 0.18);
        break;

      case 'medium':
        // Single soft notification ping
        this._playTone(698, 0.25, 0.25, 'sine', 0.0);
        break;

      case 'low':
      default:
        // Very soft blip
        this._playTone(523, 0.15, 0.15, 'sine', 0.0);
        break;
    }
  }

  /** Play a success chime (event posted) */
  playSuccess() {
    if (!this.enabled) return;
    this._playTone(523, 0.1, 0.2, 'sine', 0.0);
    this._playTone(659, 0.1, 0.2, 'sine', 0.12);
    this._playTone(784, 0.2, 0.2, 'sine', 0.24);
  }

  /** Play error sound */
  playError() {
    if (!this.enabled) return;
    this._playTone(220, 0.3, 0.3, 'sawtooth', 0.0);
  }

  /** Mute/unmute all sounds */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = val;
  }
}

const soundService = new SoundService();
export default soundService;

/**
 * TTSService.js
 * Text-to-Speech service using browser's Web Speech API.
 * Provides accessibility features for incident reports.
 */

class TTSService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isSpeaking = false;
    this.currentUtterance = null;
    
    // Check if TTS is supported
    this.isSupported = 'speechSynthesis' in window;
    
    if (!this.isSupported) {
      console.warn('Text-to-Speech not supported in this browser');
    }
  }

  /**
   * Speak text aloud
   * @param {string} text - Text to speak
   * @param {Object} options - Speech options
   * @returns {Promise} Resolves when speech completes
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Text-to-Speech not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      utterance.lang = options.lang || 'en-US';
      
      // Try to find a good voice
      const voices = this.synth.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Samantha') ||
        v.name.includes('Microsoft')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Event handlers
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.currentUtterance = utterance;
        if (options.onStart) options.onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (options.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (options.onError) options.onError(event);
        reject(new Error(`Speech error: ${event.error}`));
      };

      // Start speaking
      this.synth.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this.isSupported && this.synth.speaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Pause speech
   */
  pause() {
    if (this.isSupported) {
      this.synth.pause();
    }
  }

  /**
   * Resume speech
   */
  resume() {
    if (this.isSupported) {
      this.synth.resume();
    }
  }

  /**
   * Read an incident summary
   * @param {Object} event - Event object
   * @returns {Promise}
   */
  async readIncident(event) {
    const trustLevel = this.getTrustDescription(event.user_reputation);
    const ageMinutes = Math.floor((Date.now() - event.timestamp) / 60000);
    const ageText = ageMinutes === 0 ? 'just now' : `${ageMinutes} minutes ago`;
    
    const summary = `${event.type} incident reported ${ageText}. ${event.text}. This report has a trust level of ${trustLevel}. ${event.confirmations} people confirmed this incident, and ${event.fakes} people reported it as fake.`;
    
    return this.speak(summary, {
      rate: 0.9,
      pitch: 1.0
    });
  }

  /**
   * Get trust level description
   * @param {number} score - Reputation score
   * @returns {string} Description
   */
  getTrustDescription(score) {
    if (score >= 0.8) return 'highly trusted';
    if (score >= 0.5) return 'moderately trusted';
    return 'unverified';
  }

  /**
   * Get available voices
   * @returns {Array} Available voices
   */
  getVoices() {
    if (!this.isSupported) return [];
    return this.synth.getVoices();
  }

  /**
   * Check if currently speaking
   * @returns {boolean}
   */
  getIsSpeaking() {
    return this.isSpeaking;
  }

  /**
   * Announce a short alert
   * @param {string} message - Alert message
   */
  async alert(message) {
    return this.speak(message, {
      rate: 1.1,
      pitch: 1.1
    });
  }
}

export default TTSService;

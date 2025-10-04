/**
 * T009: Voice Input Component
 * 
 * Voice-to-text input using Web Speech API
 * Features:
 * - Real-time transcription
 * - Browser Speech Recognition API
 * - Fallback to manual typing
 * - Visual feedback during recording
 * - Auto-save transcript
 */

import { getEventBus } from '../events-utility.js';

/**
 * Voice Input class
 */
class VoiceInput {
  constructor() {
    this.eventBus = getEventBus();
    this.recognition = null;
    this.isListening = false;
    this.transcript = '';
    this.interimTranscript = '';
    this.isSupported = this._checkSupport();
    this.onTranscriptUpdateCallback = null;
    this.onTranscriptCompleteCallback = null;
    this.onErrorCallback = null;
    
    if (this.isSupported) {
      this._initializeRecognition();
    }
  }

  /**
   * Check if browser supports Speech Recognition
   * @returns {boolean}
   * @private
   */
  _checkSupport() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Initialize Speech Recognition
   * @private
   */
  _initializeRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Handle results
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      this.interimTranscript = interimTranscript;
      
      if (finalTranscript) {
        this.transcript += finalTranscript;
      }

      // Emit update event
      if (this.onTranscriptUpdateCallback) {
        this.onTranscriptUpdateCallback({
          transcript: this.transcript,
          interim: this.interimTranscript
        });
      }

      this.eventBus.emit('voice-transcript-update', {
        transcript: this.transcript,
        interim: this.interimTranscript
      });
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      const errorMessage = this._getErrorMessage(event.error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }

      this.eventBus.emit('voice-input-error', {
        error: event.error,
        message: errorMessage
      });

      // Stop listening on error
      this.isListening = false;
    };

    // Handle end
    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart if we're still supposed to be listening
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Failed to restart recognition:', error);
          this.isListening = false;
        }
      } else {
        // Emit complete event
        if (this.onTranscriptCompleteCallback) {
          this.onTranscriptCompleteCallback(this.transcript);
        }

        this.eventBus.emit('voice-transcript-complete', {
          transcript: this.transcript
        });
      }
    };

    // Handle start
    this.recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      this.eventBus.emit('voice-input-started');
    };
  }

  /**
   * Get user-friendly error message
   * @param {string} error - Error type
   * @returns {string}
   * @private
   */
  _getErrorMessage(error) {
    const errorMessages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not found or not accessible.',
      'not-allowed': 'Microphone access denied. Please allow microphone access.',
      'network': 'Network error. Check your internet connection.',
      'aborted': 'Voice input was aborted.',
      'service-not-allowed': 'Speech recognition service not available.'
    };

    return errorMessages[error] || 'An error occurred during voice input.';
  }

  /**
   * Start listening for voice input
   * @returns {Promise<void>}
   */
  async startListening() {
    if (!this.isSupported) {
      throw new Error('Speech recognition not supported in this browser');
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    // Reset transcript
    this.transcript = '';
    this.interimTranscript = '';

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('🎤 Started listening');
    } catch (error) {
      console.error('Failed to start recognition:', error);
      throw new Error('Failed to start voice input: ' + error.message);
    }
  }

  /**
   * Stop listening for voice input
   */
  stopListening() {
    if (!this.isListening) {
      console.warn('Not currently listening');
      return;
    }

    this.isListening = false;
    
    if (this.recognition) {
      this.recognition.stop();
      console.log('🛑 Stopped listening');
    }
  }

  /**
   * Toggle listening state
   * @returns {Promise<void>}
   */
  async toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      await this.startListening();
    }
  }

  /**
   * Get current transcript
   * @returns {string}
   */
  getTranscript() {
    return this.transcript;
  }

  /**
   * Get interim (in-progress) transcript
   * @returns {string}
   */
  getInterimTranscript() {
    return this.interimTranscript;
  }

  /**
   * Clear transcript
   */
  clearTranscript() {
    this.transcript = '';
    this.interimTranscript = '';
  }

  /**
   * Check if speech recognition is supported
   * @returns {boolean}
   */
  isVoiceInputSupported() {
    return this.isSupported;
  }

  /**
   * Check if currently listening
   * @returns {boolean}
   */
  isCurrentlyListening() {
    return this.isListening;
  }

  /**
   * Set callback for transcript updates
   * @param {Function} callback
   */
  onTranscriptUpdate(callback) {
    this.onTranscriptUpdateCallback = callback;
  }

  /**
   * Set callback for transcript complete
   * @param {Function} callback
   */
  onTranscriptComplete(callback) {
    this.onTranscriptCompleteCallback = callback;
  }

  /**
   * Set callback for errors
   * @param {Function} callback
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Request microphone permissions
   * @returns {Promise<boolean>}
   */
  async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Create voice input UI button
   * @param {Object} options - Configuration options
   * @returns {HTMLElement}
   */
  createButton(options = {}) {
    const {
      label = '🎤 Voice Input',
      className = 'voice-input-btn',
      onClick = null
    } = options;

    const button = document.createElement('button');
    button.className = `btn ${className}`;
    button.innerHTML = label;
    button.disabled = !this.isSupported;
    
    if (!this.isSupported) {
      button.title = 'Voice input not supported in this browser';
    } else {
      button.title = 'Click to start voice input';
    }

    button.addEventListener('click', async () => {
      if (onClick) {
        onClick();
      } else {
        await this.toggleListening();
        
        // Update button appearance
        if (this.isListening) {
          button.classList.add('listening');
          button.innerHTML = '⏹️ Stop';
          button.title = 'Click to stop recording';
        } else {
          button.classList.remove('listening');
          button.innerHTML = label;
          button.title = 'Click to start voice input';
        }
      }
    });

    return button;
  }

  /**
   * Create visual feedback element
   * @returns {HTMLElement}
   */
  createVisualFeedback() {
    const container = document.createElement('div');
    container.className = 'voice-input-feedback';
    container.style.display = 'none';

    container.innerHTML = `
      <div class="voice-input-indicator">
        <div class="pulse-ring"></div>
        <div class="pulse-ring"></div>
        <div class="pulse-ring"></div>
        <div class="microphone-icon">🎤</div>
      </div>
      <div class="voice-input-status">Listening...</div>
      <div class="voice-input-transcript">
        <div class="final-transcript"></div>
        <div class="interim-transcript"></div>
      </div>
    `;

    // Update visibility based on listening state
    this.eventBus.on('voice-input-started', () => {
      container.style.display = 'flex';
    });

    this.eventBus.on('voice-transcript-complete', () => {
      container.style.display = 'none';
    });

    this.eventBus.on('voice-input-error', () => {
      container.style.display = 'none';
    });

    // Update transcript display
    this.eventBus.on('voice-transcript-update', ({ transcript, interim }) => {
      const finalEl = container.querySelector('.final-transcript');
      const interimEl = container.querySelector('.interim-transcript');
      
      if (finalEl) finalEl.textContent = transcript;
      if (interimEl) interimEl.textContent = interim;
    });

    return container;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.isListening) {
      this.stopListening();
    }
    
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition.onstart = null;
    }
    
    this.onTranscriptUpdateCallback = null;
    this.onTranscriptCompleteCallback = null;
    this.onErrorCallback = null;
  }
}

// Export singleton and class
const voiceInput = new VoiceInput();

export default voiceInput;
export { VoiceInput };

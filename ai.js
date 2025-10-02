/**
 * T034-T036: AI Service Layer - src/js/ai.js
 * 
 * OpenAI GPT-4o-mini integration for AI-powered note tagging
 * Includes privacy protection, request queuing, and retry logic
 * 
 * Constitutional Requirements:
 * - 2-second timeout maximum
 * - Privacy-compliant data sanitization  
 * - Offline queueing capability
 * - Error handling with graceful degradation
 * 
 * Features:
 * - Automatic tag generation from note content
 * - PII detection and removal before API calls
 * - Rate limiting and request optimization
 * - Private mode support (AI bypass)
 * - Offline operation queuing with retry logic
 */

import { getEventBus, APPLICATION_EVENTS } from './events-utility.js';
import { measureOperation } from './performance-utility.js';
import db from './db.js';

/**
 * Privacy patterns to remove from content before AI processing
 * Constitutional requirement: Privacy by design
 */
const PRIVACY_PATTERNS = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (various formats)
  /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // Social Security Numbers
  /\b\d{3}-?\d{2}-?\d{4}\b/g,
  
  // Credit card numbers (basic pattern)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // IP addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // URLs (partial - remove domain info)
  /https?:\/\/[^\s]+/g,
  
  // Potential passwords or keys (strings of random chars)
  /\b[A-Za-z0-9+/]{20,}={0,2}\b/g,
  
  // VIN numbers (17 alphanumeric characters)
  /\b[A-HJ-NPR-Z0-9]{17}\b/g,
  
  // Bank account numbers (simplified pattern)
  /\b\d{8,17}\b/g
];

/**
 * AI Service Configuration
 */
const AI_CONFIG = {
  API_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
  MODEL: 'gpt-4o-mini',
  MAX_TOKENS: 100,
  TEMPERATURE: 0.3,
  TIMEOUT: 2000, // 2-second constitutional limit
  MAX_CONTENT_LENGTH: 4000, // Limit content size for API efficiency
  RETRY_DELAYS: [1000, 2000, 4000], // Progressive retry delays
  RATE_LIMIT_DELAY: 1000 // Minimum delay between requests
};

/**
 * AI Service class for tag generation and content processing
 */
export class AIService {
  constructor() {
    this.eventBus = getEventBus();
    this.isPrivateMode = false;
    this.apiKey = null;
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Load settings
    this._loadSettings();
  }

  /**
   * Load AI service settings from database
   * @private
   */
  async _loadSettings() {
    try {
      this.apiKey = await db.setting('ai_api_key');
      this.isPrivateMode = await db.setting('private_mode') || false;
      
      if (!this.apiKey && !this.isPrivateMode) {
        console.warn('AI API key not configured. AI features will be queued until key is provided.');
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  }

  /**
   * Set OpenAI API key
   * @param {string} apiKey - OpenAI API key
   */
  async setApiKey(apiKey) {
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('API key must be a non-empty string');
    }

    this.apiKey = apiKey.trim();
    await db.setting('ai_api_key', this.apiKey);
    
    this.eventBus.emit(APPLICATION_EVENTS.AI_REQUEST_COMPLETED, {
      type: 'configuration',
      success: true,
      message: 'API key configured successfully'
    });

    // Process any queued requests
    this._processQueue();
  }

  /**
   * Enable or disable private mode
   * @param {boolean} enabled - Whether private mode is enabled
   */
  async setPrivateMode(enabled) {
    this.isPrivateMode = Boolean(enabled);
    await db.setting('private_mode', this.isPrivateMode);
    
    if (this.isPrivateMode) {
      console.log('AI private mode enabled - AI requests will be bypassed');
    }
  }

  /**
   * Sanitize content for privacy compliance
   * @param {string} content - Content to sanitize
   * @returns {string} Sanitized content
   * @private
   */
  _sanitizeContent(content) {
    if (typeof content !== 'string') {
      return '';
    }

    let sanitized = content;

    // Apply privacy patterns
    for (const pattern of PRIVACY_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Limit content length for API efficiency
    if (sanitized.length > AI_CONFIG.MAX_CONTENT_LENGTH) {
      sanitized = sanitized.substring(0, AI_CONFIG.MAX_CONTENT_LENGTH) + '...';
    }

    return sanitized;
  }

  /**
   * Generate AI prompt for tag extraction
   * @param {string} title - Note title
   * @param {string} content - Note content (sanitized)
   * @returns {string} AI prompt
   * @private
   */
  _generateTagPrompt(title, content) {
    return `Analyze this note and suggest 3-5 relevant tags. Return ONLY a JSON array of lowercase tag strings, no explanation.

Title: ${title}
Content: ${content}

Tags should be:
- Single words or short phrases (2-3 words max)
- Relevant to the main topics/concepts
- Useful for organization and retrieval
- Lowercase with hyphens for multi-word tags

Example response: ["javascript", "web-development", "arrays", "tutorial"]`;
  }

  /**
   * Make API request to OpenAI
   * @param {string} prompt - AI prompt
   * @returns {Promise<Array>} Array of suggested tags
   * @private
   */
  async _makeApiRequest(prompt) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const requestData = {
      model: AI_CONFIG.MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: AI_CONFIG.MAX_TOKENS,
      temperature: AI_CONFIG.TEMPERATURE,
      response_format: { type: 'json_object' }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT);

    try {
      const response = await fetch(AI_CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in API response');
      }

      // Parse JSON response
      try {
        const tags = JSON.parse(content);
        if (!Array.isArray(tags)) {
          throw new Error('Response is not an array');
        }
        
        // Validate and clean tags
        return tags
          .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
          .map(tag => tag.toLowerCase().trim())
          .slice(0, 5); // Limit to 5 tags max
          
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON:', parseError);
        throw new Error('Invalid JSON response from AI');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('AI request timed out (2 second limit)');
      }
      
      throw error;
    }
  }

  /**
   * Enforce rate limiting between requests
   * @private
   */
  async _enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < AI_CONFIG.RATE_LIMIT_DELAY) {
      const waitTime = AI_CONFIG.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Generate tags for a note using AI
   * @param {Object} note - Note object with title and body
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Array of suggested tags
   */
  async generateTags(note, options = {}) {
    return await measureOperation('ai-request', async () => {
      const { force = false, skipQueue = false } = options;

      // Check private mode
      if (this.isPrivateMode && !force) {
        this.eventBus.emit(APPLICATION_EVENTS.AI_REQUEST_COMPLETED, {
          type: 'tag_generation',
          noteId: note.id,
          success: false,
          reason: 'private_mode',
          tags: []
        });
        return [];
      }

      // Validate input
      if (!note || !note.body) {
        throw new Error('Note body is required for tag generation');
      }

      // Sanitize content
      const sanitizedTitle = this._sanitizeContent(note.title || 'Untitled');
      const sanitizedBody = this._sanitizeContent(note.body);

      if (sanitizedBody.trim().length === 0) {
        throw new Error('Note content is empty after privacy sanitization');
      }

      this.eventBus.emit(APPLICATION_EVENTS.AI_REQUEST_STARTED, {
        type: 'tag_generation',
        noteId: note.id,
        contentLength: sanitizedBody.length
      });

      try {
        // Check if API key is available
        if (!this.apiKey) {
          if (skipQueue) {
            throw new Error('API key not configured and queue skipped');
          }
          
          // Queue for later processing
          await this._queueRequest('tag_generation', {
            noteId: note.id,
            title: sanitizedTitle,
            body: sanitizedBody
          });

          this.eventBus.emit(APPLICATION_EVENTS.AI_REQUEST_QUEUED, {
            type: 'tag_generation',
            noteId: note.id,
            reason: 'no_api_key'
          });

          return [];
        }

        // Rate limiting
        await this._enforceRateLimit();

        // Generate prompt and make request
        const prompt = this._generateTagPrompt(sanitizedTitle, sanitizedBody);
        const tags = await this._makeApiRequest(prompt);

        // Update tag index to mark as AI-generated
        for (const tag of tags) {
          const existing = await db.tag_index.get(tag.toLowerCase());
          if (existing) {
            await db.tag_index.update(tag, { is_ai_generated: true });
          }
        }

        this.eventBus.emit(APPLICATION_EVENTS.AI_REQUEST_COMPLETED, {
          type: 'tag_generation',
          noteId: note.id,
          success: true,
          tags,
          duration: Date.now() - this.lastRequestTime
        });

        return tags;

      } catch (error) {
        console.error('AI tag generation failed:', error);

        // Queue for retry if not a permanent failure
        if (!skipQueue && this._isRetryableError(error)) {
          await this._queueRequest('tag_generation', {
            noteId: note.id,
            title: sanitizedTitle,
            body: sanitizedBody,
            error: error.message
          });

          this.eventBus.emit(APPLICATION_EVENTS.AI_REQUEST_QUEUED, {
            type: 'tag_generation',
            noteId: note.id,
            reason: 'retry',
            error: error.message
          });
        } else {
          this.eventBus.emit(APPLICATION_EVENTS.AI_REQUEST_FAILED, {
            type: 'tag_generation',
            noteId: note.id,
            error: error.message
          });
        }

        throw error;
      }
    });
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} Whether error is retryable
   * @private
   */
  _isRetryableError(error) {
    const message = error.message.toLowerCase();
    
    // Non-retryable errors
    if (message.includes('invalid api key') || 
        message.includes('unauthorized') ||
        message.includes('insufficient_quota') ||
        message.includes('model_not_found')) {
      return false;
    }

    // Retryable errors (network, rate limits, timeouts, etc.)
    return true;
  }

  /**
   * Queue AI request for later processing
   * @param {string} type - Request type
   * @param {Object} data - Request data
   * @private
   */
  async _queueRequest(type, data) {
    await db.queueOperation({
      type: `ai_${type}`,
      data,
      delay: 0 // Process immediately when possible
    });
  }

  /**
   * Process queued AI requests
   * @private
   */
  async _processQueue() {
    if (this.isProcessingQueue || this.isPrivateMode || !this.apiKey) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const pendingOperations = await db.getPendingOperations();
      const aiOperations = pendingOperations.filter(op => 
        op.operation_type.startsWith('ai_')
      );

      for (const operation of aiOperations) {
        try {
          if (operation.operation_type === 'ai_tag_generation') {
            const { noteId, title, body } = operation.data;
            
            // Check if note still exists
            const note = await db.getNote(noteId);
            if (!note) {
              await db.completeOperation(operation.id);
              continue;
            }

            // Generate tags
            const tags = await this.generateTags(
              { id: noteId, title, body }, 
              { skipQueue: true }
            );

            if (tags.length > 0) {
              // Update note with generated tags
              const existingTags = note.tags || [];
              const newTags = [...new Set([...existingTags, ...tags])];
              
              await db.updateNote(noteId, { tags: newTags });
            }

            await db.completeOperation(operation.id);

          }
        } catch (error) {
          console.error('Failed to process queued AI operation:', error);
          
          const shouldRetry = await db.failOperation(operation.id, error.message);
          if (!shouldRetry) {
            console.error(`AI operation ${operation.id} failed permanently`);
          }
        }

        // Rate limiting between queued requests
        await new Promise(resolve => setTimeout(resolve, AI_CONFIG.RATE_LIMIT_DELAY));
      }

    } catch (error) {
      console.error('Error processing AI queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Start periodic queue processing
   */
  startQueueProcessing() {
    // Process queue every 30 seconds
    setInterval(() => {
      this._processQueue();
    }, 30000);

    // Initial processing
    this._processQueue();
  }

  /**
   * Test API configuration
   * @returns {Promise<Object>} Test result
   */
  async testConfiguration() {
    return await measureOperation('ai-request', async () => {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'API key not configured'
        };
      }

      try {
        const testPrompt = this._generateTagPrompt(
          'Test Note',
          'This is a simple test to verify AI integration is working correctly.'
        );

        await this._makeApiRequest(testPrompt);

        return {
          success: true,
          message: 'AI configuration is working correctly'
        };

      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  /**
   * Get AI service statistics
   * @returns {Promise<Object>} Service statistics
   */
  async getStatistics() {
    const queuedOperations = await db.sync_queue
      .where('operation_type')
      .startsWith('ai_')
      .and(op => op.status === 'pending')
      .count();

    const completedOperations = await db.sync_queue
      .where('operation_type')
      .startsWith('ai_')
      .and(op => op.status === 'completed')
      .count();

    const failedOperations = await db.sync_queue
      .where('operation_type')
      .startsWith('ai_')
      .and(op => op.status === 'failed')
      .count();

    return {
      isConfigured: Boolean(this.apiKey),
      isPrivateMode: this.isPrivateMode,
      queuedRequests: queuedOperations,
      completedRequests: completedOperations,
      failedRequests: failedOperations,
      isProcessingQueue: this.isProcessingQueue,
      lastRequestTime: this.lastRequestTime
    };
  }
}

// Create and export singleton instance
const aiService = new AIService();

// Start queue processing
aiService.startQueueProcessing();

export default aiService;
export { AIService };
/**
 * Chat Service
 * RAG-powered conversational interface using vector search and LLM
 */

import { generateULID } from '../ulid.js';
import db from '../db.js';
import aiService from '../ai.js';
import vectorSearch from './vector-search.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';

/**
 * Chat Service
 */
class ChatService {
  constructor() {
    this.eventBus = getEventBus();
    this.maxHistoryMessages = 10;
    this.rateLimit = {
      maxMessages: 5,
      windowMs: 60000, // 1 minute
      timestamps: []
    };
  }

  /**
   * Create new chat session
   * @param {object} options - Session options
   * @returns {Promise<string>} Session ID
   */
  async createSession(options = {}) {
    const sessionId = generateULID();
    
    const session = {
      id: sessionId,
      title: options.title || 'New Conversation',
      message_count: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      is_deleted: false,
      privateMode: options.privateMode || false
    };

    await db.chat_sessions.add(session);

    this.eventBus.emit(APPLICATION_EVENTS.CHAT_SESSION_CREATED, { sessionId, session });

    return sessionId;
  }

  /**
   * Get chat session
   * @param {string} sessionId - Session ID
   * @returns {Promise<object>} Session object
   */
  async getSession(sessionId) {
    return await db.chat_sessions.get(sessionId);
  }

  /**
   * List all sessions
   * @returns {Promise<Array>} Sessions sorted by recent activity
   */
  async listSessions() {
    const sessions = await db.chat_sessions
      .where('is_deleted')
      .equals(false)
      .toArray();

    // Sort by updated_at descending
    sessions.sort((a, b) => b.updated_at - a.updated_at);

    return sessions;
  }

  /**
   * Update session
   * @param {string} sessionId - Session ID
   * @param {object} updates - Fields to update
   */
  async updateSession(sessionId, updates) {
    await db.chat_sessions.update(sessionId, {
      ...updates,
      updated_at: Date.now()
    });
  }

  /**
   * Delete session and all its messages
   * @param {string} sessionId - Session ID
   */
  async deleteSession(sessionId) {
    // Soft delete session
    await db.chat_sessions.update(sessionId, {
      is_deleted: true,
      updated_at: Date.now()
    });

    // Delete all messages in session
    const messages = await db.chat_messages
      .where('session_id')
      .equals(sessionId)
      .toArray();

    for (const message of messages) {
      await db.chat_messages.delete(message.id);
    }

    this.eventBus.emit(APPLICATION_EVENTS.CHAT_SESSION_DELETED, { sessionId });
  }

  /**
   * Get messages for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Messages in chronological order
   */
  async getMessages(sessionId) {
    const messages = await db.chat_messages
      .where('session_id')
      .equals(sessionId)
      .toArray();

    // Sort by created_at ascending
    messages.sort((a, b) => a.created_at - b.created_at);

    return messages;
  }

  /**
   * Send message and get AI response
   * @param {string} sessionId - Session ID
   * @param {string} content - User message content
   * @returns {Promise<object>} AI response with metadata
   */
  async sendMessage(sessionId, content) {
    // Check rate limit
    this.checkRateLimit();

    // Validate input
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    try {
      // Save user message
      const userMessageId = generateULID();
      const userMessage = {
        id: userMessageId,
        session_id: sessionId,
        role: 'user',
        content: content.trim(),
        created_at: Date.now(),
        referenced_notes: [],
        referenced_files: []
      };

      await db.chat_messages.add(userMessage);

      // Build context from relevant documents
      const context = await this.buildContext(content);

      // Get conversation history
      const messages = await this.getMessages(sessionId);
      const recentMessages = messages.slice(-this.maxHistoryMessages);

      // Build prompt
      const prompt = await this.buildPrompt(content, recentMessages, context);

      // Call LLM
      const response = await aiService.generateCompletion(prompt.messages);

      // Save assistant message
      const assistantMessageId = generateULID();
      const assistantMessage = {
        id: assistantMessageId,
        session_id: sessionId,
        role: 'assistant',
        content: response,
        created_at: Date.now(),
        referenced_notes: context.noteIds,
        referenced_files: context.fileIds
      };

      await db.chat_messages.add(assistantMessage);

      // Update session
      await db.chat_sessions.update(sessionId, {
        message_count: (await this.getMessages(sessionId)).length,
        updated_at: Date.now()
      });

      // Auto-generate session title if this is the first exchange
      if (messages.length === 0) {
        await this.generateSessionTitle(sessionId, content);
      }

      this.eventBus.emit(APPLICATION_EVENTS.CHAT_MESSAGE_SENT, {
        sessionId,
        messageId: assistantMessageId
      });

      return {
        messageId: assistantMessageId,
        content: response,
        role: 'assistant',
        contextUsed: context.documents,
        sources: context.documents.map(doc => ({
          type: doc.source,
          id: doc.sourceId,
          title: doc.title
        }))
      };
    } catch (error) {
      console.error('Chat service error:', error);

      // Check for rate limit error
      if (error.message && error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait before sending more messages.');
      }

      throw error;
    }
  }

  /**
   * Stream message response (for future implementation)
   * @param {string} sessionId - Session ID
   * @param {string} content - User message
   * @param {object} options - Stream options
   */
  async streamMessage(sessionId, content, options = {}) {
    // Placeholder for streaming implementation
    // Would use Server-Sent Events or WebSocket
    throw new Error('Streaming not yet implemented. Use sendMessage() instead.');
  }

  /**
   * Build context from relevant documents using RAG
   * @param {string} query - User query
   * @param {object} options - Context options
   * @returns {Promise<object>} Context with documents
   */
  async buildContext(query, options = {}) {
    const { maxTokens = 2000 } = options;

    try {
      const context = await vectorSearch.getRelevantContext(query, {
        maxTokens,
        sources: ['notes', 'files']
      });

      // Extract IDs
      const noteIds = context.documents
        .filter(doc => doc.source === 'note')
        .map(doc => doc.sourceId);

      const fileIds = context.documents
        .filter(doc => doc.source === 'file')
        .map(doc => doc.sourceId);

      return {
        documents: context.documents,
        totalTokens: context.totalTokens,
        noteIds,
        fileIds
      };
    } catch (error) {
      console.warn('Failed to build context, continuing without:', error);
      return {
        documents: [],
        totalTokens: 0,
        noteIds: [],
        fileIds: []
      };
    }
  }

  /**
   * Build prompt with context and conversation history
   * @param {string} userMessage - Current user message
   * @param {Array} history - Recent message history
   * @param {object} context - RAG context
   * @returns {Promise<object>} Formatted prompt
   */
  async buildPrompt(userMessage, history, context) {
    // Build system message with context
    let systemContent = `You are Brain Assistant, a helpful AI that answers questions based on the user's personal notes and documents (their "second brain").

You have access to relevant context from their stored knowledge. When answering:
- Reference specific notes or files when you use information from them
- Be concise but thorough
- If the answer isn't in the provided context, you can still answer based on your general knowledge, but mention this
- Format code blocks with proper syntax highlighting
- Use bullet points and structure for clarity`;

    if (context.documents.length > 0) {
      systemContent += `\n\n## Current Relevant Context:\n\n`;
      
      for (const doc of context.documents) {
        systemContent += `### [${doc.title}]\n${doc.content}\n\n`;
      }
    } else {
      systemContent += `\n\nNote: No relevant context found in the user's notes for this query. Answer based on general knowledge.`;
    }

    // Build messages array
    const messages = [
      { role: 'system', content: systemContent }
    ];

    // Add conversation history (excluding system messages)
    for (const msg of history) {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    return { messages };
  }

  /**
   * Check rate limiting
   */
  checkRateLimit() {
    const now = Date.now();
    
    // Remove timestamps outside the window
    this.rateLimit.timestamps = this.rateLimit.timestamps.filter(
      ts => now - ts < this.rateLimit.windowMs
    );

    // Check if limit exceeded
    if (this.rateLimit.timestamps.length >= this.rateLimit.maxMessages) {
      throw new Error('Rate limit exceeded. Please wait before sending more messages.');
    }

    // Add current timestamp
    this.rateLimit.timestamps.push(now);
  }

  /**
   * Generate session title from first message
   * @param {string} sessionId - Session ID
   * @param {string} firstMessage - First user message
   */
  async generateSessionTitle(sessionId, firstMessage) {
    try {
      // Generate a short title (max 50 chars)
      const truncated = firstMessage.substring(0, 100);
      let title = truncated;

      // Try to use AI to generate a better title
      try {
        const prompt = `Generate a short (max 5 words) title for this conversation: "${truncated}"
        
Respond with just the title, no quotes or extra text.`;

        title = await aiService.generateCompletion([
          { role: 'user', content: prompt }
        ]);

        // Trim and limit length
        title = title.trim().substring(0, 50);
      } catch (error) {
        console.warn('Failed to generate AI title, using truncated message');
      }

      await this.updateSession(sessionId, { title });
    } catch (error) {
      console.error('Failed to generate session title:', error);
    }
  }

  /**
   * Export session to markdown
   * @param {string} sessionId - Session ID
   * @param {object} options - Export options
   * @returns {Promise<string>} Markdown content
   */
  async exportSession(sessionId, options = {}) {
    const {
      includeTimestamps = false,
      includeSources = false
    } = options;

    const session = await this.getSession(sessionId);
    const messages = await this.getMessages(sessionId);

    let markdown = `# ${session.title}\n\n`;
    markdown += `*Generated: ${new Date().toLocaleString()}*\n\n`;
    markdown += `---\n\n`;

    for (const message of messages) {
      const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
      markdown += `## ${role}\n\n`;

      if (includeTimestamps) {
        markdown += `*${new Date(message.created_at).toLocaleString()}*\n\n`;
      }

      markdown += `${message.content}\n\n`;

      if (includeSources && message.referenced_notes?.length > 0) {
        markdown += `**Sources:**\n`;
        for (const noteId of message.referenced_notes) {
          const note = await db.notes.get(noteId);
          if (note) {
            markdown += `- Note: ${note.title || 'Untitled'}\n`;
          }
        }
        for (const fileId of message.referenced_files || []) {
          const file = await db.files.get(fileId);
          if (file) {
            markdown += `- File: ${file.name}\n`;
          }
        }
        markdown += `\n`;
      }

      markdown += `---\n\n`;
    }

    return markdown;
  }
}

// Export singleton instance
const chatService = new ChatService();
export default chatService;

// Export individual methods for testing
export const createSession = (options) => chatService.createSession(options);
export const getSession = (sessionId) => chatService.getSession(sessionId);
export const listSessions = () => chatService.listSessions();
export const updateSession = (sessionId, updates) => chatService.updateSession(sessionId, updates);
export const deleteSession = (sessionId) => chatService.deleteSession(sessionId);
export const sendMessage = (sessionId, content) => chatService.sendMessage(sessionId, content);
export const getMessages = (sessionId) => chatService.getMessages(sessionId);
export const streamMessage = (sessionId, content, options) => chatService.streamMessage(sessionId, content, options);
export const buildContext = (query, options) => chatService.buildContext(query, options);
export const buildPrompt = (userMessage, history, context) => chatService.buildPrompt(userMessage, history, context);
export const exportSession = (sessionId, options) => chatService.exportSession(sessionId, options);

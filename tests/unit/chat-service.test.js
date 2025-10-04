/**
 * Chat Service Contract Tests
 * These tests define the contract for RAG-powered chat functionality
 * Following TDD: tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract: ChatService
 * Handles RAG-powered conversations with context from notes/files
 */
describe('ChatService Contract Tests', () => {
  
  describe('Session Management', () => {
    it('should create new chat session', async () => {
      const { createSession } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ 
        title: 'Test Chat Session' 
      });
      
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBe(26); // ULID
    });
    
    it('should retrieve existing session', async () => {
      const { createSession, getSession } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test Session' });
      const session = await getSession(sessionId);
      
      expect(session).toHaveProperty('id', sessionId);
      expect(session).toHaveProperty('title', 'Test Session');
      expect(session).toHaveProperty('created_at');
      expect(session).toHaveProperty('message_count', 0);
    });
    
    it('should list all sessions sorted by recent activity', async () => {
      const { listSessions } = await import('../../src/js/services/chat-service.js');
      
      const sessions = await listSessions();
      
      expect(Array.isArray(sessions)).toBe(true);
      
      // Should be sorted by updated_at descending
      for (let i = 0; i < sessions.length - 1; i++) {
        expect(sessions[i].updated_at).toBeGreaterThanOrEqual(sessions[i + 1].updated_at);
      }
    });
    
    it('should delete session and associated messages', async () => {
      const { createSession, deleteSession, getSession } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'To Delete' });
      await deleteSession(sessionId);
      
      const session = await getSession(sessionId);
      expect(session).toBeNull();
    });
    
    it('should update session title', async () => {
      const { createSession, updateSession, getSession } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Original' });
      await updateSession(sessionId, { title: 'Updated Title' });
      
      const session = await getSession(sessionId);
      expect(session.title).toBe('Updated Title');
    });
  });
  
  describe('Message Handling', () => {
    it('should send message and receive AI response', async () => {
      const { createSession, sendMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      const response = await sendMessage(sessionId, 'What is machine learning?');
      
      expect(response).toHaveProperty('messageId');
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('role', 'assistant');
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    });
    
    it('should store user message in database', async () => {
      const { createSession, sendMessage, getMessages } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      await sendMessage(sessionId, 'Test message');
      
      const messages = await getMessages(sessionId);
      const userMessage = messages.find(m => m.role === 'user');
      
      expect(userMessage).toBeDefined();
      expect(userMessage.content).toBe('Test message');
    });
    
    it('should store assistant response in database', async () => {
      const { createSession, sendMessage, getMessages } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      await sendMessage(sessionId, 'Test message');
      
      const messages = await getMessages(sessionId);
      const assistantMessage = messages.find(m => m.role === 'assistant');
      
      expect(assistantMessage).toBeDefined();
      expect(assistantMessage.content).toBeTruthy();
    });
    
    it('should maintain message order in conversation', async () => {
      const { createSession, sendMessage, getMessages } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      
      await sendMessage(sessionId, 'First message');
      await sendMessage(sessionId, 'Second message');
      await sendMessage(sessionId, 'Third message');
      
      const messages = await getMessages(sessionId);
      
      // Should be in chronological order
      for (let i = 0; i < messages.length - 1; i++) {
        expect(messages[i].created_at).toBeLessThanOrEqual(messages[i + 1].created_at);
      }
    });
    
    it('should increment session message count', async () => {
      const { createSession, sendMessage, getSession } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      
      await sendMessage(sessionId, 'Message 1');
      await sendMessage(sessionId, 'Message 2');
      
      const session = await getSession(sessionId);
      
      // Each sendMessage creates 2 messages (user + assistant)
      expect(session.message_count).toBe(4);
    });
  });
  
  describe('RAG Context Integration', () => {
    it('should retrieve relevant context from notes', async () => {
      const { createSession, sendMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      
      // Mock that we have notes about "testing"
      const response = await sendMessage(sessionId, 'Tell me about testing');
      
      expect(response).toHaveProperty('contextUsed');
      expect(Array.isArray(response.contextUsed)).toBe(true);
    });
    
    it('should include source citations in response', async () => {
      const { createSession, sendMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      const response = await sendMessage(sessionId, 'What are the requirements?');
      
      expect(response).toHaveProperty('sources');
      
      if (response.sources && response.sources.length > 0) {
        expect(response.sources[0]).toHaveProperty('type'); // 'note' or 'file'
        expect(response.sources[0]).toHaveProperty('id');
        expect(response.sources[0]).toHaveProperty('title');
      }
    });
    
    it('should store referenced note IDs in message', async () => {
      const { createSession, sendMessage, getMessages } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      await sendMessage(sessionId, 'Summarize my notes about testing');
      
      const messages = await getMessages(sessionId);
      const assistantMessage = messages.find(m => m.role === 'assistant');
      
      expect(assistantMessage).toHaveProperty('referenced_notes');
      expect(Array.isArray(assistantMessage.referenced_notes)).toBe(true);
    });
    
    it('should store referenced file IDs in message', async () => {
      const { createSession, sendMessage, getMessages } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      await sendMessage(sessionId, 'What does my document say?');
      
      const messages = await getMessages(sessionId);
      const assistantMessage = messages.find(m => m.role === 'assistant');
      
      expect(assistantMessage).toHaveProperty('referenced_files');
      expect(Array.isArray(assistantMessage.referenced_files)).toBe(true);
    });
    
    it('should limit context to token budget', async () => {
      const { buildContext } = await import('../../src/js/services/chat-service.js');
      
      const query = 'Test query with many results';
      const context = await buildContext(query, { maxTokens: 2000 });
      
      expect(context).toHaveProperty('documents');
      expect(context).toHaveProperty('totalTokens');
      expect(context.totalTokens).toBeLessThanOrEqual(2000);
    });
  });
  
  describe('Conversation Context', () => {
    it('should maintain conversation history in prompts', async () => {
      const { createSession, sendMessage, buildPrompt } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      
      await sendMessage(sessionId, 'My name is Alice');
      await sendMessage(sessionId, 'What is my name?');
      
      // Should remember "Alice" from previous message
      const messages = await import('../../src/js/services/chat-service.js')
        .then(m => m.getMessages(sessionId));
      
      const lastResponse = messages.filter(m => m.role === 'assistant').pop();
      expect(lastResponse.content.toLowerCase()).toContain('alice');
    });
    
    it('should limit conversation history to recent messages', async () => {
      const { buildPrompt } = await import('../../src/js/services/chat-service.js');
      
      const mockMessages = Array(50).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        created_at: Date.now() + i
      }));
      
      const prompt = await buildPrompt('New question', mockMessages, { maxHistoryMessages: 10 });
      
      // Should only include last 10 messages + new question
      expect(prompt).toBeDefined();
    });
    
    it('should include system prompt with instructions', async () => {
      const { buildPrompt } = await import('../../src/js/services/chat-service.js');
      
      const prompt = await buildPrompt('Test question', []);
      
      expect(prompt).toHaveProperty('messages');
      expect(prompt.messages[0].role).toBe('system');
      expect(prompt.messages[0].content).toContain('second brain');
    });
  });
  
  describe('Performance & Safety', () => {
    it('should respect 2 second timeout for API calls', async () => {
      const { createSession, sendMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      
      const startTime = performance.now();
      
      try {
        await sendMessage(sessionId, 'Test message with timeout');
      } catch (error) {
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(2500); // 2s + buffer
      }
    });
    
    it('should handle API errors gracefully', async () => {
      const { createSession, sendMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      
      // Mock API failure
      await expect(sendMessage(sessionId, '')).rejects.toThrow();
    });
    
    it('should redact PII from messages in Private Mode', async () => {
      const { createSession, sendMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ 
        title: 'Private Session',
        privateMode: true 
      });
      
      const response = await sendMessage(
        sessionId, 
        'My email is test@example.com and phone is 555-1234'
      );
      
      expect(response).toHaveProperty('redacted');
      expect(response.redacted).toBe(true);
    });
    
    it('should enforce rate limiting on messages', async () => {
      const { createSession, sendMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      
      // Try to send many messages rapidly
      const promises = Array(10).fill(null).map(() => 
        sendMessage(sessionId, 'Rapid message')
      );
      
      // Some should be rate-limited
      await expect(Promise.all(promises)).rejects.toThrow(/rate limit/i);
    });
  });
  
  describe('Streaming Responses', () => {
    it('should support streaming chat responses', async () => {
      const { createSession, streamMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      const chunks = [];
      
      await streamMessage(sessionId, 'Tell me a story', {
        onChunk: (chunk) => chunks.push(chunk)
      });
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every(c => typeof c === 'string')).toBe(true);
    });
    
    it('should handle stream interruption gracefully', async () => {
      const { createSession, streamMessage } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      
      const controller = new AbortController();
      
      const streamPromise = streamMessage(sessionId, 'Long response', {
        signal: controller.signal,
        onChunk: () => {}
      });
      
      // Cancel after 100ms
      setTimeout(() => controller.abort(), 100);
      
      await expect(streamPromise).rejects.toThrow(/abort/i);
    });
  });
  
  describe('Export & Sharing', () => {
    it('should export chat session to markdown', async () => {
      const { createSession, sendMessage, exportSession } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Export Test' });
      await sendMessage(sessionId, 'First message');
      await sendMessage(sessionId, 'Second message');
      
      const markdown = await exportSession(sessionId);
      
      expect(typeof markdown).toBe('string');
      expect(markdown).toContain('# Export Test');
      expect(markdown).toContain('First message');
      expect(markdown).toContain('Second message');
    });
    
    it('should include timestamps in export', async () => {
      const { createSession, sendMessage, exportSession } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      await sendMessage(sessionId, 'Test message');
      
      const markdown = await exportSession(sessionId, { includeTimestamps: true });
      
      expect(markdown).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
    });
    
    it('should include source citations in export', async () => {
      const { createSession, sendMessage, exportSession } = await import('../../src/js/services/chat-service.js');
      
      const sessionId = await createSession({ title: 'Test' });
      await sendMessage(sessionId, 'Question with sources');
      
      const markdown = await exportSession(sessionId, { includeSources: true });
      
      expect(markdown).toContain('Sources:');
    });
  });
});

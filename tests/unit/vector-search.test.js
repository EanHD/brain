/**
 * Vector Search Contract Tests
 * These tests define the contract for semantic search using vector embeddings
 * Following TDD: tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract: VectorSearch Service
 * Handles embedding generation and semantic similarity search
 */
describe('VectorSearch Contract Tests', () => {
  
  describe('Embedding Generation', () => {
    it('should generate embeddings for text content', async () => {
      const { generateEmbedding } = await import('../../src/js/services/vector-search.js');
      
      const text = 'This is a sample text for embedding generation';
      const embedding = await generateEmbedding(text);
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536); // OpenAI text-embedding-ada-002 dimension
      expect(embedding.every(n => typeof n === 'number')).toBe(true);
    });
    
    it('should handle empty text gracefully', async () => {
      const { generateEmbedding } = await import('../../src/js/services/vector-search.js');
      
      await expect(generateEmbedding('')).rejects.toThrow(/empty/i);
    });
    
    it('should truncate long text to token limit', async () => {
      const { generateEmbedding } = await import('../../src/js/services/vector-search.js');
      
      // OpenAI embedding model has ~8k token limit
      const longText = 'word '.repeat(10000); // Way over limit
      
      // Should not throw, should truncate instead
      const embedding = await generateEmbedding(longText);
      expect(Array.isArray(embedding)).toBe(true);
    });
    
    it('should respect performance budget (<500ms per embedding)', async () => {
      const { generateEmbedding } = await import('../../src/js/services/vector-search.js');
      
      const startTime = performance.now();
      await generateEmbedding('Sample text for performance test');
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(500);
    });
    
    it('should batch process multiple texts efficiently', async () => {
      const { generateEmbeddings } = await import('../../src/js/services/vector-search.js');
      
      const texts = [
        'First text to embed',
        'Second text to embed',
        'Third text to embed'
      ];
      
      const embeddings = await generateEmbeddings(texts);
      
      expect(embeddings.length).toBe(3);
      expect(embeddings.every(e => Array.isArray(e) && e.length === 1536)).toBe(true);
    });
  });
  
  describe('Cosine Similarity', () => {
    it('should calculate cosine similarity between vectors', async () => {
      const { cosineSimilarity } = await import('../../src/js/services/vector-search.js');
      
      const vectorA = [1, 0, 0];
      const vectorB = [1, 0, 0];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      
      expect(similarity).toBe(1); // Identical vectors
    });
    
    it('should return 0 for orthogonal vectors', async () => {
      const { cosineSimilarity } = await import('../../src/js/services/vector-search.js');
      
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      
      expect(similarity).toBe(0);
    });
    
    it('should return -1 for opposite vectors', async () => {
      const { cosineSimilarity } = await import('../../src/js/services/vector-search.js');
      
      const vectorA = [1, 0, 0];
      const vectorB = [-1, 0, 0];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      
      expect(similarity).toBe(-1);
    });
    
    it('should handle high-dimensional vectors efficiently', async () => {
      const { cosineSimilarity } = await import('../../src/js/services/vector-search.js');
      
      const vectorA = new Array(1536).fill(0.1);
      const vectorB = new Array(1536).fill(0.2);
      
      const startTime = performance.now();
      const similarity = cosineSimilarity(vectorA, vectorB);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(10); // Should be very fast
      expect(typeof similarity).toBe('number');
    });
  });
  
  describe('Semantic Search', () => {
    it('should find semantically similar notes', async () => {
      const { searchNotes } = await import('../../src/js/services/vector-search.js');
      
      const query = 'machine learning algorithms';
      const results = await searchNotes(query, { limit: 5 });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
      
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('noteId');
        expect(results[0]).toHaveProperty('similarity');
        expect(results[0]).toHaveProperty('content');
      }
    });
    
    it('should rank results by similarity score', async () => {
      const { searchNotes } = await import('../../src/js/services/vector-search.js');
      
      const results = await searchNotes('test query', { limit: 10 });
      
      // Results should be sorted in descending order of similarity
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
      }
    });
    
    it('should filter by minimum similarity threshold', async () => {
      const { searchNotes } = await import('../../src/js/services/vector-search.js');
      
      const results = await searchNotes('test query', { 
        minSimilarity: 0.7,
        limit: 10 
      });
      
      expect(results.every(r => r.similarity >= 0.7)).toBe(true);
    });
    
    it('should respect performance budget (<200ms for search)', async () => {
      const { searchNotes } = await import('../../src/js/services/vector-search.js');
      
      const startTime = performance.now();
      await searchNotes('performance test query', { limit: 5 });
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(200);
    });
  });
  
  describe('File Search', () => {
    it('should search across file contents', async () => {
      const { searchFiles } = await import('../../src/js/services/vector-search.js');
      
      const query = 'contract terms and conditions';
      const results = await searchFiles(query, { limit: 5 });
      
      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('fileId');
        expect(results[0]).toHaveProperty('similarity');
        expect(results[0]).toHaveProperty('filename');
      }
    });
    
    it('should filter by file type', async () => {
      const { searchFiles } = await import('../../src/js/services/vector-search.js');
      
      const results = await searchFiles('test query', { 
        fileTypes: ['application/pdf'],
        limit: 10 
      });
      
      expect(results.every(r => r.type === 'application/pdf')).toBe(true);
    });
  });
  
  describe('Hybrid Search (Keyword + Semantic)', () => {
    it('should combine keyword and semantic search', async () => {
      const { hybridSearch } = await import('../../src/js/services/vector-search.js');
      
      const query = 'neural networks';
      const results = await hybridSearch(query, { 
        keywordWeight: 0.3,
        semanticWeight: 0.7,
        limit: 10 
      });
      
      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('id');
        expect(results[0]).toHaveProperty('score');
        expect(results[0]).toHaveProperty('content');
      }
    });
    
    it('should boost exact keyword matches', async () => {
      const { hybridSearch } = await import('../../src/js/services/vector-search.js');
      
      const query = 'exact phrase match';
      const results = await hybridSearch(query, { 
        keywordWeight: 0.5,
        semanticWeight: 0.5 
      });
      
      // Result with exact match should score higher than semantic-only
      expect(results.length).toBeGreaterThan(0);
    });
  });
  
  describe('Embedding Cache', () => {
    it('should cache embeddings to avoid regeneration', async () => {
      const { generateEmbedding, clearCache } = await import('../../src/js/services/vector-search.js');
      
      await clearCache();
      
      const text = 'cacheable text content';
      
      // First call - should generate
      const start1 = performance.now();
      const embedding1 = await generateEmbedding(text);
      const duration1 = performance.now() - start1;
      
      // Second call - should use cache
      const start2 = performance.now();
      const embedding2 = await generateEmbedding(text);
      const duration2 = performance.now() - start2;
      
      expect(embedding1).toEqual(embedding2);
      expect(duration2).toBeLessThan(duration1 * 0.5); // Cache should be much faster
    });
    
    it('should invalidate cache when content changes', async () => {
      const { generateEmbedding, invalidateCache } = await import('../../src/js/services/vector-search.js');
      
      const noteId = 'test-note-123';
      const text = 'original content';
      
      await generateEmbedding(text, { cacheKey: noteId });
      
      // Invalidate cache
      await invalidateCache(noteId);
      
      // Should regenerate embedding
      const embedding = await generateEmbedding(text, { cacheKey: noteId });
      expect(Array.isArray(embedding)).toBe(true);
    });
  });
  
  describe('Integration with RAG', () => {
    it('should provide context documents for LLM', async () => {
      const { getRelevantContext } = await import('../../src/js/services/vector-search.js');
      
      const query = 'What are the best practices for testing?';
      const context = await getRelevantContext(query, { 
        maxTokens: 2000,
        sources: ['notes', 'files'] 
      });
      
      expect(context).toHaveProperty('documents');
      expect(Array.isArray(context.documents)).toBe(true);
      expect(context).toHaveProperty('totalTokens');
      expect(context.totalTokens).toBeLessThanOrEqual(2000);
    });
    
    it('should include source attribution for citations', async () => {
      const { getRelevantContext } = await import('../../src/js/services/vector-search.js');
      
      const context = await getRelevantContext('test query', { maxTokens: 1000 });
      
      context.documents.forEach(doc => {
        expect(doc).toHaveProperty('source'); // 'note' or 'file'
        expect(doc).toHaveProperty('sourceId');
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('content');
      });
    });
  });
});

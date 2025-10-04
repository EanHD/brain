/**
 * Vector Search Service
 * Handles semantic search using embeddings and cosine similarity
 */

import aiService from '../ai.js';
import db from '../db.js';
import Fuse from 'fuse.js';

// Cache for embeddings to avoid regeneration
const embeddingCache = new Map();

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vectorA - First vector
 * @param {number[]} vectorB - Second vector
 * @returns {number} Similarity score between -1 and 1
 */
export function cosineSimilarity(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Generate embedding for text using OpenAI API
 * @param {string} text - Text to embed
 * @param {object} options - Options (cacheKey, etc.)
 * @returns {Promise<number[]>} Embedding vector
 */
export async function generateEmbedding(text, options = {}) {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  // Check cache first
  const cacheKey = options.cacheKey || text;
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }

  try {
    // Truncate text if too long (OpenAI has ~8k token limit)
    const maxChars = 8000 * 4; // Rough estimate: 4 chars per token
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

    // Call OpenAI embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiService.apiKey}`
      },
      body: JSON.stringify({
        input: truncatedText,
        model: 'text-embedding-3-small'
      }),
      signal: AbortSignal.timeout(500) // 500ms timeout
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    // Cache the result
    embeddingCache.set(cacheKey, embedding);

    return embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function generateEmbeddings(texts) {
  const embeddings = [];
  
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Search notes using semantic similarity
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} Search results
 */
export async function searchNotes(query, options = {}) {
  const {
    limit = 10,
    minSimilarity = 0.5
  } = options;

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Get all non-deleted notes
    const notes = await db.notes
      .where('is_deleted')
      .equals(false)
      .toArray();

    // Calculate similarity for each note
    const results = [];
    
    for (const note of notes) {
      // Generate embedding for note content if not cached
      const noteText = `${note.title || ''} ${note.content || ''}`.trim();
      if (!noteText) continue;

      try {
        const noteEmbedding = await generateEmbedding(noteText, { 
          cacheKey: `note_${note.id}` 
        });

        const similarity = cosineSimilarity(queryEmbedding, noteEmbedding);

        if (similarity >= minSimilarity) {
          results.push({
            noteId: note.id,
            similarity,
            content: note.content,
            title: note.title,
            tags: note.tags || [],
            created_at: note.created_at,
            updated_at: note.updated_at
          });
        }
      } catch (error) {
        console.warn(`Failed to process note ${note.id}:`, error);
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  } catch (error) {
    console.error('Note search error:', error);
    throw error;
  }
}

/**
 * Search files using semantic similarity
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} Search results
 */
export async function searchFiles(query, options = {}) {
  const {
    limit = 10,
    minSimilarity = 0.5,
    fileTypes = []
  } = options;

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Get all non-deleted files
    let filesQuery = db.files.where('is_deleted').equals(false);
    const files = await filesQuery.toArray();

    // Filter by file type if specified
    const filteredFiles = fileTypes.length > 0
      ? files.filter(file => fileTypes.includes(file.type))
      : files;

    // Calculate similarity for each file
    const results = [];
    
    for (const file of filteredFiles) {
      const fileText = `${file.name} ${file.extracted_text || ''}`.trim();
      if (!fileText) continue;

      try {
        const fileEmbedding = await generateEmbedding(fileText, {
          cacheKey: `file_${file.id}`
        });

        const similarity = cosineSimilarity(queryEmbedding, fileEmbedding);

        if (similarity >= minSimilarity) {
          results.push({
            fileId: file.id,
            similarity,
            filename: file.name,
            type: file.type,
            size: file.size,
            created_at: file.created_at,
            updated_at: file.updated_at
          });
        }
      } catch (error) {
        console.warn(`Failed to process file ${file.id}:`, error);
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  } catch (error) {
    console.error('File search error:', error);
    throw error;
  }
}

/**
 * Hybrid search combining keyword and semantic search
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} Combined search results
 */
export async function hybridSearch(query, options = {}) {
  const {
    keywordWeight = 0.3,
    semanticWeight = 0.7,
    limit = 10
  } = options;

  try {
    // Semantic search
    const semanticResults = await searchNotes(query, { limit: limit * 2 });

    // Keyword search using Fuse.js
    const notes = await db.notes
      .where('is_deleted')
      .equals(false)
      .toArray();

    const fuse = new Fuse(notes, {
      keys: ['title', 'content', 'tags'],
      includeScore: true,
      threshold: 0.4
    });

    const keywordResults = fuse.search(query);

    // Combine results with weighted scoring
    const combinedResults = new Map();

    // Add semantic results
    for (const result of semanticResults) {
      combinedResults.set(result.noteId, {
        ...result,
        score: result.similarity * semanticWeight
      });
    }

    // Add/merge keyword results
    for (const result of keywordResults) {
      const id = result.item.id;
      const keywordScore = (1 - result.score) * keywordWeight;

      if (combinedResults.has(id)) {
        const existing = combinedResults.get(id);
        existing.score += keywordScore;
      } else {
        combinedResults.set(id, {
          noteId: id,
          content: result.item.content,
          title: result.item.title,
          tags: result.item.tags || [],
          score: keywordScore
        });
      }
    }

    // Convert to array and sort by combined score
    const results = Array.from(combinedResults.values());
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  } catch (error) {
    console.error('Hybrid search error:', error);
    throw error;
  }
}

/**
 * Get relevant context documents for RAG
 * @param {string} query - Query text
 * @param {object} options - Options
 * @returns {Promise<object>} Context documents and metadata
 */
export async function getRelevantContext(query, options = {}) {
  const {
    maxTokens = 2000,
    sources = ['notes', 'files']
  } = options;

  const context = {
    documents: [],
    totalTokens: 0
  };

  try {
    // Search notes if requested
    if (sources.includes('notes')) {
      const noteResults = await searchNotes(query, { limit: 10 });
      
      for (const result of noteResults) {
        // Estimate tokens (rough: 4 chars per token)
        const contentTokens = Math.ceil((result.content || '').length / 4);
        
        if (context.totalTokens + contentTokens <= maxTokens) {
          context.documents.push({
            source: 'note',
            sourceId: result.noteId,
            title: result.title || 'Untitled',
            content: result.content,
            similarity: result.similarity
          });
          context.totalTokens += contentTokens;
        } else {
          break;
        }
      }
    }

    // Search files if requested
    if (sources.includes('files')) {
      const fileResults = await searchFiles(query, { limit: 5 });
      
      for (const result of fileResults) {
        const file = await db.files.get(result.fileId);
        const contentTokens = Math.ceil((file.extracted_text || '').length / 4);
        
        if (context.totalTokens + contentTokens <= maxTokens) {
          context.documents.push({
            source: 'file',
            sourceId: result.fileId,
            title: result.filename,
            content: file.extracted_text,
            similarity: result.similarity
          });
          context.totalTokens += contentTokens;
        } else {
          break;
        }
      }
    }

    return context;
  } catch (error) {
    console.error('Context retrieval error:', error);
    throw error;
  }
}

/**
 * Clear embedding cache
 */
export function clearCache() {
  embeddingCache.clear();
}

/**
 * Invalidate cache for specific item
 * @param {string} cacheKey - Cache key to invalidate
 */
export function invalidateCache(cacheKey) {
  embeddingCache.delete(cacheKey);
  embeddingCache.delete(`note_${cacheKey}`);
  embeddingCache.delete(`file_${cacheKey}`);
}

// Export default service object
export default {
  cosineSimilarity,
  generateEmbedding,
  generateEmbeddings,
  searchNotes,
  searchFiles,
  hybridSearch,
  getRelevantContext,
  clearCache,
  invalidateCache
};

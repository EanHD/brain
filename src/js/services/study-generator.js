/**
 * Study Session Generator
 * AI-powered study session creation with quizzes, flashcards, and learning paths
 * 
 * Features:
 * - Quiz generation from notes
 * - Topic clustering
 * - Learning path generation
 * - Flashcard creation
 */

import db from '../db.js';
import aiService from '../ai.js';
import vectorSearch from './vector-search.js';
import { getEventBus } from '../events-utility.js';
import { generateULID } from '../ulid.js';

/**
 * Study Generator class
 */
class StudyGenerator {
  constructor() {
    this.eventBus = getEventBus();
  }

  /**
   * Initialize study generator
   */
  async initialize() {
    console.log('✅ Study generator initialized');
  }

  /**
   * Generate quiz from notes
   * @param {string|Array<string>} topicOrTags - Topic or array of tags
   * @param {number} questionCount - Number of questions to generate
   * @returns {Promise<Object>} Quiz session
   */
  async generateQuiz(topicOrTags, questionCount = 10) {
    try {
      // Get relevant notes
      const notes = await this._getNotesForTopic(topicOrTags);
      
      if (notes.length === 0) {
        throw new Error('No notes found for topic');
      }
      
      // Combine note content
      const content = notes
        .map(note => `Title: ${note.title}\n${note.content}`)
        .join('\n\n---\n\n');
      
      // Generate questions using AI
      const prompt = `Based on the following notes, generate ${questionCount} quiz questions. 
      
Include a mix of:
- Multiple choice (4 options, 1 correct)
- True/False
- Short answer

Format as JSON array with structure:
[{
  "type": "multiple_choice" | "true_false" | "short_answer",
  "question": "question text",
  "options": ["A", "B", "C", "D"], // for multiple choice only
  "correct_answer": "answer",
  "explanation": "why this is correct"
}]

Notes:
${content.substring(0, 4000)}`;
      
      const response = await aiService.generateCompletion([
        { role: 'user', content: prompt }
      ], {
        maxTokens: 2000,
        temperature: 0.7
      });
      
      // Parse questions
      let questions;
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing quiz questions:', parseError);
        // Fallback: create simple questions from note titles
        questions = this._generateFallbackQuiz(notes, questionCount);
      }
      
      // Create study session
      const session = {
        id: generateULID(),
        type: 'quiz',
        topic: Array.isArray(topicOrTags) ? topicOrTags.join(', ') : topicOrTags,
        questions: questions.slice(0, questionCount),
        noteIds: notes.map(n => n.id),
        created_at: new Date().toISOString(),
        completed: false,
        score: null
      };
      
      // Store in database
      await db.study_sessions.add(session);
      
      return session;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }

  /**
   * Generate topic cluster
   * @param {string} tag - Tag to cluster around
   * @returns {Promise<Object>} Topic cluster with related notes
   */
  async generateTopicCluster(tag) {
    try {
      // Get notes with this tag
      const taggedNotes = await db.notes
        .filter(note => !note.is_deleted && note.tags && note.tags.includes(tag))
        .toArray();
      
      if (taggedNotes.length === 0) {
        throw new Error('No notes found with this tag');
      }
      
      // Use vector search to find similar notes
      const similarNotes = new Set();
      
      for (const note of taggedNotes.slice(0, 3)) { // Limit to 3 seed notes
        const results = await vectorSearch.search(note.content, { k: 5 });
        results.forEach(result => similarNotes.add(result.id));
      }
      
      // Get full note objects
      const clusterNoteIds = [...similarNotes];
      const clusterNotes = await db.notes.bulkGet(clusterNoteIds);
      
      // Filter out null results and deleted notes
      const validNotes = clusterNotes.filter(note => note && !note.is_deleted);
      
      // Create cluster
      return {
        tag,
        coreNotes: taggedNotes.map(n => ({
          id: n.id,
          title: n.title,
          tags: n.tags
        })),
        relatedNotes: validNotes
          .filter(n => !taggedNotes.find(tn => tn.id === n.id))
          .map(n => ({
            id: n.id,
            title: n.title,
            tags: n.tags
          })),
        totalNotes: validNotes.length
      };
    } catch (error) {
      console.error('Error generating topic cluster:', error);
      throw error;
    }
  }

  /**
   * Generate learning path
   * @param {string} goal - Learning goal
   * @returns {Promise<Object>} Learning path with ordered notes
   */
  async generateLearningPath(goal) {
    try {
      // Search for relevant notes
      const relevantNotes = await vectorSearch.search(goal, { k: 20 });
      
      if (relevantNotes.length === 0) {
        throw new Error('No relevant notes found for goal');
      }
      
      // Get full note content for top results
      const noteIds = relevantNotes.slice(0, 10).map(n => n.id);
      const notes = await db.notes.bulkGet(noteIds);
      
      // Use AI to suggest learning order
      const noteSummaries = notes
        .filter(n => n)
        .map(n => `${n.id}: ${n.title}\nTags: ${(n.tags || []).join(', ')}`)
        .join('\n\n');
      
      const prompt = `Given the learning goal "${goal}" and these notes:

${noteSummaries}

Suggest the optimal order to study these notes for maximum learning effectiveness.
Consider:
- Prerequisites (what should be learned first)
- Difficulty progression (easier concepts first)
- Logical flow of topics

Respond with JSON array of note IDs in recommended order:
["id1", "id2", "id3", ...]

Also identify any knowledge gaps that aren't covered by these notes.`;
      
      const response = await aiService.generateCompletion([
        { role: 'user', content: prompt }
      ], {
        maxTokens: 1000,
        temperature: 0.5
      });
      
      // Parse response
      let orderedIds;
      let knowledgeGaps = [];
      
      try {
        // Extract JSON array
        const jsonMatch = response.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          orderedIds = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: use original order
          orderedIds = noteIds;
        }
        
        // Extract knowledge gaps (simple heuristic)
        if (response.includes('gap') || response.includes('missing')) {
          const lines = response.split('\n');
          knowledgeGaps = lines
            .filter(line => line.toLowerCase().includes('gap') || line.toLowerCase().includes('missing'))
            .map(line => line.trim())
            .filter(line => line.length > 0);
        }
      } catch (parseError) {
        console.error('Error parsing learning path:', parseError);
        orderedIds = noteIds;
      }
      
      // Build learning path
      const orderedNotes = [];
      for (const id of orderedIds) {
        const note = notes.find(n => n && n.id === id);
        if (note) {
          orderedNotes.push({
            id: note.id,
            title: note.title,
            tags: note.tags || [],
            completed: false
          });
        }
      }
      
      return {
        goal,
        path: orderedNotes,
        knowledgeGaps,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating learning path:', error);
      throw error;
    }
  }

  /**
   * Create flashcards from notes
   * @param {Array<string>} noteIds - Note IDs to create flashcards from
   * @returns {Promise<Object>} Flashcard deck
   */
  async createFlashcards(noteIds) {
    try {
      // Get notes
      const notes = await db.notes.bulkGet(noteIds);
      const validNotes = notes.filter(n => n && !n.is_deleted);
      
      if (validNotes.length === 0) {
        throw new Error('No valid notes found');
      }
      
      // Combine content
      const content = validNotes
        .map(note => `${note.title}\n${note.content}`)
        .join('\n\n---\n\n');
      
      // Generate flashcards using AI
      const prompt = `Based on the following notes, create flashcards for key concepts.

Generate 10-15 flashcard pairs in JSON format:
[{
  "front": "Question or concept",
  "back": "Answer or explanation"
}]

Focus on:
- Important definitions
- Key concepts
- Critical facts
- Relationships between ideas

Notes:
${content.substring(0, 4000)}`;
      
      const response = await aiService.generateCompletion([
        { role: 'user', content: prompt }
      ], {
        maxTokens: 1500,
        temperature: 0.6
      });
      
      // Parse flashcards
      let cards;
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          cards = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing flashcards:', parseError);
        // Fallback: create simple cards from note titles
        cards = validNotes.map(note => ({
          front: `What is: ${note.title}?`,
          back: note.content.substring(0, 200) + '...'
        }));
      }
      
      // Create flashcard deck
      const deck = {
        id: generateULID(),
        name: `Flashcards: ${validNotes[0].title}${validNotes.length > 1 ? ' and more' : ''}`,
        cards,
        noteIds,
        created_at: new Date().toISOString(),
        lastStudied: null,
        masteryLevel: 0
      };
      
      // Store in database
      await db.study_sessions.add(deck);
      
      return deck;
    } catch (error) {
      console.error('Error creating flashcards:', error);
      throw error;
    }
  }

  /**
   * Get notes for topic
   * @param {string|Array<string>} topicOrTags - Topic or tags
   * @returns {Promise<Array>} Notes
   * @private
   */
  async _getNotesForTopic(topicOrTags) {
    if (Array.isArray(topicOrTags)) {
      // Get notes with any of these tags
      return await db.notes
        .filter(note => {
          if (note.is_deleted) return false;
          if (!note.tags) return false;
          return topicOrTags.some(tag => note.tags.includes(tag));
        })
        .toArray();
    } else {
      // Search by topic using vector search
      const results = await vectorSearch.search(topicOrTags, { k: 10 });
      const noteIds = results.map(r => r.id);
      const notes = await db.notes.bulkGet(noteIds);
      return notes.filter(n => n && !n.is_deleted);
    }
  }

  /**
   * Generate fallback quiz questions
   * @param {Array} notes - Notes to create quiz from
   * @param {number} count - Number of questions
   * @returns {Array} Quiz questions
   * @private
   */
  _generateFallbackQuiz(notes, count) {
    const questions = [];
    
    for (let i = 0; i < Math.min(count, notes.length); i++) {
      const note = notes[i];
      questions.push({
        type: 'short_answer',
        question: `Explain the key concepts from: "${note.title}"`,
        correct_answer: note.content.substring(0, 200),
        explanation: 'Review your note for details'
      });
    }
    
    return questions;
  }

  /**
   * Get study session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Study session
   */
  async getSession(sessionId) {
    return await db.study_sessions.get(sessionId);
  }

  /**
   * Complete study session
   * @param {string} sessionId - Session ID
   * @param {Object} results - Session results
   */
  async completeSession(sessionId, results) {
    await db.study_sessions.update(sessionId, {
      completed: true,
      score: results.score,
      answers: results.answers,
      completed_at: new Date().toISOString()
    });
    
    this.eventBus.emit('study-session-completed', {
      sessionId,
      score: results.score
    });
  }

  /**
   * Get all study sessions
   * @returns {Promise<Array>} Study sessions
   */
  async getAllSessions() {
    return await db.study_sessions.toArray();
  }
}

// Create and export singleton instance
const studyGenerator = new StudyGenerator();

export default studyGenerator;
export { StudyGenerator };

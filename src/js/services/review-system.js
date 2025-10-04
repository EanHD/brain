/**
 * Review System Service
 * Enhanced spaced repetition with adaptive intervals and weak spot detection
 * 
 * Features:
 * - Adaptive intervals based on performance
 * - Tag-based review acceleration
 * - Weak spot detection
 * - Review history tracking
 * - Performance analytics
 */

import db from '../db.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';

/**
 * Review System class
 */
class ReviewSystem {
  constructor() {
    this.eventBus = getEventBus();
    
    // Interval presets (in days)
    this.intervals = {
      standard: [7, 14, 30],
      accelerated: [3, 7, 14],
      mastered: [14, 30, 90]
    };
  }

  /**
   * Initialize review system
   */
  async initialize() {
    console.log('✅ Review system initialized');
  }

  /**
   * Get notes due for review
   * @param {number} limit - Maximum notes to return
   * @returns {Promise<Array>} Notes due for review
   */
  async getDueNotes(limit = 10) {
    const now = new Date();
    
    try {
      // Get all notes with review data
      const notes = await db.notes
        .filter(note => {
          if (note.is_deleted) return false;
          
          // If never reviewed, it's due
          if (!note.next_review) return true;
          
          // Check if due date has passed
          const dueDate = new Date(note.next_review);
          return dueDate <= now;
        })
        .limit(limit)
        .toArray();
      
      // Sort by priority (overdue first, then by date)
      return notes.sort((a, b) => {
        const aOverdue = a.next_review ? now - new Date(a.next_review) : 0;
        const bOverdue = b.next_review ? now - new Date(b.next_review) : 0;
        return bOverdue - aOverdue;
      });
    } catch (error) {
      console.error('Error getting due notes:', error);
      return [];
    }
  }

  /**
   * Get review interval based on note properties
   * @param {Object} note - Note object
   * @returns {Array<number>} Interval sequence in days
   */
  getReviewInterval(note) {
    // Tag-based acceleration
    const tags = note.tags || [];
    const hasStudyTag = tags.some(tag => 
      ['study', 'important', 'exam', 'learn'].includes(tag.toLowerCase())
    );
    
    if (hasStudyTag) {
      return this.intervals.accelerated;
    }
    
    // Check if note is well-mastered (high review count with good performance)
    const reviewCount = note.review_count || 0;
    const reviewHistory = note.review_history || [];
    
    if (reviewCount >= 3) {
      // Calculate average performance
      const avgPerformance = reviewHistory.length > 0
        ? reviewHistory.reduce((sum, r) => sum + this._performanceToScore(r.performance), 0) / reviewHistory.length
        : 0;
      
      if (avgPerformance >= 2.5) { // Average of "easy" or better
        return this.intervals.mastered;
      }
    }
    
    return this.intervals.standard;
  }

  /**
   * Calculate next review date
   * @param {string} noteId - Note ID
   * @param {string} performance - Performance rating ('easy', 'medium', 'hard', 'forgotten')
   * @returns {Promise<Date>} Next review date
   */
  async calculateNextReview(noteId, performance) {
    try {
      const note = await db.notes.get(noteId);
      if (!note) {
        throw new Error('Note not found');
      }
      
      // Get appropriate interval sequence
      const intervals = this.getReviewInterval(note);
      
      // Get current review count
      const reviewCount = note.review_count || 0;
      
      // Determine interval index (cap at last interval)
      let intervalIndex = Math.min(reviewCount, intervals.length - 1);
      
      // Adjust based on performance
      let interval = intervals[intervalIndex];
      
      switch (performance) {
        case 'easy':
          // Accelerate: jump forward one step
          intervalIndex = Math.min(intervalIndex + 1, intervals.length - 1);
          interval = intervals[intervalIndex];
          break;
        
        case 'medium':
          // Keep current interval
          break;
        
        case 'hard':
          // Step back one level
          intervalIndex = Math.max(intervalIndex - 1, 0);
          interval = intervals[intervalIndex];
          break;
        
        case 'forgotten':
          // Reset to beginning
          intervalIndex = 0;
          interval = intervals[0];
          break;
      }
      
      // Calculate next review date
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);
      
      return nextReview;
    } catch (error) {
      console.error('Error calculating next review:', error);
      throw error;
    }
  }

  /**
   * Record review session
   * @param {string} noteId - Note ID
   * @param {string} performance - Performance rating
   * @returns {Promise<void>}
   */
  async recordReview(noteId, performance) {
    try {
      const note = await db.notes.get(noteId);
      if (!note) {
        throw new Error('Note not found');
      }
      
      // Calculate next review date
      const nextReview = await this.calculateNextReview(noteId, performance);
      
      // Update review history
      const reviewHistory = note.review_history || [];
      reviewHistory.push({
        date: new Date().toISOString(),
        performance,
        interval: this._getIntervalDays(note.next_review, nextReview)
      });
      
      // Keep last 20 reviews
      if (reviewHistory.length > 20) {
        reviewHistory.shift();
      }
      
      // Update note
      await db.notes.update(noteId, {
        next_review: nextReview.toISOString(),
        last_reviewed: new Date().toISOString(),
        review_count: (note.review_count || 0) + 1,
        review_history: reviewHistory,
        updated_at: new Date().toISOString()
      });
      
      // Emit event
      this.eventBus.emit('review-recorded', {
        noteId,
        performance,
        nextReview
      });
      
    } catch (error) {
      console.error('Error recording review:', error);
      throw error;
    }
  }

  /**
   * Get weak spot tags (tags rarely reviewed)
   * @returns {Promise<Array>} Weak spot tags with metadata
   */
  async getWeakSpotTags() {
    try {
      // Get all notes with tags
      const notes = await db.notes
        .filter(note => !note.is_deleted && note.tags && note.tags.length > 0)
        .toArray();
      
      // Build tag statistics
      const tagStats = new Map();
      
      for (const note of notes) {
        for (const tag of note.tags) {
          if (!tagStats.has(tag)) {
            tagStats.set(tag, {
              tag,
              totalNotes: 0,
              lastReviewed: null,
              avgReviewCount: 0
            });
          }
          
          const stats = tagStats.get(tag);
          stats.totalNotes++;
          stats.avgReviewCount += (note.review_count || 0);
          
          // Track most recent review
          if (note.last_reviewed) {
            const reviewDate = new Date(note.last_reviewed);
            if (!stats.lastReviewed || reviewDate > stats.lastReviewed) {
              stats.lastReviewed = reviewDate;
            }
          }
        }
      }
      
      // Calculate averages and identify weak spots
      const now = new Date();
      const weakSpots = [];
      
      for (const [tag, stats] of tagStats) {
        stats.avgReviewCount = stats.avgReviewCount / stats.totalNotes;
        
        // Calculate days since last review
        const daysSinceReview = stats.lastReviewed
          ? Math.floor((now - stats.lastReviewed) / (1000 * 60 * 60 * 24))
          : 999;
        
        // Weak spot criteria:
        // 1. Not reviewed in 14+ days
        // 2. Low average review count (<2)
        // 3. Multiple notes (>= 2)
        if (daysSinceReview >= 14 && stats.avgReviewCount < 2 && stats.totalNotes >= 2) {
          weakSpots.push({
            tag,
            noteCount: stats.totalNotes,
            avgReviewCount: Math.round(stats.avgReviewCount * 10) / 10,
            daysSinceReview,
            lastReviewed: stats.lastReviewed
          });
        }
      }
      
      // Sort by days since review (descending)
      weakSpots.sort((a, b) => b.daysSinceReview - a.daysSinceReview);
      
      return weakSpots;
    } catch (error) {
      console.error('Error getting weak spot tags:', error);
      return [];
    }
  }

  /**
   * Get review statistics
   * @returns {Promise<Object>} Review statistics
   */
  async getReviewStats() {
    try {
      const notes = await db.notes
        .filter(note => !note.is_deleted)
        .toArray();
      
      const now = new Date();
      let dueCount = 0;
      let reviewedCount = 0;
      let totalReviews = 0;
      const performanceCounts = {
        easy: 0,
        medium: 0,
        hard: 0,
        forgotten: 0
      };
      
      for (const note of notes) {
        // Count due notes
        if (!note.next_review || new Date(note.next_review) <= now) {
          dueCount++;
        }
        
        // Count reviewed notes
        if (note.review_count && note.review_count > 0) {
          reviewedCount++;
          totalReviews += note.review_count;
        }
        
        // Count performance ratings
        if (note.review_history) {
          for (const review of note.review_history) {
            if (performanceCounts.hasOwnProperty(review.performance)) {
              performanceCounts[review.performance]++;
            }
          }
        }
      }
      
      return {
        totalNotes: notes.length,
        dueCount,
        reviewedCount,
        neverReviewedCount: notes.length - reviewedCount,
        totalReviews,
        avgReviewsPerNote: reviewedCount > 0 ? Math.round((totalReviews / reviewedCount) * 10) / 10 : 0,
        performanceCounts
      };
    } catch (error) {
      console.error('Error getting review stats:', error);
      return {
        totalNotes: 0,
        dueCount: 0,
        reviewedCount: 0,
        neverReviewedCount: 0,
        totalReviews: 0,
        avgReviewsPerNote: 0,
        performanceCounts: { easy: 0, medium: 0, hard: 0, forgotten: 0 }
      };
    }
  }

  /**
   * Get a random "flashback" note (old note for surprise review)
   * @returns {Promise<Object|null>} Random old note
   */
  async getFlashbackNote() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const oldNotes = await db.notes
        .filter(note => {
          if (note.is_deleted) return false;
          if (!note.created_at) return false;
          return new Date(note.created_at) < sixMonthsAgo;
        })
        .toArray();
      
      if (oldNotes.length === 0) return null;
      
      // Return random note
      const randomIndex = Math.floor(Math.random() * oldNotes.length);
      return oldNotes[randomIndex];
    } catch (error) {
      console.error('Error getting flashback note:', error);
      return null;
    }
  }

  /**
   * Convert performance to numerical score
   * @param {string} performance - Performance rating
   * @returns {number} Numerical score (0-3)
   * @private
   */
  _performanceToScore(performance) {
    const scores = {
      forgotten: 0,
      hard: 1,
      medium: 2,
      easy: 3
    };
    return scores[performance] || 2;
  }

  /**
   * Get interval in days between two dates
   * @param {string} from - From date (ISO string)
   * @param {Date} to - To date
   * @returns {number} Days between dates
   * @private
   */
  _getIntervalDays(from, to) {
    if (!from) return 0;
    const fromDate = new Date(from);
    return Math.floor((to - fromDate) / (1000 * 60 * 60 * 24));
  }
}

// Create and export singleton instance
const reviewSystem = new ReviewSystem();

export default reviewSystem;
export { ReviewSystem };

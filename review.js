/**
 * T049: Review View Controller - src/js/views/review.js
 * 
 * Review view implementing spaced repetition and flashback features
 * Constitutional performance requirement: <200ms render
 */

import db from '../db.js';
import { state, VIEWS } from '../state.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { measureOperation } from '../performance-utility.js';

export class ReviewViewController {
  constructor() {
    this.eventBus = getEventBus();
    this.elements = {};
    this.isInitialized = false;
    
    this.handleNoteClick = this.handleNoteClick.bind(this);
    this.handleReviewComplete = this.handleReviewComplete.bind(this);
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.bindElements();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Review view initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Review view:', error);
    }
  }

  async bindElements() {
    this.elements = {
      view: document.getElementById('review-view'),
      reviewDue: document.getElementById('review-due'),
      reviewFlashback: document.getElementById('review-flashback'),
      reviewWeakspots: document.getElementById('review-weakspots')
    };

    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      throw new Error(`Missing Review DOM elements: ${missingElements.join(', ')}`);
    }
  }

  setupEventListeners() {
    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, ({ toView }) => {
      if (toView === VIEWS.REVIEW) {
        this.onViewActivated();
      }
    });

    this.eventBus.on(APPLICATION_EVENTS.NOTE_UPDATED, () => {
      this.onDataChanged();
    });
  }

  async onViewActivated() {
    await this.loadReviewData();
  }

  async loadReviewData() {
    return await measureOperation('library-render', async () => {
      try {
        await Promise.all([
          this.loadNotesForReview(),
          this.loadFlashbackOfTheDay(),
          this.loadWeakSpots()
        ]);
      } catch (error) {
        console.error('❌ Failed to load review data:', error);
      }
    });
  }

  async loadNotesForReview() {
    try {
      // Get notes that haven't been reviewed in 24 hours or never reviewed
      const now = Date.now();
      const dayAgo = now - (24 * 60 * 60 * 1000);
      
      const allNotes = await db.getNotes({ limit: 1000 });
      const dueNotes = allNotes.filter(note => {
        const lastReviewed = note.last_reviewed || 0;
        return lastReviewed < dayAgo;
      });

      this.renderNotesForReview(dueNotes.slice(0, 10)); // Limit to 10 for performance

    } catch (error) {
      console.error('❌ Failed to load notes for review:', error);
      this.elements.reviewDue.innerHTML = this.createErrorHTML('Failed to load review notes');
    }
  }

  async loadFlashbackOfTheDay() {
    try {
      // Get a random note from 7+ days ago
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const allNotes = await db.getNotes({ limit: 1000 });
      const oldNotes = allNotes.filter(note => note.created_at < weekAgo);
      
      if (oldNotes.length === 0) {
        this.elements.reviewFlashback.innerHTML = this.createEmptyHTML('No flashback notes available yet');
        return;
      }

      // Select random note
      const randomNote = oldNotes[Math.floor(Math.random() * oldNotes.length)];
      this.renderFlashbackNote(randomNote);

    } catch (error) {
      console.error('❌ Failed to load flashback:', error);
      this.elements.reviewFlashback.innerHTML = this.createErrorHTML('Failed to load flashback');
    }
  }

  async loadWeakSpots() {
    try {
      // Find tags that haven't been used recently
      const tags = await db.getTags();
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const weakSpotTags = tags
        .filter(tag => tag.last_used < weekAgo && tag.count > 1)
        .sort((a, b) => a.last_used - b.last_used)
        .slice(0, 5);

      this.renderWeakSpots(weakSpotTags);

    } catch (error) {
      console.error('❌ Failed to load weak spots:', error);
      this.elements.reviewWeakspots.innerHTML = this.createErrorHTML('Failed to load weak spots');
    }
  }

  renderNotesForReview(notes) {
    if (notes.length === 0) {
      this.elements.reviewDue.innerHTML = this.createEmptyHTML('All caught up! No notes need review.');
      return;
    }

    const notesHtml = notes.map(note => `
      <div class="note-card review-card" data-note-id="${note.id}">
        <div class="note-card-title">${this.escapeHtml(note.title)}</div>
        <div class="note-card-preview">${this.escapeHtml(this.createPreview(note.body))}</div>
        <div class="note-card-meta">
          <span class="review-status">
            Last reviewed: ${this.formatLastReviewed(note.last_reviewed)}
          </span>
          <div class="review-actions">
            <button 
              class="btn btn-sm btn-primary review-btn" 
              data-note-id="${note.id}" 
              data-difficulty="easy"
            >
              Easy
            </button>
            <button 
              class="btn btn-sm btn-secondary review-btn" 
              data-note-id="${note.id}" 
              data-difficulty="medium"
            >
              Medium  
            </button>
            <button 
              class="btn btn-sm btn-danger review-btn" 
              data-note-id="${note.id}" 
              data-difficulty="hard"
            >
              Hard
            </button>
          </div>
        </div>
      </div>
    `).join('');

    this.elements.reviewDue.innerHTML = notesHtml;

    // Add click listeners
    this.elements.reviewDue.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', this.handleNoteClick);
    });

    this.elements.reviewDue.querySelectorAll('.review-btn').forEach(btn => {
      btn.addEventListener('click', this.handleReviewComplete);
    });
  }

  renderFlashbackNote(note) {
    const daysAgo = Math.floor((Date.now() - note.created_at) / (24 * 60 * 60 * 1000));
    
    this.elements.reviewFlashback.innerHTML = `
      <div class="flashback-card card">
        <div class="card-header">
          <h4>From ${daysAgo} days ago</h4>
          <span class="flashback-date">${new Date(note.created_at).toLocaleDateString()}</span>
        </div>
        <div class="card-body">
          <h3 class="flashback-title">${this.escapeHtml(note.title)}</h3>
          <div class="flashback-content">${this.escapeHtml(this.createPreview(note.body, 300))}</div>
          <div class="flashback-tags">
            ${(note.tags || []).map(tag => 
              `<span class="tag">${this.escapeHtml(tag)}</span>`
            ).join('')}
          </div>
        </div>
        <div class="card-footer">
          <button 
            class="btn btn-primary" 
            data-note-id="${note.id}"
            onclick="this.dispatchEvent(new CustomEvent('note-click', {bubbles: true}))"
          >
            Read Full Note
          </button>
        </div>
      </div>
    `;

    // Add click listener for the flashback note
    this.elements.reviewFlashback.querySelector('[data-note-id]').addEventListener('click', this.handleNoteClick);
  }

  renderWeakSpots(weakSpotTags) {
    if (weakSpotTags.length === 0) {
      this.elements.reviewWeakspots.innerHTML = this.createEmptyHTML('No weak spots detected');
      return;
    }

    const weakSpotsHtml = weakSpotTags.map(tag => {
      const daysSinceUsed = Math.floor((Date.now() - tag.last_used) / (24 * 60 * 60 * 1000));
      
      return `
        <div class="weak-spot-item card">
          <div class="weak-spot-info">
            <h4 class="weak-spot-tag">${this.escapeHtml(tag.tag)}</h4>
            <p class="weak-spot-meta">
              ${tag.count} notes • Last used ${daysSinceUsed} days ago
            </p>
          </div>
          <div class="weak-spot-actions">
            <button 
              class="btn btn-sm btn-primary" 
              data-tag="${this.escapeHtml(tag.tag)}"
              onclick="this.dispatchEvent(new CustomEvent('tag-browse', {bubbles: true}))"
            >
              Browse Notes
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.elements.reviewWeakspots.innerHTML = weakSpotsHtml;

    // Add tag browse listeners
    this.elements.reviewWeakspots.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', (event) => {
        const tag = event.target.dataset.tag;
        state.updateSearch('', [tag]);
        state.navigateTo(VIEWS.LIBRARY);
      });
    });
  }

  async handleNoteClick(event) {
    // Prevent event if clicking on review buttons
    if (event.target.classList.contains('review-btn')) {
      return;
    }

    const noteCard = event.currentTarget;
    const noteId = noteCard.dataset.noteId || noteCard.querySelector('[data-note-id]')?.dataset.noteId;
    
    if (noteId) {
      try {
        const note = await db.getNote(noteId);
        if (note) {
          state.setCurrentNote(note);
          state.navigateTo(VIEWS.DETAIL, { mode: 'view' });
        }
      } catch (error) {
        console.error('❌ Failed to load note:', error);
        this.showToast('Failed to load note', 'error');
      }
    }
  }

  async handleReviewComplete(event) {
    event.stopPropagation(); // Prevent note click
    
    const button = event.target;
    const noteId = button.dataset.noteId;
    const difficulty = button.dataset.difficulty;
    
    try {
      // Update note review status
      const updates = {
        last_reviewed: Date.now(),
        review_count: 1, // Increment would require getting current value
        review_difficulty: this.getDifficultyScore(difficulty)
      };

      await db.updateNote(noteId, updates);
      
      // Remove note from review list
      const noteCard = button.closest('.review-card');
      if (noteCard) {
        noteCard.style.opacity = '0.5';
        noteCard.style.pointerEvents = 'none';
        
        setTimeout(() => {
          noteCard.remove();
          
          // Check if we need to show "all done" message
          const remainingCards = this.elements.reviewDue.querySelectorAll('.review-card');
          if (remainingCards.length === 0) {
            this.elements.reviewDue.innerHTML = this.createEmptyHTML('All caught up! Great job reviewing your notes.');
          }
        }, 500);
      }
      
      this.showToast(`Note reviewed as ${difficulty}`, 'success');

    } catch (error) {
      console.error('❌ Failed to complete review:', error);
      this.showToast('Failed to save review', 'error');
    }
  }

  getDifficultyScore(difficulty) {
    const scores = { easy: 1, medium: 2, hard: 3 };
    return scores[difficulty] || 2;
  }

  createPreview(body, maxLength = 150) {
    const plainText = body
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .trim();

    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  }

  formatLastReviewed(timestamp) {
    if (!timestamp) return 'Never';
    
    const daysAgo = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
    
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return `${daysAgo} days ago`;
  }

  createEmptyHTML(message) {
    return `
      <div class="empty-state">
        <p class="text-muted">${this.escapeHtml(message)}</p>
      </div>
    `;
  }

  createErrorHTML(message) {
    return `
      <div class="error-state">
        <p class="text-danger">${this.escapeHtml(message)}</p>
        <button class="btn btn-secondary btn-sm" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;
  }

  showToast(message, type = 'info') {
    this.eventBus.emit('show-toast', { message, type });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  async onDataChanged() {
    if (state.get('currentView') === VIEWS.REVIEW) {
      await this.loadReviewData();
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      reviewNotesCount: this.elements.reviewDue?.children.length || 0,
      hasFlashback: !!this.elements.reviewFlashback?.querySelector('.flashback-card'),
      weakSpotsCount: this.elements.reviewWeakspots?.children.length || 0
    };
  }

  destroy() {
    this.isInitialized = false;
  }
}

const reviewView = new ReviewViewController();
export default reviewView;
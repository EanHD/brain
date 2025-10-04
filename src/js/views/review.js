/**
 * T022: Review & Study View UI - src/js/views/review.js
 * 
 * Review view implementing spaced repetition, study sessions, and flashback features
 * Constitutional performance requirement: <200ms render
 */

import db from '../db.js';
import { state, VIEWS } from '../state.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { measureOperation } from '../performance-utility.js';
import reviewSystem from '../services/review-system.js';
import studyGenerator from '../services/study-generator.js';

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
      reviewWeakspots: document.getElementById('review-weakspots'),
      reviewStats: document.getElementById('review-stats'),
      studySessions: document.getElementById('study-sessions')
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
    return await measureOperation('review-render', async () => {
      try {
        await Promise.all([
          this.loadNotesForReview(),
          this.loadFlashbackOfTheDay(),
          this.loadWeakSpots(),
          this.loadReviewStats(),
          this.loadStudySessions()
        ]);
      } catch (error) {
        console.error('❌ Failed to load review data:', error);
      }
    });
  }

  async loadNotesForReview() {
    try {
      // Use review system to get due notes
      const dueNotes = await reviewSystem.getDueNotes(10);
      this.renderNotesForReview(dueNotes);

    } catch (error) {
      console.error('❌ Failed to load notes for review:', error);
      this.elements.reviewDue.innerHTML = this.createErrorHTML('Failed to load review notes');
    }
  }

  async loadFlashbackOfTheDay() {
    try {
      // Use review system to get flashback note
      const flashbackNote = await reviewSystem.getFlashbackNote();
      
      if (!flashbackNote) {
        this.elements.reviewFlashback.innerHTML = this.createEmptyHTML('No flashback notes available yet');
        return;
      }

      this.renderFlashbackNote(flashbackNote);

    } catch (error) {
      console.error('❌ Failed to load flashback:', error);
      this.elements.reviewFlashback.innerHTML = this.createErrorHTML('Failed to load flashback');
    }
  }

  async loadWeakSpots() {
    try {
      // Use review system to get weak spot tags
      const weakSpots = await reviewSystem.getWeakSpotTags();
      this.renderWeakSpots(weakSpots);

    } catch (error) {
      console.error('❌ Failed to load weak spots:', error);
      this.elements.reviewWeakspots.innerHTML = this.createErrorHTML('Failed to load weak spots');
    }
  }

  async loadReviewStats() {
    try {
      const stats = await reviewSystem.getReviewStats();
      this.renderReviewStats(stats);
    } catch (error) {
      console.error('❌ Failed to load review stats:', error);
      this.elements.reviewStats.innerHTML = this.createErrorHTML('Failed to load stats');
    }
  }

  async loadStudySessions() {
    try {
      const sessions = await studyGenerator.getAllSessions();
      this.renderStudySessions(sessions.slice(0, 5)); // Show recent 5
    } catch (error) {
      console.error('❌ Failed to load study sessions:', error);
      this.elements.studySessions.innerHTML = this.createErrorHTML('Failed to load sessions');
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
        <div class="note-card-preview">${this.escapeHtml(this.createPreview(note.content || note.body))}</div>
        <div class="note-card-meta">
          <span class="review-status">
            Last reviewed: ${this.formatLastReviewed(note.last_reviewed)}
            ${note.review_count ? `• ${note.review_count} reviews` : ''}
          </span>
          <div class="review-actions">
            <button 
              class="btn btn-sm btn-success review-btn" 
              data-note-id="${note.id}" 
              data-performance="easy"
              title="Easy - I knew it well"
            >
              😊 Easy
            </button>
            <button 
              class="btn btn-sm btn-primary review-btn" 
              data-note-id="${note.id}" 
              data-performance="medium"
              title="Medium - I remembered with effort"
            >
              🤔 Medium  
            </button>
            <button 
              class="btn btn-sm btn-warning review-btn" 
              data-note-id="${note.id}" 
              data-performance="hard"
              title="Hard - I struggled to remember"
            >
              😓 Hard
            </button>
            <button 
              class="btn btn-sm btn-danger review-btn" 
              data-note-id="${note.id}" 
              data-performance="forgotten"
              title="Forgotten - I didn't remember"
            >
              ❌ Forgot
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

  renderWeakSpots(weakSpots) {
    if (weakSpots.length === 0) {
      this.elements.reviewWeakspots.innerHTML = this.createEmptyHTML('No weak spots detected');
      return;
    }

    const weakSpotsHtml = weakSpots.map(spot => {
      return `
        <div class="weak-spot-item card">
          <div class="weak-spot-info">
            <h4 class="weak-spot-tag">#${this.escapeHtml(spot.tag)}</h4>
            <p class="weak-spot-meta">
              ${spot.noteCount} notes • Last reviewed ${spot.daysSinceReview} days ago
            </p>
          </div>
          <div class="weak-spot-actions">
            <button 
              class="btn btn-sm btn-primary" 
              data-tag="${this.escapeHtml(spot.tag)}"
            >
              Browse Notes
            </button>
            <button 
              class="btn btn-sm btn-secondary" 
              data-tag="${this.escapeHtml(spot.tag)}"
              data-action="quiz"
            >
              Create Quiz
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.elements.reviewWeakspots.innerHTML = weakSpotsHtml;

    // Add tag browse listeners
    this.elements.reviewWeakspots.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        const tag = event.target.dataset.tag;
        const action = event.target.dataset.action;
        
        if (action === 'quiz') {
          await this.createQuizForTag(tag);
        } else {
          state.updateSearch('', [tag]);
          state.navigateTo(VIEWS.LIBRARY);
        }
      });
    });
  }

  renderReviewStats(stats) {
    const completionRate = stats.totalNotes > 0
      ? Math.round((stats.reviewedCount / stats.totalNotes) * 100)
      : 0;

    const performanceLabels = {
      easy: '😊 Easy',
      medium: '🤔 Medium',
      hard: '😓 Hard',
      forgotten: '❌ Forgot'
    };

    const performanceHtml = Object.entries(stats.performanceDistribution || {})
      .map(([perf, count]) => `
        <div class="stat-item">
          <span class="stat-label">${performanceLabels[perf]}</span>
          <span class="stat-value">${count}</span>
        </div>
      `).join('');

    this.elements.reviewStats.innerHTML = `
      <div class="review-stats-grid">
        <div class="stat-card">
          <div class="stat-number">${stats.dueCount}</div>
          <div class="stat-label">Due Now</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.reviewedCount}</div>
          <div class="stat-label">Reviewed</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${completionRate}%</div>
          <div class="stat-label">Coverage</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.avgReviewsPerNote.toFixed(1)}</div>
          <div class="stat-label">Avg Reviews</div>
        </div>
      </div>
      ${performanceHtml ? `
        <div class="performance-breakdown">
          <h4>Recent Performance</h4>
          ${performanceHtml}
        </div>
      ` : ''}
    `;
  }

  renderStudySessions(sessions) {
    if (sessions.length === 0) {
      this.elements.studySessions.innerHTML = this.createEmptyHTML('No study sessions yet. Create a quiz or flashcards!');
      return;
    }

    const sessionsHtml = sessions.map(session => {
      const isCompleted = session.completed;
      const statusClass = isCompleted ? 'completed' : 'pending';
      const icon = session.type === 'quiz' ? '📝' : '🎴';
      
      return `
        <div class="study-session-card card ${statusClass}" data-session-id="${session.id}">
          <div class="session-header">
            <span class="session-icon">${icon}</span>
            <div class="session-info">
              <h4 class="session-topic">${this.escapeHtml(session.topic || session.name)}</h4>
              <p class="session-meta">
                ${session.type === 'quiz' ? `${session.questions?.length || 0} questions` : `${session.cards?.length || 0} cards`}
                ${isCompleted ? `• Score: ${session.score}%` : ''}
              </p>
            </div>
          </div>
          <div class="session-actions">
            ${isCompleted ? `
              <button class="btn btn-sm btn-secondary" data-session-id="${session.id}" data-action="retry">
                Retry
              </button>
            ` : `
              <button class="btn btn-sm btn-primary" data-session-id="${session.id}" data-action="start">
                Start
              </button>
            `}
            <button class="btn btn-sm btn-danger" data-session-id="${session.id}" data-action="delete">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.elements.studySessions.innerHTML = `
      <div class="study-sessions-header">
        <h3>Study Sessions</h3>
        <button class="btn btn-sm btn-primary" id="create-study-session">
          + New Session
        </button>
      </div>
      ${sessionsHtml}
    `;

    // Add listeners
    this.elements.studySessions.querySelector('#create-study-session')?.addEventListener('click', () => {
      this.showCreateSessionDialog();
    });

    this.elements.studySessions.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        const sessionId = event.target.dataset.sessionId;
        const action = event.target.dataset.action;
        
        switch (action) {
          case 'start':
          case 'retry':
            await this.startStudySession(sessionId);
            break;
          case 'delete':
            await this.deleteStudySession(sessionId);
            break;
        }
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
    const performance = button.dataset.performance;
    
    try {
      // Record review using review system
      await reviewSystem.recordReview(noteId, performance);
      
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
      
      // Reload stats
      await this.loadReviewStats();
      
      this.showToast(`Review recorded as ${performance}`, 'success');

    } catch (error) {
      console.error('❌ Failed to complete review:', error);
      this.showToast('Failed to save review', 'error');
    }
  }

  async createQuizForTag(tag) {
    try {
      this.showToast('Generating quiz...', 'info');
      const quiz = await studyGenerator.generateQuiz([tag], 10);
      this.showToast('Quiz created!', 'success');
      await this.loadStudySessions();
    } catch (error) {
      console.error('❌ Failed to create quiz:', error);
      this.showToast('Failed to create quiz', 'error');
    }
  }

  async startStudySession(sessionId) {
    try {
      const session = await studyGenerator.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // For now, just show a toast - in a full implementation, this would open a modal
      this.showToast(`Starting ${session.type} session...`, 'info');
      
      // TODO: Implement quiz/flashcard modal UI
      console.log('Study session:', session);
      
    } catch (error) {
      console.error('❌ Failed to start session:', error);
      this.showToast('Failed to start session', 'error');
    }
  }

  async deleteStudySession(sessionId) {
    if (!confirm('Delete this study session?')) return;
    
    try {
      await db.study_sessions.delete(sessionId);
      this.showToast('Session deleted', 'success');
      await this.loadStudySessions();
    } catch (error) {
      console.error('❌ Failed to delete session:', error);
      this.showToast('Failed to delete session', 'error');
    }
  }

  showCreateSessionDialog() {
    // Simple prompt-based creation for MVP
    const type = prompt('Session type (quiz or flashcards):');
    if (!type || !['quiz', 'flashcards'].includes(type)) {
      this.showToast('Invalid session type', 'error');
      return;
    }

    const topic = prompt('Enter topic or tags (comma-separated):');
    if (!topic) return;

    const tags = topic.split(',').map(t => t.trim());

    if (type === 'quiz') {
      this.createQuizSession(tags);
    } else {
      this.createFlashcardsSession(tags);
    }
  }

  async createQuizSession(tags) {
    try {
      this.showToast('Generating quiz...', 'info');
      const quiz = await studyGenerator.generateQuiz(tags, 10);
      this.showToast('Quiz created!', 'success');
      await this.loadStudySessions();
    } catch (error) {
      console.error('❌ Failed to create quiz:', error);
      this.showToast('Failed to create quiz', 'error');
    }
  }

  async createFlashcardsSession(tags) {
    try {
      this.showToast('Generating flashcards...', 'info');
      
      // Get notes with these tags
      const notes = await db.notes
        .filter(note => {
          if (note.is_deleted) return false;
          if (!note.tags) return false;
          return tags.some(tag => note.tags.includes(tag));
        })
        .toArray();
      
      if (notes.length === 0) {
        throw new Error('No notes found with these tags');
      }

      const noteIds = notes.map(n => n.id);
      const deck = await studyGenerator.createFlashcards(noteIds);
      
      this.showToast('Flashcards created!', 'success');
      await this.loadStudySessions();
    } catch (error) {
      console.error('❌ Failed to create flashcards:', error);
      this.showToast(error.message || 'Failed to create flashcards', 'error');
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
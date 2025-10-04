/**
 * File Preview Modal Component
 * Full-screen modal for previewing different file types
 * 
 * Features:
 * - PDF viewer with page navigation
 * - Image viewer with zoom/pan
 * - Text/code viewer with syntax highlighting
 * - Keyboard shortcuts (← → for pages, Esc to close)
 * - Touch gestures support
 * - Download, delete, share actions
 */

import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';

/**
 * FilePreviewModal class
 */
export class FilePreviewModal {
  constructor() {
    this.isOpen = false;
    this.currentFile = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.zoom = 1;
    this.eventBus = getEventBus();
    
    // Bound handlers for cleanup
    this._boundKeyHandler = this._handleKeyPress.bind(this);
    this._boundTouchStart = this._handleTouchStart.bind(this);
    this._boundTouchMove = this._handleTouchMove.bind(this);
    this._boundTouchEnd = this._handleTouchEnd.bind(this);
    
    // Touch gesture tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartDistance = 0;
    this.initialZoom = 1;
  }

  /**
   * Open preview modal with file
   * @param {Object} file - File object with data and metadata
   */
  async open(file) {
    if (this.isOpen) {
      this.close();
    }

    this.currentFile = file;
    this.currentPage = 1;
    this.zoom = 1;
    this.isOpen = true;

    // Create modal
    this._createModal();
    
    // Render preview content
    await this._renderPreview();
    
    // Setup event listeners
    this._setupEventListeners();
    
    // Animate in
    requestAnimationFrame(() => {
      this.modal.classList.add('visible');
    });
  }

  /**
   * Close preview modal
   */
  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    
    // Animate out
    this.modal.classList.remove('visible');
    
    // Cleanup after animation
    setTimeout(() => {
      this._cleanup();
      if (this.modal && this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
    }, 300);
  }

  /**
   * Create modal DOM structure
   * @private
   */
  _createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'file-preview-modal';
    this.modal.innerHTML = `
      <div class="file-preview-backdrop" data-action="close"></div>
      <div class="file-preview-container">
        <header class="file-preview-header">
          <div class="file-preview-info">
            <h2 class="file-preview-title">${this._escapeHtml(this.currentFile.filename)}</h2>
            <div class="file-preview-meta">
              <span class="file-size">${this._formatFileSize(this.currentFile.size_bytes)}</span>
              <span class="file-date">${this._formatDate(this.currentFile.created_at)}</span>
            </div>
          </div>
          <div class="file-preview-actions">
            <button class="btn-icon" data-action="download" title="Download">
              <span class="icon">⬇️</span>
            </button>
            <button class="btn-icon" data-action="delete" title="Delete">
              <span class="icon">🗑️</span>
            </button>
            <button class="btn-icon" data-action="close" title="Close">
              <span class="icon">✕</span>
            </button>
          </div>
        </header>

        <div class="file-preview-content" data-content>
          <div class="loading-spinner">Loading preview...</div>
        </div>

        <footer class="file-preview-footer" style="display: none;">
          <div class="file-preview-controls" data-controls></div>
        </footer>
      </div>
    `;

    document.body.appendChild(this.modal);
  }

  /**
   * Render preview based on file type
   * @private
   */
  async _renderPreview() {
    const content = this.modal.querySelector('[data-content]');
    const mimeType = this.currentFile.mime_type || '';

    try {
      if (mimeType.includes('pdf')) {
        await this._renderPDF(content);
      } else if (mimeType.startsWith('image/')) {
        await this._renderImage(content);
      } else if (mimeType.includes('text') || mimeType.includes('markdown')) {
        await this._renderText(content);
      } else if (this.currentFile.extracted_text) {
        // Show extracted text for unsupported types
        await this._renderExtractedText(content);
      } else {
        this._renderUnsupported(content);
      }
    } catch (error) {
      console.error('Error rendering preview:', error);
      this._renderError(content, error);
    }
  }

  /**
   * Render PDF preview
   * @param {HTMLElement} container - Container element
   * @private
   */
  async _renderPDF(container) {
    // For MVP, show extracted text and download option
    // Full PDF rendering would require pdf.js integration
    
    container.innerHTML = `
      <div class="pdf-preview">
        <div class="pdf-info">
          <div class="file-icon-large">📄</div>
          <h3>PDF Document</h3>
          <p>Click download to view the full PDF</p>
          ${this.currentFile.extracted_text ? `
            <details class="pdf-text-preview">
              <summary>View extracted text</summary>
              <pre class="extracted-text">${this._escapeHtml(this.currentFile.extracted_text.substring(0, 5000))}</pre>
              ${this.currentFile.extracted_text.length > 5000 ? '<p class="text-truncated">... (text truncated)</p>' : ''}
            </details>
          ` : ''}
        </div>
        <button class="btn btn-primary" data-action="download">
          <span class="icon">📥</span> Download PDF
        </button>
      </div>
    `;

    // Show page navigation if we have page count
    if (this.currentFile.metadata?.pages) {
      this.totalPages = this.currentFile.metadata.pages;
      this._showPDFControls();
    }
  }

  /**
   * Render image preview
   * @param {HTMLElement} container - Container element
   * @private
   */
  async _renderImage(container) {
    // Convert blob to data URL for preview
    const blob = new Blob([this.currentFile.blob], { type: this.currentFile.mime_type });
    const url = URL.createObjectURL(blob);

    container.innerHTML = `
      <div class="image-preview">
        <div class="image-container" data-image-container>
          <img 
            src="${url}" 
            alt="${this._escapeHtml(this.currentFile.filename)}"
            class="preview-image"
            data-preview-image
            style="transform: scale(${this.zoom})"
          />
        </div>
      </div>
    `;

    // Show zoom controls
    this._showImageControls();

    // Cleanup URL when modal closes
    this._cleanupURLs = this._cleanupURLs || [];
    this._cleanupURLs.push(url);
  }

  /**
   * Render text/markdown preview
   * @param {HTMLElement} container - Container element
   * @private
   */
  async _renderText(container) {
    let text = '';
    
    if (this.currentFile.extracted_text) {
      text = this.currentFile.extracted_text;
    } else if (this.currentFile.blob) {
      // Read blob as text
      const blob = new Blob([this.currentFile.blob], { type: this.currentFile.mime_type });
      text = await blob.text();
    }

    const isMarkdown = this.currentFile.mime_type?.includes('markdown') || 
                       this.currentFile.filename?.endsWith('.md');

    container.innerHTML = `
      <div class="text-preview">
        <div class="text-container">
          ${isMarkdown ? this._renderMarkdown(text) : `<pre class="text-content">${this._escapeHtml(text)}</pre>`}
        </div>
      </div>
    `;
  }

  /**
   * Render extracted text for unsupported types
   * @param {HTMLElement} container - Container element
   * @private
   */
  async _renderExtractedText(container) {
    container.innerHTML = `
      <div class="extracted-preview">
        <div class="extracted-info">
          <h3>Extracted Text Content</h3>
          <p>Preview not available for this file type</p>
        </div>
        <div class="text-container">
          <pre class="text-content">${this._escapeHtml(this.currentFile.extracted_text)}</pre>
        </div>
      </div>
    `;
  }

  /**
   * Render unsupported file type message
   * @param {HTMLElement} container - Container element
   * @private
   */
  _renderUnsupported(container) {
    container.innerHTML = `
      <div class="unsupported-preview">
        <div class="file-icon-large">${this._getFileIcon(this.currentFile.mime_type)}</div>
        <h3>Preview not available</h3>
        <p>This file type cannot be previewed in the browser</p>
        <button class="btn btn-primary" data-action="download">
          <span class="icon">📥</span> Download File
        </button>
      </div>
    `;
  }

  /**
   * Render error message
   * @param {HTMLElement} container - Container element
   * @param {Error} error - Error object
   * @private
   */
  _renderError(container, error) {
    container.innerHTML = `
      <div class="error-preview">
        <div class="error-icon">⚠️</div>
        <h3>Preview Error</h3>
        <p>${this._escapeHtml(error.message)}</p>
        <button class="btn btn-secondary" data-action="close">Close</button>
      </div>
    `;
  }

  /**
   * Show PDF navigation controls
   * @private
   */
  _showPDFControls() {
    const footer = this.modal.querySelector('.file-preview-footer');
    const controls = footer.querySelector('[data-controls]');
    
    controls.innerHTML = `
      <div class="pdf-controls">
        <button class="btn-icon" data-action="prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>
          <span class="icon">←</span>
        </button>
        <span class="page-indicator">Page ${this.currentPage} of ${this.totalPages}</span>
        <button class="btn-icon" data-action="next-page" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
          <span class="icon">→</span>
        </button>
      </div>
    `;
    
    footer.style.display = 'flex';
  }

  /**
   * Show image zoom controls
   * @private
   */
  _showImageControls() {
    const footer = this.modal.querySelector('.file-preview-footer');
    const controls = footer.querySelector('[data-controls]');
    
    controls.innerHTML = `
      <div class="zoom-controls">
        <button class="btn-icon" data-action="zoom-out" ${this.zoom <= 0.5 ? 'disabled' : ''}>
          <span class="icon">−</span>
        </button>
        <span class="zoom-indicator">${Math.round(this.zoom * 100)}%</span>
        <button class="btn-icon" data-action="zoom-in" ${this.zoom >= 3 ? 'disabled' : ''}>
          <span class="icon">+</span>
        </button>
        <button class="btn btn-sm" data-action="zoom-reset">
          <span class="icon">⊡</span> Fit
        </button>
      </div>
    `;
    
    footer.style.display = 'flex';
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Click handlers
    this.modal.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) {
        this._handleAction(action, e);
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', this._boundKeyHandler);

    // Touch gestures for mobile
    const container = this.modal.querySelector('[data-image-container]');
    if (container) {
      container.addEventListener('touchstart', this._boundTouchStart, { passive: false });
      container.addEventListener('touchmove', this._boundTouchMove, { passive: false });
      container.addEventListener('touchend', this._boundTouchEnd, { passive: false });
    }
  }

  /**
   * Handle action button clicks
   * @param {string} action - Action name
   * @param {Event} event - Click event
   * @private
   */
  async _handleAction(action, event) {
    switch (action) {
      case 'close':
        this.close();
        break;

      case 'download':
        await this._downloadFile();
        break;

      case 'delete':
        await this._deleteFile();
        break;

      case 'prev-page':
        this._previousPage();
        break;

      case 'next-page':
        this._nextPage();
        break;

      case 'zoom-in':
        this._zoomIn();
        break;

      case 'zoom-out':
        this._zoomOut();
        break;

      case 'zoom-reset':
        this._zoomReset();
        break;
    }
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  _handleKeyPress(e) {
    if (!this.isOpen) return;

    switch (e.key) {
      case 'Escape':
        this.close();
        break;

      case 'ArrowLeft':
        if (this.totalPages > 1) {
          this._previousPage();
        }
        break;

      case 'ArrowRight':
        if (this.totalPages > 1) {
          this._nextPage();
        }
        break;

      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._zoomIn();
        }
        break;

      case '-':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._zoomOut();
        }
        break;

      case '0':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._zoomReset();
        }
        break;
    }
  }

  /**
   * Handle touch start for gestures
   * @param {TouchEvent} e - Touch event
   * @private
   */
  _handleTouchStart(e) {
    if (e.touches.length === 1) {
      // Single touch - track for swipe
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Two finger touch - track for pinch zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.touchStartDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      this.initialZoom = this.zoom;
    }
  }

  /**
   * Handle touch move for gestures
   * @param {TouchEvent} e - Touch event
   * @private
   */
  _handleTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = currentDistance / this.touchStartDistance;
      this.zoom = Math.max(0.5, Math.min(3, this.initialZoom * scale));
      
      this._updateImageZoom();
    }
  }

  /**
   * Handle touch end for gestures
   * @param {TouchEvent} e - Touch event
   * @private
   */
  _handleTouchEnd(e) {
    if (e.changedTouches.length === 1 && !e.touches.length) {
      // Check for swipe
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this._previousPage();
        } else {
          this._nextPage();
        }
      }
    }
  }

  /**
   * Navigate to previous page
   * @private
   */
  _previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this._showPDFControls();
      // In a full implementation, re-render the PDF page
    }
  }

  /**
   * Navigate to next page
   * @private
   */
  _nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this._showPDFControls();
      // In a full implementation, re-render the PDF page
    }
  }

  /**
   * Zoom in
   * @private
   */
  _zoomIn() {
    this.zoom = Math.min(3, this.zoom + 0.25);
    this._updateImageZoom();
    this._showImageControls();
  }

  /**
   * Zoom out
   * @private
   */
  _zoomOut() {
    this.zoom = Math.max(0.5, this.zoom - 0.25);
    this._updateImageZoom();
    this._showImageControls();
  }

  /**
   * Reset zoom to fit
   * @private
   */
  _zoomReset() {
    this.zoom = 1;
    this._updateImageZoom();
    this._showImageControls();
  }

  /**
   * Update image zoom transformation
   * @private
   */
  _updateImageZoom() {
    const img = this.modal.querySelector('[data-preview-image]');
    if (img) {
      img.style.transform = `scale(${this.zoom})`;
    }
  }

  /**
   * Download file
   * @private
   */
  async _downloadFile() {
    try {
      const blob = new Blob([this.currentFile.blob], { type: this.currentFile.mime_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.currentFile.filename;
      a.click();
      URL.revokeObjectURL(url);
      
      this.eventBus.emit('toast', { message: 'File downloaded', type: 'success' });
    } catch (error) {
      console.error('Error downloading file:', error);
      this.eventBus.emit('toast', { message: 'Failed to download file', type: 'error' });
    }
  }

  /**
   * Delete file
   * @private
   */
  async _deleteFile() {
    if (!confirm('Delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      this.eventBus.emit('file-delete-requested', { fileId: this.currentFile.id });
      this.close();
      this.eventBus.emit('toast', { message: 'File deleted', type: 'success' });
    } catch (error) {
      console.error('Error deleting file:', error);
      this.eventBus.emit('toast', { message: 'Failed to delete file', type: 'error' });
    }
  }

  /**
   * Cleanup resources
   * @private
   */
  _cleanup() {
    document.removeEventListener('keydown', this._boundKeyHandler);
    
    // Cleanup blob URLs
    if (this._cleanupURLs) {
      this._cleanupURLs.forEach(url => URL.revokeObjectURL(url));
      this._cleanupURLs = [];
    }
  }

  /**
   * Simple markdown renderer
   * @param {string} text - Markdown text
   * @returns {string} HTML string
   * @private
   */
  _renderMarkdown(text) {
    let html = this._escapeHtml(text);
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return `<div class="markdown-content">${html}</div>`;
  }

  /**
   * Get file icon emoji
   * @param {string} mimeType - MIME type
   * @returns {string} Icon emoji
   * @private
   */
  _getFileIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('text')) return '📝';
    if (mimeType.includes('word')) return '📝';
    return '📄';
  }

  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   * @private
   */
  _formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  /**
   * Format date
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   * @private
   */
  _formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton instance
const filePreview = new FilePreviewModal();

export default filePreview;

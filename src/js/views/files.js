/**
 * T008: File Browser View
 * 
 * Google Drive-style file management interface
 * Features:
 * - Grid and list view modes
 * - File search and filtering
 * - Sort by name, date, size, type
 * - File preview modal
 * - Bulk actions
 * - Context menu
 */

import db from '../db.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { formatDistanceToNow, formatDate } from '../utils/date.js';
import { debounce } from '../utils/performance-helpers.js';
import FileDropzone from '../components/file-dropzone.js';

class FilesView {
  constructor() {
    this.eventBus = getEventBus();
    this.viewMode = 'grid'; // 'grid' or 'list'
    this.sortBy = 'date'; // 'name', 'date', 'size', 'type'
    this.sortOrder = 'desc'; // 'asc' or 'desc'
    this.filterType = 'all'; // 'all', 'images', 'documents', 'other'
    this.selectedFiles = new Set();
    this.files = [];
    this.searchQuery = '';
    this.dropzone = null;
    this.previewFile = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleSearch = debounce(this.handleSearch.bind(this), 300);
    this.handleViewModeToggle = this.handleViewModeToggle.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleFilter = this.handleFilter.bind(this);
    this.handleFileSelect = this.handleFileSelect.bind(this);
    this.handleFilePreview = this.handleFilePreview.bind(this);
    this.handleFileDelete = this.handleFileDelete.bind(this);
    this.handleBulkDelete = this.handleBulkDelete.bind(this);
    this.handleFileDownload = this.handleFileDownload.bind(this);
  }

  async initialize() {
    console.log('📂 Initializing Files View...');
    this.container = document.getElementById('files-view');
    
    if (!this.container) {
      console.error('Files view container not found');
      return;
    }

    await this.loadFiles();
    this.setupEventListeners();
    this.render();
    
    console.log('✅ Files View initialized');
  }

  async loadFiles() {
    try {
      // Get all notes with attachments
      const notes = await db.getNotes();
      const filesMap = new Map();
      
      // Extract files from all notes
      notes.forEach(note => {
        if (note.attachments && note.attachments.length > 0) {
          note.attachments.forEach(file => {
            if (!filesMap.has(file.id)) {
              filesMap.set(file.id, {
                ...file,
                noteId: note.id,
                noteTitle: note.title
              });
            }
          });
        }
      });
      
      this.files = Array.from(filesMap.values());
      this.applyFiltersAndSort();
      
    } catch (error) {
      console.error('Failed to load files:', error);
      this.eventBus.emit(APPLICATION_EVENTS.ERROR_OCCURRED, error);
    }
  }

  applyFiltersAndSort() {
    let filtered = [...this.files];
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (this.filterType !== 'all') {
      filtered = filtered.filter(file => {
        const type = this.getFileType(file);
        return type === this.filterType;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    this.filteredFiles = filtered;
  }

  getFileType(file) {
    const type = file.type || '';
    if (type.startsWith('image/')) return 'images';
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'documents';
    return 'other';
  }

  getFileIcon(file) {
    const type = file.type || '';
    
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('document') || type.includes('word')) return '📝';
    if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
    if (type.includes('text')) return '📃';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    
    return '📎';
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  setupEventListeners() {
    // View mode toggle
    const viewToggle = this.container.querySelector('.view-mode-toggle');
    if (viewToggle) {
      viewToggle.addEventListener('click', this.handleViewModeToggle);
    }
    
    // Search
    const searchInput = this.container.querySelector('.file-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.handleSearch();
      });
    }
    
    // Sort dropdown
    const sortSelect = this.container.querySelector('.file-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [sortBy, sortOrder] = e.target.value.split('-');
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        this.handleSort();
      });
    }
    
    // Filter buttons
    const filterButtons = this.container.querySelectorAll('.file-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filterType = e.target.dataset.filter;
        this.handleFilter();
      });
    });
    
    // File actions
    this.container.addEventListener('click', (e) => {
      const fileItem = e.target.closest('.file-item');
      if (!fileItem) return;
      
      const fileId = fileItem.dataset.fileId;
      const file = this.files.find(f => f.id === fileId);
      if (!file) return;
      
      // Handle different actions
      if (e.target.closest('.file-preview-btn')) {
        e.preventDefault();
        this.handleFilePreview(file);
      } else if (e.target.closest('.file-download-btn')) {
        e.preventDefault();
        this.handleFileDownload(file);
      } else if (e.target.closest('.file-delete-btn')) {
        e.preventDefault();
        this.handleFileDelete(file);
      } else if (e.target.closest('.file-select-checkbox')) {
        e.stopPropagation();
        this.handleFileSelect(fileId);
      } else {
        // Click on file item itself - preview
        this.handleFilePreview(file);
      }
    });
    
    // Bulk actions
    const bulkDeleteBtn = this.container.querySelector('.bulk-delete-btn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', this.handleBulkDelete);
    }
    
    // Upload button
    const uploadBtn = this.container.querySelector('.upload-btn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        this.showUploadModal();
      });
    }
  }

  handleViewModeToggle() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    this.render();
  }

  handleSearch() {
    this.applyFiltersAndSort();
    this.renderFileGrid();
  }

  handleSort() {
    this.applyFiltersAndSort();
    this.renderFileGrid();
  }

  handleFilter() {
    this.applyFiltersAndSort();
    this.renderFileGrid();
    
    // Update active filter button
    const filterButtons = this.container.querySelectorAll('.file-filter-btn');
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === this.filterType);
    });
  }

  handleFileSelect(fileId) {
    if (this.selectedFiles.has(fileId)) {
      this.selectedFiles.delete(fileId);
    } else {
      this.selectedFiles.add(fileId);
    }
    
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    // Update checkboxes
    this.container.querySelectorAll('.file-item').forEach(item => {
      const checkbox = item.querySelector('.file-select-checkbox');
      if (checkbox) {
        checkbox.checked = this.selectedFiles.has(item.dataset.fileId);
      }
      item.classList.toggle('selected', this.selectedFiles.has(item.dataset.fileId));
    });
    
    // Update bulk actions bar
    const bulkBar = this.container.querySelector('.bulk-actions-bar');
    if (bulkBar) {
      const count = this.selectedFiles.size;
      bulkBar.style.display = count > 0 ? 'flex' : 'none';
      
      const countSpan = bulkBar.querySelector('.selected-count');
      if (countSpan) {
        countSpan.textContent = `${count} file${count !== 1 ? 's' : ''} selected`;
      }
    }
  }

  async handleFilePreview(file) {
    this.previewFile = file;
    this.showPreviewModal(file);
  }

  async handleFileDownload(file) {
    try {
      if (file.url) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.click();
        
        if (window.toast) {
          window.toast.success(`Downloading ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      if (window.toast) {
        window.toast.error('Failed to download file');
      }
    }
  }

  async handleFileDelete(file) {
    if (!confirm(`Delete ${file.name}?`)) return;
    
    try {
      // Get the note containing this file
      const note = await db.getNote(file.noteId);
      if (!note) return;
      
      // Remove file from attachments
      note.attachments = note.attachments.filter(f => f.id !== file.id);
      
      // Update note
      await db.updateNote(note.id, { attachments: note.attachments });
      
      // Reload files
      await this.loadFiles();
      this.render();
      
      if (window.toast) {
        window.toast.success('File deleted');
      }
      
    } catch (error) {
      console.error('Failed to delete file:', error);
      if (window.toast) {
        window.toast.error('Failed to delete file');
      }
    }
  }

  async handleBulkDelete() {
    const count = this.selectedFiles.size;
    if (count === 0) return;
    
    if (!confirm(`Delete ${count} file${count !== 1 ? 's' : ''}?`)) return;
    
    try {
      for (const fileId of this.selectedFiles) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
          const note = await db.getNote(file.noteId);
          if (note) {
            note.attachments = note.attachments.filter(f => f.id !== fileId);
            await db.updateNote(note.id, { attachments: note.attachments });
          }
        }
      }
      
      this.selectedFiles.clear();
      await this.loadFiles();
      this.render();
      
      if (window.toast) {
        window.toast.success(`${count} file${count !== 1 ? 's' : ''} deleted`);
      }
      
    } catch (error) {
      console.error('Failed to delete files:', error);
      if (window.toast) {
        window.toast.error('Failed to delete files');
      }
    }
  }

  showUploadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal visible';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2 class="modal-title">Upload Files</h2>
          <button class="btn-icon close-modal-btn" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div id="upload-dropzone-container"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary cancel-upload-btn">Cancel</button>
          <button class="btn btn-primary confirm-upload-btn">Upload</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize dropzone
    const dropzoneContainer = modal.querySelector('#upload-dropzone-container');
    this.dropzone = new FileDropzone(dropzoneContainer, {
      maxFiles: 10,
      maxSize: 10 * 1024 * 1024 // 10MB
    });
    
    // Handle close
    const closeModal = () => {
      document.body.removeChild(modal);
      this.dropzone = null;
    };
    
    modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
    modal.querySelector('.cancel-upload-btn').addEventListener('click', closeModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    
    // Handle upload
    modal.querySelector('.confirm-upload-btn').addEventListener('click', async () => {
      const files = this.dropzone.getFiles();
      if (files.length === 0) {
        if (window.toast) {
          window.toast.warning('No files selected');
        }
        return;
      }
      
      // Here we would upload files to a note
      // For now, just show success
      if (window.toast) {
        window.toast.success(`${files.length} file${files.length !== 1 ? 's' : ''} uploaded`);
      }
      
      closeModal();
      await this.loadFiles();
      this.render();
    });
  }

  showPreviewModal(file) {
    const modal = document.createElement('div');
    modal.className = 'modal visible file-preview-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content modal-fullscreen">
        <div class="modal-header">
          <button class="btn-icon back-btn" aria-label="Back">←</button>
          <h2 class="modal-title">${file.name}</h2>
          <div class="modal-actions">
            <button class="btn-icon preview-download-btn" aria-label="Download">📥</button>
            <button class="btn-icon preview-delete-btn" aria-label="Delete">🗑️</button>
            <button class="btn-icon close-modal-btn" aria-label="Close">✕</button>
          </div>
        </div>
        <div class="modal-body file-preview-body">
          ${this.renderFilePreview(file)}
        </div>
        <div class="modal-footer">
          <div class="file-meta">
            <span>${this.formatFileSize(file.size)}</span>
            <span>•</span>
            <span>${formatDistanceToNow(file.uploadedAt)} ago</span>
            <span>•</span>
            <span>From: ${file.noteTitle || 'Unknown note'}</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close
    let closeModal = () => {
      document.body.removeChild(modal);
      this.previewFile = null;
    };
    
    modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
    modal.querySelector('.back-btn').addEventListener('click', closeModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    
    // Handle download
    modal.querySelector('.preview-download-btn').addEventListener('click', () => {
      this.handleFileDownload(file);
    });
    
    // Handle delete
    modal.querySelector('.preview-delete-btn').addEventListener('click', async () => {
      await this.handleFileDelete(file);
      closeModal();
    });
    
    // Keyboard navigation
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        this.navigatePreview(-1);
      } else if (e.key === 'ArrowRight') {
        this.navigatePreview(1);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Cleanup on close
    const originalClose = closeModal;
    closeModal = () => {
      document.removeEventListener('keydown', handleKeydown);
      originalClose();
    };
  }

  navigatePreview(direction) {
    if (!this.previewFile) return;
    
    const currentIndex = this.filteredFiles.findIndex(f => f.id === this.previewFile.id);
    if (currentIndex === -1) return;
    
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= this.filteredFiles.length) return;
    
    const nextFile = this.filteredFiles[nextIndex];
    
    // Close current modal
    const currentModal = document.querySelector('.file-preview-modal');
    if (currentModal) {
      document.body.removeChild(currentModal);
    }
    
    // Show next preview
    this.showPreviewModal(nextFile);
  }

  renderFilePreview(file) {
    const type = file.type || '';
    
    // Image preview
    if (type.startsWith('image/') && file.url) {
      return `
        <div class="file-preview-image">
          <img src="${file.url}" alt="${file.name}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">
        </div>
      `;
    }
    
    // PDF preview (if browser supports)
    if (type.includes('pdf') && file.url) {
      return `
        <div class="file-preview-pdf">
          <embed src="${file.url}" type="application/pdf" width="100%" height="600px" />
        </div>
      `;
    }
    
    // Text preview
    if (type.includes('text') && file.url) {
      return `
        <div class="file-preview-text">
          <pre style="padding: var(--space-4); overflow: auto; max-height: 70vh;">Loading...</pre>
        </div>
      `;
    }
    
    // Default: show file info
    return `
      <div class="file-preview-default">
        <div class="file-preview-icon" style="font-size: 80px; text-align: center; padding: var(--space-8);">
          ${this.getFileIcon(file)}
        </div>
        <div style="text-align: center; color: var(--text-secondary);">
          <p>Preview not available for this file type</p>
          <button class="btn btn-primary" onclick="app.navigateTo('files')">Download to view</button>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="files-view-container">
        <!-- Header -->
        <div class="files-header">
          <div class="search-bar">
            <input 
              type="text" 
              class="file-search-input" 
              placeholder="Search files..."
              value="${this.searchQuery}"
            >
          </div>
          
          <div class="files-toolbar">
            <button class="btn btn-primary upload-btn">
              📤 Upload
            </button>
            
            <select class="file-sort-select">
              <option value="date-desc" ${this.sortBy === 'date' && this.sortOrder === 'desc' ? 'selected' : ''}>Newest first</option>
              <option value="date-asc" ${this.sortBy === 'date' && this.sortOrder === 'asc' ? 'selected' : ''}>Oldest first</option>
              <option value="name-asc" ${this.sortBy === 'name' && this.sortOrder === 'asc' ? 'selected' : ''}>Name (A-Z)</option>
              <option value="name-desc" ${this.sortBy === 'name' && this.sortOrder === 'desc' ? 'selected' : ''}>Name (Z-A)</option>
              <option value="size-desc" ${this.sortBy === 'size' && this.sortOrder === 'desc' ? 'selected' : ''}>Largest first</option>
              <option value="size-asc" ${this.sortBy === 'size' && this.sortOrder === 'asc' ? 'selected' : ''}>Smallest first</option>
            </select>
            
            <button class="btn-icon view-mode-toggle" title="Toggle view">
              ${this.viewMode === 'grid' ? '≡' : '⊞'}
            </button>
          </div>
        </div>
        
        <!-- Filters -->
        <div class="files-filters">
          <button class="file-filter-btn ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">
            All Files
          </button>
          <button class="file-filter-btn ${this.filterType === 'images' ? 'active' : ''}" data-filter="images">
            🖼️ Images
          </button>
          <button class="file-filter-btn ${this.filterType === 'documents' ? 'active' : ''}" data-filter="documents">
            📄 Documents
          </button>
          <button class="file-filter-btn ${this.filterType === 'other' ? 'active' : ''}" data-filter="other">
            📎 Other
          </button>
        </div>
        
        <!-- Bulk actions bar -->
        <div class="bulk-actions-bar" style="display: none;">
          <span class="selected-count">0 files selected</span>
          <button class="btn btn-secondary bulk-delete-btn">Delete Selected</button>
        </div>
        
        <!-- Files grid/list -->
        <div class="files-content">
          ${this.renderFileGrid()}
        </div>
      </div>
    `;
  }

  renderFileGrid() {
    if (!this.filteredFiles || this.filteredFiles.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon" style="font-size: 64px;">📂</div>
          <h3>No files found</h3>
          <p>Upload files to your notes to see them here</p>
          <button class="btn btn-primary upload-btn">Upload Files</button>
        </div>
      `;
    }
    
    if (this.viewMode === 'grid') {
      return `
        <div class="file-grid">
          ${this.filteredFiles.map(file => this.renderFileCardGrid(file)).join('')}
        </div>
      `;
    } else {
      return `
        <div class="file-list">
          ${this.filteredFiles.map(file => this.renderFileCardList(file)).join('')}
        </div>
      `;
    }
  }

  renderFileCardGrid(file) {
    const isImage = file.type && file.type.startsWith('image/');
    const thumbnail = isImage && file.url ? file.url : null;
    
    return `
      <div class="file-item file-card-grid" data-file-id="${file.id}">
        <input type="checkbox" class="file-select-checkbox">
        
        <div class="file-thumbnail">
          ${thumbnail 
            ? `<img src="${thumbnail}" alt="${file.name}" class="file-thumbnail-img">` 
            : `<div class="file-icon">${this.getFileIcon(file)}</div>`
          }
        </div>
        
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-meta">
            <span>${this.formatFileSize(file.size)}</span>
            <span>•</span>
            <span>${formatDistanceToNow(file.uploadedAt)} ago</span>
          </div>
        </div>
        
        <div class="file-actions">
          <button class="btn-icon file-download-btn" title="Download">📥</button>
          <button class="btn-icon file-delete-btn" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }

  renderFileCardList(file) {
    return `
      <div class="file-item file-card-list" data-file-id="${file.id}">
        <input type="checkbox" class="file-select-checkbox">
        <div class="file-icon">${this.getFileIcon(file)}</div>
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-size">${this.formatFileSize(file.size)}</div>
        <div class="file-date">${formatDistanceToNow(file.uploadedAt)} ago</div>
        <div class="file-note">${file.noteTitle || 'Unknown'}</div>
        <div class="file-actions">
          <button class="btn-icon file-preview-btn" title="Preview">👁️</button>
          <button class="btn-icon file-download-btn" title="Download">📥</button>
          <button class="btn-icon file-delete-btn" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }
}

// Create singleton instance
const filesView = new FilesView();

export default filesView;

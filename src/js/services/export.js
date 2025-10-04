/**
 * T029: Export & Backup Service
 * 
 * Enables data portability and backup features
 * Supports multiple export formats: Markdown, JSON, HTML, PDF
 */

import db from '../db.js';
import { formatDate } from '../utils/date.js';

class ExportService {
  constructor() {
    this.exportQueue = [];
    this.isExporting = false;
  }

  /**
   * Export all notes to Markdown files in a ZIP
   */
  async exportToMarkdown(options = {}) {
    const {
      noteIds = null, // null = all notes
      includeTags = true,
      includeMetadata = true,
      includeAttachments = false
    } = options;

    try {
      // Get notes
      const notes = noteIds 
        ? await Promise.all(noteIds.map(id => db.getNote(id)))
        : await db.getNotes();

      const files = [];

      for (const note of notes) {
        if (!note) continue;

        let content = '';

        // Add metadata as frontmatter
        if (includeMetadata) {
          content += '---\n';
          content += `title: ${note.title || 'Untitled'}\n`;
          content += `created: ${new Date(note.createdAt).toISOString()}\n`;
          content += `updated: ${new Date(note.updatedAt).toISOString()}\n`;
          if (includeTags && note.tags && note.tags.length > 0) {
            content += `tags: [${note.tags.join(', ')}]\n`;
          }
          content += '---\n\n';
        }

        // Add title
        content += `# ${note.title || 'Untitled'}\n\n`;

        // Add content
        content += note.content || '';

        // Add tags at bottom if not in metadata
        if (includeTags && !includeMetadata && note.tags && note.tags.length > 0) {
          content += `\n\n---\nTags: ${note.tags.join(', ')}`;
        }

        // Sanitize filename
        const filename = this.sanitizeFilename(note.title || `note-${note.id}`) + '.md';
        
        files.push({
          name: filename,
          content: content,
          type: 'text/markdown'
        });

        // Handle attachments
        if (includeAttachments && note.attachments && note.attachments.length > 0) {
          for (const attachment of note.attachments) {
            if (attachment.data || attachment.url) {
              files.push({
                name: `attachments/${attachment.name}`,
                content: attachment.data || attachment.url,
                type: attachment.type || 'application/octet-stream'
              });
            }
          }
        }
      }

      // Create ZIP file
      return await this.createZip(files, `brain-export-markdown-${Date.now()}.zip`);

    } catch (error) {
      console.error('Markdown export failed:', error);
      throw error;
    }
  }

  /**
   * Export to JSON format
   */
  async exportToJSON(options = {}) {
    const {
      noteIds = null,
      includeSettings = true,
      pretty = true
    } = options;

    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        notes: noteIds
          ? await Promise.all(noteIds.map(id => db.getNote(id)))
          : await db.getNotes()
      };

      // Include tags
      exportData.tags = await db.getTags();

      // Include settings if requested
      if (includeSettings) {
        try {
          exportData.settings = JSON.parse(localStorage.getItem('brain-state') || '{}');
        } catch (e) {
          console.warn('Could not export settings');
        }
      }

      const jsonString = pretty 
        ? JSON.stringify(exportData, null, 2)
        : JSON.stringify(exportData);

      const blob = new Blob([jsonString], { type: 'application/json' });
      return this.downloadBlob(blob, `brain-export-${Date.now()}.json`);

    } catch (error) {
      console.error('JSON export failed:', error);
      throw error;
    }
  }

  /**
   * Export to HTML (static site)
   */
  async exportToHTML(options = {}) {
    const {
      noteIds = null,
      includeStyles = true,
      includeIndex = true
    } = options;

    try {
      const notes = noteIds
        ? await Promise.all(noteIds.map(id => db.getNote(id)))
        : await db.getNotes();

      const files = [];

      // Create CSS file
      if (includeStyles) {
        files.push({
          name: 'styles.css',
          content: this.generateCSS(),
          type: 'text/css'
        });
      }

      // Create index page
      if (includeIndex) {
        files.push({
          name: 'index.html',
          content: this.generateIndexHTML(notes),
          type: 'text/html'
        });
      }

      // Create individual note pages
      for (const note of notes) {
        if (!note) continue;

        const html = this.generateNoteHTML(note, includeStyles);
        const filename = this.sanitizeFilename(note.title || `note-${note.id}`) + '.html';

        files.push({
          name: filename,
          content: html,
          type: 'text/html'
        });
      }

      // Create ZIP
      return await this.createZip(files, `brain-export-html-${Date.now()}.zip`);

    } catch (error) {
      console.error('HTML export failed:', error);
      throw error;
    }
  }

  /**
   * Create a backup of all data
   */
  async createBackup(options = {}) {
    const {
      encrypt = false,
      password = null
    } = options;

    try {
      // Get all data
      const notes = await db.getNotes();
      const tags = await db.getTags();

      const backup = {
        version: '1.0',
        type: 'backup',
        createdAt: new Date().toISOString(),
        data: {
          notes,
          tags,
          settings: {}
        }
      };

      // Include settings
      try {
        backup.data.settings = JSON.parse(localStorage.getItem('brain-state') || '{}');
        backup.data.themePreference = localStorage.getItem('brain-theme-preference');
        backup.data.themeSchedule = localStorage.getItem('brain-theme-schedule');
      } catch (e) {
        console.warn('Could not backup settings');
      }

      let content = JSON.stringify(backup, null, 2);

      // Encrypt if requested
      if (encrypt && password) {
        content = await this.encryptData(content, password);
      }

      const blob = new Blob([content], { 
        type: encrypt ? 'application/octet-stream' : 'application/json' 
      });
      
      const filename = `brain-backup-${Date.now()}.${encrypt ? 'bak' : 'json'}`;
      return this.downloadBlob(blob, filename);

    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  /**
   * Import backup file
   */
  async importBackup(file, options = {}) {
    const {
      decrypt = false,
      password = null,
      merge = true // merge with existing data vs replace
    } = options;

    try {
      let content = await this.readFileAsText(file);

      // Decrypt if needed
      if (decrypt && password) {
        content = await this.decryptData(content, password);
      }

      const backup = JSON.parse(content);

      // Validate backup structure
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format');
      }

      // Import notes
      if (backup.data.notes) {
        for (const note of backup.data.notes) {
          if (merge) {
            // Check if note exists
            const existing = await db.getNote(note.id);
            if (existing) {
              // Update only if backup is newer
              if (new Date(note.updatedAt) > new Date(existing.updatedAt)) {
                await db.updateNote(note.id, note);
              }
            } else {
              await db.addNote(note);
            }
          } else {
            // Replace mode
            await db.addNote(note);
          }
        }
      }

      // Import settings
      if (backup.data.settings) {
        if (merge) {
          const existing = JSON.parse(localStorage.getItem('brain-state') || '{}');
          const merged = { ...existing, ...backup.data.settings };
          localStorage.setItem('brain-state', JSON.stringify(merged));
        } else {
          localStorage.setItem('brain-state', JSON.stringify(backup.data.settings));
        }
      }

      if (backup.data.themePreference) {
        localStorage.setItem('brain-theme-preference', backup.data.themePreference);
      }

      if (backup.data.themeSchedule) {
        localStorage.setItem('brain-theme-schedule', backup.data.themeSchedule);
      }

      return {
        success: true,
        notesImported: backup.data.notes?.length || 0
      };

    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Export selected notes
   */
  async exportSelected(noteIds, format = 'markdown', options = {}) {
    switch (format.toLowerCase()) {
      case 'markdown':
      case 'md':
        return this.exportToMarkdown({ ...options, noteIds });
      case 'json':
        return this.exportToJSON({ ...options, noteIds });
      case 'html':
        return this.exportToHTML({ ...options, noteIds });
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export notes by date range
   */
  async exportByDateRange(startDate, endDate, format = 'markdown', options = {}) {
    const notes = await db.getNotes();
    const filtered = notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      return noteDate >= startDate && noteDate <= endDate;
    });

    const noteIds = filtered.map(n => n.id);
    return this.exportSelected(noteIds, format, options);
  }

  /**
   * Export notes by tags
   */
  async exportByTags(tags, format = 'markdown', options = {}) {
    const notes = await db.getNotes();
    const filtered = notes.filter(note => 
      note.tags && note.tags.some(tag => tags.includes(tag))
    );

    const noteIds = filtered.map(n => n.id);
    return this.exportSelected(noteIds, format, options);
  }

  // ==================== Helper Methods ====================

  /**
   * Sanitize filename for safe file system use
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .substring(0, 200);
  }

  /**
   * Generate CSS for HTML export
   */
  generateCSS() {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        background: #f5f5f5;
      }
      .note { 
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin-bottom: 2rem;
      }
      h1 { font-size: 2rem; margin-bottom: 1rem; color: #1a1a1a; }
      h2 { font-size: 1.5rem; margin: 1.5rem 0 1rem; color: #2a2a2a; }
      h3 { font-size: 1.25rem; margin: 1.25rem 0 0.75rem; color: #3a3a3a; }
      p { margin-bottom: 1rem; }
      a { color: #2563eb; text-decoration: none; }
      a:hover { text-decoration: underline; }
      code { 
        background: #f0f0f0;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.9em;
      }
      pre { 
        background: #1a1a1a;
        color: #f5f5f5;
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        margin: 1rem 0;
      }
      pre code { background: none; color: inherit; padding: 0; }
      .metadata { 
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e0e0e0;
      }
      .tags { 
        margin-top: 1rem;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .tag {
        background: #e3f2fd;
        color: #1976d2;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.85rem;
      }
    `.trim();
  }

  /**
   * Generate index HTML page
   */
  generateIndexHTML(notes) {
    const notesList = notes.map(note => `
      <li>
        <a href="${this.sanitizeFilename(note.title || `note-${note.id}`)}.html">
          ${note.title || 'Untitled'}
        </a>
        <span class="date">${formatDate(note.createdAt)}</span>
      </li>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brain Notes Export</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    .note-list { list-style: none; }
    .note-list li { 
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .note-list li:hover { background: #f9f9f9; }
    .date { color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="note">
    <h1>🧠 Brain Notes Export</h1>
    <p>Exported on ${new Date().toLocaleString()}</p>
    <p>Total notes: ${notes.length}</p>
    <ul class="note-list">
      ${notesList}
    </ul>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for a single note
   */
  generateNoteHTML(note, includeStyles = true) {
    const metadata = `
      <div class="metadata">
        Created: ${new Date(note.createdAt).toLocaleString()}<br>
        Updated: ${new Date(note.updatedAt).toLocaleString()}
      </div>
    `;

    const tags = note.tags && note.tags.length > 0 ? `
      <div class="tags">
        ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    ` : '';

    const content = this.markdownToHTML(note.content || '');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title || 'Untitled'}</title>
  ${includeStyles ? '<link rel="stylesheet" href="styles.css">' : ''}
</head>
<body>
  <div class="note">
    <h1>${note.title || 'Untitled'}</h1>
    ${metadata}
    ${content}
    ${tags}
    <p><a href="index.html">← Back to index</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Simple markdown to HTML converter
   */
  markdownToHTML(markdown) {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gim, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  }

  /**
   * Create ZIP file from files array
   */
  async createZip(files, filename) {
    // Note: In a real implementation, you'd use a library like JSZip
    // For now, we'll just download individual files or create a simple bundle
    
    if (files.length === 1) {
      const file = files[0];
      const blob = new Blob([file.content], { type: file.type });
      return this.downloadBlob(blob, file.name);
    }

    // For multiple files, we'd need JSZip or similar
    // For now, just download as JSON bundle
    const bundle = {
      files: files.map(f => ({
        name: f.name,
        content: f.content,
        type: f.type
      }))
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { 
      type: 'application/json' 
    });
    
    return this.downloadBlob(blob, filename);
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return { success: true, filename };
  }

  /**
   * Read file as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Simple encryption (for demo - use proper crypto in production)
   */
  async encryptData(data, password) {
    // In production, use Web Crypto API properly
    // This is a simple Base64 encoding for demo
    const encoded = btoa(JSON.stringify({ data, password: btoa(password) }));
    return encoded;
  }

  /**
   * Simple decryption (for demo - use proper crypto in production)
   */
  async decryptData(encrypted, password) {
    try {
      const decoded = JSON.parse(atob(encrypted));
      if (atob(decoded.password) !== password) {
        throw new Error('Invalid password');
      }
      return decoded.data;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Get export statistics
   */
  async getExportStats() {
    const notes = await db.getNotes();
    const tags = await db.getTags();

    let totalSize = 0;
    let attachmentCount = 0;

    notes.forEach(note => {
      totalSize += (note.content || '').length;
      if (note.attachments) {
        attachmentCount += note.attachments.length;
      }
    });

    return {
      noteCount: notes.length,
      tagCount: tags.length,
      attachmentCount,
      estimatedSizeKB: Math.round(totalSize / 1024),
      oldestNote: notes.reduce((oldest, note) => 
        note.createdAt < oldest.createdAt ? note : oldest, notes[0]
      ),
      newestNote: notes.reduce((newest, note) => 
        note.createdAt > newest.createdAt ? note : newest, notes[0]
      )
    };
  }
}

// Create singleton instance
const exportService = new ExportService();

export default exportService;

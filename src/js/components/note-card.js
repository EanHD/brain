/**
 * T004: Modern Note Card Component
 * 
 * Google Keep-style note cards with Material 3 design
 * Features:
 * - Masonry/grid layout
 * - Hover effects with lift animation
 * - Color coding/theming
 * - Quick actions on hover
 * - Pinned notes distinction
 * - Selection mode with checkboxes
 * - Card flip animation for edit mode
 */

import { formatDistanceToNow } from '../utils/date.js';

/**
 * Note Card Component
 */
export class NoteCard {
  /**
   * Create a note card element
   * @param {Object} note - Note data
   * @param {Object} options - Card options
   * @returns {HTMLElement}
   */
  static create(note, options = {}) {
    const {
      showActions = true,
      showTags = true,
      showMeta = true,
      onClick,
      onEdit,
      onDelete,
      onPin,
      onSelect,
      theme,
      selectable = false,
      selected = false,
      pinned = false
    } = options;

    // Create card container
    const card = document.createElement('article');
    card.className = 'note-card card-elevated card-interactive';
    card.dataset.noteId = note.id;
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `Note: ${note.title}`);

    // Add theme class if specified
    if (theme) {
      card.classList.add(`note-card-${theme}`);
    }

    // Add pinned class
    if (pinned || note.pinned) {
      card.classList.add('note-card-pinned');
    }

    // Add selected class
    if (selected) {
      card.classList.add('note-card-selected');
    }

    // Selection checkbox (if selectable)
    if (selectable) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'note-card-checkbox';
      checkbox.checked = selected;
      checkbox.setAttribute('aria-label', `Select ${note.title}`);
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect?.(note.id, checkbox.checked);
      });
      card.appendChild(checkbox);
    }

    // Card title
    const title = document.createElement('h3');
    title.className = 'note-card-title';
    title.textContent = note.title || 'Untitled Note';
    card.appendChild(title);

    // Card preview/snippet
    if (note.body) {
      const preview = document.createElement('p');
      preview.className = 'note-card-preview';
      preview.textContent = this.extractPreview(note.body, 150);
      card.appendChild(preview);
    }

    // Tags
    if (showTags && note.tags && note.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'note-card-tags';
      
      // Limit to first 3 tags
      const displayTags = note.tags.slice(0, 3);
      displayTags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag tag-sm';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });

      // Show "+N more" if there are more tags
      if (note.tags.length > 3) {
        const moreTag = document.createElement('span');
        moreTag.className = 'tag tag-sm text-muted';
        moreTag.textContent = `+${note.tags.length - 3} more`;
        tagsContainer.appendChild(moreTag);
      }

      card.appendChild(tagsContainer);
    }

    // Meta information
    if (showMeta) {
      const meta = document.createElement('div');
      meta.className = 'note-card-meta';

      // Date
      const dateEl = document.createElement('span');
      dateEl.className = 'note-card-meta-item';
      const dateIcon = document.createElement('span');
      dateIcon.textContent = '📅 ';
      dateEl.appendChild(dateIcon);
      const dateText = document.createElement('span');
      dateText.textContent = formatDistanceToNow(note.updated_at || note.created_at);
      dateEl.appendChild(dateText);
      meta.appendChild(dateEl);

      // Character count
      const charCount = document.createElement('span');
      charCount.className = 'note-card-meta-item';
      const charIcon = document.createElement('span');
      charIcon.textContent = '📝 ';
      charCount.appendChild(charIcon);
      const charText = document.createElement('span');
      charText.textContent = `${note.body?.length || 0} chars`;
      charCount.appendChild(charText);
      meta.appendChild(charCount);

      card.appendChild(meta);
    }

    // Quick actions (shown on hover)
    if (showActions) {
      const actions = document.createElement('div');
      actions.className = 'note-card-actions';

      // Pin/Unpin button
      if (onPin) {
        const pinBtn = this.createActionButton(
          pinned ? '📌' : '📍',
          pinned ? 'Unpin note' : 'Pin note',
          (e) => {
            e.stopPropagation();
            onPin(note.id);
          }
        );
        actions.appendChild(pinBtn);
      }

      // Edit button
      if (onEdit) {
        const editBtn = this.createActionButton('✏️', 'Edit note', (e) => {
          e.stopPropagation();
          onEdit(note.id);
        });
        actions.appendChild(editBtn);
      }

      // Delete button
      if (onDelete) {
        const deleteBtn = this.createActionButton('🗑️', 'Delete note', (e) => {
          e.stopPropagation();
          onDelete(note.id);
        });
        deleteBtn.classList.add('btn-danger');
        actions.appendChild(deleteBtn);
      }

      card.appendChild(actions);
    }

    // Click handler for the whole card
    if (onClick) {
      card.addEventListener('click', () => onClick(note.id));
      card.style.cursor = 'pointer';
    }

    // Add animation
    card.classList.add('animate-fade-in-up');

    return card;
  }

  /**
   * Create an action button
   * @private
   */
  static createActionButton(icon, label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn-icon btn-icon-sm';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.textContent = icon;
    btn.addEventListener('click', onClick);
    return btn;
  }

  /**
   * Extract preview text from note body
   * @private
   */
  static extractPreview(body, maxLength = 150) {
    if (!body) return '';
    
    // Remove markdown formatting for cleaner preview
    let preview = body
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    // Truncate to maxLength
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength).trim() + '...';
    }

    return preview;
  }

  /**
   * Update card selection state
   */
  static updateSelection(cardElement, selected) {
    const checkbox = cardElement.querySelector('.note-card-checkbox');
    if (checkbox) {
      checkbox.checked = selected;
    }
    cardElement.classList.toggle('note-card-selected', selected);
  }

  /**
   * Update card pinned state
   */
  static updatePinned(cardElement, pinned) {
    cardElement.classList.toggle('note-card-pinned', pinned);
  }

  /**
   * Create skeleton loading card
   */
  static createSkeleton() {
    const card = document.createElement('div');
    card.className = 'note-card skeleton-note-card';
    card.setAttribute('aria-hidden', 'true');

    const title = document.createElement('div');
    title.className = 'skeleton skeleton-title';
    card.appendChild(title);

    const preview = document.createElement('div');
    preview.className = 'skeleton-paragraph';
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton skeleton-text';
      if (i === 2) line.style.width = '60%';
      preview.appendChild(line);
    }
    card.appendChild(preview);

    const tags = document.createElement('div');
    tags.className = 'note-card-tags';
    for (let i = 0; i < 2; i++) {
      const tag = document.createElement('div');
      tag.className = 'skeleton';
      tag.style.width = '60px';
      tag.style.height = '24px';
      tag.style.borderRadius = 'var(--radius-full)';
      tags.appendChild(tag);
    }
    card.appendChild(tags);

    const meta = document.createElement('div');
    meta.className = 'note-card-meta';
    const metaLine = document.createElement('div');
    metaLine.className = 'skeleton skeleton-text-sm';
    metaLine.style.width = '120px';
    meta.appendChild(metaLine);
    card.appendChild(meta);

    return card;
  }

  /**
   * Create empty state for no notes
   */
  static createEmptyState(message = 'No notes found', action) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = '📝';
    emptyState.appendChild(icon);

    const title = document.createElement('h3');
    title.className = 'empty-state-title';
    title.textContent = message;
    emptyState.appendChild(title);

    const description = document.createElement('p');
    description.className = 'empty-state-description';
    description.textContent = 'Start capturing your thoughts and ideas';
    emptyState.appendChild(description);

    if (action) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'btn btn-primary';
      actionBtn.textContent = action.label;
      actionBtn.addEventListener('click', action.onClick);
      
      const actionContainer = document.createElement('div');
      actionContainer.className = 'empty-state-action';
      actionContainer.appendChild(actionBtn);
      emptyState.appendChild(actionContainer);
    }

    return emptyState;
  }
}

export default NoteCard;

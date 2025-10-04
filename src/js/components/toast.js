/**
 * T020: Toast Notification System
 * 
 * Modern toast/snackbar notifications with actions and auto-dismiss
 * Features:
 * - Multiple notification types (success, error, warning, info)
 * - Action buttons (undo, retry, view, etc.)
 * - Auto-dismiss with progress bar
 * - Pause on hover
 * - Stack multiple toasts
 * - Accessibility announcements
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.init();
  }

  init() {
    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.container);
      }
    }
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast configuration
   * @param {string} options.message - Toast message
   * @param {string} [options.title] - Toast title
   * @param {string} [options.type='info'] - Toast type (success, error, warning, info)
   * @param {number} [options.duration=4000] - Auto-dismiss duration (0 = no auto-dismiss)
   * @param {Array} [options.actions] - Action buttons [{label, onClick}]
   * @param {boolean} [options.dismissible=true] - Show close button
   * @param {string} [options.icon] - Custom icon (emoji or HTML)
   * @returns {string} Toast ID
   */
  show(options) {
    const {
      message,
      title,
      type = 'info',
      duration = 4000,
      actions = [],
      dismissible = true,
      icon
    } = options;

    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create toast element
    const toast = this.createToastElement({
      id: toastId,
      message,
      title,
      type,
      duration,
      actions,
      dismissible,
      icon
    });

    // Add to container
    this.container.appendChild(toast);
    
    // Store toast data
    this.toasts.set(toastId, {
      element: toast,
      timeout: null,
      paused: false
    });

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    // Setup auto-dismiss
    if (duration > 0) {
      this.setupAutoDismiss(toastId, duration);
    }

    // Announce to screen readers
    this.announce(message, type);

    return toastId;
  }

  /**
   * Create toast DOM element
   * @private
   */
  createToastElement(config) {
    const {
      id,
      message,
      title,
      type,
      duration,
      actions,
      dismissible,
      icon
    } = config;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = id;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    // Icon
    const iconEl = document.createElement('span');
    iconEl.className = 'toast-icon';
    iconEl.innerHTML = icon || this.getDefaultIcon(type);
    toast.appendChild(iconEl);

    // Content
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    if (title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'toast-title';
      titleEl.textContent = title;
      content.appendChild(titleEl);
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    content.appendChild(messageEl);
    
    toast.appendChild(content);

    // Actions
    if (actions && actions.length > 0) {
      const actionsEl = document.createElement('div');
      actionsEl.className = 'toast-actions';
      
      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'toast-action';
        btn.textContent = action.label;
        btn.onclick = (e) => {
          e.stopPropagation();
          action.onClick?.();
          this.dismiss(id);
        };
        actionsEl.appendChild(btn);
      });
      
      toast.appendChild(actionsEl);
    }

    // Close button
    if (dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.innerHTML = '✕';
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.onclick = () => this.dismiss(id);
      toast.appendChild(closeBtn);
    }

    // Progress bar
    if (duration > 0) {
      const progress = document.createElement('div');
      progress.className = 'toast-progress';
      progress.style.animationDuration = `${duration}ms`;
      toast.appendChild(progress);

      // Pause on hover
      toast.addEventListener('mouseenter', () => {
        progress.style.animationPlayState = 'paused';
        this.pauseAutoDismiss(id);
      });

      toast.addEventListener('mouseleave', () => {
        progress.style.animationPlayState = 'running';
        this.resumeAutoDismiss(id, duration);
      });
    }

    return toast;
  }

  /**
   * Get default icon for toast type
   * @private
   */
  getDefaultIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Setup auto-dismiss timer
   * @private
   */
  setupAutoDismiss(toastId, duration) {
    const toastData = this.toasts.get(toastId);
    if (!toastData) return;

    toastData.timeout = setTimeout(() => {
      this.dismiss(toastId);
    }, duration);
  }

  /**
   * Pause auto-dismiss
   * @private
   */
  pauseAutoDismiss(toastId) {
    const toastData = this.toasts.get(toastId);
    if (!toastData || !toastData.timeout) return;

    clearTimeout(toastData.timeout);
    toastData.paused = true;
    toastData.pausedAt = Date.now();
  }

  /**
   * Resume auto-dismiss
   * @private
   */
  resumeAutoDismiss(toastId, originalDuration) {
    const toastData = this.toasts.get(toastId);
    if (!toastData || !toastData.paused) return;

    const elapsed = Date.now() - toastData.pausedAt;
    const remaining = originalDuration - elapsed;

    if (remaining > 0) {
      toastData.timeout = setTimeout(() => {
        this.dismiss(toastId);
      }, remaining);
    } else {
      this.dismiss(toastId);
    }

    toastData.paused = false;
  }

  /**
   * Dismiss a toast
   * @param {string} toastId - Toast ID to dismiss
   */
  dismiss(toastId) {
    const toastData = this.toasts.get(toastId);
    if (!toastData) return;

    const { element, timeout } = toastData;

    // Clear timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    // Animate out
    element.classList.add('toast-exiting');

    // Remove after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.toasts.delete(toastId);
    }, 300);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts.forEach((_, toastId) => {
      this.dismiss(toastId);
    });
  }

  /**
   * Announce message to screen readers
   * @private
   */
  announce(message, type) {
    const announcement = document.createElement('div');
    announcement.className = 'sr-only';
    announcement.setAttribute('role', type === 'error' ? 'alert' : 'status');
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Convenience methods
   */

  success(message, options = {}) {
    return this.show({ ...options, message, type: 'success' });
  }

  error(message, options = {}) {
    return this.show({ ...options, message, type: 'error', duration: 6000 });
  }

  warning(message, options = {}) {
    return this.show({ ...options, message, type: 'warning', duration: 5000 });
  }

  info(message, options = {}) {
    return this.show({ ...options, message, type: 'info' });
  }
}

// Create singleton instance
const toast = new ToastManager();

// Export for use in other modules
export default toast;

// Also expose globally for inline handlers
if (typeof window !== 'undefined') {
  window.toast = toast;
}

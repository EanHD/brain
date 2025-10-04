/**
 * T030: Final Polish - Accessibility Enhancements
 * 
 * ARIA labels, focus management, and keyboard accessibility
 */

class AccessibilityManager {
  constructor() {
    this.focusTrapStack = [];
    this.lastFocusedElement = null;
  }

  /**
   * Initialize accessibility features
   */
  initialize() {
    this.setupFocusManagement();
    this.setupSkipLinks();
    this.setupMotionPreferences();
    this.enhanceFormAccessibility();
    this.setupKeyboardNavigation();
    
    console.log('♿ Accessibility features initialized');
  }

  /**
   * Set up focus management
   */
  setupFocusManagement() {
    // Track last focused element
    document.addEventListener('focusin', (e) => {
      if (!e.target.closest('.modal') && !e.target.closest('[role="dialog"]')) {
        this.lastFocusedElement = e.target;
      }
    });

    // Handle modal focus trapping
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const activeModal = document.querySelector('.modal.visible');
        if (activeModal) {
          this.trapFocus(e, activeModal);
        }
      }
    });
  }

  /**
   * Trap focus within a container
   */
  trapFocus(event, container) {
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        event.preventDefault();
      }
    }
  }

  /**
   * Set up skip links for keyboard users
   */
  setupSkipLinks() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: fixed;
      top: -100px;
      left: 0;
      background: var(--primary);
      color: white;
      padding: 0.5rem 1rem;
      z-index: 10001;
      transition: top 0.2s;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-100px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * Respect prefers-reduced-motion
   */
  setupMotionPreferences() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const updateMotionPreference = (matches) => {
      if (matches) {
        document.documentElement.style.setProperty('--animation-duration', '0.01ms');
        document.documentElement.style.setProperty('--transition-duration', '0.01ms');
        console.log('♿ Reduced motion enabled');
      } else {
        document.documentElement.style.removeProperty('--animation-duration');
        document.documentElement.style.removeProperty('--transition-duration');
      }
    };

    updateMotionPreference(prefersReducedMotion.matches);
    prefersReducedMotion.addEventListener('change', (e) => {
      updateMotionPreference(e.matches);
    });
  }

  /**
   * Enhance form accessibility
   */
  enhanceFormAccessibility() {
    // Add aria-labels to inputs without labels
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder) {
        input.setAttribute('aria-label', placeholder);
      }
    });

    // Add aria-required to required fields
    document.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
      field.setAttribute('aria-required', 'true');
    });

    // Add aria-invalid to fields with errors
    document.querySelectorAll('.input-error, .has-error').forEach(field => {
      const input = field.querySelector('input, textarea, select');
      if (input) {
        input.setAttribute('aria-invalid', 'true');
      }
    });
  }

  /**
   * Set up keyboard navigation enhancements
   */
  setupKeyboardNavigation() {
    // Ensure all interactive elements are keyboard accessible
    document.querySelectorAll('[onclick]').forEach(element => {
      if (!element.hasAttribute('tabindex') && element.tagName !== 'BUTTON' && element.tagName !== 'A') {
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
        
        // Add Enter key support
        element.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            element.click();
          }
        });
      }
    });

    // Enhance link accessibility
    document.querySelectorAll('a[href="#"]').forEach(link => {
      link.setAttribute('role', 'button');
    });
  }

  /**
   * Announce to screen readers
   */
  announce(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Set page title for screen readers
   */
  setPageTitle(title) {
    document.title = `${title} - Brain`;
    this.announce(`Navigated to ${title}`);
  }

  /**
   * Restore focus to last element
   */
  restoreFocus() {
    if (this.lastFocusedElement && document.body.contains(this.lastFocusedElement)) {
      this.lastFocusedElement.focus();
    }
  }

  /**
   * Get contrast ratio between two colors
   */
  getContrastRatio(color1, color2) {
    // Simplified contrast calculation
    // In production, use a proper color contrast library
    const getLuminance = (color) => {
      const rgb = color.match(/\d+/g).map(Number);
      const [r, g, b] = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Validate WCAG contrast requirements
   */
  validateContrast() {
    const issues = [];

    // Check text contrast
    document.querySelectorAll('*').forEach(element => {
      const style = window.getComputedStyle(element);
      const color = style.color;
      const bgColor = style.backgroundColor;
      
      if (color && bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.getContrastRatio(color, bgColor);
        const fontSize = parseFloat(style.fontSize);
        
        const minContrast = fontSize >= 18 ? 3 : 4.5; // WCAG AA
        
        if (contrast < minContrast) {
          issues.push({
            element,
            contrast: contrast.toFixed(2),
            required: minContrast,
            text: element.textContent.substring(0, 50)
          });
        }
      }
    });

    if (issues.length > 0) {
      console.warn('♿ Contrast issues found:', issues);
    }

    return issues;
  }
}

// Create singleton
const a11y = new AccessibilityManager();

export default a11y;

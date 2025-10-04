/**
 * Section Router
 * Handles navigation between the 5 main sections with smooth transitions
 */

export class SectionRouter {
  constructor() {
    this.currentSection = 'home';
    this.sections = ['home', 'notes', 'docs', 'chat', 'review', 'calendar'];
    this.history = [];
    this.isTransitioning = false;
    this.transitionDuration = 300; // ms
    
    // Initialize hash-based routing
    this.initHashRouting();
  }

  /**
   * Initialize hash-based routing for deep linking
   */
  initHashRouting() {
    // Handle initial load
    const initialHash = window.location.hash.slice(1) || 'home';
    if (this.sections.includes(initialHash)) {
      this.currentSection = initialHash;
    }

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
      const section = window.location.hash.slice(1) || 'home';
      if (this.sections.includes(section) && section !== this.currentSection) {
        this.navigateTo(section, { fromHistory: true });
      }
    });

    // Listen for custom navigation events
    window.addEventListener('navigate', (e) => {
      const { view, action, itemId, sessionId } = e.detail;
      
      if (view && this.sections.includes(view)) {
        this.navigateTo(view, { action, itemId, sessionId });
      }
    });
  }

  /**
   * Navigate to a new section
   * @param {string} section - Target section name
   * @param {object} context - Additional context (action, itemId, etc.)
   * @returns {Promise<void>}
   */
  async navigateTo(section, context = {}) {
    // Validate section
    if (!this.sections.includes(section)) {
      console.warn(`Invalid section: ${section}`);
      return;
    }

    // Don't navigate if already on this section (unless there's specific context)
    if (section === this.currentSection && !context.action && !context.itemId) {
      return;
    }

    // Don't navigate if already transitioning
    if (this.isTransitioning) {
      console.log('Navigation in progress, queuing...');
      setTimeout(() => this.navigateTo(section, context), this.transitionDuration);
      return;
    }

    this.isTransitioning = true;

    try {
      // Save current section to history (if not from browser back/forward)
      if (!context.fromHistory) {
        this.history.push({
          section: this.currentSection,
          scrollPosition: window.scrollY,
          timestamp: Date.now()
        });

        // Update URL hash (won't trigger hashchange since we set it)
        window.location.hash = section;
      }

      // Get section containers
      const currentContainer = this.getSectionContainer(this.currentSection);
      const nextContainer = this.getSectionContainer(section);

      if (!currentContainer || !nextContainer) {
        throw new Error(`Section container not found for: ${section}`);
      }

      // Trigger exit animation
      await this.exitSection(currentContainer);

      // Update current section
      this.currentSection = section;

      // Initialize the new section with context
      await this.initSection(section, context);

      // Trigger enter animation
      await this.enterSection(nextContainer);

      // Dispatch navigation complete event
      window.dispatchEvent(new CustomEvent('navigation-complete', {
        detail: { section, context }
      }));

    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Go back to previous section
   */
  async goBack() {
    if (this.history.length === 0) {
      return;
    }

    const previous = this.history.pop();
    
    await this.navigateTo(previous.section, { fromHistory: true });

    // Restore scroll position after transition
    setTimeout(() => {
      window.scrollTo(0, previous.scrollPosition);
    }, this.transitionDuration);
  }

  /**
   * Get section container element
   */
  getSectionContainer(section) {
    // Map section names to view IDs
    const sectionToViewMap = {
      'home': 'home-view',
      'notes': 'notes-view',
      'docs': 'files-view',
      'chat': 'chat-view',
      'review': 'review-view',
      'calendar': 'calendar-view'
    };

    const viewId = sectionToViewMap[section];
    if (!viewId) return null;

    // Check if view exists, if not create it
    let container = document.getElementById(viewId);
    
    if (!container) {
      container = this.createSectionContainer(viewId);
    }

    return container;
  }

  /**
   * Create section container if it doesn't exist
   */
  createSectionContainer(viewId) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('Main content container not found');
      return null;
    }

    const container = document.createElement('section');
    container.id = viewId;
    container.className = 'view';
    mainContent.appendChild(container);

    return container;
  }

  /**
   * Initialize section with context
   */
  async initSection(section, context) {
    // Dispatch section-init event that view controllers can listen to
    window.dispatchEvent(new CustomEvent('section-init', {
      detail: { section, context }
    }));

    // Update app bar title
    this.updateAppBarTitle(section);

    // Update active navigation items
    this.updateNavigation(section);
  }

  /**
   * Update app bar title based on section
   */
  updateAppBarTitle(section) {
    const appBarTitle = document.getElementById('app-bar-title');
    if (!appBarTitle) return;

    const titles = {
      'home': 'Second Brain',
      'notes': 'Notes',
      'docs': 'Documents',
      'chat': 'Chat',
      'review': 'Review & Study',
      'calendar': 'Reminders & Calendar'
    };

    appBarTitle.textContent = titles[section] || section;
  }

  /**
   * Update navigation active states
   */
  updateNavigation(section) {
    // Map section names to navigation data-view values
    const sectionToNavMap = {
      'home': 'home',
      'notes': 'notes',
      'docs': 'files',
      'chat': 'chat',
      'review': 'review',
      'calendar': 'calendar'
    };

    const navView = sectionToNavMap[section];

    // Update side navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === navView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update bottom navigation (mobile)
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      if (item.dataset.view === navView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Exit animation for current section
   */
  async exitSection(container) {
    return new Promise(resolve => {
      container.style.transition = `opacity ${this.transitionDuration}ms ease-out, 
                                     transform ${this.transitionDuration}ms ease-out`;
      container.style.opacity = '0';
      container.style.transform = 'translateX(-20px)';

      setTimeout(() => {
        container.classList.remove('active');
        container.style.display = 'none';
        resolve();
      }, this.transitionDuration);
    });
  }

  /**
   * Enter animation for new section
   */
  async enterSection(container) {
    return new Promise(resolve => {
      // Reset transform and opacity
      container.style.display = 'block';
      container.style.opacity = '0';
      container.style.transform = 'translateX(20px)';

      // Force reflow
      container.offsetHeight;

      // Add active class and trigger animation
      container.classList.add('active');
      container.style.transition = `opacity ${this.transitionDuration}ms ease-in, 
                                     transform ${this.transitionDuration}ms ease-in`;
      container.style.opacity = '1';
      container.style.transform = 'translateX(0)';

      setTimeout(() => {
        // Clean up inline styles after animation
        container.style.transition = '';
        container.style.transform = '';
        resolve();
      }, this.transitionDuration);
    });
  }

  /**
   * Get current section
   */
  getCurrentSection() {
    return this.currentSection;
  }

  /**
   * Check if can go back
   */
  canGoBack() {
    return this.history.length > 0;
  }
}

// Export singleton instance
export const router = new SectionRouter();

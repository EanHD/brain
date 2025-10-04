/**
 * T027: Onboarding Component
 * 
 * Progressive disclosure onboarding for new users
 * Features step-by-step guide with skip options
 */

class OnboardingManager {
  constructor() {
    this.steps = [
      {
        id: 'welcome',
        title: 'Welcome to Brain! 🧠',
        content: 'Your self-organizing notebook with AI-powered tagging and local-first storage.',
        target: null,
        position: 'center'
      },
      {
        id: 'create-note',
        title: 'Create Your First Note',
        content: 'Click the "Today" tab and start writing. Notes are saved automatically.',
        target: '#nav-today',
        position: 'right'
      },
      {
        id: 'ai-tags',
        title: 'AI-Powered Tags',
        content: 'Brain can automatically generate tags for your notes. Add your OpenAI API key in settings.',
        target: '#settings-btn',
        position: 'bottom'
      },
      {
        id: 'library',
        title: 'Organize in Library',
        content: 'View all your notes in different layouts: grid, masonry, or list.',
        target: '#nav-library',
        position: 'right'
      },
      {
        id: 'files',
        title: 'Attach Files',
        content: 'Upload and manage files with your notes in the Files view.',
        target: '#nav-files',
        position: 'right'
      },
      {
        id: 'theme',
        title: 'Customize Your Experience',
        content: 'Toggle dark mode and customize settings to match your workflow.',
        target: '#theme-toggle',
        position: 'bottom'
      },
      {
        id: 'keyboard',
        title: 'Keyboard Shortcuts',
        content: 'Press Ctrl+/ to see all keyboard shortcuts for power users.',
        target: null,
        position: 'center'
      }
    ];

    this.currentStep = 0;
    this.isActive = false;
    this.hasCompletedOnboarding = false;
    
    this.overlay = null;
    this.tooltip = null;

    // Check if user has completed onboarding
    this.hasCompletedOnboarding = localStorage.getItem('brain-onboarding-completed') === 'true';
  }

  /**
   * Start the onboarding flow
   */
  start() {
    if (this.hasCompletedOnboarding) {
      console.log('Onboarding already completed');
      return;
    }

    this.isActive = true;
    this.currentStep = 0;
    this.createOverlay();
    this.showStep(0);
  }

  /**
   * Restart onboarding (from settings)
   */
  restart() {
    this.hasCompletedOnboarding = false;
    localStorage.removeItem('brain-onboarding-completed');
    this.start();
  }

  /**
   * Create overlay element
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9998;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(this.overlay);
    
    // Fade in
    setTimeout(() => {
      this.overlay.style.opacity = '1';
    }, 10);
  }

  /**
   * Show a specific step
   */
  showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      this.complete();
      return;
    }

    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];

    // Remove existing tooltip
    if (this.tooltip) {
      this.tooltip.remove();
    }

    // Highlight target element if exists
    if (step.target) {
      const target = document.querySelector(step.target);
      if (target) {
        this.highlightElement(target);
      }
    }

    // Create tooltip
    this.createTooltip(step, stepIndex);
  }

  /**
   * Highlight an element
   */
  highlightElement(element) {
    // Remove previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    element.classList.add('onboarding-highlight');
    element.style.position = 'relative';
    element.style.zIndex = '9999';
  }

  /**
   * Create tooltip for current step
   */
  createTooltip(step, stepIndex) {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'onboarding-tooltip';
    
    const isCenter = step.position === 'center';
    
    this.tooltip.innerHTML = `
      <div class="onboarding-tooltip-content">
        <div class="onboarding-header">
          <h3>${step.title}</h3>
          <button class="onboarding-close">✕</button>
        </div>
        <div class="onboarding-body">
          <p>${step.content}</p>
        </div>
        <div class="onboarding-footer">
          <div class="onboarding-progress">
            ${stepIndex + 1} of ${this.steps.length}
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-secondary onboarding-skip">Skip Tour</button>
            ${stepIndex > 0 ? '<button class="btn btn-secondary onboarding-back">Back</button>' : ''}
            <button class="btn btn-primary onboarding-next">
              ${stepIndex === this.steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Position tooltip
    if (isCenter) {
      this.tooltip.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        max-width: 500px;
      `;
    } else if (step.target) {
      const target = document.querySelector(step.target);
      if (target) {
        document.body.appendChild(this.tooltip);
        this.positionTooltip(this.tooltip, target, step.position);
      }
    }

    document.body.appendChild(this.tooltip);

    // Add event listeners
    this.tooltip.querySelector('.onboarding-close').addEventListener('click', () => {
      this.skip();
    });

    this.tooltip.querySelector('.onboarding-skip').addEventListener('click', () => {
      this.skip();
    });

    const backBtn = this.tooltip.querySelector('.onboarding-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.showStep(stepIndex - 1);
      });
    }

    this.tooltip.querySelector('.onboarding-next').addEventListener('click', () => {
      this.showStep(stepIndex + 1);
    });

    // Animate in
    this.tooltip.style.opacity = '0';
    this.tooltip.style.transform += ' scale(0.9)';
    setTimeout(() => {
      this.tooltip.style.transition = 'all 0.3s ease';
      this.tooltip.style.opacity = '1';
      this.tooltip.style.transform = this.tooltip.style.transform.replace('scale(0.9)', 'scale(1)');
    }, 10);
  }

  /**
   * Position tooltip relative to target
   */
  positionTooltip(tooltip, target, position) {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top, left;

    switch (position) {
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.right + 20;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.left - tooltipRect.width - 20;
        break;
      case 'top':
        top = targetRect.top - tooltipRect.height - 20;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + 20;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
    }

    // Ensure tooltip stays within viewport
    top = Math.max(20, Math.min(top, window.innerHeight - tooltipRect.height - 20));
    left = Math.max(20, Math.min(left, window.innerWidth - tooltipRect.width - 20));

    tooltip.style.position = 'fixed';
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.zIndex = '10000';
  }

  /**
   * Skip onboarding
   */
  skip() {
    if (confirm('Skip the tour? You can restart it anytime from Settings.')) {
      this.complete();
    }
  }

  /**
   * Complete onboarding
   */
  complete() {
    this.isActive = false;
    this.hasCompletedOnboarding = true;
    localStorage.setItem('brain-onboarding-completed', 'true');

    // Clean up
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.remove();
        this.overlay = null;
      }, 300);
    }

    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
      setTimeout(() => {
        this.tooltip.remove();
        this.tooltip = null;
      }, 300);
    }

    // Remove highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
      el.style.zIndex = '';
    });

    console.log('✅ Onboarding completed');
  }

  /**
   * Check if should show onboarding
   */
  shouldShow() {
    return !this.hasCompletedOnboarding;
  }
}

// Create singleton
const onboarding = new OnboardingManager();

// Export
export default onboarding;

/**
 * T023: Theme Manager Utility
 * 
 * Manages theme switching with smooth transitions
 * Features:
 * - Light/Dark/Auto modes
 * - Smooth color transitions
 * - System preference sync
 * - Persistent theme preference
 * - No flash on load
 * - Scheduled switching (optional)
 */

const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

const STORAGE_KEY = 'brain-theme-preference';
const TRANSITION_DURATION = 300; // ms

class ThemeManager {
  constructor() {
    this.currentTheme = THEMES.AUTO;
    this.systemPrefersDark = false;
    this.mediaQuery = null;
    this.transitionTimeout = null;
    this.scheduleTimeout = null;
    this.listeners = new Set();
    
    // Bind methods
    this.setTheme = this.setTheme.bind(this);
    this.toggle = this.toggle.bind(this);
    this.handleSystemChange = this.handleSystemChange.bind(this);
  }

  /**
   * Initialize the theme manager
   */
  initialize() {
    // Set up system preference listener
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPrefersDark = this.mediaQuery.matches;
    
    // Listen for system theme changes
    if (this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener('change', this.handleSystemChange);
    } else {
      // Fallback for older browsers
      this.mediaQuery.addListener(this.handleSystemChange);
    }
    
    // Load saved preference
    this.loadPreference();
    
    // Apply initial theme without transition
    this.applyTheme(this.getEffectiveTheme(), false);
    
    // Set up scheduled switching if configured
    this.setupScheduledSwitching();
    
    console.log('🎨 Theme manager initialized:', {
      preference: this.currentTheme,
      effective: this.getEffectiveTheme(),
      systemPrefersDark: this.systemPrefersDark
    });
  }

  /**
   * Load theme preference from storage
   */
  loadPreference() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && Object.values(THEMES).includes(saved)) {
        this.currentTheme = saved;
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  }

  /**
   * Save theme preference to storage
   */
  savePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, this.currentTheme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }

  /**
   * Get the effective theme (resolving 'auto' to light/dark)
   */
  getEffectiveTheme() {
    if (this.currentTheme === THEMES.AUTO) {
      return this.systemPrefersDark ? THEMES.DARK : THEMES.LIGHT;
    }
    return this.currentTheme;
  }

  /**
   * Set theme with smooth transition
   */
  setTheme(theme, animate = true) {
    if (!Object.values(THEMES).includes(theme)) {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }

    const oldEffectiveTheme = this.getEffectiveTheme();
    this.currentTheme = theme;
    const newEffectiveTheme = this.getEffectiveTheme();

    // Save preference
    this.savePreference();

    // Apply theme
    if (oldEffectiveTheme !== newEffectiveTheme) {
      this.applyTheme(newEffectiveTheme, animate);
    }

    // Notify listeners
    this.notifyListeners({
      theme: this.currentTheme,
      effectiveTheme: newEffectiveTheme
    });
  }

  /**
   * Apply theme to DOM
   */
  applyTheme(theme, animate = true) {
    const html = document.documentElement;
    const body = document.body;

    // Add transition class for smooth animation
    if (animate) {
      html.classList.add('theme-transitioning');
      
      // Clear any existing timeout
      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout);
      }

      // Remove transition class after animation
      this.transitionTimeout = setTimeout(() => {
        html.classList.remove('theme-transitioning');
      }, TRANSITION_DURATION);
    }

    // Set theme attribute
    html.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme);

    console.log(`🎨 Theme applied: ${theme}`);
  }

  /**
   * Update meta theme-color tag
   */
  updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }

    // Set color based on theme
    const color = theme === THEMES.DARK ? '#0a0a0a' : '#ffffff';
    metaThemeColor.content = color;
  }

  /**
   * Toggle between light and dark mode
   */
  toggle(animate = true) {
    const effectiveTheme = this.getEffectiveTheme();
    const newTheme = effectiveTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    this.setTheme(newTheme, animate);
  }

  /**
   * Handle system theme preference change
   */
  handleSystemChange(e) {
    this.systemPrefersDark = e.matches;
    
    // If using auto mode, update theme
    if (this.currentTheme === THEMES.AUTO) {
      const newEffectiveTheme = this.getEffectiveTheme();
      this.applyTheme(newEffectiveTheme, true);
      
      // Notify listeners
      this.notifyListeners({
        theme: this.currentTheme,
        effectiveTheme: newEffectiveTheme,
        source: 'system'
      });
    }
  }

  /**
   * Set up scheduled theme switching
   */
  setupScheduledSwitching() {
    // Check for scheduled switching preference
    try {
      const schedule = JSON.parse(localStorage.getItem('brain-theme-schedule') || 'null');
      
      if (schedule && schedule.enabled) {
        this.scheduleThemeSwitch(schedule);
      }
    } catch (error) {
      console.warn('Failed to load theme schedule:', error);
    }
  }

  /**
   * Schedule automatic theme switching
   */
  scheduleThemeSwitch(schedule) {
    // Clear existing schedule
    if (this.scheduleTimeout) {
      clearTimeout(this.scheduleTimeout);
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Parse schedule times (format: "HH:MM")
    const [darkHour, darkMinutes] = (schedule.darkStart || '20:00').split(':').map(Number);
    const [lightHour, lightMinutes] = (schedule.lightStart || '07:00').split(':').map(Number);

    // Calculate minutes since midnight
    const currentTime = currentHour * 60 + currentMinutes;
    const darkStartTime = darkHour * 60 + darkMinutes;
    const lightStartTime = lightHour * 60 + lightMinutes;

    // Determine if we should be in dark mode
    let shouldBeDark;
    if (darkStartTime < lightStartTime) {
      // Normal case: dark mode overnight (e.g., 20:00 to 07:00)
      shouldBeDark = currentTime >= darkStartTime || currentTime < lightStartTime;
    } else {
      // Inverted case: dark mode during day
      shouldBeDark = currentTime >= darkStartTime && currentTime < lightStartTime;
    }

    // Apply appropriate theme
    const targetTheme = shouldBeDark ? THEMES.DARK : THEMES.LIGHT;
    if (this.getEffectiveTheme() !== targetTheme) {
      this.setTheme(targetTheme, true);
    }

    // Calculate next switch time
    let nextSwitchTime;
    if (shouldBeDark) {
      // Next switch is to light mode
      nextSwitchTime = lightStartTime > currentTime 
        ? lightStartTime - currentTime 
        : 1440 - currentTime + lightStartTime; // Tomorrow
    } else {
      // Next switch is to dark mode
      nextSwitchTime = darkStartTime > currentTime
        ? darkStartTime - currentTime
        : 1440 - currentTime + darkStartTime; // Tomorrow
    }

    // Schedule next switch
    this.scheduleTimeout = setTimeout(() => {
      this.scheduleThemeSwitch(schedule);
    }, nextSwitchTime * 60 * 1000);

    console.log(`⏰ Next theme switch in ${Math.floor(nextSwitchTime / 60)}h ${nextSwitchTime % 60}m`);
  }

  /**
   * Enable scheduled theme switching
   */
  enableSchedule(darkStart = '20:00', lightStart = '07:00') {
    const schedule = {
      enabled: true,
      darkStart,
      lightStart
    };

    try {
      localStorage.setItem('brain-theme-schedule', JSON.stringify(schedule));
      this.scheduleThemeSwitch(schedule);
      console.log('⏰ Theme schedule enabled:', schedule);
    } catch (error) {
      console.error('Failed to enable theme schedule:', error);
    }
  }

  /**
   * Disable scheduled theme switching
   */
  disableSchedule() {
    if (this.scheduleTimeout) {
      clearTimeout(this.scheduleTimeout);
      this.scheduleTimeout = null;
    }

    try {
      localStorage.setItem('brain-theme-schedule', JSON.stringify({ enabled: false }));
      console.log('⏰ Theme schedule disabled');
    } catch (error) {
      console.error('Failed to disable theme schedule:', error);
    }
  }

  /**
   * Register a theme change listener
   */
  onChange(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of theme change
   */
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Theme listener error:', error);
      }
    });
  }

  /**
   * Get current theme info
   */
  getThemeInfo() {
    return {
      preference: this.currentTheme,
      effective: this.getEffectiveTheme(),
      systemPrefersDark: this.systemPrefersDark,
      isAuto: this.currentTheme === THEMES.AUTO
    };
  }

  /**
   * Clean up
   */
  destroy() {
    // Remove system preference listener
    if (this.mediaQuery) {
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', this.handleSystemChange);
      } else {
        this.mediaQuery.removeListener(this.handleSystemChange);
      }
    }

    // Clear timeouts
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }
    if (this.scheduleTimeout) {
      clearTimeout(this.scheduleTimeout);
    }

    // Clear listeners
    this.listeners.clear();
  }
}

// Create singleton instance
const themeManager = new ThemeManager();

// Export for use in other modules
export default themeManager;
export { THEMES };

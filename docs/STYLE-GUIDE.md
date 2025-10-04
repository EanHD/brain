# UI/UX Style Guide

## Design System Overview

Brain follows **Material Design 3** principles with a focus on:
- **Local-first**: All data stored locally in IndexedDB
- **Performance**: Sub-100ms interactions, instant saves
- **Accessibility**: WCAG 2.1 AA compliance
- **Progressive**: Enhanced experiences on capable devices

---

## Color System

### Semantic Tokens

Our color system uses **semantic color tokens** that adapt to light and dark themes:

```css
/* Primary Brand Color - Indigo */
--primary: #4F46E5;
--on-primary: #FFFFFF;
--primary-container: #E0E7FF;
--on-primary-container: #312E81;

/* Surface Colors */
--surface: #FFFFFF;           /* Light mode */
--surface-dark: #0A0A0A;      /* Dark mode (OLED true black) */
--on-surface: #1F1F1F;
--surface-variant: #F5F5F5;

/* State Layers */
--state-hover: rgba(0, 0, 0, 0.08);
--state-focus: rgba(0, 0, 0, 0.12);
--state-pressed: rgba(0, 0, 0, 0.16);
--state-dragged: rgba(0, 0, 0, 0.24);
```

### 11-Step Color Palettes

Each semantic color has an 11-step scale for subtle variations:

**Gray Scale**:
```css
--gray-0: #FFFFFF;
--gray-1: #F9FAFB;
--gray-2: #F3F4F6;
--gray-3: #E5E7EB;
--gray-4: #D1D5DB;
--gray-5: #9CA3AF;
--gray-6: #6B7280;
--gray-7: #4B5563;
--gray-8: #374151;
--gray-9: #1F2937;
--gray-10: #0A0A0A;
```

**Primary (Indigo) Scale**:
```css
--primary-0: #F5F7FF;
--primary-1: #EEF2FF;
--primary-2: #E0E7FF;
--primary-3: #C7D2FE;
--primary-4: #A5B4FC;
--primary-5: #818CF8;
--primary-6: #6366F1;
--primary-7: #4F46E5;
--primary-8: #4338CA;
--primary-9: #3730A3;
--primary-10: #312E81;
```

### Tag Colors

Tags use a predefined palette for consistency:

```javascript
const TAG_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316'  // Orange
];
```

---

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```

**Rationale**: Uses system fonts for native feel and optimal rendering.

### Type Scale

Material Design 3 type scale with responsive adjustments:

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display Large | 57px | 400 | 64px | Hero headlines |
| Display Medium | 45px | 400 | 52px | Prominent headlines |
| Display Small | 36px | 400 | 44px | Section headlines |
| Headline Large | 32px | 600 | 40px | Page titles |
| Headline Medium | 28px | 600 | 36px | Section titles |
| Headline Small | 24px | 600 | 32px | Card titles |
| Title Large | 22px | 500 | 28px | Modal titles |
| Title Medium | 16px | 600 | 24px | List headers |
| Title Small | 14px | 600 | 20px | Buttons, labels |
| Body Large | 16px | 400 | 24px | Article content |
| Body Medium | 14px | 400 | 20px | UI content |
| Body Small | 12px | 400 | 16px | Captions, metadata |
| Label Large | 14px | 600 | 20px | Button text |
| Label Medium | 12px | 600 | 16px | Chip text |
| Label Small | 11px | 600 | 14px | Micro labels |

### Responsive Typography

```css
/* Mobile: Base sizes */
h1 { font-size: 24px; }
body { font-size: 14px; }

/* Tablet: 1.125x scale */
@media (min-width: 640px) {
  h1 { font-size: 28px; }
  body { font-size: 15px; }
}

/* Desktop: 1.25x scale */
@media (min-width: 1024px) {
  h1 { font-size: 32px; }
  body { font-size: 16px; }
}
```

---

## Spacing

### 4px Grid System

All spacing uses a **4px base unit** for visual consistency:

```css
--space-0: 0px;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### Component Spacing

| Component | Padding | Gap | Margin |
|-----------|---------|-----|--------|
| Card | 16px | 12px | 16px |
| Button | 12px 24px | - | 8px |
| List Item | 16px | 8px | 0 |
| Form Field | 12px | 4px | 16px |
| Modal | 24px | 16px | - |
| Chips | 8px 12px | 8px | 4px |

---

## Elevation

Material Design 3 elevation system using box-shadows:

```css
/* Elevation 0: On-surface */
--elevation-0: none;

/* Elevation 1: Raised */
--elevation-1: 
  0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Elevation 2: Floating */
--elevation-2: 
  0 1px 3px 0 rgba(0, 0, 0, 0.1),
  0 1px 2px -1px rgba(0, 0, 0, 0.1);

/* Elevation 3: Overlays */
--elevation-3: 
  0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -2px rgba(0, 0, 0, 0.1);

/* Elevation 4: Modals */
--elevation-4: 
  0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -4px rgba(0, 0, 0, 0.1);

/* Elevation 5: Dialogs */
--elevation-5: 
  0 20px 25px -5px rgba(0, 0, 0, 0.1),
  0 8px 10px -6px rgba(0, 0, 0, 0.1);
```

### Usage Guidelines

- **0dp**: Base surface (background)
- **1dp**: Raised elements (cards at rest)
- **2dp**: Floating elements (cards on hover, FABs)
- **3dp**: Dropdowns, tooltips
- **4dp**: Modals, dialogs
- **5dp**: Navigation drawers

---

## Shape

### Border Radius

```css
--radius-none: 0px;
--radius-sm: 4px;    /* Chips, tags */
--radius-md: 8px;    /* Buttons, inputs */
--radius-lg: 12px;   /* Cards */
--radius-xl: 16px;   /* Modals */
--radius-2xl: 24px;  /* Large containers */
--radius-full: 9999px; /* Pills, avatars */
```

### Component Shapes

| Component | Border Radius |
|-----------|---------------|
| Button | 8px |
| Card | 12px |
| Input | 8px |
| Modal | 16px |
| Chip | 16px (pill) |
| Avatar | 50% (circle) |
| Tag | 4px |
| Dropdown | 8px |

---

## Motion

### Easing Functions

```css
/* Standard: Enter and exit */
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);

/* Emphasized: Attention-grabbing */
--ease-emphasized: cubic-bezier(0.2, 0.0, 0, 1);

/* Decelerated: Enter screen */
--ease-decelerated: cubic-bezier(0.0, 0.0, 0.2, 1);

/* Accelerated: Exit screen */
--ease-accelerated: cubic-bezier(0.4, 0.0, 1, 1);
```

### Duration

```css
--duration-short-1: 50ms;   /* Instant feedback */
--duration-short-2: 100ms;  /* Icon animations */
--duration-short-3: 150ms;  /* State changes */
--duration-short-4: 200ms;  /* Small component transitions */
--duration-medium-1: 250ms; /* Standard transitions */
--duration-medium-2: 300ms; /* Enter/exit */
--duration-long-1: 400ms;   /* Complex transitions */
--duration-long-2: 500ms;   /* Page transitions */
```

### Animation Guidelines

**Micro-interactions** (50-150ms):
- Button state changes
- Icon animations
- Checkbox/radio toggles

**Component Transitions** (200-300ms):
- Card hover elevation
- Dropdown open/close
- Tab switching
- Theme transitions

**Page Transitions** (400-500ms):
- View navigation
- Modal enter/exit
- Sidebar slide

**Reduced Motion**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Interactive States

### Button States

```css
.btn {
  /* Rest */
  background: var(--primary);
  color: var(--on-primary);
  
  /* Hover */
  &:hover {
    background: var(--primary-7);
    box-shadow: var(--elevation-2);
  }
  
  /* Focus */
  &:focus-visible {
    outline: 3px solid var(--primary);
    outline-offset: 2px;
  }
  
  /* Active/Pressed */
  &:active {
    background: var(--primary-8);
    box-shadow: var(--elevation-1);
  }
  
  /* Disabled */
  &:disabled {
    background: var(--gray-3);
    color: var(--gray-5);
    cursor: not-allowed;
    opacity: 0.5;
  }
}
```

### Card States

```css
.card {
  /* Rest */
  box-shadow: var(--elevation-0);
  
  /* Hover */
  &:hover {
    box-shadow: var(--elevation-2);
    transform: translateY(-2px);
  }
  
  /* Focus */
  &:focus-within {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  
  /* Selected */
  &.selected {
    border: 2px solid var(--primary);
    background: var(--primary-container);
  }
}
```

---

## Components

### Buttons

**Variants**:
1. **Filled** (High emphasis): Primary actions
2. **Outlined** (Medium emphasis): Secondary actions
3. **Text** (Low emphasis): Tertiary actions
4. **Icon** (Minimal): Tool buttons

```html
<!-- Filled -->
<button class="btn btn-filled">Save</button>

<!-- Outlined -->
<button class="btn btn-outlined">Cancel</button>

<!-- Text -->
<button class="btn btn-text">Learn More</button>

<!-- Icon -->
<button class="btn-icon" aria-label="Delete">
  <span class="icon">🗑️</span>
</button>
```

### Cards

```html
<article class="card" tabindex="0">
  <header class="card-header">
    <h3 class="card-title">Card Title</h3>
    <p class="card-meta">Jan 15, 2024</p>
  </header>
  <div class="card-body">
    <p>Card content goes here...</p>
  </div>
  <footer class="card-actions">
    <button class="btn btn-text">Action</button>
  </footer>
</article>
```

### Forms

```html
<div class="form-field">
  <label for="title" class="form-label">Title</label>
  <input 
    type="text" 
    id="title" 
    class="form-input"
    placeholder="Enter title..."
    aria-required="true"
  />
  <span class="form-helper">Required field</span>
</div>
```

### Chips/Tags

```html
<span class="chip">
  <span class="chip-label">JavaScript</span>
  <button class="chip-remove" aria-label="Remove JavaScript">×</button>
</span>
```

---

## Accessibility

### WCAG 2.1 AA Requirements

✅ **Contrast Ratios**:
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

✅ **Keyboard Navigation**:
- All interactive elements focusable
- Logical tab order
- Skip links for main content
- Escape to close modals

✅ **Screen Readers**:
- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- ARIA labels on icon buttons
- ARIA live regions for notifications
- Focus management in modals

✅ **Touch Targets**:
- Minimum 48x48px
- Adequate spacing (8px+)

### Focus Management

```css
/* Hide default focus, show for keyboard users */
*:focus {
  outline: none;
}

*:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}
```

### Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Responsive Design

### Mobile-First Approach

Start with mobile styles, enhance for larger screens:

```css
/* Mobile: Base styles */
.container {
  padding: 16px;
}

/* Tablet: 640px+ */
@media (min-width: 640px) {
  .container {
    padding: 24px;
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### Breakpoints

```css
/* Mobile */
@media (max-width: 639px) { }

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1440px) { }
```

### Safe Areas (iOS)

```css
.app-bar {
  padding-top: env(safe-area-inset-top);
}

.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## Dark Mode

### Theme Toggle

```javascript
// Three modes: light, dark, auto (system)
themeManager.setTheme('dark');
```

### Dark Mode Colors

```css
html[data-theme="dark"] {
  --surface: #0A0A0A;          /* OLED true black */
  --on-surface: #E5E5E5;
  --surface-variant: #1F1F1F;
  
  /* Adjust elevation for dark mode */
  --elevation-1: 0 1px 2px 0 rgba(255, 255, 255, 0.05);
}
```

### Smooth Transitions

```css
html.theme-transitioning,
html.theme-transitioning *,
html.theme-transitioning *::before,
html.theme-transitioning *::after {
  transition: 
    background-color 300ms var(--ease-standard),
    color 300ms var(--ease-standard),
    border-color 300ms var(--ease-standard),
    box-shadow 300ms var(--ease-standard) !important;
}
```

---

## Performance

### Constitutional Requirements

From `spec/001-self-organizing-notebook/spec.md`:

- ✅ **Save operation**: < 50ms
- ✅ **Render 1000 notes**: < 200ms
- ✅ **Search across notes**: < 120ms
- ✅ **PWA lighthouse score**: > 90

### Optimization Techniques

1. **Virtual scrolling**: Only render visible items
2. **Debounced search**: Wait 300ms after last keystroke
3. **Indexed database**: Compound indexes for queries
4. **Code splitting**: Dynamic imports for views
5. **Lazy loading**: Images loaded on scroll
6. **Service worker**: Cache static assets

---

## Icon System

### Emoji Icons

Brain uses emoji for icons (native, accessible, no HTTP requests):

```javascript
const ICONS = {
  note: '📝',
  library: '📚',
  tag: '🏷️',
  search: '🔍',
  settings: '⚙️',
  calendar: '📅',
  review: '🔄',
  files: '📁',
  theme: '🌙',
  save: '💾',
  delete: '🗑️',
  edit: '✏️',
  share: '📤'
};
```

**Advantages**:
- Zero HTTP requests
- Automatic color in dark mode
- Accessible by default
- Consistent across platforms

---

## Best Practices

### Do's ✅

- Use semantic HTML (`<nav>`, `<main>`, `<article>`)
- Provide ARIA labels for icon buttons
- Respect `prefers-reduced-motion`
- Test with keyboard only
- Test with screen reader (NVDA, JAWS, VoiceOver)
- Validate color contrast (4.5:1 minimum)
- Use `rem` for font sizes (respects user preferences)
- Add loading skeletons for perceived performance
- Debounce expensive operations (search, auto-save)
- Use CSS custom properties for theming

### Don'ts ❌

- Don't use `outline: none` without `:focus-visible`
- Don't rely on color alone to convey information
- Don't disable zoom (`user-scalable=no`)
- Don't use `<div>` for buttons (use `<button>`)
- Don't set fixed heights on text containers
- Don't use `setTimeout` for critical operations
- Don't block the main thread (use Web Workers)
- Don't use JavaScript for animations (use CSS)
- Don't forget `alt` text on images
- Don't use `px` for text (use `rem`)

---

## Design Checklist

Before shipping a new component:

- [ ] Follows Material Design 3 guidelines
- [ ] Uses semantic color tokens (not hardcoded colors)
- [ ] Spacing follows 4px grid
- [ ] Typography uses design system scale
- [ ] All interactive states defined (hover, focus, active, disabled)
- [ ] Animations use proper easing and duration
- [ ] WCAG 2.1 AA contrast ratios
- [ ] Keyboard accessible
- [ ] Screen reader tested
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Reduced motion support
- [ ] Dark mode compatible
- [ ] Touch targets ≥ 48x48px
- [ ] Performance budget met
- [ ] Documented in `COMPONENTS.md`

---

## Resources

- [Material Design 3](https://m3.material.io/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Web.dev](https://web.dev/)
- [A11y Project](https://www.a11yproject.com/)

---

**Questions?** See `docs/COMPONENTS.md` for component API documentation.

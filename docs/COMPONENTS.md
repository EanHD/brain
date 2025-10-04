# Component Documentation

## Table of Contents

1. [Core Components](#core-components)
2. [UI Components](#ui-components)
3. [Utility Components](#utility-components)
4. [Views](#views)
5. [Services](#services)

---

## Core Components

### ApplicationController (`app.js`)

**Purpose**: Central orchestrator for the entire Brain PWA application.

**Key Responsibilities**:
- View routing and navigation
- Event bus coordination
- Performance monitoring
- Database initialization
- Theme management
- Settings persistence

**Usage**:
```javascript
import { ApplicationController } from './js/app.js';

const app = new ApplicationController();
app.initialize();
```

**Key Methods**:
- `initialize()`: Bootstrap the application
- `navigate(view)`: Switch between views
- `saveNote()`: Persist current note
- `deleteNote(id)`: Remove a note
- `showToast(message, type)`: Display notifications

---

## UI Components

### NoteCard (`components/note-card.js`)

**Purpose**: Material Design 3 card component for displaying notes.

**Features**:
- Elevation on hover (0dp → 2dp)
- Tag rendering with color coding
- Action buttons (edit, delete, share)
- Responsive layout
- Swipe gestures on mobile
- Long-press for context menu

**Usage**:
```javascript
import NoteCard from './components/note-card.js';

const card = new NoteCard({
  note: noteData,
  onClick: (id) => navigate('detail', id),
  onDelete: (id) => deleteNote(id)
});

container.appendChild(card.render());
```

**Props**:
```typescript
{
  note: Note;              // Note data object
  onClick?: (id) => void;  // Click handler
  onDelete?: (id) => void; // Delete handler
  showActions?: boolean;   // Show action buttons (default: true)
}
```

---

### RichTextEditor (`components/rich-editor.js`)

**Purpose**: Full-featured rich text editor with Markdown support.

**Features**:
- Text formatting: bold, italic, underline, strikethrough
- Lists: ordered and unordered
- Headings: H1, H2, H3
- Links and code blocks
- Undo/redo functionality
- Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
- Markdown import/export
- Auto-save support
- Focus mode (F11)
- Character count

**Usage**:
```javascript
import RichTextEditor from './components/rich-editor.js';

const editor = new RichTextEditor({
  content: '<p>Initial content</p>',
  placeholder: 'Start typing...',
  onChange: (html) => console.log('Content changed:', html),
  onSave: (html) => saveNote(html)
});

container.appendChild(editor.render());
```

**Keyboard Shortcuts**:
- `Ctrl+B`: Bold
- `Ctrl+I`: Italic
- `Ctrl+U`: Underline
- `Ctrl+K`: Insert link
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo
- `F11`: Toggle focus mode
- `Ctrl+S`: Save

---

### FileDropzone (`components/file-dropzone.js`)

**Purpose**: Drag-and-drop file upload with validation and preview.

**Features**:
- Drag-and-drop support
- Click to browse
- File type validation
- Size limit enforcement
- Image preview thumbnails
- Multiple file upload
- Progress indicators
- Paste support (Ctrl+V)

**Usage**:
```javascript
import FileDropzone from './components/file-dropzone.js';

const dropzone = new FileDropzone({
  accept: ['image/*', 'application/pdf'],
  maxSize: 10 * 1024 * 1024, // 10MB
  multiple: true,
  onUpload: async (files) => {
    for (const file of files) {
      await uploadFile(file);
    }
  }
});

container.appendChild(dropzone.render());
```

---

### TagInput (`components/tag-input.js`)

**Purpose**: Multi-select tag input with autocomplete and AI suggestions.

**Features**:
- Autocomplete from existing tags
- AI-powered tag suggestions
- Color-coded tags
- Keyboard navigation (Arrow keys, Enter, Backspace)
- Tag creation on Enter or comma
- Click to remove tags
- Hierarchical tag support (parent/child)

**Usage**:
```javascript
import TagInput from './components/tag-input.js';

const tagInput = new TagInput({
  tags: ['javascript', 'web-dev'],
  suggestions: ['react', 'vue', 'angular'],
  onChange: (tags) => console.log('Tags:', tags),
  onRequestSuggestions: async (content) => {
    return await getAISuggestions(content);
  }
});

container.appendChild(tagInput.render());
```

---

### Toast (`components/toast.js`)

**Purpose**: Non-intrusive notification system.

**Types**:
- `info`: Informational messages (blue)
- `success`: Success confirmations (green)
- `warning`: Warnings (orange)
- `error`: Error messages (red)

**Features**:
- Auto-dismiss after 3 seconds
- Manual dismiss button
- Swipe to dismiss on mobile
- Stacking for multiple toasts
- Action buttons (optional)
- Progress bar for duration

**Usage**:
```javascript
import { showToast } from './components/toast.js';

// Simple toast
showToast('Note saved successfully', 'success');

// Toast with action
showToast('Note deleted', 'info', {
  action: 'Undo',
  onAction: () => restoreNote(id)
});
```

---

### LoadingSkeleton (`components/loading-skeleton.js`)

**Purpose**: Skeleton screens for better perceived performance.

**Variants**:
- `card`: Note card skeleton
- `list`: List item skeleton
- `text`: Text line skeleton
- `avatar`: Circular avatar skeleton

**Usage**:
```javascript
import LoadingSkeleton from './components/loading-skeleton.js';

const skeleton = new LoadingSkeleton({
  type: 'card',
  count: 5
});

container.appendChild(skeleton.render());
```

---

### KeyboardShortcuts (`components/keyboard-shortcuts.js`)

**Purpose**: Global keyboard shortcut system with help modal.

**Features**:
- Context-aware shortcuts (global, editor, search, Vim)
- Help modal (Ctrl+/)
- Custom shortcut registration
- Vim mode (optional)
- Conflict detection
- Modifier key support

**Default Shortcuts**:
- `Ctrl+S`: Save current note
- `Ctrl+N`: New note
- `Ctrl+K`: Search
- `Ctrl+1-5`: Switch views
- `Ctrl+Shift+L`: Toggle theme
- `Ctrl+/`: Show shortcuts help

**Usage**:
```javascript
import keyboardShortcuts from './components/keyboard-shortcuts.js';

// Initialize with default shortcuts
keyboardShortcuts.initialize({
  onSave: () => saveNote(),
  onNew: () => createNote(),
  onSearch: () => showSearch()
});

// Register custom shortcut
keyboardShortcuts.register('Ctrl+P', () => {
  console.log('Custom shortcut');
}, 'global', 'Print');
```

---

### Onboarding (`components/onboarding.js`)

**Purpose**: Progressive disclosure onboarding for new users.

**Features**:
- 7-step tutorial flow
- Element highlighting with pulse
- Tooltip positioning (center, top, bottom, left, right)
- Skip, back, and next navigation
- Completion tracking in localStorage
- Restart capability

**Steps**:
1. Welcome message
2. Create your first note
3. AI-powered tagging
4. Browse library
5. Manage files
6. Theme customization
7. Keyboard shortcuts

**Usage**:
```javascript
import onboarding from './components/onboarding.js';

// Start onboarding
onboarding.start();

// Restart onboarding
onboarding.restart();
```

---

## Utility Components

### ThemeManager (`utils/theme.js`)

**Purpose**: Theme management with smooth transitions.

**Features**:
- Three themes: light, dark, auto (system)
- Smooth color transitions (300ms)
- System preference sync
- Scheduled theme switching
- localStorage persistence
- Meta theme color updates for mobile

**Usage**:
```javascript
import themeManager, { THEMES } from './utils/theme.js';

// Initialize
themeManager.initialize();

// Set theme
themeManager.setTheme(THEMES.DARK);

// Toggle between light/dark
themeManager.toggle();

// Schedule theme switch (9 AM light, 6 PM dark)
themeManager.enableSchedule('09:00', '18:00');

// Listen for changes
themeManager.onChange((theme) => {
  console.log('Theme changed to:', theme);
});
```

---

### AccessibilityManager (`utils/accessibility.js`)

**Purpose**: WCAG 2.1 AA accessibility compliance.

**Features**:
- Focus management and trapping
- Skip links for keyboard users
- Reduced motion support
- Screen reader announcements
- Form accessibility enhancements
- Keyboard navigation
- Contrast ratio validation

**Usage**:
```javascript
import a11y from './utils/accessibility.js';

// Initialize
a11y.initialize();

// Announce to screen readers
a11y.announce('Note saved', 'polite');

// Set page title
a11y.setPageTitle('Library');

// Validate contrast
const issues = a11y.validateContrast();
```

---

### ULID Generator (`ulid.js`)

**Purpose**: Generate sortable, unique identifiers.

**Features**:
- Lexicographically sortable
- 128-bit (26 characters)
- Monotonically increasing
- Collision-resistant
- More efficient than UUID v4

**Usage**:
```javascript
import { ulid } from './js/ulid.js';

const id = ulid(); // 01ARZ3NDEKTSV4RRFFQ69G5FAV
```

---

## Views

### TodayView (`views/today.js`)

**Purpose**: Main landing view for creating and browsing today's notes.

**Features**:
- Rich text editor
- Recent notes grid
- Quick actions
- Auto-save
- AI tag suggestions

---

### LibraryView (`views/library.js`)

**Purpose**: Browse all notes with search, filter, and sort.

**Features**:
- Grid layout with masonry
- Real-time search
- Tag filtering
- Sort by: date, title, relevance
- Infinite scroll
- Bulk actions

---

### TOCView (`views/toc.js`)

**Purpose**: Tag-based navigation and organization.

**Features**:
- Hierarchical tag tree
- Tag cloud visualization
- Tag analytics (count, frequency)
- Rename and merge tags
- Color customization

---

### DetailView (`views/detail.js`)

**Purpose**: Full-screen note editing and viewing.

**Features**:
- Rich text editing
- File attachments
- Tag management
- Version history
- Share options
- Markdown export

---

### ReviewView (`views/review.js`)

**Purpose**: Spaced repetition review system.

**Features**:
- Queue management
- Difficulty rating (easy, medium, hard)
- Progress tracking
- Daily goals
- Review history

---

### FilesView (`views/files.js`)

**Purpose**: Google Drive-style file management.

**Features**:
- Grid and list views
- File preview (images, PDFs, text)
- Search and filtering
- Sort by name, date, size, type
- Bulk operations
- Upload with drag-and-drop

---

## Services

### ExportService (`services/export.js`)

**Purpose**: Export notes to multiple formats.

**Features**:
- Markdown export (with frontmatter)
- JSON export (complete data)
- HTML export (static site)
- Backup creation (with encryption)
- Import from backup
- Date range filtering
- Tag filtering

**Usage**:
```javascript
import * as exportService from './services/export.js';

// Export all notes to Markdown
await exportService.exportToMarkdown();

// Export by date range
await exportService.exportByDateRange('2024-01-01', '2024-12-31');

// Create encrypted backup
await exportService.createBackup({ encrypt: true });

// Import backup
await exportService.importBackup(file, { merge: true });
```

---

## Design Principles

### Material Design 3

All components follow Material Design 3 guidelines:

- **Color System**: 11-step palettes with semantic tokens
- **Typography**: System font stack with responsive scales
- **Elevation**: 0dp, 1dp, 2dp, 3dp, 4dp, 5dp
- **Motion**: Emphasized easing with 200-300ms duration
- **States**: Rest, hover, focus, pressed, disabled

### Responsive Design

- **Mobile-first**: Base styles for mobile, enhancements for larger screens
- **Breakpoints**:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Touch targets**: Minimum 48x48px
- **Safe areas**: iOS notch and home indicator support

### Accessibility

- **WCAG 2.1 AA**: Contrast ratios, keyboard navigation, screen reader support
- **Focus visible**: Clear focus indicators for keyboard users
- **ARIA labels**: Semantic HTML with appropriate ARIA attributes
- **Reduced motion**: Respects `prefers-reduced-motion`

### Performance

- **Constitutional Requirements**:
  - Save operation: < 50ms
  - Render 1000 notes: < 200ms
  - Search across notes: < 120ms
- **Code splitting**: Dynamic imports for views
- **Lazy loading**: Images and files loaded on demand
- **IndexedDB**: Efficient local storage with indexing

---

## Contributing

When creating new components:

1. Follow Material Design 3 guidelines
2. Ensure WCAG 2.1 AA accessibility
3. Write JSDoc comments
4. Add unit tests
5. Update this documentation
6. Test on mobile, tablet, and desktop
7. Validate performance budgets

---

## Questions?

See `docs/DEVELOPMENT.md` for development setup and `docs/API.md` for detailed API documentation.

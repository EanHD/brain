# Tasks: UI Polish & RAG Integration - Brain Notebook PWA

**Feature**: Self-Organizing Notebook | **Phase**: UI/UX Modernization & RAG Integration  
**Vision**: Cross between ChatGPT app, Google Drive, and Google Keep with Material 3/Apple professional aesthetics  
**Status**: Ready for execution

## Overview

Transform the Brain PWA into a modern, professional cross-platform notes application with RAG (Retrieval-Augmented Generation) capabilities. The UI should feel elegant, smooth, and not clunky - moving from an amateur skeleton to a polished, production-ready application.

### Key Design Principles
- **Material 3 / Apple Design Language**: Clean, spacious, purposeful animations
- **Modern Typography**: Clear hierarchy, generous whitespace, readable fonts
- **Smooth Interactions**: Micro-animations, transitions, tactile feedback
- **Professional Color Palette**: Sophisticated neutrals with accent colors
- **Responsive Grid**: Proper spacing, alignment, breathing room
- **Cross-platform Feel**: Works seamlessly on mobile, tablet, desktop

### New Features to Add
1. **File Upload Section**: Drag-and-drop file uploads with preview
2. **RAG Integration**: Sync notes/files to vector database (ChromaDB/similar)
3. **Chat Interface**: LLM chat with RAG-powered context from notes
4. **Enhanced Notes UI**: Cards, grid layouts, rich previews
5. **File Management**: Google Drive-style file browser
6. **Smart Search**: Vector similarity search across all content

---

## Setup & Foundation Tasks

### T001: Update Design System & CSS Variables [P] ✅
**File**: `src/css/main.css`  
**Priority**: Critical  
**Parallel**: Yes (independent file)  
**Status**: Complete

Create a modern design system with:
- **Color Palette**: Material 3 inspired with depth
  - Primary: Professional blue (#2563EB → #1E40AF)
  - Surface colors with proper elevation (0dp-5dp)
  - Semantic colors (success, warning, error, info)
  - Dark mode with OLED-friendly blacks
- **Typography Scale**: 
  - Display, Headline, Title, Body, Label styles
  - Line heights optimized for readability (1.5-1.6)
  - Letter spacing for different weights
- **Spacing System**: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64, 96)
- **Border Radius**: Consistent rounding (4px, 8px, 12px, 16px, 24px)
- **Shadows**: Layered elevation system (0-5)
- **Transitions**: Smooth, purposeful animations (150ms-300ms)
- **Z-index Scale**: Organized stacking context

**Success Criteria**:
- Design tokens accessible via CSS custom properties
- Dark mode toggle works seamlessly
- All spacing uses the 4px grid system

---

### T002: Implement Modern Component Library [P] ✅
**File**: `src/css/components.css`  
**Priority**: Critical  
**Parallel**: Yes (independent file)  
**Status**: Complete

Redesign core components with modern aesthetics:

**Buttons**:
- Primary, Secondary, Tertiary, Text variants
- Icon buttons with proper tap targets (44x44px min)
- Loading states with spinners
- Hover, focus, active states with smooth transitions
- Disabled states with reduced opacity

**Cards**:
- Elevated cards with proper shadows
- Filled cards for secondary content
- Outlined cards for lists
- Interactive states (hover lift effect)
- Card actions area with proper spacing

**Inputs**:
- Floating label design
- Clear error/success states
- Helper text positioning
- Search input with icon integration
- File upload dropzone styling

**Navigation**:
- Bottom navigation for mobile (Material 3 style)
- Side navigation for desktop (collapsible)
- Tab bars with indicator animation
- Breadcrumbs for navigation context

**Modals & Dialogs**:
- Full-screen on mobile, centered on desktop
- Smooth enter/exit animations
- Backdrop blur effect
- Proper focus trapping

**Toast Notifications**:
- Snackbar style positioning
- Auto-dismiss with pause on hover
- Action buttons integration
- Multiple notification types

**Success Criteria**:
- All components follow Material 3 principles
- Consistent interaction patterns across components
- Smooth animations (no janky transitions)
- Accessibility built-in (ARIA, keyboard navigation)

---

### T003: Redesign Application Layout Structure ✅
**Files**: `index.html`, `src/css/responsive.css`  
**Priority**: Critical  
**Dependencies**: T001, T002  
**Status**: Complete

Transform the layout to modern app structure:

**Desktop Layout** (≥1024px):
```
┌─────────────────────────────────────┐
│ Top App Bar (64px)                  │
├──────┬──────────────────────┬────────┤
│ Side │                      │ Side   │
│ Nav  │   Main Content       │ Panel  │
│(240px│      Area            │(320px) │
│)     │                      │optional│
└──────┴──────────────────────┴────────┘
```

**Tablet Layout** (768px-1023px):
```
┌─────────────────────────────┐
│ Top App Bar                 │
├─────┬───────────────────────┤
│ Nav │   Main Content        │
│Rail │      Area             │
│(72px│                       │
└─────┴───────────────────────┘
```

**Mobile Layout** (<768px):
```
┌───────────────────┐
│ Top App Bar       │
├───────────────────┤
│                   │
│  Main Content     │
│      Area         │
│                   │
├───────────────────┤
│ Bottom Nav (56px) │
└───────────────────┘
```

**Features**:
- Responsive grid system (12 columns)
- Proper breakpoints (mobile: <768px, tablet: 768-1023px, desktop: ≥1024px)
- Collapsible side navigation
- Contextual side panel (detail views, chat)
- Sticky headers with shadow on scroll
- Safe area insets for mobile devices

**Success Criteria**:
- Smooth transitions between breakpoints
- No layout shift on navigation changes
- Touch-friendly spacing on mobile
- Efficient use of screen real estate

---

## Notes Section Enhancement

### T004: Create Modern Note Card Component ✅
**Files**: `src/css/components.css`, `src/js/views/library.js`  
**Priority**: High  
**Dependencies**: T002  
**Status**: Complete

Design beautiful note cards inspired by Google Keep:

**Card Structure**:
```
┌──────────────────────────┐
│ Title (truncate 2 lines) │
│ ─────────────────────── │
│ Preview (truncate 3-4    │
│ lines with fade out)     │
│                          │
│ ┌tag┐ ┌tag┐ ┌tag┐      │
│ └───┘ └───┘ └───┘      │
│                          │
│ 📅 2d ago  · 📝 245 chars│
└──────────────────────────┘
```

**Features**:
- Masonry/grid layout option
- Hover effects (subtle lift + shadow)
- Color coding/theming per note
- Quick actions on hover (edit, delete, share)
- Pinned notes distinction
- Selection mode with checkboxes
- Smooth card flip animation for edit mode

**Interactive States**:
- Default: Subtle shadow
- Hover: Lift effect (translateY(-4px) + deeper shadow)
- Active/Selected: Border accent color
- Drag: Opacity + scale transform

**Success Criteria**:
- Cards feel tactile and responsive
- Smooth transitions between states
- Information hierarchy clear at a glance
- Grid layout adjusts gracefully (1-4 columns)

---

### T005: Implement Rich Note Editor ✅
**Files**: `src/js/views/detail.js`, `src/css/components.css`  
**Priority**: High  
**Dependencies**: T003  
**Status**: Complete

Create a distraction-free writing experience:

**Editor Features**:
- Markdown preview toggle
- Syntax highlighting for code blocks
- Auto-save indicator (discrete)
- Word/character count
- Focus mode (hide UI chrome)
- Typewriter mode option
- Zen mode (full screen)

**Formatting Toolbar**:
- Floating toolbar on text selection
- Common actions: Bold, Italic, Link, Code
- Keyboard shortcuts visible on hover
- Smooth fade-in animation
- Mobile-optimized touch targets

**Editor Polish**:
- Proper line height (1.6-1.7)
- Generous padding (24px+)
- Max width for readability (680px)
- Smooth cursor blink
- Selection highlight color
- Placeholder animation

**Success Criteria**:
- Writing feels smooth and responsive
- No input lag on typing
- Toolbar appears contextually
- Focus mode removes all distractions

---

### T006: Design Note Input Component (Today View) ✅
**Files**: `src/js/views/today.js`, `src/css/components.css`  
**Priority**: High  
**Dependencies**: T002  
**Status**: Complete

Create an inviting note capture experience:

**Quick Capture Box**:
```
┌─────────────────────────────────┐
│  ✍️ What's on your mind?        │
│  ─────────────────────────────  │
│  [Expanding textarea on focus]  │
│  ─────────────────────────────  │
│  📎 📷 🎤  |  [AI Tags] [Save]  │
└─────────────────────────────────┘
```

**Features**:
- Auto-expand textarea (3 lines → unlimited)
- Rich attachments toolbar
- AI tag suggestion chips (appear after typing)
- Save animation (card slide down)
- Clear/reset button
- Draft auto-save every 5s
- Voice input integration

**Polish Details**:
- Smooth height transition (300ms ease-out)
- Focus state with accent border glow
- Character counter appears at 80% limit
- Success feedback on save (checkmark animation)

**Success Criteria**:
- Feels fast and lightweight
- Encourages quick note capture
- AI suggestions feel helpful, not intrusive

---

## File Management System

### T007: Create File Upload Dropzone Component [P] ✅
**Files**: `src/js/components/file-dropzone.js`, `src/css/components.css`  
**Priority**: Medium  
**Dependencies**: T002  
**Status**: Complete

Build a modern file upload interface:

**Dropzone Design**:
```
┌─────────────────────────────────────┐
│                                     │
│     📁 Drop files here              │
│                                     │
│     or click to browse              │
│                                     │
│  Supported: PDF, DOCX, TXT, MD,    │
│  PNG, JPG (Max 10MB per file)      │
└─────────────────────────────────────┘
```

**Features**:
- Drag-and-drop with visual feedback
- Click to open file picker
- Multiple file selection
- File type validation
- Size limit checking
- Upload progress bars
- Thumbnail preview for images
- File type icons
- Remove file button

**States**:
- Default: Dashed border
- Drag Over: Solid accent border + background tint
- Uploading: Progress indicator
- Success: Checkmark animation
- Error: Error message with retry button

**Success Criteria**:
- Intuitive drag-and-drop interaction
- Clear feedback during upload process
- Error states are helpful and actionable

---

### T008: Build File Browser Component (Google Drive Style) [P] ✅
**Files**: `src/js/views/files.js`, `src/css/components.css`, `index.html`, `src/js/state.js`, `src/js/app.js`  
**Priority**: High  
**Parallel**: Yes (new view)  
**Status**: Complete

Create a file management interface:

**File Browser Layout**:
```
┌────────────────────────────────────────┐
│ 🔍 Search files...    [⊞] [≡] [↑]    │
├────────────────────────────────────────┤
│ Grid View                              │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │📄  │ │📄  │ │📷  │ │📄  │          │
│ │Doc1│ │Doc2│ │Img1│ │Doc3│          │
│ └────┘ └────┘ └────┘ └────┘          │
│                                        │
│ List View                              │
│ 📄 Document.pdf        2.3 MB  2d ago │
│ 📷 Screenshot.png       125 KB  5d ago│
│ 📝 Notes.md              12 KB  1w ago│
└────────────────────────────────────────┘
```

**Features**:
- Toggle between grid/list view
- Sort by: name, date, size, type
- File type filtering
- Bulk actions (select multiple)
- Right-click context menu
- Preview on click
- Search with highlighting
- Folder organization

**File Card (Grid)**:
- Large file type icon
- Filename (truncate)
- File size
- Last modified date
- Hover actions (download, delete, share)

**Success Criteria**:
- Feels like a native file manager
- Fast navigation and search
- Clear visual hierarchy

---

### T009: Implement Tag Management UI ✅
**Files**: `src/js/components/tag-manager.js`, `src/js/views/detail.js`  
**Priority**: High  
**Dependencies**: T002  
**Status**: Complete

Create rich file previews:

**Preview Modal**:
```
┌─────────────────────────────────────┐
│ ← Document.pdf              ⋯   ✕  │
├─────────────────────────────────────┤
│                                     │
│   [PDF/Image/Text Preview]          │
│                                     │
│   [Full content rendering]          │
│                                     │
├─────────────────────────────────────┤
│ 📥 Download  🗑️ Delete  ↗ Share    │
└─────────────────────────────────────┘
```

**Supported Types**:
- PDF: Embedded PDF viewer
- Images: Full-size with zoom
- Text/Markdown: Formatted rendering
- Code: Syntax highlighted
- Office docs: Placeholder with download

**Features**:
- Keyboard navigation (← → for prev/next)
- Zoom controls for images
- Page navigation for PDFs
- Fullscreen mode
- Copy to clipboard button
- Share/export options

**Success Criteria**:
- Fast preview loading (<500ms)
- Smooth transitions between files
- Mobile-friendly touch gestures

---

## RAG Integration

### T010: Design RAG Architecture & Choose Vector DB [P]
**Files**: `docs/RAG-ARCHITECTURE.md`, `package.json`  
**Priority**: Critical  
**Parallel**: Yes (research task)

Research and document RAG implementation:

**Evaluation Criteria**:
- **ChromaDB**: Full-featured, Python backend
- **LanceDB**: Serverless, embedded option
- **Weaviate**: Cloud-native, scalable
- **Qdrant**: Fast, low memory
- **Pinecone**: Managed service

**Decision Factors**:
- Local-first compatibility
- Client-side JavaScript SDK
- Embedding dimension support
- Query performance (<200ms)
- Storage size efficiency
- Cost (free tier availability)

**Architecture Decisions**:
- Embedding model (OpenAI ada-002 vs local)
- Chunking strategy for notes (overlap size)
- Metadata indexing (tags, dates, file types)
- Incremental updates vs batch reindex
- Fallback for offline mode

**Deliverables**:
- Architecture diagram
- Technology selection rationale
- Integration implementation plan
- Performance benchmarks

**Success Criteria**:
- Clear technical direction chosen
- Documented trade-offs
- Integration plan with timeline

---

### T011: Implement Note-to-Vector Pipeline
**Files**: `src/js/services/rag-indexer.js`, `src/js/services/embeddings.js`  
**Priority**: High  
**Dependencies**: T010

Build the indexing pipeline:

**Pipeline Flow**:
```
Note Created/Updated
    ↓
Chunk Content (512 tokens, 128 overlap)
    ↓
Generate Embeddings (OpenAI/Local)
    ↓
Store in Vector DB with Metadata
    ↓
Update Search Index
```

**Features**:
- Automatic indexing on save
- Background processing (Web Worker)
- Progress tracking for large batches
- Error handling with retry logic
- Rate limiting for API calls
- Incremental updates (changed chunks only)
- Metadata extraction (tags, entities, dates)

**Chunking Strategy**:
- Target: 512 tokens per chunk
- Overlap: 128 tokens (25%)
- Preserve paragraph boundaries
- Include title in first chunk
- Add context headers

**Success Criteria**:
- Indexing completes in background
- No UI blocking during indexing
- Handles large notes (50k chars)
- Graceful degradation on errors

---

### T012: Build Vector Search Service
**Files**: `src/js/services/vector-search.js`  
**Priority**: High  
**Dependencies**: T011

Implement semantic search:

**Search API**:
```javascript
async function vectorSearch(query, options = {}) {
  // Options: limit, threshold, filters, rerank
  return {
    results: [
      {
        noteId: 'ulid',
        score: 0.95,
        chunk: 'matched content...',
        metadata: { tags, created_at },
        highlight: 'relevant excerpt'
      }
    ],
    took: 45, // ms
    total: 127
  };
}
```

**Features**:
- Similarity threshold filtering
- Result reranking (semantic + keyword)
- Metadata filtering (date ranges, tags)
- Highlighted excerpts
- Relevance scoring
- Query expansion (synonyms)
- Hybrid search (vector + keyword)

**Optimization**:
- Cache frequent queries
- Debounce search input (300ms)
- Load results progressively
- Preload top 3 note contents

**Success Criteria**:
- Search completes <200ms
- Results feel relevant
- Smooth scrolling through results
- Clear "no results" state

---

### T013: Integrate File Upload → RAG Indexing
**Files**: `src/js/services/file-processor.js`  
**Priority**: Medium  
**Dependencies**: T007, T011

Process uploaded files for RAG:

**Processing Pipeline**:
```
File Upload
    ↓
Extract Text (PDF/DOCX/TXT)
    ↓
OCR for Images (Tesseract.js)
    ↓
Chunk & Embed
    ↓
Index in Vector DB
    ↓
Link to Original File
```

**File Type Handlers**:
- **PDF**: pdf.js extraction
- **DOCX**: mammoth.js conversion
- **TXT/MD**: Direct read
- **Images**: OCR with Tesseract
- **Code files**: Syntax-aware chunking

**Features**:
- Progress tracking per file
- Preview extracted text
- Manual correction option
- Reprocess failed files
- Bulk processing queue

**Success Criteria**:
- Handles common file types
- Clear progress indication
- Extracted text is accurate
- Fast processing (< 5s for typical doc)

---

## Chat Interface

### T014: Design Chat UI Component (ChatGPT Style)
**Files**: `src/js/views/chat.js`, `src/css/components.css`  
**Priority**: High  
**Dependencies**: T003

Create a modern chat interface:

**Chat Layout**:
```
┌────────────────────────────────────┐
│ 🧠 Brain Assistant      [Settings] │
├────────────────────────────────────┤
│                                    │
│ 👤 How do I set up authentication? │
│ ──────────────────────────────────│
│ 🤖 Based on your notes, here's... │
│    [Referenced: auth-notes.md]     │
│                                    │
│ 👤 Show me the code example        │
│ ──────────────────────────────────│
│ 🤖 Here's the code from your...   │
│    ```javascript                   │
│    // code block                   │
│    ```                            │
│    [Referenced: 3 notes]           │
│                                    │
├────────────────────────────────────┤
│ 💬 Ask about your notes...  [↑]   │
└────────────────────────────────────┘
```

**Features**:
- Auto-scrolling to latest message
- Typing indicator (animated dots)
- Message timestamps (on hover)
- Code block syntax highlighting
- Markdown rendering
- Referenced notes pills (clickable)
- Copy message button
- Regenerate response option
- Export conversation

**Message Types**:
- User message: Right-aligned, accent background
- Assistant message: Left-aligned, surface background
- System message: Centered, muted
- Error message: Red tint with retry button

**Success Criteria**:
- Feels like ChatGPT interface
- Smooth message animations
- Clear visual hierarchy
- Fast message rendering

---

### T015: Implement RAG-Powered Chat Backend
**Files**: `src/js/services/chat-service.js`  
**Priority**: High  
**Dependencies**: T012, T014

Build the chat logic with RAG:

**Chat Flow**:
```
User Query
    ↓
Vector Search (top 5 relevant chunks)
    ↓
Build Context Prompt
    ↓
LLM Request (OpenAI)
    ↓
Stream Response
    ↓
Display with References
```

**Context Building**:
```javascript
const systemPrompt = `
You are Brain Assistant, helping the user understand their notes.
You have access to their note collection via RAG search.

Current relevant context:
${relevantChunks.map(c => `[${c.title}]: ${c.content}`).join('\n\n')}

Answer based on this context. Cite note titles when relevant.
`;
```

**Features**:
- Streaming responses (SSE)
- Context windowing (last 5 messages)
- Conversation memory
- Source attribution (which notes used)
- Fallback responses (no relevant context)
- Rate limiting (5 msg/min)
- Token counting & limits

**Optimization**:
- Cache similar queries (5min TTL)
- Prefetch likely follow-ups
- Batch similar searches
- Progressive context loading

**Success Criteria**:
- Responses feel contextual
- References are accurate
- Streaming is smooth
- Handles edge cases gracefully

---

### T016: Add Chat History & Sessions
**Files**: `src/js/services/chat-history.js`, `src/js/db.js`  
**Priority**: Medium  
**Dependencies**: T015

Implement conversation persistence:

**Data Model**:
```javascript
interface ChatSession {
  id: string; // ULID
  title: string; // Auto-generated summary
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  referenced_notes: string[]; // Note IDs
  created_at: string;
}
```

**Features**:
- Session list sidebar
- Auto-title generation (from first message)
- Search within sessions
- Delete sessions
- Export session as markdown
- Pin important sessions
- Session sharing (export JSON)

**UI Enhancements**:
- Session list with preview
- Quick switch between sessions
- Continue last session on load
- Create new session button
- Session rename option

**Success Criteria**:
- Sessions persist across reloads
- Fast session switching (<100ms)
- Clear session organization

---

## Polish & Performance

### T017: Implement Micro-animations System [P] ✅
**Files**: `src/css/animations.css`, `src/js/utils/animations.js`  
**Priority**: Medium  
**Parallel**: Yes (enhancement)  
**Status**: Complete

Add purposeful animations:

**Animation Library**:
- **Fade In/Out**: Opacity + slight scale
- **Slide In**: From edge with ease-out
- **Lift**: Hover effect (translateY + shadow)
- **Ripple**: Material ripple on tap
- **Skeleton**: Loading placeholder shimmer
- **Bounce**: Success feedback
- **Shake**: Error feedback
- **Pulse**: Attention grabber

**Implementation**:
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 300ms ease-out;
}
```

**Usage Patterns**:
- Page transitions: Fade + slide
- Modal entry: Scale + fade
- Card interactions: Lift + shadow
- Button feedback: Ripple
- Loading states: Skeleton screens
- Success actions: Checkmark bounce
- Errors: Input shake

**Performance**:
- Use transform & opacity only
- Hardware acceleration (will-change)
- Respect prefers-reduced-motion
- Limit concurrent animations

**Success Criteria**:
- Animations feel snappy, not slow
- No janky frame drops
- Enhances UX without distraction

---

### T018: Implement Skeleton Loading States [P] ✅
**Files**: `src/css/components.css`, `src/js/components/skeleton.js`  
**Priority**: Medium  
**Parallel**: Yes (enhancement)  
**Status**: Complete

Add loading placeholders:

**Skeleton Patterns**:
```
Note Card Skeleton:
┌──────────────────────────┐
│ ████████░░░░░░░░░░░░░░░ │ (title)
│ ───────────────────────  │
│ ████░░░░░░░░░░░░░░░░░░  │ (preview)
│ ██░░░░░░░░░░░░░░░░░░░░  │
│ ████████░░░░░░░░░░░░░░  │
│                          │
│ [▮▮] [▮▮] [▮▮]          │ (tags)
└──────────────────────────┘
```

**Components**:
- Note card skeleton
- File card skeleton
- Chat message skeleton
- Sidebar list skeleton
- Table row skeleton

**Animation**:
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface) 25%,
    var(--surface-elevated) 50%,
    var(--surface) 75%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

**Success Criteria**:
- Matches actual content layout
- Smooth shimmer effect
- Clear loading indication
- No layout shift on content load

---

### T019: Add Empty States & Zero Data UI [P] ✅
**Files**: `src/css/components.css`, `src/js/components/empty-state.js`  
**Priority**: Medium  
**Parallel**: Yes (enhancement)  
**Status**: Complete

Design helpful empty states:

**Empty State Templates**:
```
No Notes Yet
┌─────────────────────────────┐
│         📝                  │
│                             │
│   Start Your First Note     │
│                             │
│   Capture your thoughts,    │
│   ideas, and knowledge      │
│                             │
│   [ + Create Note ]         │
└─────────────────────────────┘
```

**States to Design**:
- No notes: Onboarding CTA
- No search results: Suggestions
- No files: Upload prompt
- No chat history: Getting started
- No RAG data: Sync prompt
- Network error: Retry action
- No permissions: Help text

**Elements**:
- Relevant icon/illustration
- Clear headline
- Helpful description
- Primary action button
- Optional secondary actions

**Success Criteria**:
- Empty states are encouraging
- Clear next steps provided
- Matches overall design system

---

### T020: Implement Toast Notification System [P] ✅
**Files**: `src/js/components/toast.js`, `src/css/components.css`  
**Priority**: Medium  
**Parallel**: Yes (new feature)  
**Status**: Complete

Create modern notifications:

**Toast Design**:
```
┌────────────────────────────────┐
│ ✅ Note saved successfully     │
│ [Undo] [View]              [✕]│
└────────────────────────────────┘
```

**Toast Types**:
- Success: Green accent, checkmark
- Error: Red accent, X icon
- Warning: Yellow accent, ! icon
- Info: Blue accent, i icon

**Features**:
- Auto-dismiss (4s default)
- Pause on hover
- Action buttons (undo, retry, view)
- Stack multiple toasts
- Slide in from bottom
- Mobile-optimized positioning
- Accessibility announcements

**API**:
```javascript
toast.success('Note saved!', {
  action: { label: 'View', onClick: () => {} },
  duration: 4000
});
```

**Success Criteria**:
- Non-intrusive positioning
- Clear feedback on actions
- Smooth animations
- Screen reader support

---

### T021: Optimize Performance & Lazy Loading ✅
**Files**: Multiple performance improvements  
**Priority**: High  
**Dependencies**: All UI tasks  
**Status**: Complete

Implement performance optimizations:

**Lazy Loading**:
- Images: Intersection Observer
- Routes: Dynamic imports
- Heavy components: Code splitting
- File previews: On-demand loading

**Virtual Scrolling**:
- Large note lists (>100 items)
- Chat history (>50 messages)
- File browser (>100 files)

**Code Splitting**:
```javascript
// Dynamic imports
const FileUploader = () => import('./components/file-uploader.js');
const ChatView = () => import('./views/chat.js');
const RagIndexer = () => import('./services/rag-indexer.js');
```

**Optimization Techniques**:
- Bundle analysis & size reduction
- Tree shaking unused code
- Image optimization (WebP, lazy)
- CSS purging
- Service worker caching strategy
- IndexedDB query optimization
- Debounce expensive operations

**Metrics to Target**:
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1
- Largest Contentful Paint: <2.5s
- Note save: <50ms
- Search: <120ms
- Chat response start: <500ms

**Success Criteria**:
- Lighthouse score >90
- No UI blocking operations
- Smooth 60fps scrolling
- Fast cold start (<2s)

---

### T022: Add Keyboard Shortcuts & Power User Features [P] ✅
**Files**: `src/js/components/keyboard-shortcuts.js`, `src/css/components.css`, `src/js/app.js`  
**Priority**: Medium  
**Parallel**: Yes (enhancement)  
**Status**: Complete

Implement productivity shortcuts:

**Global Shortcuts**:
- `Cmd/Ctrl + K`: Command palette
- `Cmd/Ctrl + N`: New note
- `Cmd/Ctrl + F`: Search
- `Cmd/Ctrl + ,`: Settings
- `Cmd/Ctrl + /`: Shortcuts help

**View Navigation**:
- `1-5`: Switch views
- `Cmd/Ctrl + [/]`: Back/forward
- `Esc`: Close modal/drawer

**Editor Shortcuts**:
- `Cmd/Ctrl + B`: Bold
- `Cmd/Ctrl + I`: Italic
- `Cmd/Ctrl + K`: Insert link
- `Cmd/Ctrl + Shift + C`: Code block
- `Cmd/Ctrl + S`: Save

**Chat Shortcuts**:
- `Enter`: Send message
- `Shift + Enter`: New line
- `Cmd/Ctrl + ↑/↓`: History

**Features**:
- Command palette (Cmd+K)
- Shortcut help overlay
- Customizable bindings
- Visual feedback on trigger
- Context-aware shortcuts

**Success Criteria**:
- Shortcuts feel natural
- Help is discoverable
- No conflicts with browser
- Works cross-platform

---

### T023: Implement Dark Mode with Smooth Transition ✅
**Files**: `src/css/main.css`, `src/js/utils/theme.js`, `src/js/app.js`, `index.html`  
**Priority**: Medium  
**Dependencies**: T001  
**Status**: Complete

Perfect dark mode experience:

**Theme System**:
- Light mode (default)
- Dark mode (OLED-friendly)
- Auto mode (system preference)
- Scheduled switching

**Transition Animation**:
```css
@keyframes theme-transition {
  from {
    filter: invert(0);
  }
  to {
    filter: invert(1);
  }
}

.theme-transitioning {
  animation: theme-transition 300ms ease-in-out;
}
```

**Dark Mode Colors**:
- Background: `#0A0A0A` (true black for OLED)
- Surface 1dp: `#1E1E1E`
- Surface 2dp: `#2A2A2A`
- Text: `#E0E0E0` (reduced contrast)
- Accent: Adjusted for dark background

**Features**:
- Smooth color transition
- Persist preference
- System sync option
- No flash on load
- Images adapt (filter adjustment)

**Success Criteria**:
- No jarring theme switch
- Colors are comfortable
- Contrast ratios meet WCAG
- Battery-efficient on OLED

---

## Testing & Documentation

### T024: Write Component Documentation [P] ✅
**Files**: `docs/COMPONENTS.md`  
**Priority**: Low  
**Parallel**: Yes (documentation)  
**Status**: Complete

Document the component system:

**Documentation Structure**:
```markdown
# Component Library

## Button
### Usage
### Props
### Examples
### Accessibility
### Browser Support

## Card
...
```

**For Each Component**:
- Purpose & use cases
- Props & configuration
- Code examples
- Accessibility notes
- Browser compatibility
- Common patterns

**Interactive Examples**:
- Storybook-style demos
- Live playground links
- Copy-paste snippets

**Success Criteria**:
- Clear, comprehensive docs
- Easy to find examples
- Searchable content

---

### T025: Create UI/UX Style Guide [P] ✅
**Files**: `docs/STYLE-GUIDE.md`  
**Priority**: Low  
**Parallel**: Yes (documentation)  
**Status**: Complete

Document design decisions:

**Style Guide Sections**:
1. **Design Principles**: Philosophy & goals
2. **Color Palette**: All colors with usage
3. **Typography**: Scale, weights, line heights
4. **Spacing**: Grid system & spacing scale
5. **Components**: All UI components
6. **Patterns**: Common interaction patterns
7. **Motion**: Animation guidelines
8. **Icons**: Icon system & usage
9. **Accessibility**: WCAG compliance
10. **Responsive**: Breakpoints & patterns

**Visual Examples**:
- Color swatches
- Typography specimens
- Component variations
- Layout grids
- Animation timings

**Success Criteria**:
- Comprehensive visual reference
- Consistent design language
- Easy to maintain consistency

---

### T026: Add E2E Tests for New Features [P]
**Files**: `tests/e2e/file-upload.test.js`, `tests/e2e/chat.test.js`, `tests/e2e/rag-search.test.js`  
**Priority**: Medium  
**Parallel**: Yes (independent tests)

Test critical user flows:

**Test Suites**:
1. **File Upload Flow**
   - Upload single file
   - Upload multiple files
   - Drag and drop
   - File type validation
   - Size limit handling

2. **RAG Search Flow**
   - Semantic search
   - Filter by date/tags
   - View search results
   - Open note from search

3. **Chat Flow**
   - Send message
   - Receive streaming response
   - View referenced notes
   - New session creation
   - Session persistence

4. **UI Responsiveness**
   - Mobile layout
   - Tablet layout
   - Desktop layout
   - Orientation changes

**Test Tools**:
- Playwright for E2E
- Visual regression tests
- Performance assertions
- Accessibility audits

**Success Criteria**:
- All critical paths covered
- Tests are reliable (no flakiness)
- Fast execution (<2min total)

---

## Deployment & Polish

### T027: Create Progressive Disclosure Onboarding [P] ✅
**Files**: `src/js/components/onboarding.js`, `src/css/components.css`, `src/js/app.js`, `index.html`  
**Priority**: Low  
**Parallel**: Yes (enhancement)  
**Status**: Complete

Guide new users:

**Onboarding Flow**:
1. **Welcome Screen**: App introduction
2. **Create First Note**: Interactive tutorial
3. **Add Tags**: Explain tagging system
4. **Upload File**: Show file features
5. **Try Chat**: RAG chat demo
6. **Customize**: Theme & settings

**Features**:
- Step-by-step guide
- Skip option at each step
- Progress indicator
- Interactive elements
- Dismissible forever
- Restart option in settings

**Tooltip System**:
- Contextual hints
- Dismissible tips
- Smart timing (on idle)
- Non-intrusive placement

**Success Criteria**:
- Users understand core features
- Low abandonment rate
- Skippable but helpful

---

### T028: Implement Offline Mode Enhancements ✅
**Files**: `src/js/services/offline.js`, `sw.js`  
**Priority**: Medium  
**Dependencies**: T010  
**Status**: Complete

Improve offline experience:

**Features**:
- Offline indicator banner
- Queued actions display
- Sync status tracking
- Conflict resolution UI
- Background sync when online
- Offline-first file caching

**Service Worker Strategy**:
- Cache-first for static assets
- Network-first for API calls
- Background sync for queue
- Periodic sync for updates

**UI Indicators**:
- Offline banner (top of page)
- Queued actions count
- Sync progress indicator
- Last synced timestamp

**Success Criteria**:
- App works fully offline
- Clear sync status
- No data loss on reconnect

---

### T029: Add Export & Backup Features [P] ✅
**Files**: `src/js/services/export.js`, `src/js/app.js`, `index.html`  
**Priority**: Low  
**Parallel**: Yes (independent feature)  
**Status**: Complete

Enable data portability:

**Export Formats**:
- **Markdown**: All notes as .md files
- **JSON**: Structured data export
- **PDF**: Formatted note collection
- **HTML**: Static site generation

**Backup Features**:
- Auto-backup schedule
- Manual backup button
- Import backup file
- Verify backup integrity
- Encrypted backups option

**Export Options**:
- Select specific notes/tags
- Date range filtering
- Include/exclude attachments
- Format options per type

**Success Criteria**:
- Fast export (<5s for 1000 notes)
- All data preserved
- Easy import process

---

### T030: Final UI Polish Pass ✅
**Files**: All CSS and component files  
**Priority**: High  
**Dependencies**: All previous tasks  
**Status**: Complete

Final refinements:

**Polish Checklist**:
- [ ] All colors use design tokens
- [ ] Consistent spacing (4px grid)
- [ ] All text uses typography scale
- [ ] Smooth transitions everywhere
- [ ] Loading states for all async ops
- [ ] Error states for all failures
- [ ] Empty states for all views
- [ ] Focus states for accessibility
- [ ] Hover states for interactives
- [ ] Mobile touch targets ≥44px
- [ ] No layout shifts
- [ ] All images optimized
- [ ] Icons consistent style
- [ ] Buttons have proper states
- [ ] Forms have validation
- [ ] Modals trap focus
- [ ] Tooltips are helpful
- [ ] Animations respect motion prefs
- [ ] Dark mode is comfortable
- [ ] Print styles work

**Cross-browser Testing**:
- Chrome (desktop & mobile)
- Firefox (desktop & mobile)
- Safari (desktop & mobile)
- Edge (desktop)

**Accessibility Audit**:
- WCAG 2.1 AA compliance
- Screen reader testing
- Keyboard navigation
- Color contrast checks
- Focus management

**Performance Validation**:
- Lighthouse scores >90
- Core Web Vitals passing
- Bundle size <500KB
- No render-blocking resources

**Success Criteria**:
- App feels professional & polished
- No visual bugs
- Smooth across all devices
- Accessible to all users

---

## Execution Plan

### Phase 1: Foundation (Week 1)
**Parallel Tasks**: T001, T002, T010, T024, T025  
**Sequential**: T003 (depends on T001, T002)  
**Goal**: Modern design system & RAG architecture

### Phase 2: Core UI (Week 2)
**Parallel Tasks**: T004, T005, T006, T007, T008, T017, T018, T019, T020  
**Goal**: Beautiful notes interface & file management

### Phase 3: RAG Integration (Week 3)
**Sequential**: T011 → T012 → T013 → T015  
**Parallel with**: T014 (chat UI), T016 (chat history)  
**Goal**: Full RAG pipeline & chat interface

### Phase 4: Polish (Week 4)
**Parallel Tasks**: T021, T022, T023, T026, T027, T028, T029  
**Sequential**: T030 (final polish pass)  
**Goal**: Performance, shortcuts, tests, refinement

---

## Success Metrics

### Design Quality
- [ ] Feels like a professional app (not amateur)
- [ ] Smooth animations (60fps)
- [ ] Generous whitespace (not cramped)
- [ ] Clear visual hierarchy
- [ ] Consistent interaction patterns

### Functionality
- [ ] Notes creation/editing works flawlessly
- [ ] File upload handles all formats
- [ ] RAG search returns relevant results
- [ ] Chat provides helpful responses
- [ ] All features work offline

### Performance
- [ ] App loads <2s
- [ ] Note save <50ms
- [ ] Search results <120ms
- [ ] Chat response <500ms (first token)
- [ ] Smooth scrolling 60fps

### Accessibility
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigable
- [ ] Screen reader friendly
- [ ] Proper ARIA labels

### Cross-platform
- [ ] Works on mobile (iOS/Android)
- [ ] Works on tablet
- [ ] Works on desktop
- [ ] Responsive layouts perfect

---

**Status**: Ready for execution | **Estimated Duration**: 4 weeks | **Priority**: High

This comprehensive plan transforms Brain into a modern, professional notes application with RAG capabilities, matching the UX quality of ChatGPT, Google Drive, and Google Keep.

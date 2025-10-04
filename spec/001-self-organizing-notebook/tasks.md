# Tasks: Brain - Personal Second Brain PWA

**Feature**: Self-Organizing Notebook → Personal Second Brain  
**Phase**: Core Implementation + UI/UX + RAG Integration  
**Status**: Ready for execution  
**Input**: plan.md, spec.md, data-model.md, contracts/, constitution.md

## Overview

Build Brain as a personal "second brain" that feels natural to use daily. The home screen features 5 big sections (not a cluttered menu), each leading to its own full-page workspace:

1. **Notes**: Canvas-style editor with LLM auto-tagging
2. **Docs**: File library with OCR and metadata extraction
3. **Chat**: RAG-powered LLM interface grounded in your content
4. **Review & Study**: Spaced repetition + structured learning sessions
5. **Reminders & Calendar**: Calendar sync with LLM suggestions

## Design Vision

- **Home = Simple**: 5 large cards/buttons with small previews ("2 new notes today")
- **Inside = Powerful**: Each section opens full-page workspace
- **Navigation = Intuitive**: Feels like moving between "rooms," no cluttered sidebars
- **Always Portable**: Web-first, PWA-ready, eventual native iOS/Android

## Constitution Compliance

Per `.specify/memory/constitution.md`:
- ✅ **Simplicity First**: Vanilla JS, minimal dependencies
- ✅ **Documentation as Code**: Comprehensive inline comments
- ✅ **Test-Driven Development**: Tests before implementation
- ✅ **Performance Accountability**: <50ms save, <200ms render, <120ms search
- ✅ **Privacy by Design**: Local-first, user-controlled AI, PII redaction
- ✅ **PWA Standards**: Offline-first, responsive, installable

---

## Phase 3.1: Setup & Foundation

### T001: Audit Current Implementation State ✅
**Files**: All existing src/ files  
**Priority**: Critical  
**Parallel**: No  
**Status**: COMPLETE - See docs/IMPLEMENTATION-AUDIT.md

**Tasks**:
- ✅ Review existing code in src/js/app.js, db.js, state.js, ai.js, views/
- ✅ Document what's working, what needs refactoring
- ✅ Identify gaps between current state and new vision
- ✅ Create migration plan for existing features
- ✅ Verify all 54 unit tests still passing
- ✅ Check database schema compatibility

**Success Criteria**:
- ✅ Complete inventory of existing features
- ✅ Clear migration path documented
- ✅ No regression in working features
- ✅ Test suite remains green (54/54 tests passing)

---

### T002: Update Dependencies ✅
- Install new required packages: `pdfjs-dist@3`, `tesseract.js@5`, `mammoth@1`, `date-fns@3`, `fuse.js@7`, `canvas-confetti@1`
- Verify build still works
- Update package.json with peer dependencies if needed

### T003: Extend Data Model ✅
- Extend database schema in `src/js/db.js`:
  - New `files` table: `id, name, type, size, blob, extracted_text, metadata, created_at, updated_at, is_deleted`
  - New `chat_sessions` table: `id, title, created_at, updated_at, message_count, is_deleted`---

### T003 [P]: Extend Data Model for New Entities
**File**: `src/js/db.js`  
**Priority**: Critical  
**Parallel**: Yes (database migrations)

**New Tables**:
```javascript
// Files table
{
  id: string,              // ULID
  filename: string,
  filepath: string,        // Blob storage path
  mime_type: string,
  size_bytes: number,
  extracted_text: string,  // OCR/PDF extracted content
  metadata: object,        // File-specific metadata
  tags: string[],
  created_at: string,
  updated_at: string
}

// Chat Sessions table
{
  id: string,
  title: string,           // Auto-generated summary
  message_count: number,
  created_at: string,
  updated_at: string
}

// Chat Messages table
{
  id: string,
  session_id: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  referenced_notes: string[],  // Note IDs used for RAG
  referenced_files: string[],  // File IDs used for RAG
  created_at: string
}

// Study Sessions table
{
  id: string,
  session_type: 'review' | 'quiz' | 'topic_cluster',
  content_ids: string[],   // Notes/files in session
  progress: object,        // Completion tracking
  score: number,
  created_at: string,
  completed_at: string
}

// Reminders table
{
  id: string,
  title: string,
  description: string,
  due_date: string,
  reminder_type: 'review' | 'deadline' | 'habit',
  related_note_id: string,
  completed: boolean,
  created_at: string
}

// Calendar Events (cached from external)
{
  id: string,
  external_id: string,
  title: string,
  start_time: string,
  end_time: string,
  source: 'google' | 'ical',
  synced_at: string
}
```

**Migration Strategy**:
- Increment DB_VERSION to 2
- Preserve existing notes, tag_index, settings, sync_queue tables
- Add new tables with proper indexes
- Migrate any existing data if needed
- Test rollback capability

**Success Criteria**:
- Database schema updated without data loss
- All indexes created successfully
- Migration completes in <1s
- Existing features continue working

---

### T004 [P]: Create Contract Tests for New Services ✅
**Priority**: Can run in parallel during implementation, but must complete before implementation

Write comprehensive contract tests for all new services that will be built. These tests should FAIL initially (TDD approach).

**New test files to create**:

1. **tests/unit/file-processor.test.js**: PDF extraction, OCR, DOCX conversion
2. **tests/unit/vector-search.test.js**: Embedding generation, cosine similarity, semantic search
3. **tests/unit/chat-service.test.js**: Session management, message handling, RAG context building
4. **tests/unit/calendar-sync.test.js**: Google Calendar API, iCal parsing, reminder scheduling
5. **tests/unit/canvas-editor.test.js**: Canvas rendering, element positioning, drag-and-drop

**What to test**:

---

## Phase 3.2: Home Dashboard & Navigation

### T005: Design Home Dashboard Layout ✅
**Files**: `index.html`, `src/css/main.css`, `src/css/components.css`  
**Priority**: High  
**Dependencies**: T001, T002

**Layout Structure**:
```html
<main id="home-dashboard" class="dashboard">
  <header class="dashboard-header">
    <h1>Brain</h1>
    <button class="btn-icon" data-action="settings">⚙️</button>
  </header>
  
  <nav class="dashboard-grid">
    <div class="dashboard-card" data-section="notes">
      <div class="card-icon">📝</div>
      <h2>Notes</h2>
      <p class="card-preview">2 new today</p>
    </div>
    
    <div class="dashboard-card" data-section="docs">
      <div class="card-icon">📁</div>
      <h2>Docs</h2>
      <p class="card-preview">12 files</p>
    </div>
    
    <div class="dashboard-card" data-section="chat">
      <div class="card-icon">💬</div>
      <h2>Chat</h2>
      <p class="card-preview">3 conversations</p>
    </div>
    
    <div class="dashboard-card" data-section="review">
      <div class="card-icon">🧠</div>
      <h2>Review & Study</h2>
      <p class="card-preview">5 due today</p>
    </div>
    
    <div class="dashboard-card" data-section="calendar">
      <div class="card-icon">📅</div>
      <h2>Reminders</h2>
      <p class="card-preview">2 upcoming</p>
    </div>
  </nav>
</main>
```

**CSS Requirements**:
- Responsive grid (1 column mobile, 2-3 desktop)
- Large tap targets (min 120x120px cards)
- Hover effects (subtle lift)
- Loading states for preview data
- Smooth transitions between dashboard and sections

**Success Criteria**:
- Dashboard feels spacious and inviting
- Cards show live preview data
- Navigation to sections is instant
- Mobile-first responsive design works
- Passes Lighthouse accessibility audit

---

### T006: Implement Section Router & Transitions ✅
**File**: `src/js/router.js` (new)  
**Priority**: High  
**Dependencies**: T005

**Router Functionality**:
```javascript
class SectionRouter {
  constructor() {
    this.currentSection = 'home';
    this.sections = ['home', 'notes', 'docs', 'chat', 'review', 'calendar'];
    this.history = [];
  }
  
  navigateTo(section, context = {}) {
    // Validate section
    // Save current state
    // Trigger exit animation
    // Load new section
    // Trigger enter animation
    // Update history
    // Update URL hash
  }
  
  goBack() {
    // Navigate to previous section
    // Restore previous state
  }
}
```

**Animation Strategy**:
- Fade + slide transitions (300ms)
- No layout shift during transitions
- Interrupt-safe (can navigate during transition)
- Browser back button support
- Deep linking via URL hash

**Success Criteria**:
- Smooth transitions between sections
- No janky animations
- Browser back/forward works
- Deep links load correct section
- State preserved during navigation

---

## Phase 3.3: Notes Section (Canvas Editor)

### T007 [P]: Create Canvas Editor Component ✅
**Files**: `src/js/components/canvas-editor.js`, `src/css/components.css`  
**Priority**: Critical  
**Parallel**: Yes (new component)

**Canvas Features**:
```javascript
class CanvasEditor {
  // Text editing
  addTextBlock(x, y, content)
  editTextBlock(id, newContent)
  
  // Drawing
  enableDrawMode()
  addDrawing(strokes)
  editDrawing(id, newStrokes)
  
  // Media
  addImage(x, y, imageData)
  addDocument(x, y, fileRef)
  
  // Layout
  moveElement(id, newX, newY)
  resizeElement(id, newWidth, newHeight)
  alignElements(ids, alignment)
  
  // Collaboration (future)
  exportToJSON()
  importFromJSON(data)
}
```

**Implementation Approach**:
- Use HTML5 Canvas for drawing layer
- Contenteditable divs for text blocks
- Absolute positioning for free-form layout
- Touch gestures for mobile (pinch zoom, pan)
- Keyboard shortcuts (Cmd+D for draw mode)

**Success Criteria**:
- Smooth drawing with no lag
- Text editing works inline
- Images/docs embed correctly
- Touch gestures feel natural
- Exports to portable JSON format

---

### T008: Integrate Canvas Editor into Notes View ✅
**Files**: `src/js/views/notes.js` (new), `src/js/views/today.js` (refactor)  
**Priority**: High  
**Dependencies**: T007

**Tasks**:
- Create new Notes view controller
- Migrate existing Today view functionality
- Add canvas editor initialization
- Implement save/autosave for canvas notes
- Add toolbar for canvas tools
- Integrate AI tagging with canvas content
- Handle mixed content (text + drawings + images)

**UI Layout**:
```
┌─────────────────────────────────────┐
│ ← Back to Home    [Tools] [AI Tag] │
├─────────────────────────────────────┤
│                                     │
│      Canvas Editor Area             │
│      (free-form layout)             │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Success Criteria**:
- Canvas notes save with <50ms latency
- AI can extract text from canvas for tagging
- Existing text-only notes still work
- Smooth transition from Today view
- Mobile editing works well

---

### T009 [P]: Implement Voice Input for Notes ✅
**File**: `src/js/components/voice-input.js` (new)  
**Priority**: Medium  
**Parallel**: Yes (independent feature)

**Voice Features**:
```javascript
class VoiceInput {
  startListening()
  stopListening()
  
  // Events
  onTranscriptUpdate(callback)
  onTranscriptComplete(callback)
  onError(callback)
  
  // Browser Speech Recognition API
  // Fallback to OpenAI Whisper API if needed
}
```

**Integration Points**:
- Quick capture button on Notes view
- Real-time transcription display
- Auto-save transcript as note
- Optional AI tagging after transcription
- Mobile-optimized (large mic button)

**Success Criteria**:
- Accurate transcription (>90%)
- Real-time display of transcript
- Works offline with queued sync
- Clear visual feedback during recording
- Graceful fallback if permission denied

---

## Phase 3.4: Docs Section (File Management)

### T010 [P]: Create File Processor Service ✅
**File**: `src/js/services/file-processor.js` (new)  
**Priority**: Critical  
**Parallel**: Yes (independent service)  
**Dependencies**: T004 (tests must be written first)

**File Processing Pipeline**:
```javascript
class FileProcessor {
  async processFile(file) {
    // 1. Validate file type and size
    // 2. Generate ULID for file
    // 3. Store file blob in IndexedDB
    // 4. Extract text based on type:
    //    - PDF: pdf.js extraction
    //    - Images: Tesseract OCR
    //    - DOCX: Mammoth conversion
    //    - TXT/MD: Direct read
    // 5. Extract metadata (author, created date, etc.)
    // 6. Generate AI tags from extracted text
    // 7. Store file record in database
    // 8. Emit FILE_PROCESSED event
    // 9. Queue for RAG indexing
  }
  
  async extractText(file) { /*...*/ }
  async extractMetadata(file) { /*...*/ }
  async generateThumbnail(file) { /*...*/ }
}
```

**Supported Formats**:
- PDF (pdf.js)
- Images: JPG, PNG, HEIC (Tesseract OCR)
- Documents: DOCX (Mammoth), TXT, MD
- Code files: JS, PY, etc. (syntax-aware)

**Success Criteria**:
- Processes 10MB PDF in <5s
- OCR accuracy >85% on clear images
- Handles batch uploads efficiently
- Progress tracking per file
- Graceful handling of unsupported types

---

### T011: Build File Browser UI
**Files**: `src/js/views/docs.js` (new), `src/css/components.css`  
**Priority**: High  
**Dependencies**: T010

**UI Features**:
```
┌─────────────────────────────────────┐
│ ← Back      [Upload] [Grid/List]    │
├─────────────────────────────────────┤
│ 🔍 Search files...                  │
├─────────────────────────────────────┤
│ Grid View                           │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│ │📄  │ │📷  │ │📄  │ │📄  │       │
│ │Doc1│ │Img1│ │Doc2│ │Doc3│       │
│ └────┘ └────┘ └────┘ └────┘       │
│                                     │
│ List View                           │
│ 📄 Report.pdf    2.3MB    2d ago   │
│ 📷 Photo.jpg     125KB    5d ago   │
│ 📝 Notes.md       12KB    1w ago   │
└─────────────────────────────────────┘
```

**Features**:
- Toggle grid/list view
- Sort by: name, date, size, type
- Filter by file type
- Search extracted text content
- Bulk selection and actions
- File preview modal
- Context menu (download, delete, share)

**Success Criteria**:
- Grid/list toggle is instant
- Search includes file contents
- Preview loads quickly
- Bulk operations feel smooth
- Mobile-friendly touch targets

---

### T012 [P]: Implement File Upload Dropzone ✅
**File**: `src/js/components/file-dropzone.js` (new)  
**Priority**: High  
**Parallel**: Yes (independent component)

**Dropzone Features**:
```javascript
class FileDropzone {
  // Drag and drop
  onDragOver(event)
  onDrop(event)
  
  // Click to browse
  onClick()
  openFilePicker()
  
  // Multiple files
  handleFileList(files)
  
  // Progress tracking
  uploadProgress(file, percent)
  
  // Validation
  validateFileType(file)
  validateFileSize(file)
}
```

**UI Design**:
```
┌─────────────────────────────────────┐
│                                     │
│     📁 Drop files here              │
│                                     │
│     or click to browse              │
│                                     │
│  PDF, DOCX, TXT, MD, PNG, JPG      │
│  Max 10MB per file                  │
└─────────────────────────────────────┘
```

**Success Criteria**:
- Drag-over visual feedback
- Multiple file selection works
- Progress bars for each file
- Clear error messages
- Mobile camera integration

---

### T013 [P]: Create File Preview Modal ✅
**File**: `src/js/components/file-preview.js` (new)  
**Priority**: Medium  
**Parallel**: Yes (independent component)

**Preview Types**:
```javascript
class FilePreview {
  // PDF viewer
  renderPDF(fileData, page)
  
  // Image viewer
  renderImage(imageData, zoom)
  
  // Text/Markdown viewer
  renderText(content, syntax)
  
  // Actions
  download()
  delete()
  share()
  extractText()
}
```

**UI Features**:
- Full-screen modal
- Zoom controls for images/PDFs
- Page navigation for PDFs
- Syntax highlighting for code
- Keyboard shortcuts (← → for pages, Esc to close)
- Touch gestures (pinch zoom, swipe)

**Success Criteria**:
- Preview loads <500ms
- Smooth zoom/pan on mobile
- Keyboard navigation works
- No layout shift on open

---

## Phase 3.5: RAG Integration

### T014: Choose and Configure Vector Database
**Files**: `src/js/services/vector-db.js` (new), `docs/RAG-ARCHITECTURE.md` (new)  
**Priority**: Critical  
**Dependencies**: Research phase

**Evaluation**:
- **ChromaDB**: Full-featured, Python backend, requires server
- **LanceDB**: Serverless, embedded, good for local-first
- **In-Memory**: Simple Map-based solution for MVP
- **IndexedDB + Manual Vectors**: Full client-side solution

**Recommended**: Start with IndexedDB + manual vectors for MVP
- Store embeddings as Float32Array in IndexedDB
- Use cosine similarity for search
- Defer to proper vector DB when scaling needed

**Implementation**:
```javascript
class VectorDB {
  async addDocument(id, content, metadata) {
    const embedding = await this.generateEmbedding(content);
    await this.store(id, embedding, metadata);
  }
  
  async search(query, topK = 5) {
    const queryEmbedding = await this.generateEmbedding(query);
    const results = await this.cosineSimilaritySearch(queryEmbedding, topK);
    return results;
  }
  
  async generateEmbedding(text) {
    // Use OpenAI text-embedding-3-small
    // Or local sentence-transformers.js
  }
  
  cosineSimilarity(vec1, vec2) { /*...*/ }
}
```

**Success Criteria**:
- Embeddings generated in <500ms
- Search returns results in <200ms
- Handles 1000+ documents efficiently
- Works offline with queued embedding generation

---

### T015: Implement Note-to-Vector Indexing Pipeline
**File**: `src/js/services/rag-indexer.js` (new)  
**Priority**: High  
**Dependencies**: T014

**Indexing Pipeline**:
```javascript
class RagIndexer {
  async indexNote(noteId) {
    // 1. Load note content
    // 2. Chunk content (512 tokens, 128 overlap)
    // 3. Generate embeddings for each chunk
    // 4. Store vectors with metadata
    // 5. Update search index
    // 6. Emit INDEXED event
  }
  
  async indexFile(fileId) {
    // Same as note, but with extracted text
  }
  
  async reindexAll() {
    // Background job to reindex entire corpus
  }
  
  chunkText(text, chunkSize = 512, overlap = 128) { /*...*/ }
}
```

**Chunking Strategy**:
- Target 512 tokens per chunk
- 128 token overlap between chunks
- Preserve paragraph boundaries
- Include title in first chunk metadata
- Add chunk position for context

**Success Criteria**:
- Indexing happens in background
- No UI blocking during indexing
- Progress tracking visible
- Handles 50k character notes
- Graceful error handling

---

### T016 [P]: Build Vector Search Service ✅
**File**: `src/js/services/vector-search.js` (new)  
**Priority**: High  
**Parallel**: Yes (independent service)  
**Dependencies**: T014, T015

**Search API**:
```javascript
class VectorSearch {
  async search(query, options = {}) {
    // 1. Generate query embedding
    // 2. Find top K similar vectors
    // 3. Rerank by metadata (recency, tags)
    // 4. Load full documents
    // 5. Generate highlighted excerpts
    // 6. Return results
    
    return {
      results: [{
        id: 'note_ulid',
        type: 'note' | 'file',
        score: 0.95,
        chunk: 'matched content...',
        metadata: { tags, created_at },
        highlight: 'relevant excerpt with <mark>query</mark>'
      }],
      took: 45, // ms
      total: 127
    };
  }
  
  async hybridSearch(query, filters = {}) {
    // Combine vector search + keyword search
    // Apply tag filters, date ranges
    // Rerank combined results
  }
}
```

**Features**:
- Similarity threshold filtering
- Metadata filtering (date, tags, type)
- Keyword + vector hybrid search
- Result reranking
- Highlighted excerpts
- Query expansion

**Success Criteria**:
- Search completes <200ms
- Results feel relevant
- Hybrid search improves accuracy
- Filters work correctly

---

## Phase 3.6: Chat Interface

### T017: Design Chat UI (ChatGPT Style) ✅
**Files**: `src/js/views/chat.js` (new), `src/css/components.css`  
**Priority**: High  
**Dependencies**: T006

**Chat Layout**:
```
┌────────────────────────────────────┐
│ ← Sessions    Brain Assistant    ⚙️│
├────────────────────────────────────┤
│                                    │
│ 👤 How do I set up authentication? │
│ ──────────────────────────────────│
│ 🤖 Based on your notes, here's... │
│    [📝 Referenced: auth-notes.md]  │
│                                    │
│ 👤 Show me the code example        │
│ ──────────────────────────────────│
│ 🤖 Here's the code from your...   │
│    ```javascript                   │
│    // code block                   │
│    ```                            │
│    [📝 Referenced: 3 notes]        │
│                                    │
├────────────────────────────────────┤
│ 💬 Ask about your notes...    [↑] │
└────────────────────────────────────┘
```

**Features**:
- Auto-scroll to latest message
- Typing indicator (animated dots)
- Message timestamps (on hover)
- Code block syntax highlighting
- Markdown rendering
- Referenced notes pills (clickable)
- Copy message button
- Regenerate response
- Export conversation

**Success Criteria**:
- Feels like ChatGPT interface
- Smooth message animations
- Clear visual hierarchy
- Fast message rendering

---

### T018: Implement RAG-Powered Chat Service ✅
**File**: `src/js/services/chat-service.js` (new)  
**Priority**: Critical  
**Dependencies**: T016, T017

**Chat Flow**:
```javascript
class ChatService {
  async sendMessage(sessionId, userMessage) {
    // 1. Vector search for relevant content
    const relevantChunks = await this.vectorSearch.search(userMessage, { topK: 5 });
    
    // 2. Build context prompt
    const context = this.buildContextPrompt(relevantChunks);
    
    // 3. Call LLM with streaming
    const stream = await this.llm.createChatCompletion({
      messages: [
        { role: 'system', content: context },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ],
      stream: true
    });
    
    // 4. Stream response to UI
    for await (const chunk of stream) {
      this.emitMessageChunk(chunk);
    }
    
    // 5. Save conversation
    await this.saveMessage(sessionId, userMessage, fullResponse, relevantChunks);
  }
  
  buildContextPrompt(chunks) {
    return `You are Brain Assistant. You have access to the user's notes and files via RAG.

Current relevant context:
${chunks.map(c => `[${c.metadata.title}]: ${c.content}`).join('\n\n')}

Answer based on this context. Cite note/file titles when relevant.
If the user asks something outside your context, you can answer generally but note that you're going beyond their stored knowledge.`;
  }
}
```

**Features**:
- Streaming responses (SSE)
- Conversation context (last 10 messages)
- Source attribution (which notes/files used)
- Fallback for questions outside context
- Rate limiting (5 msg/min)
- Token counting & limits
- Conversation titles (auto-generated)

**Success Criteria**:
- Responses feel contextual
- References are accurate
- Streaming is smooth
- Handles general queries gracefully

---

### T019 [P]: Implement Chat Session Management
**Files**: `src/js/services/chat-history.js` (new), `src/js/db.js` (extend)  
**Priority**: Medium  
**Parallel**: Yes (independent feature)

**Session Features**:
```javascript
class ChatHistory {
  async createSession()
  async listSessions(limit = 20)
  async getSession(sessionId)
  async updateSessionTitle(sessionId, title)
  async deleteSession(sessionId)
  async exportSession(sessionId, format = 'markdown')
  async searchMessages(query)
}
```

**UI Components**:
- Session list sidebar (collapsible)
- Auto-title generation (from first message)
- Search within sessions
- Delete confirmation
- Export as Markdown
- Pin important sessions

**Success Criteria**:
- Sessions persist across reloads
- Fast session switching (<100ms)
- Search finds relevant messages
- Export format is readable

---

## Phase 3.7: Review & Study System

### T020: Enhance Spaced Repetition Algorithm ✅
**File**: `src/js/services/review-system.js` (extend existing)  
**Priority**: High  
**Dependencies**: Existing review functionality

**Algorithm Improvements**:
```javascript
class ReviewSystem {
  // Existing intervals: [7, 14, 30] days
  // New: Adaptive intervals based on performance
  
  calculateNextReview(noteId, performance) {
    // performance: 'easy' | 'medium' | 'hard'
    // Adjust intervals based on user feedback
    // Track review history for optimization
  }
  
  // New: Tag-based review acceleration
  getReviewInterval(note) {
    if (note.tags.includes('study') || note.tags.includes('important')) {
      return [3, 7, 14]; // Faster review cycle
    }
    return [7, 14, 30]; // Standard
  }
  
  // New: Weak spot detection
  async getWeakSpotTags() {
    // Find tags rarely reviewed
    // Surface notes with underutilized tags
  }
}
```

**Success Criteria**:
- Adaptive intervals improve retention
- Tag-based acceleration works
- Weak spot detection is helpful
- Review queue feels manageable

---

### T021: Create Study Session Generator ✅
**File**: `src/js/services/study-generator.js` (new)  
**Priority**: Medium  
**Dependencies**: T018 (chat service)

**Study Session Types**:
```javascript
class StudyGenerator {
  async generateQuiz(topicOrTags, questionCount = 10) {
    // Use LLM to generate questions from notes
    // Multiple choice, short answer, true/false
  }
  
  async generateTopicCluster(tag) {
    // Find related notes by tag
    // Use vector similarity to expand cluster
    // Create learning path through notes
  }
  
  async generateLearningPath(goal) {
    // Use LLM to analyze notes
    // Suggest order for studying content
    // Identify knowledge gaps
  }
  
  async createFlashcards(noteIds) {
    // Extract key concepts
    // Generate Q&A pairs
    // Store as flashcard deck
  }
}
```

**UI for Study Sessions**:
```
┌────────────────────────────────────┐
│ Study Session: JavaScript Basics   │
├────────────────────────────────────┤
│ Progress: 7/10 questions           │
│ Score: 85%                         │
│                                    │
│ Question 7:                        │
│ What is closure in JavaScript?    │
│                                    │
│ [Your answer...]                   │
│                                    │
│ [Submit] [Skip] [End Session]     │
└────────────────────────────────────┘
```

**Success Criteria**:
- Questions are relevant to notes
- Topic clusters are coherent
- Learning paths make sense
- Flashcards are useful

---

### T022: Build Review & Study View ✅
**Files**: `src/js/views/review.js` (extend existing), `src/css/components.css`  
**Priority**: High  
**Dependencies**: T020, T021

**View Sections**:
```
┌─────────────────────────────────────┐
│ ← Back     Review & Study          │
├─────────────────────────────────────┤
│ 📅 Due for Review                   │
│    5 notes waiting                  │
│    [Start Review Session]           │
│                                     │
│ 💡 Flashback of the Day             │
│    "Meeting notes from 1 year ago"  │
│                                     │
│ 🎯 Study Sessions                   │
│    ┌─────────────────────────┐     │
│    │ JavaScript Quiz         │     │
│    │ 10 questions · 15min    │     │
│    └─────────────────────────┘     │
│                                     │
│ 📊 Weak Spots                       │
│    Tags rarely reviewed:            │
│    · async_programming (14d ago)    │
│    · database_design (21d ago)      │
└─────────────────────────────────────┘
```

**Features**:
- Due review counter with badge
- Quick start review session
- Flashback cards with preview
- Study session library
- Progress tracking
- Completion animations

**Success Criteria**:
- Review queue is clear
- Study sessions are accessible
- Progress is motivating
- Weak spots are actionable

---

## Phase 3.8: Reminders & Calendar

### T023 [P]: Implement Calendar Integration ✅
**File**: `src/js/services/calendar-sync.js` (new)  
**Priority**: Medium  
**Parallel**: Yes (independent feature)

**Calendar Sources**:
```javascript
class CalendarSync {
  async syncGoogleCalendar(accessToken) {
    // OAuth flow for Google Calendar API
    // Fetch upcoming events
    // Store in local cache
    // Set up periodic sync
  }
  
  async syncICalendar(icalUrl) {
    // Fetch .ics file
    // Parse events
    // Store in local cache
  }
  
  async getUpcomingEvents(days = 7) {
    // Query cached events
    // Return events in next N days
  }
}
```

**Privacy Considerations**:
- Explicit user consent for calendar access
- Store access tokens securely (encrypted)
- Allow calendar disconnect
- Clear cached events on disconnect

**Success Criteria**:
- Google Calendar integration works
- iCal URL subscription works
- Events sync automatically
- Privacy controls are clear

---

### T024: Create Reminders System ✅
**File**: `src/js/services/reminder-service.js` (new)  
**Priority**: Medium  
**Dependencies**: T023

**Reminder Types**:
```javascript
class ReminderService {
  async createReminder(reminder) {
    // Store reminder in database
    // Schedule notification
    // Link to related note/event
  }
  
  async scheduleNotification(reminder) {
    // Use browser Notification API
    // Fallback to in-app alerts
    // Respect user notification preferences
  }
  
  async suggestReminders() {
    // Use LLM to analyze calendar + notes
    // Suggest relevant reminders
    // E.g., "Review diagnostic notes before shift"
  }
  
  async markComplete(reminderId) {
    // Update reminder status
    // Track completion rate
  }
}
```

**LLM Suggestions**:
```javascript
// Example: User has note tagged "newton_physics" and calendar event "Physics exam"
// LLM suggests: "Review Newton's laws notes before exam tomorrow"
```

**Success Criteria**:
- Notifications appear on time
- Suggestions are helpful
- Completion tracking works
- Integrates with browser notifications

---

### T025: Build Calendar View ✅
**Files**: `src/js/views/calendar.js` (new), `src/css/components.css`  
**Priority**: Low  
**Dependencies**: T023, T024

**View Layout**:
```
┌─────────────────────────────────────┐
│ ← Back     Reminders & Calendar     │
├─────────────────────────────────────┤
│ 🔔 Upcoming Reminders               │
│    · Review notes for meeting (2h)  │
│    · Call mom (tomorrow)            │
│                                     │
│ 📅 This Week                        │
│    Mon: Team standup, 9am          │
│    Wed: Doctor appointment, 2pm    │
│    Fri: Project deadline           │
│                                     │
│ 💡 LLM Suggestions                  │
│    "Review Newton notes before     │
│     physics exam tomorrow"         │
│    [Create Reminder]               │
│                                     │
│ [+ New Reminder]                   │
└─────────────────────────────────────┘
```

**Features**:
- List view (not full calendar UI for MVP)
- Checkboxes for completed items
- Quick add reminder
- LLM suggestion cards
- Event details on tap
- Link to related notes

**Success Criteria**:
- Upcoming events visible at a glance
- Reminders are actionable
- LLM suggestions are relevant
- Easy to create new reminders

---

## Phase 3.9: Integration & Polish

### T026: Implement Global Search ✅
**File**: `src/js/services/global-search.js` (new)  
**Priority**: High  
**Dependencies**: T016

**Unified Search**:
```javascript
class GlobalSearch {
  async search(query) {
    // Search across:
    // - Notes (title, body, tags)
    // - Files (filename, extracted text)
    // - Chat messages (content)
    // - Calendar events (title, description)
    
    // Use vector search for semantic results
    // Use keyword search for exact matches
    // Combine and rank results
    
    return {
      notes: [...],
      files: [...],
      chats: [...],
      events: [...]
    };
  }
}
```

**Search UI**:
- Global search bar (accessible from any view)
- Categorized results
- Jump to result in context
- Search history
- Keyboard shortcut (Cmd+K)

**Success Criteria**:
- Searches all content types
- Results grouped by type
- Fast execution (<120ms)
- Keyboard accessible

---

### T027 [P]: Add Progressive Disclosure Onboarding
**File**: `src/js/components/onboarding.js` (extend existing)  
**Priority**: Low  
**Parallel**: Yes (enhancement)

**Onboarding Flow**:
```javascript
// New users see interactive tour
1. Welcome: "Meet Brain, your second brain"
2. Dashboard: "5 main sections, each a full workspace"
3. Notes: "Canvas-style editor with AI tagging"
4. Docs: "Upload files, we'll extract and search text"
5. Chat: "Ask questions, get answers from your notes"
6. Review: "Spaced repetition learning"
7. Calendar: "Sync calendar for smart reminders"
```

**Features**:
- Interactive tooltips
- Skip option at each step
- Progress indicator
- Dismissible forever
- Restart option in settings
- Context-sensitive hints

**Success Criteria**:
- New users understand core features
- Tour is skippable
- Doesn't feel intrusive
- Can be restarted

---

### T028 [P]: Implement Offline Sync Enhancements
**File**: `src/js/services/offline-sync.js` (extend existing)  
**Priority**: Medium  
**Parallel**: Yes (enhancement)

**Enhanced Offline Features**:
```javascript
class OfflineSync {
  // Existing: Queue AI requests
  // New: Queue RAG indexing
  async queueIndexing(noteId, priority = 'low') {
    // Queue note for embedding generation
    // Process when online
  }
  
  // New: Offline file processing
  async processFileOffline(fileId) {
    // Extract text immediately
    // Queue OCR/AI for later
  }
  
  // New: Conflict resolution
  async resolveConflicts() {
    // Detect sync conflicts
    // Present resolution UI to user
  }
}
```

**UI Enhancements**:
- Offline indicator banner
- Queued actions count
- Sync progress bar
- Conflict resolution dialog
- Last synced timestamp

**Success Criteria**:
- All features work offline
- Clear sync status
- Conflicts handled gracefully
- No data loss

---

### T029 [P]: Add Export & Backup Features
**File**: `src/js/services/export.js` (extend existing)  
**Priority**: Low  
**Parallel**: Yes (independent feature)

**Export Formats**:
```javascript
class ExportService {
  // Existing: Markdown, JSON
  
  // New: Include files in export
  async exportWithFiles(format = 'zip') {
    // Package notes + files together
    // Preserve folder structure
    // Include manifest.json
  }
  
  // New: Incremental backup
  async createBackup(incremental = true) {
    // Export only changed items since last backup
    // Faster than full export
  }
  
  // New: Cloud backup
  async backupToCloud(provider) {
    // Google Drive, Dropbox, etc.
    // Encrypted backup
  }
}
```

**Features**:
- Auto-backup schedule
- Backup to cloud (optional)
- Import backup file
- Verify backup integrity
- Encryption option

**Success Criteria**:
- Fast export (<10s for 1000 notes)
- All data preserved
- Import restores correctly
- Cloud backup works

---

### T030: Performance Optimization Pass ✅
**Files**: All performance-critical files  
**Priority**: High  
**Dependencies**: All previous tasks

**Optimization Targets**:
```javascript
// Measure and optimize:
- Home dashboard load: <1s
- Section navigation: <300ms
- Note save: <50ms (constitutional requirement)
- Library render (1000 notes): <200ms (constitutional requirement)
- Search execution: <120ms (constitutional requirement)
- Canvas drawing: 60fps
- File upload processing: <5s per file
- Vector search: <200ms
- Chat message streaming: <500ms first token
```

**Techniques**:
- Lazy loading for heavy components
- Virtual scrolling for long lists
- Debouncing user inputs
- Caching frequently accessed data
- Web Workers for heavy processing
- Service Worker caching strategy
- Code splitting by route

**Success Criteria**:
- All constitutional budgets met
- Lighthouse score ≥90
- No UI blocking operations
- Smooth 60fps animations

---

### T031: Accessibility Audit & Fixes ✅
**Files**: All UI files  
**Priority**: High  
**Dependencies**: All UI tasks

**WCAG 2.1 AA Compliance**:
- [ ] Keyboard navigation for all features
- [ ] Screen reader support (ARIA labels)
- [ ] Color contrast ratios ≥4.5:1
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Skip navigation links
- [ ] Form labels and error messages
- [ ] Alternative text for images
- [ ] Captions for video/audio

**Testing Tools**:
- axe DevTools
- Lighthouse accessibility audit
- NVDA/JAWS screen readers
- Keyboard-only navigation test

**Success Criteria**:
- WCAG 2.1 AA compliant
- Lighthouse accessibility score 100
- Works with screen readers
- Fully keyboard navigable

---

### T032: Final UI Polish Pass ✅
**Files**: All CSS and component files  
**Priority**: Medium  
**Dependencies**: All previous tasks

**Polish Checklist**:
- [ ] All colors use design tokens
- [ ] Consistent spacing (4px grid)
- [ ] Typography scale applied
- [ ] Smooth transitions everywhere
- [ ] Loading states for async ops
- [ ] Error states for failures
- [ ] Empty states for all views
- [ ] Focus states for accessibility
- [ ] Hover states for interactives
- [ ] Mobile touch targets ≥44px
- [ ] No layout shifts
- [ ] All images optimized
- [ ] Icons consistent style
- [ ] Dark mode comfortable
- [ ] Print styles work

**Cross-browser Testing**:
- Chrome (desktop & mobile)
- Firefox (desktop & mobile)
- Safari (desktop & mobile)
- Edge (desktop)

**Success Criteria**:
- App feels professional
- No visual bugs
- Smooth across devices
- Accessible to all users

---

## Dependencies & Execution Order

### Critical Path (Must Complete Sequentially)
```
T001 → T002 → T003 → T005 → T006
                ↓
          T007 → T008
                ↓
         T014 → T015 → T016
                      ↓
                T017 → T018
```

### Parallel Execution Groups

**Group 1: Foundation (after T003)**
- T004 [P]: Contract tests
- T009 [P]: Voice input
- T010 [P]: File processor
- T012 [P]: File dropzone
- T013 [P]: File preview

**Group 2: Services (after T014)**
- T016 [P]: Vector search
- T019 [P]: Chat sessions
- T023 [P]: Calendar sync

**Group 3: Polish (after core features)**
- T027 [P]: Onboarding
- T028 [P]: Offline sync
- T029 [P]: Export/backup

### Parallel Execution Example
```bash
# After T003 completes, launch Group 1 in parallel:
Task: "Write contract tests for file processor in tests/unit/file-processor.test.js"
Task: "Implement voice input component in src/js/components/voice-input.js"
Task: "Create file processor service in src/js/services/file-processor.js"
Task: "Build file dropzone component in src/js/components/file-dropzone.js"
Task: "Create file preview modal in src/js/components/file-preview.js"
```

---

## Validation Checklist

### Constitutional Compliance
- [ ] Simplicity First: Vanilla JS, minimal dependencies
- [ ] Documentation: All functions documented
- [ ] TDD: Tests before implementation (T004 before core)
- [ ] Performance: <50ms save, <200ms render, <120ms search
- [ ] Privacy: Local-first, PII redaction, Private Mode
- [ ] PWA Standards: Offline-first, responsive, installable

### Feature Completeness
- [ ] All 5 sections implemented
- [ ] Home dashboard with live previews
- [ ] Canvas editor with drawings
- [ ] File upload with OCR
- [ ] RAG-powered chat
- [ ] Spaced repetition review
- [ ] Study session generator
- [ ] Calendar integration
- [ ] Global search across all content

### Quality Gates
- [ ] All tests passing
- [ ] Performance budgets met
- [ ] Lighthouse scores ≥90
- [ ] WCAG 2.1 AA compliant
- [ ] Cross-browser tested
- [ ] No console errors
- [ ] Documentation updated

---

## Estimated Timeline

**Phase 3.1: Setup & Foundation** (Week 1)
- T001-T004: Audit, dependencies, data model, tests

**Phase 3.2-3.3: Core UI** (Week 2-3)
- T005-T009: Dashboard, navigation, canvas editor, voice

**Phase 3.4: File Management** (Week 4)
- T010-T013: File processing, browser, upload, preview

**Phase 3.5-3.6: RAG & Chat** (Week 5-6)
- T014-T019: Vector DB, indexing, search, chat UI, sessions

**Phase 3.7-3.8: Review & Calendar** (Week 7)
- T020-T025: Spaced repetition, study generator, calendar sync

**Phase 3.9: Integration & Polish** (Week 8)
- T026-T032: Global search, onboarding, offline, export, optimization, accessibility

**Total Estimated Duration**: 8 weeks

---

## Success Metrics

### User Experience
- [ ] Home dashboard feels inviting and clear
- [ ] Navigation between sections is intuitive
- [ ] Canvas editor feels natural to use
- [ ] File upload is effortless
- [ ] Chat provides helpful answers
- [ ] Review system aids learning
- [ ] Calendar integration is useful

### Technical Performance
- [ ] App loads <2s cold start
- [ ] All constitutional budgets met
- [ ] Works fully offline
- [ ] No data loss or corruption
- [ ] Handles 1000+ notes/files smoothly

### Quality Standards
- [ ] Lighthouse PWA score ≥90
- [ ] Test coverage >80%
- [ ] Zero high-severity bugs
- [ ] WCAG 2.1 AA compliant
- [ ] Cross-browser compatible

---

**Status**: Tasks ready for execution | **Next**: Begin T001 (Audit Current State)

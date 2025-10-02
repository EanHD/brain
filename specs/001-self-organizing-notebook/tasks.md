# Tasks: Self-Organizing Notebook PWA

**Input**: Design documents from implementation plan, data model, and contracts  
**Prerequisites**: ✅ plan.md, ✅ research.md, ✅ data-model.md, ✅ contracts/

## Project Overview
Progressive Web Application for capturing and organizing notes with AI-powered tagging, multiple view modes, local-first storage, and spaced repetition review. Built with vanilla JavaScript, Dexie.js, and Workbox for maximum simplicity and learning.

**Technology Stack**: Vanilla JS + HTML5 + CSS3, Dexie.js, Workbox, OpenAI API  
**Target**: Personal use on Tailscale network, mobile-first PWA  
**Performance**: <50ms save, <200ms render, <120ms search

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Follow TDD: Tests before implementation
- Constitution compliance: Simplicity, documentation, performance

---

## Phase 3.1: Setup & Project Structure ✅ COMPLETED
**Objective**: Initialize PWA project with build tools and basic structure

- [x] **T001** Create root project structure: index.html, manifest.json, package.json, .gitignore
- [x] **T002** Initialize Node.js project and install dependencies: Dexie.js, Workbox CLI, Vite, Playwright, Vitest
- [x] **T003** [P] Configure Vite development server in vite.config.js
- [x] **T004** [P] Configure Playwright E2E testing in playwright.config.js  
- [x] **T005** [P] Configure Vitest unit testing in vitest.config.js
- [x] **T006** Create src/ directory structure: js/, css/, assets/ subdirectories
- [x] **T007** Create tests/ directory structure: e2e/, unit/ subdirectories
- [x] **T008** Create docs/ directory with README.md, DEVELOPMENT.md, DEPLOYMENT.md
- [x] **T009** [P] Setup GitHub Actions workflows in .github/workflows/: test.yml, build.yml, deploy.yml
- [x] **T010** [P] Create environment configuration: .env.example with OpenAI API key template

**Phase 3.1 Status**: ✅ **COMPLETED** - All setup tasks finished, ready for TDD Phase 3.2

---

## Phase 3.2: Tests First (TDD) 🧪 IN PROGRESS
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Database & Storage Contract Tests
- [x] **T011** [P] Contract test: Note CRUD operations in tests/unit/db.test.js
- [x] **T012** [P] Contract test: TagIndex operations in tests/unit/indexer.test.js
- [x] **T013** [P] Contract test: Settings management in tests/unit/db.test.js (included in T011)
- [x] **T014** [P] Contract test: SyncQueue operations in tests/unit/db.test.js (included in T011)

### AI Service Contract Tests
- [x] **T015** [P] Contract test: AI tag generation in tests/unit/ai.test.js
- [x] **T016** [P] Contract test: AI request sanitization in tests/unit/ai.test.js (included in T015)
- [x] **T017** [P] Contract test: AI offline queueing in tests/unit/ai.test.js (included in T015)

### Utility Contract Tests
- [x] **T018** [P] Contract test: ULID generation in tests/unit/utils.test.js
- [x] **T019** [P] Contract test: Event system in tests/unit/events.test.js
- [x] **T020** [P] Contract test: Performance monitoring in tests/unit/performance.test.js

### E2E User Journey Tests
- [x] **T021** [P] E2E test: Note creation workflow in tests/e2e/note-creation.test.js
- [x] **T022** [P] E2E test: Search and filter in tests/e2e/search-filter.test.js
- [x] **T023** [P] E2E test: PWA offline mode in tests/e2e/offline-mode.test.js
- [x] **T024** [P] E2E test: Review system in tests/e2e/review-system.test.js
- [x] **T025** [P] E2E test: Performance budgets in tests/e2e/performance.test.js

**Phase 3.2 Status**: ✅ **COMPLETE** - All contract tests designed and failing as expected (TDD)

---

## Phase 3.3: Core Implementation ✅ COMPLETED
**Objective**: Implement core data layer and utilities to make tests pass

### Utility Modules
- [x] **T026** [P] ULID generation utility in src/js/utils/ulid.js
- [x] **T027** [P] Event system utility in src/js/utils/events.js  
- [x] **T028** [P] Performance monitoring in src/js/utils/performance.js

### Database Layer
- [x] **T029** Database abstraction layer in src/js/db.js (Dexie.js setup and schemas)
- [x] **T030** Note entity operations in src/js/db.js (CRUD, search, validation)
- [x] **T031** TagIndex operations in src/js/indexer.js (tag mapping, frequency counting)
- [x] **T032** Settings management in src/js/db.js (configuration persistence)
- [x] **T033** SyncQueue operations in src/js/db.js (offline request queuing)

### AI Service Layer  
- [x] **T034** AI service integration in src/js/ai.js (OpenAI API client)
- [x] **T035** Data sanitization in src/js/ai.js (privacy pattern removal)
- [x] **T036** Request queuing and retry logic in src/js/ai.js

### Application State
- [x] **T037** State management in src/js/state.js (app state, view routing)
- [x] **T038** Application controller in src/js/app.js (initialization, coordination)

---

## Phase 3.4: User Interface Implementation ✅ COMPLETED
**Objective**: Build responsive UI components and view controllers

### HTML Structure & PWA
- [x] **T039** Main HTML template in index.html (semantic structure, PWA meta tags)
- [x] **T040** PWA manifest in manifest.json (icons, display mode, theme)
- [x] **T041** Service worker in sw.js (Workbox, caching strategies, offline support)

### CSS Styling
- [x] **T042** [P] Core CSS styles in src/css/main.css (typography, layout, variables)
- [x] **T043** [P] Component styles in src/css/components.css (buttons, forms, cards)  
- [x] **T044** [P] Responsive design in src/css/responsive.css (mobile-first, breakpoints)

### View Controllers
- [x] **T045** [P] Today view controller in src/js/views/today.js
- [x] **T046** [P] Library view controller in src/js/views/library.js
- [x] **T047** [P] TOC view controller in src/js/views/toc.js
- [x] **T048** [P] Note detail controller in src/js/views/detail.js
- [x] **T049** [P] Review view controller in src/js/views/review.js

---

## Phase 3.5: Integration & Features
**Objective**: Connect components and implement advanced features

### View Integration
- [ ] **T050** Navigation system between views in src/js/app.js
- [ ] **T051** Search functionality across views in src/js/views/library.js
- [ ] **T052** Tag filtering system in src/js/views/library.js and src/js/views/toc.js
- [ ] **T053** Note editing workflow in src/js/views/detail.js

### Advanced Features
- [ ] **T054** Spaced repetition algorithm in src/js/views/review.js
- [ ] **T055** Flashback of the Day feature in src/js/views/review.js
- [ ] **T056** Performance budget enforcement in src/js/utils/performance.js
- [ ] **T057** Error handling and user feedback across all modules

### PWA Features
- [ ] **T058** Offline detection and sync in src/js/app.js
- [ ] **T059** Background sync for AI requests in sw.js
- [ ] **T060** Installation prompt and PWA onboarding in src/js/app.js

---

## Phase 3.6: Polish & Documentation
**Objective**: Optimize performance, add comprehensive documentation

### Performance Optimization
- [ ] **T061** [P] Bundle size optimization (tree shaking, code splitting)
- [ ] **T062** [P] Database query optimization and indexing
- [ ] **T063** [P] UI performance tuning (debouncing, virtualization if needed)

### Documentation
- [ ] **T064** [P] User documentation in docs/README.md (setup, usage, troubleshooting)
- [ ] **T065** [P] Developer guide in docs/DEVELOPMENT.md (code organization, debugging)
- [ ] **T066** [P] Deployment guide in docs/DEPLOYMENT.md (GitHub Actions, Tailscale setup)
- [ ] **T067** [P] API documentation in docs/API.md (code references, architecture)

### Quality Assurance
- [ ] **T068** [P] Code review checklist and constitution compliance audit
- [ ] **T069** [P] Cross-browser testing (Chrome, Firefox, Safari, Mobile)
- [ ] **T070** [P] Accessibility audit and improvements
- [ ] **T071** Manual testing using quickstart guide scenarios
- [ ] **T072** Performance benchmarking and budget validation

---

## Dependencies
**Critical Path Dependencies:**
- Setup (T001-T010) before all other phases
- Tests (T011-T025) before implementation (T026-T060)
- Utilities (T026-T028) before database (T029-T036)
- Database (T029-T036) before state management (T037-T038)  
- State management (T037-T038) before UI (T039-T049)
- Core UI (T039-T049) before integration (T050-T060)
- Implementation complete before polish (T061-T072)

**File-Level Dependencies:**
- T029 (db.js setup) blocks T030-T033 (database operations)
- T037 (state.js) blocks T045-T049 (view controllers) 
- T039 (index.html) blocks T040-T041 (PWA features)
- T034-T036 (AI service) can run parallel with database tasks

---

## Parallel Execution Examples

### Phase 3.1 Setup (Parallel Tasks)
```bash
# Run simultaneously:
Task T003: Configure Vite development server
Task T004: Configure Playwright E2E testing  
Task T005: Configure Vitest unit testing
Task T009: Setup GitHub Actions workflows
Task T010: Create environment configuration
```

### Phase 3.2 Contract Tests (All Parallel)
```bash  
# Run simultaneously after setup complete:
Task T011: Contract test Note CRUD operations
Task T012: Contract test TagIndex operations
Task T013: Contract test Settings management
Task T014: Contract test SyncQueue operations
Task T015: Contract test AI tag generation
Task T016: Contract test AI request sanitization
Task T017: Contract test AI offline queueing
Task T018: Contract test ULID generation
Task T019: Contract test Event system
Task T020: Contract test Performance monitoring
Task T021: E2E test Note creation workflow
Task T022: E2E test Search and filter
Task T023: E2E test PWA offline mode
Task T024: E2E test Review system
Task T025: E2E test Performance budgets
```

### Phase 3.3 Utility Implementation (Parallel Tasks)
```bash
# Run simultaneously after tests are failing:
Task T026: ULID generation utility
Task T027: Event system utility
Task T028: Performance monitoring utility
```

### Phase 3.4 CSS Styling (Parallel Tasks)
```bash
# Run simultaneously:
Task T042: Core CSS styles
Task T043: Component styles
Task T044: Responsive design
```

### Phase 3.4 View Controllers (Parallel Tasks)  
```bash
# Run simultaneously after state management complete:
Task T045: Today view controller
Task T046: Library view controller
Task T047: TOC view controller
Task T048: Note detail controller
Task T049: Review view controller
```

### Phase 3.6 Documentation (Parallel Tasks)
```bash
# Run simultaneously:
Task T064: User documentation
Task T065: Developer guide
Task T066: Deployment guide
Task T067: API documentation
```

---

## Task Validation Checklist
- ✅ All contracts have corresponding tests (T011-T025)
- ✅ All entities have implementation tasks (Note, TagIndex, Settings, SyncQueue)
- ✅ All view controllers implemented (Today, Library, TOC, Detail, Review)  
- ✅ All user journeys covered by E2E tests
- ✅ Performance budgets enforced throughout
- ✅ Constitution compliance (simplicity, documentation, TDD)
- ✅ PWA features complete (offline, installation, service worker)
- ✅ Privacy requirements met (local-first, data sanitization)

## Success Criteria
**After completing all tasks:**
- ✅ PWA installs and works offline on mobile and desktop
- ✅ All performance budgets met (<50ms save, <200ms render, <120ms search)
- ✅ AI tagging works with OpenAI integration and privacy controls
- ✅ All 5 views functional (Today, Library, TOC, Detail, Review)  
- ✅ Spaced repetition review system operational
- ✅ Local-first storage with 1000+ note capacity
- ✅ Comprehensive documentation for learning and maintenance
- ✅ Deployed to GitHub Pages with Tailscale network access
- ✅ All tests pass and constitution compliance verified

**Estimated Timeline**: 72 tasks, ~2-3 weeks for experienced developer, ~4-6 weeks for learning developer

**Next Command**: `/implement` to execute tasks following TDD methodology
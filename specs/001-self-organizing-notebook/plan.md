# Implementation Plan: Self-Organizing Notebook PWA

**Branch**: `001-self-organizing-notebook` | **Date**: 2024-12-19 | **Spec**: [001-self-organizing-notebook-spec.md](./001-self-organizing-notebook-spec.md)
**Input**: Feature specification from `/001-self-organizing-notebook-spec.md`

## Summary
A Progressive Web Application (PWA) for capturing and organizing notes with AI-powered tagging, multiple view modes, local-first storage, and spaced repetition review. Designed for personal use on Tailscale network with simple, documented codebase suitable for learning and modification.

## Technical Context
**Language/Version**: JavaScript ES2022 + HTML5 + CSS3  
**Primary Dependencies**: Workbox (PWA), Dexie.js (IndexedDB), OpenAI API  
**Storage**: IndexedDB (primary) + localStorage (cache) - local-first architecture  
**Testing**: Playwright (E2E) + Vitest (unit tests)  
**Target Platform**: Progressive Web App (mobile + desktop browsers)  
**Project Type**: Single-page PWA with service worker  
**Performance Goals**: <50ms save, <200ms render (1k notes), <120ms search  
**Constraints**: Offline-capable, responsive design, Tailscale network hosting  
**Scale/Scope**: Personal use, ~1000 notes expected, 5 main screens  
**Deployment**: GitHub Actions → Static hosting on Tailscale network  
**AI Integration**: OpenAI GPT-4o-mini via API key (user-configurable)

## Constitution Check
*Based on simplicity and learning-focused principles*

✅ **Simplicity**: Single HTML file + modular JS, clear separation of concerns  
✅ **Documentation**: Extensive inline comments, README with setup instructions  
✅ **Maintainability**: Standard web technologies, no complex frameworks  
✅ **Learning-Friendly**: Clear file structure, well-commented code, step-by-step guides  
✅ **Performance**: Explicit budgets with measurement hooks  

No constitutional violations detected.

## Project Structure

### Documentation (this feature)
```
specs/001-self-organizing-notebook/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0: Tech stack decisions & PWA patterns
├── data-model.md        # Phase 1: Note & TagIndex schemas
├── quickstart.md        # Phase 1: User setup & testing scenarios  
├── contracts/           # Phase 1: API contracts & test specs
│   ├── ai-service.yaml      # OpenAI API contract
│   ├── storage.yaml         # IndexedDB operations contract
│   └── events.yaml          # Application events contract
└── tasks.md             # Phase 2: Implementation tasks (/tasks command)
```

### Source Code (repository root)
```
/
├── index.html           # Single-page PWA entry point
├── manifest.json        # PWA manifest
├── sw.js               # Service worker (offline support)
├── src/
│   ├── js/
│   │   ├── app.js           # Main application controller
│   │   ├── db.js            # IndexedDB operations (Dexie.js)
│   │   ├── state.js         # Application state management
│   │   ├── indexer.js       # Tag indexing & search
│   │   ├── ai.js            # AI tag suggestion service
│   │   ├── views/
│   │   │   ├── today.js         # Today view controller
│   │   │   ├── library.js       # Library view controller
│   │   │   ├── toc.js           # TOC view controller
│   │   │   ├── detail.js        # Note detail controller
│   │   │   └── review.js        # Review view controller
│   │   └── utils/
│   │       ├── ulid.js          # ULID generation
│   │       ├── events.js        # Event system
│   │       └── performance.js   # Performance monitoring
│   ├── css/
│   │   ├── main.css         # Core styles
│   │   ├── components.css   # UI component styles
│   │   └── responsive.css   # Mobile-first responsive design
│   └── assets/
│       ├── icons/           # PWA icons (multiple sizes)
│       └── fonts/           # Web fonts (if needed)
├── tests/
│   ├── e2e/
│   │   ├── note-creation.test.js
│   │   ├── search-filter.test.js
│   │   ├── offline-mode.test.js
│   │   └── review-system.test.js
│   └── unit/
│       ├── db.test.js
│       ├── indexer.test.js
│       ├── ai.test.js
│       └── utils.test.js
├── docs/
│   ├── README.md            # Setup & usage guide
│   ├── DEVELOPMENT.md       # Development guide
│   ├── DEPLOYMENT.md        # Tailscale deployment guide
│   └── API.md              # Code documentation
├── .github/
│   └── workflows/
│       ├── test.yml         # Run tests on PR
│       ├── build.yml        # Build PWA
│       └── deploy.yml       # Deploy to GitHub Pages
├── package.json         # Dependencies & scripts
├── vite.config.js       # Build configuration
├── playwright.config.js # E2E test configuration
└── .env.example        # Environment variables template
```

**Structure Decision**: Single-page PWA architecture chosen for simplicity and offline capability. All code in one repository with clear separation between views, data layer, and utilities. Minimal build tooling (Vite) for development experience while maintaining vanilla JS readability.

## Phase 0: Research & Technology Decisions

### Research Tasks
1. **PWA Best Practices**: Service worker patterns, offline-first data sync, app shell architecture
2. **IndexedDB Libraries**: Compare Dexie.js vs vanilla IndexedDB for simplicity and performance
3. **AI Integration Patterns**: OpenAI API integration, rate limiting, error handling, privacy
4. **Mobile-First Design**: Responsive patterns, touch interactions, performance optimization
5. **Tailscale Hosting**: Static site deployment options, HTTPS setup, network configuration
6. **GitHub Actions**: Static site deployment, testing pipeline, environment management

### Key Decisions to Document in research.md
- **PWA Framework**: Vanilla JS + Workbox (vs React/Vue) for simplicity and learning
- **Storage Strategy**: Dexie.js wrapper around IndexedDB for better API while maintaining control
- **AI Provider**: OpenAI GPT-4o-mini for cost efficiency and good tag generation
- **CSS Framework**: Custom CSS (vs Tailwind) for learning and full control
- **Build Tool**: Vite for development, minimal configuration
- **Testing Strategy**: Playwright E2E + Vitest unit tests for comprehensive coverage

## Phase 1: Design & Contracts

### 1. Data Model (data-model.md)
Extract entities from specification:
- **Note Entity**: id (ULID), title, body, tags[], created_at, updated_at, last_reviewed
- **TagIndex Entity**: tag, note_ids[], count
- **Settings Entity**: ai_api_key, private_mode, review_intervals
- **SyncQueue Entity**: operation_type, data, retry_count, created_at

### 2. API Contracts (contracts/)
Generate contracts from functional requirements:
- **ai-service.yaml**: OpenAI API integration contract
- **storage.yaml**: IndexedDB operations (CRUD, search, indexing)  
- **events.yaml**: Application event system (NOTE_CREATED, etc.)

### 3. Contract Tests
Generate failing tests from contracts:
- AI service integration tests (mock responses)
- Database operation tests (IndexedDB)
- Event system tests
- Performance benchmark tests

### 4. User Journey Tests (quickstart.md)
Extract test scenarios from user stories:
- Create note → Save → AI tags → Verify storage
- Search notes → Filter by tags → Verify results
- Offline mode → Create notes → Online sync
- Review system → Surface old notes → Update review status
- Performance → Load 1000 notes → Measure render time

### 5. Development Documentation
Create comprehensive guides:
- **README.md**: Project overview, setup instructions, basic usage
- **DEVELOPMENT.md**: Code organization, development workflow, debugging
- **DEPLOYMENT.md**: Tailscale setup, GitHub Actions configuration
- **API.md**: Code documentation, function references, architecture

**Output**: data-model.md, contracts/, failing tests, quickstart.md, comprehensive documentation

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate setup tasks: PWA structure, dependencies, configuration
- Generate test tasks from contracts: AI service tests [P], storage tests [P], event tests [P]
- Generate core implementation tasks: database layer, state management, view controllers
- Generate integration tasks: service worker, AI integration, performance monitoring
- Generate polish tasks: responsive design, error handling, documentation

**Ordering Strategy**:
- **Setup Phase**: Project structure, dependencies, PWA manifest
- **Tests Phase**: Contract tests, E2E test setup (all [P] - parallel)
- **Core Phase**: Database → State → Views (sequential due to dependencies)
- **Integration Phase**: Service worker → AI service → Performance monitoring
- **Polish Phase**: Error handling [P], responsive design [P], documentation [P]

**Estimated Output**: 25-30 numbered tasks covering full PWA development lifecycle

**Special Considerations**:
- Extensive documentation tasks for learning experience
- Performance measurement tasks with specific budgets
- GitHub Actions setup for automated deployment
- Tailscale deployment configuration

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation following TDD approach with comprehensive documentation  
**Phase 5**: Validation, performance testing, Tailscale deployment setup

## Complexity Tracking
*No constitutional violations requiring justification*

All technology choices prioritize simplicity, learning, and maintainability:
- Vanilla JavaScript over frameworks for transparency
- Minimal build tooling for reduced complexity  
- Comprehensive documentation for learning support
- Standard web technologies for broad compatibility
- Local-first architecture for privacy and performance

## Progress Tracking
- [x] Initial Constitution Check (no violations)
- [x] Technical Context defined
- [x] Project structure designed
- [x] Phase 0: Research execution (research.md)
- [x] Phase 1: Design artifacts (data-model.md, contracts/, quickstart.md)
- [x] Post-Design Constitution Check (no new violations)
- [x] Phase 2: Task planning description complete

**Status**: ✅ Plan complete, ready for `/tasks` command
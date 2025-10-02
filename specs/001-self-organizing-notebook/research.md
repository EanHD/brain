# Research & Technology Decisions: Self-Organizing Notebook PWA

**Feature**: Self-Organizing Notebook | **Phase**: 0 - Research | **Date**: 2024-12-19

## Executive Summary
Research completed for personal note-taking PWA with AI tagging, focusing on simplicity, documentation, and learning-friendly architecture. All technology choices prioritize vanilla web standards and comprehensive documentation for maintainability by a developer with limited coding experience.

## Technology Stack Decisions

### 1. PWA Framework: Vanilla JavaScript + Workbox
**Decision**: Use vanilla JavaScript with Workbox for PWA features
**Rationale**: 
- Maximum transparency and learning opportunities
- No framework complexity or build step overhead
- Direct control over all application logic
- Industry-standard PWA tools (Workbox) for offline functionality
- Easier to debug and understand for learning

**Alternatives Considered**:
- React: Rejected due to complexity overhead and learning curve
- Vue: Rejected for similar reasons, though simpler than React
- Svelte: Rejected to maintain vanilla JS simplicity

**Implementation Notes**:
- Use ES6 modules for code organization
- Workbox for service worker and caching strategies
- Native Web APIs for all functionality

### 2. Storage: Dexie.js + IndexedDB
**Decision**: Use Dexie.js as IndexedDB wrapper with localStorage cache
**Rationale**:
- IndexedDB provides robust offline storage for large datasets
- Dexie.js offers cleaner API while maintaining full IndexedDB control
- localStorage for quick access to frequently used data
- Local-first architecture ensures privacy and performance
- Well-documented library suitable for learning

**Alternatives Considered**:
- Vanilla IndexedDB: Rejected due to complex API
- PouchDB: Rejected as overkill for local-only storage
- WebSQL: Deprecated technology

**Storage Strategy**:
- IndexedDB: Primary storage for notes, tags, settings
- localStorage: Cache for recent notes, search indexes, UI state
- Service Worker: Cache for app shell and static assets

### 3. AI Integration: OpenAI GPT-4o-mini API
**Decision**: OpenAI GPT-4o-mini via direct API calls
**Rationale**:
- Cost-effective model suitable for tag generation
- Simple REST API integration
- User controls API key and usage
- Timeout and retry logic for reliability
- Privacy controls (data sanitization)

**Alternatives Considered**:
- Claude API: More expensive, similar capability
- Local AI models: Too complex for simple setup
- Hugging Face: More setup complexity

**Integration Pattern**:
- Direct fetch() calls to OpenAI API
- Request sanitization for privacy
- Graceful failure with offline queueing
- User-configurable API key

### 4. CSS Strategy: Custom CSS with CSS Grid/Flexbox
**Decision**: Hand-written CSS using modern layout techniques
**Rationale**:
- Full learning opportunity for CSS fundamentals
- Complete control over styling and responsive behavior
- No framework dependencies or build complexity
- Mobile-first responsive design
- Semantic, accessible markup

**Alternatives Considered**:
- Tailwind CSS: Rejected to focus on CSS fundamentals
- Bootstrap: Rejected as too opinionated and complex
- CSS-in-JS: Rejected as not aligned with vanilla approach

**CSS Architecture**:
- Mobile-first responsive design
- CSS Grid for layout, Flexbox for components
- CSS custom properties for theming
- Semantic class naming convention

### 5. Build Tools: Vite (Development Only)
**Decision**: Vite for development server, vanilla deployment
**Rationale**:
- Fast development experience with hot reload
- Minimal configuration required
- Outputs clean vanilla JS/CSS/HTML for deployment
- TypeScript support if needed later
- Easy debugging in development

**Alternatives Considered**:
- Webpack: Too complex configuration
- No build tool: Lacks development conveniences
- Parcel: Similar to Vite but less commonly used

**Build Strategy**:
- Vite for development server and hot reload
- Simple static file deployment for production
- ES6 modules work natively in modern browsers

### 6. Testing: Playwright + Vitest
**Decision**: Playwright for E2E tests, Vitest for unit tests
**Rationale**:
- Playwright excellent for PWA testing including offline scenarios
- Vitest compatible with Vite, fast unit test execution
- Both tools have excellent documentation and learning resources
- Can test across multiple browsers and devices

**Alternatives Considered**:
- Cypress: Good but Playwright better for PWA features
- Jest: Vitest is faster and better Vite integration
- Manual testing only: Inadequate for reliable PWA development

**Testing Strategy**:
- E2E tests for user journeys and PWA functionality
- Unit tests for data layer and utility functions
- Performance tests for speed requirements
- Visual regression tests for UI consistency

### 7. Deployment: GitHub Actions + GitHub Pages
**Decision**: GitHub Actions for CI/CD, deploy to GitHub Pages for Tailscale access
**Rationale**:
- Free GitHub Actions for building and testing
- GitHub Pages provides HTTPS for PWA requirements
- Easy integration with Tailscale network access
- Automatic deployment on code changes
- Simple static site hosting

**Alternatives Considered**:
- Netlify: Good but GitHub integration is simpler
- Vercel: Similar benefits to Netlify
- Self-hosted: More complex setup for personal use

**Deployment Strategy**:
- GitHub Actions build and test on every push
- Deploy to GitHub Pages branch for hosting
- Tailscale funnel for secure network access
- Environment variables for API keys

## Architecture Patterns

### 1. PWA App Shell Architecture
**Pattern**: App shell with dynamic content loading
**Components**:
- Static shell (navigation, layout) cached by service worker
- Dynamic content (notes) loaded from IndexedDB
- Offline-first with background sync when online

### 2. Event-Driven Architecture
**Pattern**: Custom event system for loose coupling
**Events**: NOTE_CREATED, NOTE_UPDATED, AI_TAGS_APPLIED, NOTE_DELETED, FILTER_CHANGED
**Benefits**: Modular components, easy testing, clear data flow

### 3. Local-First Data Sync
**Pattern**: Local storage primary, cloud sync secondary
**Strategy**:
- All operations work offline immediately
- AI requests queued when offline
- Eventual consistency when online
- User always has access to their data

### 4. Performance Budget Monitoring
**Pattern**: Built-in performance measurement
**Metrics**:
- Save operation < 50ms
- Library render < 200ms (1k notes)
- Search execution < 120ms (1k notes)
- Bundle size < 500KB gzipped

## Security & Privacy Considerations

### 1. API Key Management
- API keys stored in browser localStorage only
- No server-side storage of user credentials
- User controls all AI service interactions

### 2. Data Privacy
- All notes stored locally in user's browser
- AI requests sanitize sensitive patterns (emails, phones, VINs)
- Private mode bypasses AI entirely
- No telemetry or analytics

### 3. Tailscale Network Security
- App accessible only within user's Tailscale network
- HTTPS required for PWA features
- No public internet exposure

## Development Workflow

### 1. File Organization
```
src/js/           # All JavaScript modules
src/css/          # Stylesheet organization
tests/            # Test organization by type
docs/             # Comprehensive documentation
```

### 2. Code Style
- ES6+ features where supported
- Descriptive variable and function names
- Extensive inline documentation
- Consistent formatting and structure

### 3. Documentation Standards
- README with setup instructions
- Inline code comments explaining logic
- Architecture decision records
- User guides for setup and usage

## Performance Optimization

### 1. Bundle Optimization
- ES6 modules for tree shaking
- Minimal dependencies (Dexie.js, Workbox)
- Service worker for aggressive caching
- Lazy loading for non-critical features

### 2. Database Performance
- Efficient IndexedDB indexes for search
- Pagination for large note collections
- Background processing for AI requests
- Memory management for note content

### 3. UI Performance
- Virtual scrolling for large lists (if needed)
- Debounced search input
- Optimistic UI updates
- Smooth animations and transitions

## Conclusion

Technology stack chosen prioritizes:
- **Learning**: Vanilla technologies with clear documentation
- **Simplicity**: Minimal dependencies and configuration
- **Performance**: Local-first architecture with performance budgets
- **Privacy**: User-controlled data and AI interactions
- **Maintainability**: Clean code organization and extensive documentation

All decisions align with the goal of creating a functional, learnable, and maintainable personal note-taking system suitable for deployment on a Tailscale network.

**Status**: Research complete, ready for Phase 1 design artifacts
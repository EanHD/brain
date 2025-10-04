# Development Guide

This guide covers Brain PWA development, code organization, debugging techniques, and contribution guidelines.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Code Organization](#code-organization)
3. [Development Workflow](#development-workflow)
4. [Testing](#testing)
5. [Debugging](#debugging)
6. [Performance Optimization](#performance-optimization)
7. [Contributing](#contributing)

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git 2.30+
- Modern browser with DevTools
- Code editor (VS Code recommended)
- OpenAI API key (for AI features)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/EanHD/brain.git
cd brain

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and configure
nano .env  # or your preferred editor

# Start development server
npm run dev
```

### Development Server

The dev server runs on `http://localhost:5173` with:
- Hot module replacement (HMR)
- Source maps for debugging
- Live error reporting
- Service worker in development mode

### Environment Configuration

Edit `.env` file:

```bash
# OpenAI API Configuration
VITE_OPENAI_API_KEY=sk-your-key-here

# Development Settings
VITE_DEV_MODE=true
VITE_PERFORMANCE_LOGGING=true
VITE_DEBUG_EVENTS=true

# Test Settings
VITE_TEST_MODE=false
```

## Code Organization

### Directory Structure

```
brain/
├── index.html              # PWA entry point, main HTML structure
├── manifest.json           # PWA manifest configuration
├── sw.js                   # Service worker (Workbox-based)
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite build configuration
├── playwright.config.js   # E2E test configuration
├── vitest.config.js       # Unit test configuration
│
├── src/
│   ├── js/                # JavaScript modules
│   │   ├── app.js             # Application controller (entry point)
│   │   ├── db.js              # Database operations (Dexie.js)
│   │   ├── ai.js              # AI service integration
│   │   ├── state.js           # State management
│   │   │
│   │   ├── views/             # View controllers
│   │   │   ├── today.js           # Today view (note creation)
│   │   │   ├── library.js         # Library view (search/browse)
│   │   │   ├── toc.js             # TOC view (tags)
│   │   │   ├── detail.js          # Detail view (view/edit note)
│   │   │   └── review.js          # Review view (spaced repetition)
│   │   │
│   │   └── utils/             # Utility modules
│   │       ├── ulid.js            # ULID generation
│   │       ├── events.js          # Event system
│   │       └── performance.js     # Performance monitoring
│   │
│   ├── css/               # Stylesheets
│   │   ├── main.css           # Core styles and variables
│   │   ├── components.css     # UI component styles
│   │   └── responsive.css     # Mobile-first responsive design
│   │
│   └── assets/            # Static assets
│       ├── icons/             # PWA icons (various sizes)
│       └── fonts/             # Web fonts (if needed)
│
├── tests/
│   ├── e2e/               # End-to-end tests (Playwright)
│   │   ├── note-creation.test.js
│   │   ├── search-filter.test.js
│   │   ├── offline-mode.test.js
│   │   ├── review-system.test.js
│   │   └── performance-budgets.test.js
│   │
│   └── unit/              # Unit tests (Vitest)
│       ├── db.test.js
│       ├── ai.test.js
│       ├── events.test.js
│       ├── performance.test.js
│       └── utils.test.js
│
├── docs/                  # Documentation
│   ├── README.md              # User documentation
│   ├── DEVELOPMENT.md         # This file
│   ├── DEPLOYMENT.md          # Deployment guide
│   └── API.md                 # Code API documentation
│
├── .github/
│   └── workflows/         # CI/CD pipelines
│       ├── test.yml           # Run tests on PR
│       ├── build.yml          # Build PWA
│       └── deploy.yml         # Deploy to GitHub Pages
│
└── dist/                  # Build output (gitignored)
```

### Module Architecture

#### Application Controller (`app.js`)
- Initializes all subsystems
- Coordinates service communication
- Manages application lifecycle
- Handles global errors
- Monitors performance

#### Database Layer (`db.js`)
- Dexie.js wrapper for IndexedDB
- CRUD operations for notes
- Tag indexing and search
- Settings management
- Sync queue for offline operations

#### State Management (`state.js`)
- Centralized application state
- View routing and navigation
- State persistence
- Observable state changes
- History management

#### View Controllers
Each view is a self-contained module:
- Initializes view-specific DOM
- Handles view-specific events
- Manages view-specific state
- Renders data
- Cleans up on destroy

#### Utilities
- **ULID**: Lexicographically sortable unique IDs
- **Events**: Publish-subscribe event system
- **Performance**: Constitutional budget monitoring

### Code Style

#### JavaScript
- ES2022+ features
- Async/await for asynchronous operations
- Descriptive variable/function names
- JSDoc comments for all public APIs
- Constitutional performance budgets

#### CSS
- BEM-inspired naming convention
- CSS custom properties for theming
- Mobile-first responsive design
- Performance-optimized selectors

#### HTML
- Semantic HTML5 elements
- Accessibility attributes (ARIA)
- Progressive enhancement
- Valid, well-formed markup

## Development Workflow

### Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write Tests First** (TDD)
   ```bash
   # Create test file
   touch tests/unit/your-feature.test.js
   
   # Write failing tests
   npm run test:unit -- your-feature.test.js
   ```

3. **Implement Feature**
   - Follow existing code patterns
   - Add JSDoc comments
   - Keep functions small and focused
   - Check constitutional compliance

4. **Run Tests**
   ```bash
   npm run test          # All tests
   npm run test:unit     # Unit tests only
   npm run test:e2e      # E2E tests only
   ```

5. **Check Performance**
   ```bash
   npm run test:performance
   ```

6. **Lint and Format**
   ```bash
   npm run lint          # Check code quality
   npm run format        # Format code
   ```

7. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

8. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(search): add fuzzy search support

Implement fuzzy matching for search queries to improve
user experience when searching for notes.

Closes #123
```

## Testing

### Unit Tests (Vitest)

Located in `tests/unit/`:

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- db.test.js

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

#### Writing Unit Tests

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/js/db.js';

describe('Database Operations', () => {
  beforeEach(async () => {
    await db.clear();
  });

  it('should create a note', async () => {
    const note = await db.createNote({
      title: 'Test Note',
      body: 'Test content'
    });

    expect(note.id).toBeDefined();
    expect(note.title).toBe('Test Note');
  });
});
```

### E2E Tests (Playwright)

Located in `tests/e2e/`:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- note-creation.test.js

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

#### Writing E2E Tests

```javascript
import { test, expect } from '@playwright/test';

test('create and save note', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Navigate to Today view
  await page.click('[data-testid="today-view-button"]');
  
  // Type note content
  await page.fill('[data-testid="note-textarea"]', 'My test note');
  
  // Save note
  await page.click('[data-testid="save-button"]');
  
  // Verify success
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
});
```

### Performance Tests

```bash
# Run performance benchmarks
npm run test:performance

# Generate performance report
npm run performance:report
```

## Debugging

### Browser DevTools

#### Console Debugging

The app logs extensively in development mode:

```javascript
// Enable debug mode
localStorage.setItem('brain-dev-mode', 'true');
location.reload();

// Check logs
console.log('View changed:', viewName);
console.log('Performance:', metrics);
console.log('State:', currentState);
```

#### Application Tab

Check PWA features:
- Service Worker registration
- Cache Storage contents
- IndexedDB databases
- localStorage/sessionStorage

#### Network Tab

Monitor:
- API requests to OpenAI
- Resource loading times
- Service Worker caching
- Background sync

#### Performance Tab

Profile:
- JavaScript execution
- Rendering performance
- Memory usage
- Constitutional budget violations

### VS Code Debugging

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}",
      "sourceMaps": true
    }
  ]
}
```

### Common Issues

#### "IndexedDB not working"
- Check browser supports IndexedDB
- Check storage quota
- Check for private browsing mode
- Clear site data and retry

#### "Service Worker not updating"
- Hard refresh (Ctrl+Shift+R)
- Clear cache and hard reload
- Unregister service worker manually
- Check for service worker errors

#### "AI requests failing"
- Verify API key in .env
- Check OpenAI API status
- Check network connectivity
- Check browser console for errors

## Performance Optimization

### Constitutional Budgets

Brain enforces strict performance budgets:

```javascript
// Performance budgets (constitutional requirements)
const BUDGETS = {
  'note-save': 50,      // < 50ms to save note
  'library-render': 200, // < 200ms to render library (1000 notes)
  'search-execute': 120  // < 120ms to search
};
```

### Monitoring

```javascript
import { measureOperation } from './utils/performance.js';

// Measure operation
const result = await measureOperation('operation-name', async () => {
  // Your code here
  return data;
});

// Check violation
if (result.duration > BUDGET) {
  console.warn('Budget violation!', result);
}
```

### Optimization Techniques

#### Database Queries
- Use indexes for filtering
- Limit result sets
- Use pagination
- Cache frequently accessed data

#### Rendering
- Virtual scrolling for long lists
- Debounce search input
- Lazy load images
- Use CSS transforms for animations

#### Memory Management
- Clean up event listeners
- Clear unused caches
- Limit in-memory data
- Use weak references where appropriate

#### Bundle Size
- Tree shaking (automatic with Vite)
- Code splitting by route
- Lazy load non-critical modules
- Minimize dependencies

## Contributing

### Contribution Workflow

1. **Fork Repository**
2. **Create Feature Branch**
3. **Make Changes**
4. **Write/Update Tests**
5. **Update Documentation**
6. **Run All Tests**
7. **Submit Pull Request**

### Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] Performance budgets met
- [ ] Code linted (`npm run lint`)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Constitutional compliance verified
- [ ] Changes described in PR

### Code Review Process

1. Automated checks run (GitHub Actions)
2. Maintainer reviews code
3. Address feedback
4. Approval and merge

### Constitutional Compliance

All code must follow constitutional principles:

#### I. Simplicity First
- Vanilla JavaScript, no frameworks
- Clear, readable code
- Minimal dependencies
- Straightforward architecture

#### II. Documentation as Code
- JSDoc comments for all APIs
- Inline comments for complex logic
- README and guides up to date
- Code examples in documentation

#### III. Test-Driven Development
- Tests before implementation
- High test coverage
- E2E tests for user journeys
- Performance tests for budgets

#### IV. Performance Accountability
- All operations have budgets
- Violations are monitored
- Optimizations are measured
- Trade-offs are documented

#### V. Privacy by Design
- Local-first architecture
- User controls AI
- Data sanitization
- No tracking or analytics

## Additional Resources

### Learning Resources
- [MDN Web Docs](https://developer.mozilla.org/) - Web APIs
- [Dexie.js Guide](https://dexie.org/) - IndexedDB wrapper
- [Workbox Guide](https://developers.google.com/web/tools/workbox) - PWA toolkit
- [Playwright Docs](https://playwright.dev/) - E2E testing
- [Vitest Docs](https://vitest.dev/) - Unit testing

### Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - PWA auditing
- [VS Code](https://code.visualstudio.com/) - Code editor

### Community
- [GitHub Discussions](https://github.com/EanHD/brain/discussions)
- [GitHub Issues](https://github.com/EanHD/brain/issues)

## Getting Help

If you're stuck:
1. Check this documentation
2. Search existing GitHub Issues
3. Ask in GitHub Discussions
4. Create a new Issue with details

## Next Steps

- Read [API.md](API.md) for code documentation
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment guide
- Check [GitHub Projects](https://github.com/EanHD/brain/projects) for roadmap

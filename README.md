# Brain - Self-Organizing Notebook PWA

## Overview
Brain is a Progressive Web Application (PWA) for capturing and organizing notes with AI-powered tagging, multiple view modes, local-first storage, and spaced repetition review. Built with vanilla JavaScript for simplicity, learning, and maintainability.

## 🚀 Quick Deploy to GitHub Pages

**NEW**: Ready-to-deploy setup! Get your Brain PWA online in 5 minutes.

### ⚡ Ultra-Quick Deploy

```bash
# 1. Create GitHub Actions workflows
python3 create-workflows.py

# 2. Test build
npm install && npm run build

# 3. Push to GitHub
git add . && git commit -m "Deploy Brain PWA" && git push origin main

# 4. Enable GitHub Pages
# Go to: https://github.com/EanHD/brain/settings/pages
# Set Source to: GitHub Actions

# 5. Access your app!
# https://eanhd.github.io/brain/
```

**📖 Detailed Guide**: See [START_HERE.md](START_HERE.md) for complete instructions.

### 📱 Install on Your Devices

Once deployed, install as a PWA:
- **Mobile**: Open in browser → "Add to Home Screen"
- **Desktop**: Click install icon in address bar

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ 
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- OpenAI API key (optional, for AI features)

### Local Installation
```bash
# Clone the repository
git clone https://github.com/EanHD/brain.git
cd brain

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

### First-Time Setup
1. Open the app in your browser
2. Click the settings icon (⚙️) in the top right
3. Enter your OpenAI API key (optional)
4. Install the PWA when prompted

## Features
- **📝 Quick Note Capture**: Simple textarea input with auto-save
- **🤖 AI-Powered Tagging**: Automatic tag suggestions using OpenAI GPT-4o-mini
- **🔍 Smart Search**: Full-text search across notes and tags
- **📊 Table of Contents**: Browse notes by tag frequency
- **🧠 Spaced Repetition**: Review system based on forgetting curve
- **📱 PWA Support**: Install on phone/desktop, works offline
- **🔒 Privacy First**: Local-first storage, user-controlled AI
- **⚡ Performance**: <50ms save, <200ms render, <120ms search

## Architecture
Built following constitutional principles:
- **Simplicity**: Vanilla JavaScript, no frameworks
- **Documentation**: Extensive comments and guides
- **Performance**: Enforced budgets and monitoring
- **Privacy**: Local IndexedDB storage, optional AI
- **Learning**: Code designed for understanding and modification

## Technology Stack
- **Frontend**: Vanilla JavaScript ES2022 + HTML5 + CSS3
- **Storage**: IndexedDB (Dexie.js) + localStorage cache
- **PWA**: Workbox service worker for offline support
- **AI**: OpenAI GPT-4o-mini API integration
- **Testing**: Playwright (E2E) + Vitest (unit tests)
- **Build**: Vite for development and building
- **Deployment**: GitHub Actions → GitHub Pages → Tailscale network

## Project Structure
```
brain/
├── .spec/                          # Specification Kit
│   ├── 001-self-organizing-notebook/  # Feature specifications
│   └── contracts/                     # API contracts
│
├── src/                            # Application Source
│   ├── js/                            # JavaScript modules
│   │   ├── app.js                     # Application controller
│   │   ├── db.js                      # Database layer
│   │   ├── ai.js                      # AI service
│   │   ├── state.js                   # State management
│   │   └── views/                     # View controllers
│   └── css/                           # Stylesheets
│
├── tests/                          # Test Suites
│   ├── unit/                          # Unit tests
│   └── e2e/                           # End-to-end tests
│
├── docs/                           # Documentation
│   ├── README.md                      # User guide
│   ├── DEVELOPMENT.md                 # Developer guide
│   ├── DEPLOYMENT.md                  # Deployment guide
│   └── API.md                         # API documentation
│
├── index.html                      # PWA entry point
├── manifest.json                   # PWA manifest
├── sw.js                          # Service worker
├── package.json                    # Dependencies
├── vite.config.js                 # Build configuration
└── README.md                      # This file
```

## Development Status
🚧 **Currently in implementation phase**

Phase 3.1 Setup completed:
- ✅ Project structure created
- ✅ Dependencies configured
- ✅ Build tools setup (Vite, Playwright, Vitest)
- ✅ PWA manifest and HTML structure
- ✅ GitHub Actions workflows
- ✅ Environment configuration

Next: Phase 3.2 - TDD test implementation

## Constitutional Compliance
This project follows strict constitutional principles:
- **I. Simplicity First**: Vanilla JS, readable code
- **II. Documentation as Code**: Extensive comments and guides  
- **III. Test-Driven Development**: Tests before implementation
- **IV. Performance Accountability**: <50ms save, <200ms render, <120ms search
- **V. Privacy by Design**: Local-first, user-controlled AI

## License
MIT License - Built for personal use, learning, and sharing.

## Contributing
This is a personal project, but suggestions and discussions are welcome via GitHub Issues.

## Support
- 📖 Documentation: [docs/](docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/EanHD/brain/issues)
- 💡 Discussions: [GitHub Discussions](https://github.com/EanHD/brain/discussions)
# Brain Documentation

Welcome to the Brain PWA documentation! This guide will help you set up, use, and customize your self-organizing notebook.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Basic Usage](#basic-usage)
4. [Features](#features)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Topics](#advanced-topics)

## Getting Started

Brain is a Progressive Web Application designed for capturing and organizing notes with AI assistance. It works offline and can be installed on your phone or desktop.

### System Requirements

- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Node.js**: 18+ (for development only)
- **Storage**: ~50MB available disk space
- **Optional**: OpenAI API key for AI-powered tagging

### Quick Installation

1. **Visit the App**: Navigate to your Brain PWA URL
2. **Install PWA**: 
   - Desktop: Look for install icon in address bar
   - Mobile: Tap "Add to Home Screen" in browser menu
3. **Configure AI** (optional): Settings → Enter OpenAI API key
4. **Start Writing**: Create your first note!

## Installation

### For End Users

#### Desktop Installation
1. Open Brain in Chrome/Edge/Firefox
2. Click the install icon (⊕) in the address bar
3. Click "Install" in the confirmation dialog
4. Launch from your applications menu

#### Mobile Installation (iOS)
1. Open Brain in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

#### Mobile Installation (Android)
1. Open Brain in Chrome
2. Tap the three-dot menu
3. Tap "Install app" or "Add to Home Screen"
4. Tap "Install"

### For Developers

```bash
# Clone the repository
git clone https://github.com/EanHD/brain.git
cd brain

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env and add your OpenAI API key

# Start development server
npm run dev

# Open http://localhost:5173
```

## Basic Usage

### Creating a Note

1. Navigate to the **Today** view (home icon)
2. Type your note in the text area
3. Your note is saved automatically every few seconds
4. Press **Save Note** button to finalize

### Searching Notes

1. Go to the **Library** view (grid icon)
2. Use the search bar at the top
3. Filter by tags using the tag buttons
4. Click any note to view details

### Organizing with Tags

**Automatic Tags (AI)**:
- AI suggests tags based on note content
- Review and accept suggested tags
- Requires OpenAI API key configuration

**Manual Tags**:
- Click "Edit" on any note
- Click "Generate Tags" button
- Or manually add tags in the edit view

### Reviewing Notes

1. Go to the **Review** view (repeat icon)
2. See notes due for review
3. Rate each note (Easy/Medium/Hard)
4. Check "Flashback of the Day" for memories

### Table of Contents

1. Go to the **TOC** view (list icon)
2. Browse notes organized by tags
3. See tag frequency and last use
4. Click any tag to see related notes

## Features

### AI-Powered Tagging

Brain uses OpenAI's GPT-4o-mini to analyze your notes and suggest relevant tags.

**Setup**:
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Go to Settings → AI Configuration
3. Enter your API key
4. Toggle "Enable AI Features"

**Privacy Options**:
- **Private Mode**: Disables all AI processing
- **Data Sanitization**: Removes sensitive patterns before sending to AI
- **Local-First**: All data stays on your device except AI requests

### Offline Support

Brain works completely offline after initial installation:
- Create and edit notes offline
- Search and browse your library
- AI requests are queued and processed when online
- Data syncs automatically when connection restored

### Spaced Repetition

The review system helps you remember important notes:
- Notes become "due" for review after intervals
- Rate difficulty to adjust future review timing
- "Flashback of the Day" surfaces old notes
- "Weak Spots" identifies neglected topics

### Performance Guarantees

Brain is designed for speed with constitutional performance budgets:
- **Save**: < 50ms to save a note to storage
- **Render**: < 200ms to render library view (1000 notes)
- **Search**: < 120ms to perform full-text search
- Violations are logged and trigger optimizations

## Configuration

### Settings Overview

Access settings through the gear icon (⚙️):

#### AI Configuration
- **API Key**: Your OpenAI API key
- **Enable AI**: Toggle AI features on/off
- **Private Mode**: Completely disable AI processing

#### Review System
- **Enable Reviews**: Toggle review system
- **Review Intervals**: Days between review prompts (default: 7, 14, 30)

#### UI Preferences
- **Theme**: Light, Dark, or Auto (follows system)
- **Notes Per Page**: Pagination size (default: 20)

### Environment Variables (Development)

Create `.env` file:

```bash
# OpenAI API Configuration
VITE_OPENAI_API_KEY=sk-your-api-key-here

# Development Settings
VITE_DEV_MODE=true
VITE_PERFORMANCE_LOGGING=true
```

## Troubleshooting

### Common Issues

#### "AI Features Not Working"

**Solution**:
1. Check that AI is enabled in Settings
2. Verify OpenAI API key is correct
3. Check browser console for error messages
4. Ensure you have internet connection
5. Check OpenAI API usage limits

#### "Notes Not Saving"

**Solution**:
1. Check browser storage quota (Settings → Storage)
2. Try closing and reopening the app
3. Clear browser cache (except app data)
4. Check browser console for IndexedDB errors
5. Export notes as backup, reinstall app

#### "Search Not Finding Notes"

**Solution**:
1. Verify note contains search terms
2. Try broader search terms
3. Clear filters and try again
4. Rebuild search index (Settings → Advanced → Rebuild Index)

#### "PWA Won't Install"

**Solution**:
1. Ensure you're using HTTPS or localhost
2. Check browser supports PWAs
3. Verify manifest.json is accessible
4. Try different browser
5. Clear site data and try again

#### "Offline Mode Not Working"

**Solution**:
1. Check service worker is registered (DevTools → Application)
2. Reload page to activate service worker
3. Check browser supports service workers
4. Verify app was loaded online at least once
5. Check browser console for service worker errors

### Performance Issues

If the app feels slow:

1. **Check storage**: Settings → Storage Usage
   - Delete old notes you don't need
   - Export and archive old notes

2. **Check performance**: DevTools → Console
   - Look for performance violations
   - Check database operation times
   - Monitor memory usage

3. **Optimize database**: Settings → Advanced → Optimize Database
   - Rebuilds indexes
   - Cleans up fragmentation

4. **Reset app**: Settings → Advanced → Reset App
   - Backs up your notes first!
   - Clears all caches and rebuilds

### Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ⚠️ Limited* |
| Opera | 76+ | ✅ Full |

*Safari has limitations with service workers and IndexedDB

### Data Export/Import

#### Export Notes
1. Settings → Data Management → Export Notes
2. Choose format (JSON or Markdown)
3. Save file to your device

#### Import Notes
1. Settings → Data Management → Import Notes
2. Select exported file
3. Choose merge or replace strategy

### Clearing Data

**Warning**: This deletes all notes permanently!

1. Settings → Advanced → Clear All Data
2. Confirm action
3. App will reset to fresh state

## Advanced Topics

### Data Storage

Brain uses IndexedDB for primary storage:
- **Notes**: Full note content and metadata
- **TagIndex**: Tag-to-note mappings
- **Settings**: User preferences
- **SyncQueue**: Offline operation queue

LocalStorage is used for caching:
- Recent notes for Today view
- Search index for performance
- Tag frequency for TOC view
- UI state preservation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New note |
| `Ctrl/Cmd + S` | Save note |
| `Ctrl/Cmd + K` | Focus search |
| `Ctrl/Cmd + /` | Focus search |
| `Esc` | Close modals/cancel |

### Development Mode

Enable dev mode for additional features:

```javascript
// In browser console
localStorage.setItem('brain-dev-mode', 'true');
location.reload();
```

Features:
- Performance metrics overlay
- Database query logging
- AI request/response logging
- State change debugging
- Error stack traces

### Custom Themes

Brain supports custom CSS themes:

1. Settings → Appearance → Custom CSS
2. Add your CSS variables:

```css
:root {
  --primary-color: #your-color;
  --background-color: #your-bg;
  --text-color: #your-text;
}
```

### Backup Strategies

**Recommended backup schedule**:
- **Daily**: Automatic local backup (enabled by default)
- **Weekly**: Manual export to cloud storage
- **Monthly**: Full data export archive

**Backup locations**:
- Browser storage (automatic)
- Local filesystem (manual export)
- Cloud storage (manual upload)
- Git repository (for developers)

### Privacy & Security

**Data Storage**:
- All notes stored locally in browser
- No cloud sync (by design)
- Data never leaves device except AI requests

**AI Processing**:
- Only note content sent to OpenAI
- Sensitive data sanitized before sending
- Can be completely disabled
- API key stored encrypted in browser

**Network Traffic**:
- Only AI API requests
- No analytics or tracking
- No third-party scripts
- Service worker caches all assets

## Getting Help

- 📖 Read this documentation
- 🔍 Search [GitHub Issues](https://github.com/EanHD/brain/issues)
- 💬 Ask in [GitHub Discussions](https://github.com/EanHD/brain/discussions)
- 🐛 Report bugs via GitHub Issues
- 📧 Contact: your-email@example.com

## Next Steps

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for developer guide
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for hosting guide
- Read [API.md](API.md) for code documentation
- Check [GitHub Issues](https://github.com/EanHD/brain/issues) for known issues

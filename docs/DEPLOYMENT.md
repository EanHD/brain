# Deployment Guide

This guide covers deploying Brain PWA to various hosting platforms, with focus on GitHub Pages and Tailscale network configuration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Process](#build-process)
3. [GitHub Pages Deployment](#github-pages-deployment)
4. [Tailscale Network Setup](#tailscale-network-setup)
5. [Alternative Hosting](#alternative-hosting)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Environment Configuration](#environment-configuration)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required
- GitHub account
- Git installed locally
- Node.js 18+ and npm 9+
- Domain or subdomain (optional)

### Optional
- Tailscale account (for private network access)
- Custom domain
- SSL certificate (usually automatic with GitHub Pages)

## Build Process

### Development Build

```bash
# Install dependencies
npm install

# Build for development
npm run build:dev

# Output in dist/ directory
```

### Production Build

```bash
# Build optimized production bundle
npm run build

# Build with specific base path
npm run build -- --base=/brain/

# Output in dist/ directory
```

### Build Configuration

Edit `vite.config.js`:

```javascript
export default defineConfig({
  base: '/brain/', // GitHub Pages subdirectory
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for production
    minify: 'terser',
    target: 'es2022'
  }
});
```

### Build Output

```
dist/
├── index.html
├── manifest.json
├── sw.js
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other hashed assets]
└── icons/
    └── [PWA icons]
```

## GitHub Pages Deployment

### Manual Deployment

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Create gh-pages branch**
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   ```

3. **Copy build files**
   ```bash
   cp -r dist/* .
   git add .
   git commit -m "Deploy to GitHub Pages"
   ```

4. **Push to GitHub**
   ```bash
   git push origin gh-pages
   ```

5. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Select `gh-pages` branch
   - Save

### Automated Deployment

Use GitHub Actions (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Custom Domain

1. **Add CNAME file**
   ```bash
   echo "brain.yourdomain.com" > dist/CNAME
   ```

2. **Configure DNS**
   - Add CNAME record: `brain` → `yourusername.github.io`
   - Or A records to GitHub Pages IPs

3. **Enable HTTPS**
   - GitHub Pages automatically provisions SSL
   - Wait a few minutes for cert

### Environment Variables

Set secrets in GitHub repository:
- Settings → Secrets and variables → Actions
- Add `OPENAI_API_KEY` secret

## Tailscale Network Setup

### Why Tailscale?

- **Private Access**: Only your devices can access
- **No Public Exposure**: Not indexed by search engines
- **Simple Setup**: Zero-configuration VPN
- **Cross-Platform**: Works on all devices

### Tailscale Installation

#### On Server (hosting Brain)

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
sudo tailscale up

# Enable HTTPS
sudo tailscale cert brain.yourtailnet.ts.net
```

#### On Client Devices

1. Install Tailscale app from:
   - macOS: Mac App Store or brew
   - iOS: App Store
   - Android: Play Store
   - Windows: tailscale.com
   - Linux: Package manager

2. Sign in with your account

3. Access Brain: `https://brain.yourtailnet.ts.net`

### Hosting on Tailscale

#### Using Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name brain.yourtailnet.ts.net;

    ssl_certificate /var/lib/tailscale/certs/brain.yourtailnet.ts.net.crt;
    ssl_certificate_key /var/lib/tailscale/certs/brain.yourtailnet.ts.net.key;

    root /var/www/brain/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /sw.js {
        add_header Cache-Control "no-cache";
    }
}
```

#### Using Caddy

```caddy
brain.yourtailnet.ts.net {
    root * /var/www/brain/dist
    encode gzip
    file_server
    
    try_files {path} /index.html
    
    header /sw.js Cache-Control "no-cache"
}
```

#### Using Python SimpleHTTPServer

```bash
cd /var/www/brain/dist
python3 -m http.server 8080

# Or with HTTPS
python3 -m http.server 8080 \
  --bind brain.yourtailnet.ts.net \
  --certificate /var/lib/tailscale/certs/brain.yourtailnet.ts.net.crt \
  --key /var/lib/tailscale/certs/brain.yourtailnet.ts.net.key
```

### Deployment Script

`scripts/deploy-tailscale.sh`:

```bash
#!/bin/bash

# Build the app
npm run build

# Copy to server via Tailscale
rsync -avz --delete \
  dist/ \
  user@brain.yourtailnet.ts.net:/var/www/brain/dist/

# Restart web server (if needed)
ssh user@brain.yourtailnet.ts.net 'sudo systemctl restart nginx'

echo "✅ Deployed to Tailscale network"
```

Make executable:
```bash
chmod +x scripts/deploy-tailscale.sh
./scripts/deploy-tailscale.sh
```

## Alternative Hosting

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

`vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### Cloudflare Pages

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy

### Self-Hosting

#### With Docker

`Dockerfile`:

```dockerfile
FROM nginx:alpine

COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build image
docker build -t brain-pwa .

# Run container
docker run -d -p 80:80 brain-pwa
```

#### With Docker Compose

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  brain:
    build: .
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html
    restart: unless-stopped
```

## CI/CD Pipeline

### Complete GitHub Actions Workflow

`.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Lint
        run: npm run lint
        
      - name: Unit tests
        run: npm run test:unit
        
      - name: E2E tests
        run: npm run test:e2e
        
      - name: Performance tests
        run: npm run test:performance

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Environment Configuration

### Production Environment

`.env.production`:

```bash
VITE_API_BASE_URL=https://api.brain.app
VITE_ENVIRONMENT=production
VITE_DEBUG=false
VITE_ANALYTICS_ENABLED=false
```

### Staging Environment

`.env.staging`:

```bash
VITE_API_BASE_URL=https://staging-api.brain.app
VITE_ENVIRONMENT=staging
VITE_DEBUG=true
VITE_ANALYTICS_ENABLED=false
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_OPENAI_API_KEY` | OpenAI API key | No |
| `VITE_ENVIRONMENT` | Environment name | No |
| `VITE_DEBUG` | Enable debug mode | No |
| `VITE_ANALYTICS_ENABLED` | Enable analytics | No |

## Troubleshooting

### Build Failures

**Error: Out of memory**

Solution:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

**Error: Module not found**

Solution:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Issues

**404 on refresh**

Ensure your server returns `index.html` for all routes:

Nginx:
```nginx
try_files $uri $uri/ /index.html;
```

GitHub Pages:
- Uses automatic SPA handling

**Service Worker not updating**

- Increment version in `sw.js`
- Clear cache with `sw.skipWaiting()`
- Hard refresh: Ctrl+Shift+R

**CORS errors**

- Check API allows your domain
- Verify SSL certificates
- Check browser security settings

### Tailscale Issues

**Can't access Brain**

1. Check Tailscale is running
2. Verify device is connected
3. Check firewall allows traffic
4. Test with `tailscale ping brain`

**SSL certificate errors**

1. Regenerate certs: `tailscale cert --domain brain.yourtailnet.ts.net`
2. Restart web server
3. Clear browser cache

## Performance Optimization

### Build Optimizations

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['dexie'],
          'views': ['./src/js/views/library.js']
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
});
```

### CDN Integration

Use CDN for static assets:

```html
<link rel="preconnect" href="https://cdn.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">
```

### Caching Strategy

```nginx
# Static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Service worker
location = /sw.js {
    add_header Cache-Control "no-cache";
}
```

## Monitoring

### Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics (optional)

### Health Checks

```bash
# Check if app is accessible
curl -f https://brain.yourtailnet.ts.net || exit 1

# Check service worker
curl -f https://brain.yourtailnet.ts.net/sw.js || exit 1
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

## Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# backup-brain.sh

BACKUP_DIR="/backups/brain"
DATE=$(date +%Y%m%d)

# Backup dist directory
tar -czf "$BACKUP_DIR/brain-$DATE.tar.gz" /var/www/brain/dist

# Keep only last 7 days
find "$BACKUP_DIR" -name "brain-*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup-brain.sh
```

## Next Steps

- Read [README.md](README.md) for user guide
- Read [DEVELOPMENT.md](DEVELOPMENT.md) for development
- Check [GitHub Issues](https://github.com/EanHD/brain/issues) for known issues

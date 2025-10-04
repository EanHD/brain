#!/bin/bash
# Brain PWA - Automated Deployment Setup
# This script sets up everything needed for GitHub Pages deployment

set -e  # Exit on error

echo "🧠 Brain PWA - Deployment Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "${BLUE}Step 1: Creating GitHub Actions workflows...${NC}"
python3 create-workflows.py
echo ""

echo "${BLUE}Step 2: Generating PWA icons...${NC}"
python3 generate-icons.py
echo ""

echo "${BLUE}Step 3: Creating public directory...${NC}"
mkdir -p public
echo "${GREEN}✅ Public directory created${NC}"
echo ""

echo "${BLUE}Step 4: Verifying configuration...${NC}"

# Check if vite.config.js has the correct base path
if grep -q "base: process.env.NODE_ENV" vite.config.js; then
    echo "${GREEN}✅ Vite config has correct base path${NC}"
else
    echo "${YELLOW}⚠️  Warning: vite.config.js might need base path configuration${NC}"
fi

# Check if manifest.json exists
if [ -f "manifest.json" ]; then
    echo "${GREEN}✅ manifest.json exists${NC}"
else
    echo "${YELLOW}⚠️  Warning: manifest.json not found${NC}"
fi

echo ""
echo "${BLUE}Step 5: Installing dependencies...${NC}"
if ! npm install; then
    echo "${YELLOW}⚠️  Warning: npm install had issues. Please check manually.${NC}"
else
    echo "${GREEN}✅ Dependencies installed${NC}"
fi
echo ""

echo "${BLUE}Step 6: Testing build...${NC}"
if npm run build; then
    echo "${GREEN}✅ Build successful!${NC}"
    echo ""
    echo "Build output created in: ./dist"
    echo "You can preview it with: npm run preview"
else
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi
echo ""

echo "${GREEN}========================================${NC}"
echo "${GREEN}✨ Setup Complete!${NC}"
echo "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Generate icons (if not done already):"
echo "   ${BLUE}open icon-generator.html${NC}"
echo "   Click each icon to download and save to public/"
echo ""
echo "2. Enable GitHub Pages:"
echo "   Go to: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/settings/pages"
echo "   Set Source to: ${BLUE}GitHub Actions${NC}"
echo ""
echo "3. Commit and push:"
echo "   ${BLUE}git add .${NC}"
echo "   ${BLUE}git commit -m \"Setup GitHub Pages deployment\"${NC}"
echo "   ${BLUE}git push origin main${NC}"
echo ""
echo "4. Monitor deployment:"
echo "   Go to: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo ""
echo "5. Access your app:"
echo "   https://$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | cut -d'/' -f1).github.io/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | cut -d'/' -f2)/"
echo ""
echo "📖 For detailed instructions, see: ${BLUE}QUICKSTART.md${NC}"
echo ""

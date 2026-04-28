#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "Setting up QueryPal..."
echo ""

# ── Step 1: Install dependencies ─────────────────────────────────────────────

echo "Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ── Step 2: Set up .env.local ────────────────────────────────────────────────

echo ""
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo -e "${GREEN}✓ Created .env.local${NC}"
else
  echo ".env.local already exists — skipping."
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo -e "${YELLOW}ACTION REQUIRED: Fill in .env.local${NC}"
echo ""
echo "  1. Set APP_DATABASE_URL to your PostgreSQL connection string"
echo ""
echo "  2. Add your AI API key:"
echo "     For Gemini (free): https://aistudio.google.com/apikey"
echo "       → Set GOOGLE_API_KEY=your_key_here"
echo "     For Claude: https://console.anthropic.com"
echo "       → Set AI_PROVIDER=claude and ANTHROPIC_API_KEY=your_key_here"
echo ""
echo "Then run:"
echo ""
echo "  npm run dev"
echo ""
echo "Open http://localhost:3000 — the database is pre-configured, no setup needed."
echo ""

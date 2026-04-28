#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "Setting up QueryPal..."
echo ""

# ── Step 1: PostgreSQL ────────────────────────────────────────────────────────

DOCKER_PG_URL="postgresql://querypal:querypal@localhost:5433/querypal"
LOCAL_PG_URL="postgresql://localhost:5432/querypal"
PG_STARTED_BY_US=false

start_postgres_docker() {
  echo "Starting PostgreSQL via Docker..."
  docker compose up postgres -d --wait 2>/dev/null || docker compose up postgres -d
  # Give it a moment to be ready
  sleep 2
  echo -e "${GREEN}✓ PostgreSQL running on localhost:5433 (Docker)${NC}"
  PG_URL="$DOCKER_PG_URL"
  PG_STARTED_BY_US=true
}

# Check for Docker first (easiest path — no PostgreSQL install needed)
if docker info &>/dev/null 2>&1; then
  # Docker is running — use it for PostgreSQL
  start_postgres_docker
elif command -v docker &>/dev/null; then
  echo -e "${YELLOW}Docker is installed but not running.${NC}"
  echo "Please open Docker Desktop and wait for it to start, then re-run this script."
  echo ""
  echo "Alternatively, install PostgreSQL via Homebrew:"
  echo "  brew install postgresql@16"
  echo "  brew services start postgresql@16"
  echo "  createdb querypal"
  exit 1
elif command -v psql &>/dev/null; then
  # Local PostgreSQL (Homebrew or system)
  echo "Found local PostgreSQL."
  if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw querypal; then
    echo -e "${GREEN}✓ Database 'querypal' already exists${NC}"
  else
    echo "Creating 'querypal' database..."
    createdb querypal
    echo -e "${GREEN}✓ Database 'querypal' created${NC}"
  fi
  PG_URL="$LOCAL_PG_URL"
else
  echo -e "${RED}PostgreSQL not found.${NC}"
  echo ""
  echo "Pick one of the following options, then re-run this script:"
  echo ""
  echo "  Option A — Docker (recommended, no PostgreSQL install needed):"
  echo "    1. Install Docker Desktop: https://www.docker.com/products/docker-desktop"
  echo "    2. Open Docker Desktop and wait for it to start"
  echo "    3. Re-run: bash setup.sh"
  echo ""
  echo "  Option B — Homebrew:"
  echo "    brew install postgresql@16"
  echo "    brew services start postgresql@16"
  echo "    createdb querypal"
  echo "    Re-run: bash setup.sh"
  echo ""
  echo "  Option C — Cloud (no local install at all):"
  echo "    Create a free database at https://neon.tech"
  echo "    Copy the connection string, add it to .env.local as APP_DATABASE_URL"
  exit 1
fi

# ── Step 2: Install dependencies ─────────────────────────────────────────────

echo ""
echo "Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ── Step 3: Set up .env.local ────────────────────────────────────────────────

echo ""
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  # Patch in the correct APP_DATABASE_URL for this machine
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|APP_DATABASE_URL=.*|APP_DATABASE_URL=$PG_URL|" .env.local
  else
    sed -i "s|APP_DATABASE_URL=.*|APP_DATABASE_URL=$PG_URL|" .env.local
  fi
  echo -e "${GREEN}✓ Created .env.local${NC}"
  echo ""
  echo -e "${YELLOW}ACTION REQUIRED: Add your AI API key to .env.local${NC}"
  echo ""
  echo "  For Gemini (free): https://aistudio.google.com/apikey"
  echo "    → Set GOOGLE_API_KEY=your_key_here"
  echo ""
  echo "  For Claude: https://console.anthropic.com"
  echo "    → Set AI_PROVIDER=claude and ANTHROPIC_API_KEY=your_key_here"
  echo ""
else
  echo ".env.local already exists — skipping."
  echo "Make sure APP_DATABASE_URL is set to: $PG_URL"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
if [ "$PG_STARTED_BY_US" = true ]; then
  echo "PostgreSQL is running in Docker. To stop it later: docker compose stop postgres"
  echo ""
fi
echo "Next step: open .env.local, add your API key, then run:"
echo ""
echo "  npm run dev"
echo ""
echo "Open http://localhost:3000 — tables and demo data are created on first request."
echo ""

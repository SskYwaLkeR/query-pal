#!/bin/bash
set -e

echo "Setting up QueryPal..."

# 1. Install dependencies
echo "Installing dependencies..."
npm install

# 2. Set up env
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo ""
  echo "Created .env.local from .env.example."
  echo "Please add your ANTHROPIC_API_KEY to .env.local before starting the dev server."
  echo ""
fi

# 3. Seed the database
echo "Seeding demo database..."
npm run seed

echo ""
echo "Setup complete! Run 'npm run dev' to start."

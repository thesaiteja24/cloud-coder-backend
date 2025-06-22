#!/bin/bash

echo "🚀 Running project setup..."

# Step 1: Install dependencies
echo "📦 Installing NPM dependencies..."
npm install

# Step 2: Setup Husky
echo "🔧 Setting up Husky..."
npx husky install

# Step 3: Make pre-commit hook executable (if exists)
if [ -f .husky/pre-commit ]; then
  chmod +x .husky/pre-commit
  echo "✅ Husky pre-commit hook ready"
else
  echo "⚠️ No pre-commit hook found. Adding pre-commit hook with lint-staged..."
  echo "➡️ npx husky add .husky/pre-commit 'npx lint-staged'"
fi

# Step 4: Ensure it's executable
chmod +x .husky/pre-commit

# Step 5: Ensure .env file exists
if [ ! -f .env ]; then
  echo "⚠️ No .env file found. Creating a default one..."
  echo "PORT=8888" > .env
fi


echo "✅ Setup complete! You're ready to start developing."

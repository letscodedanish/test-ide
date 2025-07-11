#!/bin/bash

# Dependency Update Script
set -e

echo "🔄 Updating dependencies..."

# Update Browserslist database
echo "📊 Updating Browserslist database..."
npx update-browserslist-db@latest

# Check for outdated packages
echo "🔍 Checking for outdated packages..."
npm outdated || true

# Update dependencies (interactive)
echo "⬆️ Updating dependencies..."
npx npm-check-updates -i

# Install updated dependencies
echo "📦 Installing updated dependencies..."
npm install

# Run tests to ensure everything still works
echo "🧪 Running tests to verify updates..."
npm run test

# Run security audit
echo "🔒 Running security audit..."
npm audit --audit-level=moderate

echo "✅ Dependency update completed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Review the changes and test thoroughly"
echo "  2. Update any breaking changes in your code"
echo "  3. Commit the updated package.json and package-lock.json"
echo "  4. Deploy and monitor for any issues"
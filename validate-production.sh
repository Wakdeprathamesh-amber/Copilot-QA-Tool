#!/bin/bash

# Production Environment Validation Script
set -e

echo "🔍 Validating production environment setup..."

# Check required files
echo "📁 Checking required files..."
required_files=(
    "Dockerfile.frontend"
    "Dockerfile.backend" 
    "docker-compose.prod.yml"
    "nginx.conf"
    ".env.production"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check environment variables
echo "🔧 Checking environment variables..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copy from .env.production and fill in values"
    exit 1
fi

# Validate Docker files
echo "🐳 Validating Docker files..."
docker build -f Dockerfile.frontend -t test-frontend . --no-cache > /dev/null 2>&1 && echo "✅ Frontend Dockerfile valid" || echo "❌ Frontend Dockerfile has issues"
docker build -f Dockerfile.backend -t test-backend . --no-cache > /dev/null 2>&1 && echo "✅ Backend Dockerfile valid" || echo "❌ Backend Dockerfile has issues"

# Clean up test images
docker rmi test-frontend test-backend > /dev/null 2>&1 || true

# Validate docker-compose
echo "📋 Validating docker-compose..."
docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1 && echo "✅ docker-compose.prod.yml valid" || echo "❌ docker-compose.prod.yml has issues"

echo "🎉 Production environment validation complete!"
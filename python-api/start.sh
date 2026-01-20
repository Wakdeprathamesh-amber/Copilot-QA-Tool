#!/bin/bash

echo "🐍 Starting Python API Service for AI Eval Console"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "✅ Starting API server on http://localhost:5000"
echo ""
echo "📊 Test endpoints:"
echo "   Health: curl http://localhost:5000/health"
echo "   Conversations: curl http://localhost:5000/api/conversations?page=1"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Run the app
python app.py

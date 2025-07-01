#!/bin/bash

echo "🚀 Starting Cloud Security Assessment Tool"
echo "========================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Make cloudsec.sh executable
chmod +x cloudsec.sh

echo "🔧 Backend: Starting Express server on port 3001"
echo "🎨 Frontend: Starting React app on port 5173"
echo ""
echo "📖 Usage:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Follow the step-by-step workflow"
echo "  3. Make sure you're authenticated with gcloud/az CLI"
echo ""

# Start both server and frontend
npm run dev:full 
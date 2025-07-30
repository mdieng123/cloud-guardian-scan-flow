#!/bin/bash

echo "🚀 Starting Cloud Security Assessment Tool"
echo "========================================="

# Check if Python virtual environment exists
if [ ! -d "llama_env" ]; then
    echo "⚠️  Python environment not found. Running setup..."
    ./setup.sh --skip-system
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Make scripts executable
chmod +x cloudsec.sh setup.sh

echo "🔧 Backend: Starting Express server on port 3001"
echo "🎨 Frontend: Starting React app on port 5173"
echo ""
echo "📖 Usage:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Follow the step-by-step workflow"
echo "  3. Make sure you're authenticated with gcloud/az CLI"
echo "  4. Add your Gemini API key in the UI"
echo ""

# Start both server and frontend
npm run dev 
#!/bin/bash

# ThreadsDash Startup Script
echo "🚀 Starting ThreadsDash..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the development server
echo "✨ Starting development server..."
echo "📱 Dashboard will be available at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

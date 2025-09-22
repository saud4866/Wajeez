#!/bin/bash

# تؤريا Audio Transcription Setup Script

echo "========================================="
echo "   تؤريا Audio Transcription Setup"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

echo "✅ Node.js is installed: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm is installed: $(npm -v)"

# Create public directory if it doesn't exist
if [ ! -d "public" ]; then
    echo "📁 Creating public directory..."
    mkdir public
    
    # Move index.html to public if it exists in root
    if [ -f "index.html" ]; then
        echo "📦 Moving index.html to public directory..."
        mv index.html public/
    fi
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir uploads
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env file created from .env.example"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env and add your Gemini API key"
        echo ""
        echo "To get a Gemini API key:"
        echo "1. Visit: https://makersuite.google.com/app/apikey"
        echo "2. Sign in with your Google account"
        echo "3. Click 'Get API Key'"
        echo "4. Copy the key and paste it in .env"
    else
        # Create .env with template
        cat > .env << EOL
# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3000
EOL
        echo "✅ .env file created with template"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env and add your Gemini API key"
    fi
else
    echo "✅ .env file already exists"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo ""
    echo "📝 Creating .gitignore file..."
    cat > .gitignore << EOL
node_modules/
.env
uploads/
*.log
.DS_Store
EOL
    echo "✅ .gitignore file created"
fi

echo ""
echo "========================================="
echo "   Setup Complete! 🎉"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your Gemini API key"
echo "2. Run: npm start"
echo "3. Open: http://localhost:3000"
echo ""
echo "For development mode with auto-restart:"
echo "Run: npm run dev"
echo ""
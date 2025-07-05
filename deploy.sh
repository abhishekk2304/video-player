#!/bin/bash

# 🚀 Watch Together App Deployment Script
# This script helps you deploy the app to Railway

echo "🚀 Watch Together App Deployment Script"
echo "========================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    echo "   git push -u origin main"
    exit 1
fi

# Check if changes are committed
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Please commit them first:"
    echo "   git add ."
    echo "   git commit -m 'Prepare for deployment'"
    echo "   git push"
    exit 1
fi

echo "✅ Repository is ready for deployment"
echo ""
echo "📋 Next Steps:"
echo "1. Go to https://railway.app and sign in with GitHub"
echo "2. Click 'New Project' → 'Deploy from GitHub repo'"
echo "3. Select this repository"
echo "4. Choose 'backend' folder for the first deployment"
echo "5. Add environment variables:"
echo "   - NODE_ENV: production"
echo "   - FRONTEND_URL: (we'll set this after frontend deployment)"
echo ""
echo "6. After backend deploys, create another project for frontend"
echo "7. Choose 'frontend' folder"
echo "8. Add environment variable:"
echo "   - VITE_BACKEND_URL: (your backend URL from step 5)"
echo ""
echo "9. Update the backend FRONTEND_URL with your frontend URL"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "🎉 Your app will be live and accessible from anywhere!" 
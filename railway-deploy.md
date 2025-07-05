# 🚀 Railway Deployment - Quick Guide

## ✅ Prerequisites

- ✅ Railway account created
- ✅ Code pushed to GitHub: `abhishekk2304/video-player`

## 🎯 Step-by-Step Deployment

### 1. Deploy Backend

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose repository: `abhishekk2304/video-player`
5. **IMPORTANT**: Select `backend` folder (not root)
6. Click **"Deploy"**

### 2. Configure Backend

1. Click on your backend service
2. Go to **"Variables"** tab
3. Add environment variables:
   ```
   NODE_ENV=production
   ```
4. Copy the **Domain URL** (e.g., `https://your-app.railway.app`)

### 3. Deploy Frontend

1. Go back to Railway dashboard
2. Click **"New Service"** → **"Deploy from GitHub repo"**
3. Choose same repository: `abhishekk2304/video-player`
4. Select `frontend` folder
5. Click **"Deploy"**

### 4. Configure Frontend

1. Click on your frontend service
2. Go to **"Variables"** tab
3. Add environment variable:
   ```
   VITE_BACKEND_URL=https://your-backend-url.railway.app
   ```
   (Replace with your actual backend URL from step 2)

## 🎉 Done!

- **Frontend URL**: Your frontend Railway URL
- **Backend URL**: Your backend Railway URL
- **Test**: Open frontend URL on different devices!

## 🔧 Troubleshooting

- If deployment fails, check the logs in Railway dashboard
- Make sure you selected the correct folders (backend/frontend)
- Verify environment variables are set correctly

# 🚀 Deployment Guide - Watch Together App

This guide will help you deploy the Watch Together app to free hosting platforms for testing across multiple systems.

## 📋 Prerequisites

- GitHub account
- Railway account (free) or Render account (free)

## 🎯 Deployment Options

### Option 1: Railway (Recommended - Free Tier)

- **Backend**: Node.js service
- **Frontend**: Static site
- **Database**: Not needed (in-memory sessions)

### Option 2: Render (Alternative - Free Tier)

- **Backend**: Web service
- **Frontend**: Static site

## 🚀 Railway Deployment (Recommended)

### Step 1: Prepare Your Repository

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

### Step 2: Deploy Backend

1. **Go to [Railway.app](https://railway.app)** and sign in with GitHub
2. **Click "New Project"** → "Deploy from GitHub repo"
3. **Select your repository** and choose the `backend` folder
4. **Add Environment Variables**:

   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: `https://your-frontend-url.railway.app` (we'll get this after frontend deployment)

5. **Deploy** and wait for it to complete
6. **Copy the backend URL** (e.g., `https://your-backend.railway.app`)

### Step 3: Deploy Frontend

1. **Create another Railway project** for the frontend
2. **Select the same repository** but choose the `frontend` folder
3. **Add Environment Variables**:

   - `VITE_BACKEND_URL`: `https://your-backend.railway.app` (from step 2)

4. **Deploy** and wait for it to complete
5. **Copy the frontend URL** (e.g., `https://your-frontend.railway.app`)

### Step 4: Update Backend CORS

1. **Go back to your backend project** in Railway
2. **Update the `FRONTEND_URL`** environment variable with your frontend URL
3. **Redeploy** the backend

## 🌐 Render Deployment (Alternative)

### Step 1: Deploy Backend

1. **Go to [Render.com](https://render.com)** and sign in
2. **Click "New"** → "Web Service"
3. **Connect your GitHub repository**
4. **Configure the service**:

   - **Name**: `watch-together-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

5. **Add Environment Variables**:

   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: `https://your-frontend.onrender.com`

6. **Deploy** and copy the URL

### Step 2: Deploy Frontend

1. **Click "New"** → "Static Site"
2. **Configure the service**:

   - **Name**: `watch-together-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. **Add Environment Variables**:

   - `VITE_BACKEND_URL`: `https://your-backend.onrender.com`

4. **Deploy** and copy the URL

### Step 3: Update Backend CORS

1. **Go back to your backend service**
2. **Update the `FRONTEND_URL`** environment variable
3. **Redeploy** the backend

## 🧪 Testing Your Deployment

### 1. Test Basic Functionality

- Open your frontend URL in a browser
- Create a new session
- Verify the connection status shows "🟢 Connected"

### 2. Test Cross-Device Sync

- Open the app on **two different devices** (phone + computer, or two computers)
- Create a session on one device
- Join the session on the other device using the session ID
- Load a YouTube video and test sync functionality

### 3. Test Video Sync

- Share a YouTube URL between devices
- Play/pause/seek the video
- Verify both devices stay synchronized

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors**:

   - Ensure `FRONTEND_URL` is set correctly in backend
   - Check that the URL includes `https://` protocol

2. **Connection Issues**:

   - Verify backend URL is accessible
   - Check environment variables are set correctly

3. **Video Not Loading**:

   - Ensure YouTube URLs are valid
   - Check browser console for errors

4. **Sync Not Working**:
   - Check browser console for sync logs
   - Verify both devices are in the same session

### Debug Commands:

```bash
# Check backend logs
railway logs

# Check frontend build
railway logs --service frontend

# Restart services
railway service restart
```

## 📱 Mobile Testing

### iOS Safari:

- Works well with most features
- Some YouTube API limitations may apply

### Android Chrome:

- Full functionality supported
- Best mobile experience

## 🔒 Security Notes

- Sessions are stored in memory (not persistent)
- No user authentication (public sessions)
- YouTube API usage follows YouTube's terms of service

## 📈 Scaling Considerations

For production use, consider:

- **Database**: Add Redis/MongoDB for session persistence
- **Authentication**: Add user accounts
- **Rate Limiting**: Implement API rate limits
- **CDN**: Use Cloudflare for static assets

## 🎉 Success!

Once deployed, you can:

- Share the frontend URL with friends
- Test cross-device synchronization
- Use the app from anywhere in the world
- Monitor usage through Railway/Render dashboards

---

**Need Help?** Check the troubleshooting section or create an issue in your GitHub repository.

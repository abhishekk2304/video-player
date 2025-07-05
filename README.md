# 🎬 Watch Together - Real-time YouTube Video Sync

A real-time "Watch Together" web application that allows two users to watch YouTube videos in perfect synchronization using WebRTC peer-to-peer connections.

## ✨ Features

### 🎯 Core Features

- **Real-time Video Synchronization** - Play, pause, and seek in perfect sync
- **WebRTC P2P Connection** - Direct peer-to-peer communication for low latency
- **Live Chat** - Real-time messaging between session participants
- **Session Management** - Create and join sessions with unique session IDs
- **YouTube IFrame API Integration** - Full YouTube player functionality

### 🚀 Enhanced Features

- **URL Session Links** - Share session links directly via URL parameters
- **Video URL Sharing** - Share YouTube videos with session partners
- **Manual Sync Button** - Force synchronization when needed
- **Connection Status Indicator** - Real-time connection state feedback
- **Debug Panel** - Detailed connection and video state information
- **Fullscreen Support** - Enhanced viewing experience
- **Quick Start Videos** - Pre-loaded popular videos for testing
- **Session Info Display** - Current session details and participant count
- **Leave Session** - Clean session exit with proper cleanup
- **Clear Chat** - Reset chat history
- **Reset Video** - Jump to video beginning
- **Loading States** - Visual feedback during operations

## 🛠️ Tech Stack

### Backend

- **Node.js** with **Express.js**
- **Socket.io** for WebSocket signaling
- **Session management** with in-memory storage

### Frontend

- **React** with **Vite** for fast development
- **TailwindCSS** for responsive styling
- **YouTube IFrame API** for video playback
- **WebRTC** for peer-to-peer communication

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd yt-webrtc
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the backend server**

   ```bash
   cd ../backend
   npm run dev
   ```

   Backend will run on `http://localhost:3001`

5. **Start the frontend development server**
   ```bash
   cd ../frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

## 📖 How to Use

### Creating a Session

1. Open the app in your browser
2. Click **"Create New Session"**
3. Copy the generated session link
4. Share the link with a friend

### Joining a Session

1. Click **"Join Session"** or use a shared session link
2. Enter the session ID
3. Wait for the peer connection to establish

### Watching Together

1. **Enter a YouTube URL** in the video input field
2. **Click "Share Video"** to send it to your partner
3. **Use the sync controls**:
   - 🔄 **Manual Sync** - Force synchronization
   - ⏮️ **Reset Video** - Jump to beginning
   - ⛶ **Fullscreen** - Enhanced viewing
4. **Chat in real-time** using the chat panel

### Advanced Features

- **Debug Panel** - Click "Show Debug" for detailed connection info
- **Quick Start Videos** - Use pre-loaded popular videos for testing
- **Session Management** - Leave sessions cleanly with the "Leave Session" button

## 🔧 Configuration

### Backend Configuration

Edit `backend/server.js` to modify:

- Port number (default: 3001)
- CORS settings
- Session timeout duration

### Frontend Configuration

Edit `frontend/src/App.jsx` to modify:

- Backend WebSocket URL
- Sync interval timing
- UI customization

## 🚀 Deployment

Want to test with friends across different devices? Deploy it for free!

### Quick Deployment (Recommended)

**Option 1: Railway (Free)**

```bash
./deploy.sh
```

**Option 2: Manual Deployment**
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Deployment Options

- **Railway**: Free tier with automatic deployments
- **Render**: Free tier with static site hosting
- **Vercel**: Free tier for frontend hosting
- **Heroku**: Free tier (limited hours)

### Environment Variables

**Backend:**

- `NODE_ENV`: `production`
- `FRONTEND_URL`: Your frontend URL
- `PORT`: Auto-assigned by hosting platform

**Frontend:**

- `VITE_BACKEND_URL`: Your backend URL

## 🌍 Cross-Device Testing

Once deployed, you can:

- Test on multiple devices simultaneously
- Share the app URL with friends worldwide
- Use on mobile, tablet, and desktop
- Monitor real-time usage and performance

## 🔍 Troubleshooting

### Common Issues

1. **"Session not found"**

   - Ensure the session ID is correct
   - Check if the session creator is still online
   - Try creating a new session

2. **WebRTC connection fails**

   - Check browser WebRTC support
   - Ensure both users are online
   - Try refreshing the page

3. **Video sync issues**

   - Use the "Manual Sync" button
   - Check internet connection
   - Ensure both users have the same video URL

4. **Chat not working**
   - Verify WebRTC connection is established
   - Check browser console for errors
   - Try refreshing the page

### Debug Information

Use the "Show Debug" button to view:

- Session ID and connection status
- WebRTC availability and state
- Video player state
- Socket connection status

## 📱 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ❌ Internet Explorer (not supported)

## 🔒 Security Notes

- WebRTC connections are peer-to-peer and encrypted
- Session IDs are randomly generated
- No video content is stored on the server
- All communication is real-time only

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- YouTube IFrame API for video playback
- WebRTC for peer-to-peer communication
- Socket.io for WebSocket signaling
- React and Vite for the frontend framework
- TailwindCSS for styling

---

**Happy watching together! 🎬✨**

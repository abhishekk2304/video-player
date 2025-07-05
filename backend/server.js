const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active sessions
const sessions = new Map();

// Session cleanup interval (clean up sessions older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.createdAt && (now - session.createdAt) > 3600000) { // 1 hour
      console.log(`🧹 Cleaning up old session: ${sessionId}`);
      sessions.delete(sessionId);
    }
  }
}, 300000); // Check every 5 minutes

// Generate unique session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Add error handling for socket events
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Create a new session
  socket.on('create-session', (callback) => {
    const sessionId = generateSessionId();
    sessions.set(sessionId, {
      host: socket.id,
      guest: null,
      videoUrl: null,
      videoState: {
        currentTime: 0,
        isPlaying: false,
        videoId: null
      },
      createdAt: Date.now()
    });
    
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.isHost = true;
    
    console.log(`Session created: ${sessionId} by ${socket.id}`);
    if (typeof callback === 'function') callback({ sessionId, isHost: true });
    socket.emit('session-created', { sessionId, isHost: true });
  });

  // Join an existing session
  socket.on('join-session', (data, callback) => {
    const sessionId = typeof data === 'string' ? data : data.sessionId;
    console.log(`🔍 Attempting to join session: "${sessionId}"`);
    console.log(`📋 Available sessions:`, Array.from(sessions.keys()));
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      console.log(`❌ Session "${sessionId}" not found`);
      if (typeof callback === 'function') callback({ error: 'Session not found' });
      socket.emit('session-error', { error: 'Session not found' });
      return;
    }
    
    if (session.guest) {
      console.log(`❌ Session "${sessionId}" is full`);
      if (typeof callback === 'function') callback({ error: 'Session is full' });
      socket.emit('session-error', { error: 'Session is full' });
      return;
    }
    
    session.guest = socket.id;
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.isHost = false;
    
    console.log(`✅ User ${socket.id} joined session ${sessionId}`);
    if (typeof callback === 'function') callback({ 
      sessionId, 
      isHost: false, 
      videoUrl: session.videoUrl,
      videoState: session.videoState
    });
    socket.emit('session-joined', { 
      sessionId, 
      isHost: false, 
      videoUrl: session.videoUrl,
      videoState: session.videoState
    });
    io.to(session.host).emit('guest-joined');
  });

  // Handle WebRTC signaling
  socket.on('webrtc-offer', (offer) => {
    const session = sessions.get(socket.sessionId);
    if (session) {
      const targetId = socket.isHost ? session.guest : session.host;
      if (targetId) {
        io.to(targetId).emit('webrtc-offer', offer, socket.id);
      }
    }
  });

  socket.on('webrtc-answer', (answer) => {
    const session = sessions.get(socket.sessionId);
    if (session) {
      const targetId = socket.isHost ? session.host : session.guest;
      if (targetId) {
        io.to(targetId).emit('webrtc-answer', answer, socket.id);
      }
    }
  });

  socket.on('ice-candidate', (candidate) => {
    const session = sessions.get(socket.sessionId);
    if (session) {
      const targetId = socket.isHost ? session.guest : session.host;
      if (targetId) {
        io.to(targetId).emit('ice-candidate', candidate, socket.id);
      }
    }
  });

  // Video state synchronization
  socket.on('video-state-update', (data) => {
    const session = sessions.get(socket.sessionId);
    if (session) {
      // Handle both direct state and data with sessionId
      const state = data.state || data;
      console.log(`📺 Video state update from ${socket.id}:`, state);
      session.videoState = state;
      const targetId = socket.isHost ? session.guest : session.host;
      if (targetId) {
        console.log(`🔄 Forwarding video state to ${targetId}:`, state);
        io.to(targetId).emit('video-state-update', state);
      } else {
        console.log(`⚠️ No target found for video state update in session ${socket.sessionId}`);
      }
    } else {
      console.log(`❌ Session not found for video state update from ${socket.id}`);
    }
  });

  // Video URL update
  socket.on('video-url-update', (videoUrl) => {
    const session = sessions.get(socket.sessionId);
    if (session && socket.isHost) {
      session.videoUrl = videoUrl;
      if (session.guest) {
        io.to(session.guest).emit('video-url-update', videoUrl);
      }
    }
  });

  // Share video
  socket.on('share-video', (data) => {
    const session = sessions.get(socket.sessionId);
    if (session) {
      session.videoUrl = data.videoUrl;
      session.videoState.videoId = data.videoId;
      const targetId = socket.isHost ? session.guest : session.host;
      if (targetId) {
        io.to(targetId).emit('video-url-update', data.videoUrl);
        io.to(targetId).emit('video-state-update', session.videoState);
      }
      console.log(`📺 Video shared in session ${socket.sessionId}: ${data.videoId}`);
    }
  });

  // Send chat message
  socket.on('send-message', (data) => {
    const session = sessions.get(socket.sessionId);
    if (session) {
      const targetId = socket.isHost ? session.guest : session.host;
      if (targetId) {
        io.to(targetId).emit('chat-message', {
          message: data.message,
          sender: 'peer'
        });
      }
      console.log(`💬 Chat message in session ${socket.sessionId}: ${data.message}`);
    }
  });

  // Sync video
  socket.on('sync-video', (data) => {
    const session = sessions.get(socket.sessionId);
    if (session) {
      session.videoState = data.state;
      const targetId = socket.isHost ? session.guest : session.host;
      if (targetId) {
        io.to(targetId).emit('video-state-update', data.state);
      }
      console.log(`🔄 Video synced in session ${socket.sessionId}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.sessionId) {
      const session = sessions.get(socket.sessionId);
      if (session) {
        console.log(`🔍 User ${socket.id} disconnecting from session ${socket.sessionId}`);
        if (socket.isHost) {
          // Host disconnected, notify guest and close session
          console.log(`👤 Host disconnected from session ${socket.sessionId}`);
          if (session.guest) {
            io.to(session.guest).emit('host-disconnected');
          }
          sessions.delete(socket.sessionId);
          console.log(`🗑️ Session ${socket.sessionId} deleted`);
        } else {
          // Guest disconnected
          console.log(`👤 Guest disconnected from session ${socket.sessionId}`);
          session.guest = null;
          if (session.host) {
            io.to(session.host).emit('guest-disconnected');
          }
        }
      }
    }
  });

  // Handle session leave
  socket.on('leave-session', ({ sessionId }) => {
    console.log(`👋 User ${socket.id} leaving session ${sessionId}`);
    
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      
      // Check if this user is the host or guest
      if (session.host === socket.id) {
        // Host is leaving, notify guest and close session
        console.log(`👤 Host leaving session ${sessionId}`);
        if (session.guest) {
          io.to(session.guest).emit('host-disconnected');
        }
        sessions.delete(sessionId);
        console.log(`🗑️ Session ${sessionId} deleted`);
      } else if (session.guest === socket.id) {
        // Guest is leaving
        console.log(`👤 Guest leaving session ${sessionId}`);
        session.guest = null;
        if (session.host) {
          io.to(session.host).emit('guest-disconnected');
        }
      }
    }
    
    // Clear session info from socket
    socket.sessionId = null;
    socket.isHost = false;
    
    // Leave the socket room
    socket.leave(sessionId);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', sessions: sessions.size });
});

// Debug endpoint to list all sessions
app.get('/debug/sessions', (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id, session]) => ({
    id,
    host: session.host,
    guest: session.guest,
    videoUrl: session.videoUrl,
    videoState: session.videoState,
    createdAt: session.createdAt
  }));
  console.log(`📋 Debug: ${sessions.size} active sessions:`, sessionList);
  res.json({ 
    sessionCount: sessions.size,
    sessions: sessionList,
    sessionIds: Array.from(sessions.keys())
  });
});

// Test endpoint to create a session
app.post('/debug/create-session', (req, res) => {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    host: 'test-host',
    guest: null,
    videoUrl: null,
    videoState: {
      currentTime: 0,
      isPlaying: false,
      videoId: null
    },
    createdAt: Date.now()
  });
  console.log(`🧪 Test session created: ${sessionId}`);
  res.json({ sessionId, message: 'Test session created' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 
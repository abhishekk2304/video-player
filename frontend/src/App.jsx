import React, { useState, useRef, useEffect } from 'react'
import './App.css'
import { io } from 'socket.io-client'
import YouTubePlayer from './components/YouTubePlayer'

function extractVideoId(url) {
  console.log('🔍 Extracting video ID from URL:', url);
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[1].length === 11) ? match[1] : null;
  console.log('🔍 Extracted video ID:', videoId);
  return videoId;
}

function App() {
  console.log('🎬 App component rendering...');
  
  // Basic state
  const [sessionId, setSessionId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [connectionState, setConnectionState] = useState('disconnected');
  const [videoState, setVideoState] = useState({
    currentTime: 0,
    isPlaying: false,
    videoId: null
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLeavingSession, setIsLeavingSession] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  
  const playerRef = useRef();
  const syncIntervalRef = useRef();
  const lastSyncTimeRef = useRef(0);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      <span className="ml-2">Loading...</span>
    </div>
  );

  // Initialize socket connection
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    console.log('🔌 Connecting to backend:', backendUrl);
    console.log('🌍 Environment:', import.meta.env.MODE);
    
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to backend');
      setConnectionState('connected');
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from backend');
      setConnectionState('disconnected');
      setError('Disconnected from server. Trying to reconnect...');
      
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        if (newSocket.disconnected) {
          console.log('🔄 Attempting to reconnect...');
          newSocket.connect();
        }
      }, 3000);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setError('Failed to connect to server. Please check if the backend is running.');
      setConnectionState('error');
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      setError('Connection error occurred');
      setConnectionState('error');
    });

    // Handle session events
    newSocket.on('session-created', (data) => {
      console.log('✅ Session created:', data);
      setSessionId(data.sessionId);
      setIsHost(true);
      setError(null);
    });

    newSocket.on('session-joined', (data) => {
      console.log('✅ Session joined:', data);
      setSessionId(data.sessionId);
      setIsHost(false);
      if (data.videoUrl) setVideoUrl(data.videoUrl);
      setError(null);
    });

    newSocket.on('session-error', (data) => {
      console.error('❌ Session error:', data);
      setError(data.error);
      setIsLoading(false);
      setIsLeavingSession(false);
    });

    // Handle chat messages
    newSocket.on('chat-message', (data) => {
      console.log('💬 Received chat message:', data);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: data.message,
        sender: data.sender,
        timestamp: new Date().toLocaleTimeString()
      }]);
    });

    // Handle video state updates
    newSocket.on('video-state-update', (data) => {
      console.log('📺 Video state update received:', data);
      setIsSyncing(true);
      // Handle both direct state and nested state objects
      const state = data.state || data;
      console.log('📺 Applying video state:', state);
      
      // Add sync message to chat
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: `🔄 Video synced to ${Math.floor(state.currentTime)}s (${state.isPlaying ? 'playing' : 'paused'})`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      // Apply the state immediately
      setVideoState(state);
      
      // Also apply directly to player if available
      if (playerRef.current && state.currentTime !== undefined) {
        // Add a longer delay to ensure player is ready
        setTimeout(() => {
          console.log('🎬 Directly applying to player - seeking to:', state.currentTime);
          try {
            playerRef.current.seekTo(state.currentTime, true);
            
            // Add another delay before play/pause to ensure seek is complete
            setTimeout(() => {
              if (state.isPlaying) {
                console.log('🎬 Directly applying to player - playing');
                playerRef.current.playVideo();
              } else {
                console.log('🎬 Directly applying to player - pausing');
                playerRef.current.pauseVideo();
              }
            }, 200);
          } catch (error) {
            console.error('🎬 Error applying video state:', error);
          }
        }, 300);
      }
      
      lastSyncTimeRef.current = Date.now();
      setTimeout(() => setIsSyncing(false), 1500);
    });

    // Handle video URL updates
    newSocket.on('video-url-update', (videoUrl) => {
      console.log('📺 Received video URL update:', videoUrl);
      setVideoUrl(videoUrl);
    });

    // Handle session disconnect events
    newSocket.on('host-disconnected', () => {
      console.log('👤 Host disconnected from session');
      setError('Host has left the session. Session ended.');
      setSessionId('');
      setVideoUrl('');
      setChatMessages([]);
      setIsHost(false);
      setIsLoading(false);
      setIsLeavingSession(false);
    });

    newSocket.on('participant-disconnected', (data) => {
      console.log('👤 Participant disconnected:', data);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: `👤 Participant left (${data.participantCount} remaining)`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString()
      }]);
    });

    newSocket.on('participant-joined', (data) => {
      console.log('👤 Participant joined:', data);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: `👤 New participant joined (${data.participantCount} total)`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString()
      }]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Session management functions
  const handleCreateSession = () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }
    
    console.log('🔄 Creating session...');
    setIsLoading(true);
    socket.emit('create-session');
  };

  const handleJoinSession = () => {
    if (!joinInput.trim()) {
      alert('Please enter a session ID');
      return;
    }
    
    if (!socket) {
      setError('Not connected to server');
      return;
    }
    
    setIsLoading(true);
    console.log('🔗 Joining session:', joinInput);
    socket.emit('join-session', { sessionId: joinInput });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socket || !sessionId) return;
    
    const messageData = {
      sessionId,
      message: message.trim(),
      sender: 'me'
    };
    
    socket.emit('send-message', messageData);
    
    // Add to local chat
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      text: message.trim(),
      sender: 'me',
      timestamp: new Date().toLocaleTimeString()
    }]);
    
    setMessage('');
  };

  const handleShareVideo = () => {
    if (!videoUrl || !sessionId || !socket) return;
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }
    
    console.log('📺 Sharing video URL:', videoId);
    console.log('📺 Setting video URL in state:', videoUrl);
    
    // Send video URL to server
    socket.emit('share-video', {
      sessionId,
      videoUrl,
      videoId
    });
    
    // Add to chat
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      text: `📺 Shared video: ${videoUrl}`,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Handle video URL input change
  const handleVideoUrlChange = (e) => {
    const url = e.target.value;
    setVideoUrl(url);
    
    // Auto-load video when a valid YouTube URL is pasted
    if (url && extractVideoId(url)) {
      console.log('🎬 Valid YouTube URL detected, auto-loading video');
    }
  };

  const handleManualSync = () => {
    if (!sessionId || !socket || !playerRef.current) return;
    
    console.log('🔄 Manual sync triggered');
    setIsSyncing(true);
    
    const currentTime = playerRef.current.getCurrentTime();
    const playerState = playerRef.current.getPlayerState();
    const isPlaying = playerState === 1;
    
    const newState = {
      currentTime,
      isPlaying,
      videoId: extractVideoId(videoUrl)
    };
    
    console.log('🔄 Manual sync - sending state:', newState);
    
    socket.emit('video-state-update', {
      sessionId,
      state: newState
    });
    
    setTimeout(() => setIsSyncing(false), 1000);
  };

  // Copy session link to clipboard
  const copySessionLink = async () => {
    const sessionLink = `${window.location.origin}?session=${sessionId}`;
    try {
      await navigator.clipboard.writeText(sessionLink);
      alert('Session link copied to clipboard!');
    } catch (err) {
      console.error('❌ Failed to copy session link:', err);
    }
  };

  // Handle leaving session
  const handleLeaveSession = () => {
    if (!socket || !sessionId) {
      console.log('No socket or session to leave');
      return;
    }
    
    console.log('👋 Leaving session:', sessionId);
    setIsLeavingSession(true);
    
    try {
      socket.emit('leave-session', { sessionId });
      
      // Clear session state immediately
      setSessionId('');
      setVideoUrl('');
      setChatMessages([]);
      setIsHost(false);
      setVideoState({ isPlaying: false, currentTime: 0, videoId: null });
      window.history.replaceState({}, '', window.location.origin);
      
      // Add a small delay to ensure the leave event is processed
      setTimeout(() => {
        setIsLeavingSession(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error leaving session:', error);
      setIsLeavingSession(false);
      setError('Failed to leave session. Please try again.');
    }
  };

  // Handle URL session parameter on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    if (sessionParam && !sessionId && socket) {
      console.log('🔗 Session ID found in URL:', sessionParam);
      setJoinInput(sessionParam);
      setTimeout(() => {
        handleJoinSession();
      }, 1000);
    }
  }, [sessionId, socket]);

  // Update URL when session is created
  useEffect(() => {
    if (sessionId) {
      const newUrl = `${window.location.origin}?session=${sessionId}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [sessionId]);

  // Periodic sync for video state
  useEffect(() => {
    if (!sessionId || !socket || !videoUrl) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Send sync every 3 seconds
    syncIntervalRef.current = setInterval(() => {
      if (playerRef.current && !isSyncing && videoUrl) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const playerState = playerRef.current.getPlayerState();
          const isPlaying = playerState === 1; // 1 = playing
          
          const newState = { 
            currentTime, 
            isPlaying, 
            videoId: extractVideoId(videoUrl) 
          };
          
          // Only sync if time has changed significantly (more than 1 second)
          if (Math.abs(currentTime - videoState.currentTime) > 1) {
            console.log('📺 Periodic sync - sending state:', newState);
            socket.emit('video-state-update', {
              sessionId,
              state: newState
            });
          }
        } catch (error) {
          console.error('📺 Error in periodic sync:', error);
        }
      }
    }, 3000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [sessionId, socket, videoUrl, videoState.currentTime, isSyncing]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated geometric shapes */}
      <div className="geometric-shapes">
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
      </div>
      
      <header className="p-2 sm:p-4 glass-card shadow-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">🎬 Watch Together</h1>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                connectionState === 'connected' ? 'bg-green-400' :
                connectionState === 'connecting' ? 'bg-yellow-400' :
                'bg-red-400'
              }`}></div>
              <span className="text-white">
                {connectionState === 'connected' ? '🟢 Connected' :
                 connectionState === 'connecting' ? '🟡 Connecting...' :
                 '🔴 Disconnected'}
              </span>
            </div>
            {sessionId ? (
              <div className="flex flex-wrap items-center gap-1">
                <span className="hidden sm:inline">Session:</span>
                <span className="font-mono bg-gray-200 px-1 sm:px-2 py-1 rounded text-xs">{sessionId}</span>
                <button 
                  onClick={copySessionLink}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  title="Copy session link"
                >
                  📋 Copy
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Session Management Section */}
        <section className="w-full lg:w-80 xl:w-96 glass-card border-b lg:border-b-0 lg:border-r border-white/20 p-3 sm:p-4">
          <h2 className="text-lg font-semibold mb-4 text-white">Session Management</h2>
          
          {error && (
            <div className="w-full max-w-2xl mt-2 text-red-200 bg-red-900/30 border border-red-400/50 rounded p-2 backdrop-blur-sm">
              {error}
            </div>
          )}

          {sessionId && (
            <div className="bg-green-900/30 border border-green-400/50 text-green-200 px-3 sm:px-4 py-3 rounded mb-4 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="flex-1">
                    <strong className="text-green-300">Session Active!</strong> Share this link with a friend:
                    <div className="text-xs sm:text-sm mt-1 break-all text-green-100">
                      {window.location.origin}?session={sessionId}
                    </div>
                  </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?session=${sessionId}`);
                      alert('Session link copied to clipboard!');
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={handleLeaveSession}
                    disabled={isLeavingSession}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs sm:text-sm"
                  >
                    {isLeavingSession ? <LoadingSpinner /> : 'Leave Session'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!sessionId ? (
            <div className="space-y-4">
              <button
                onClick={handleCreateSession}
                disabled={!socket || socket.disconnected || isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                {isLoading ? <LoadingSpinner /> : 'Create New Session'}
              </button>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  placeholder="Enter session ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-black"
                />
                <button
                  onClick={handleJoinSession}
                  disabled={!joinInput.trim() || !socket || socket.disconnected || isLoading}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
                >
                  {isLoading ? <LoadingSpinner /> : 'Join Session'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={handleVideoUrlChange}
                  placeholder="Enter YouTube video URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black text-sm"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      if (videoUrl && extractVideoId(videoUrl)) {
                        console.log('🎬 Loading video:', videoUrl);
                      } else {
                        alert('Please enter a valid YouTube URL');
                      }
                    }}
                    disabled={!videoUrl}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm"
                  >
                    🎬 Load Video
                  </button>
                  <button
                    onClick={handleShareVideo}
                    disabled={!sessionId || !videoUrl || !socket}
                    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm"
                  >
                    📺 Share Video
                  </button>
                </div>
              </div>
              
              {/* Quick Start Videos */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-white mb-2">Quick Start Videos:</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Rick Roll', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
                    { name: 'Baby Shark', url: 'https://www.youtube.com/watch?v=XqZsoesa55w' },
                    { name: 'Test Video', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }
                  ].map((video, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setVideoUrl(video.url);
                        console.log('🎬 Quick start video selected:', video.url);
                      }}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded"
                    >
                      {video.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                <button
                  onClick={handleManualSync}
                  disabled={!sessionId || !socket}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-2 sm:px-4 py-2 rounded text-xs sm:text-sm"
                >
                  🔄 Sync
                </button>
                <button
                  onClick={() => {
                    setVideoState(prev => ({ ...prev, currentTime: 0 }));
                  }}
                  disabled={!videoUrl}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-2 sm:px-4 py-2 rounded text-xs sm:text-sm"
                >
                  ⏮️ Reset
                </button>
                <button
                  onClick={() => {
                    const videoContainer = document.getElementById('video-container');
                    if (videoContainer) {
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else {
                        videoContainer.requestFullscreen();
                      }
                    }
                  }}
                  disabled={!videoUrl}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white px-2 sm:px-4 py-2 rounded text-xs sm:text-sm"
                >
                  ⛶ Full
                </button>
                <button
                  onClick={() => {
                    // Test YouTube API loading
                    const testVideoId = 'dQw4w9WgXcQ';
                    setVideoUrl(`https://www.youtube.com/watch?v=${testVideoId}`);
                    console.log('🧪 Testing video loading with:', testVideoId);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-4 py-2 rounded text-xs sm:text-sm"
                >
                  🧪 Test
                </button>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-2 sm:px-4 py-2 rounded text-xs sm:text-sm"
                >
                  {showDebug ? 'Hide' : 'Show'} Debug
                </button>
                <button
                  onClick={() => {
                    if (playerRef.current) {
                      const testTime = Math.floor(Math.random() * 60);
                      console.log('🧪 Test sync - jumping to random time:', testTime);
                      playerRef.current.seekTo(testTime, true);
                      handleManualSync();
                    }
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-2 sm:px-4 py-2 rounded text-xs sm:text-sm"
                >
                  🧪 Test Sync
                </button>
                <button
                  onClick={() => {
                    if (playerRef.current && socket && sessionId) {
                      console.log('🔄 Force sync triggered');
                      const currentTime = playerRef.current.getCurrentTime();
                      const playerState = playerRef.current.getPlayerState();
                      const isPlaying = playerState === 1;
                      
                      const newState = {
                        currentTime,
                        isPlaying,
                        videoId: extractVideoId(videoUrl)
                      };
                      
                      console.log('🔄 Force sync - sending state:', newState);
                      socket.emit('video-state-update', {
                        sessionId,
                        state: newState
                      });
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-4 py-2 rounded text-xs sm:text-sm"
                >
                  🔄 Force Sync
                </button>
              </div>

              {showDebug && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded p-4 mb-4">
                  <h3 className="font-bold mb-2 text-white">🔧 Debug Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white">
                    <div>
                      <strong>Session:</strong> {sessionId || 'None'}<br/>
                      <strong>Connection:</strong> {connectionState}<br/>
                      <strong>Socket:</strong> {socket ? (socket.connected ? 'Connected' : 'Disconnected') : 'Not initialized'}<br/>
                      <strong>Is Host:</strong> {isHost ? 'Yes' : 'No'}<br/>
                      <strong>YouTube API:</strong> {window.YT ? 'Loaded' : 'Not loaded'}
                    </div>
                    <div>
                      <strong>Video State:</strong><br/>
                      • Playing: {videoState.isPlaying ? 'Yes' : 'No'}<br/>
                      • Time: {Math.floor(videoState.currentTime)}s<br/>
                      • Syncing: {isSyncing ? 'Yes' : 'No'}<br/>
                      • URL: {videoUrl || 'None'}<br/>
                      • Video ID: {extractVideoId(videoUrl) || 'None'}<br/>
                      • Player Ready: {playerRef.current ? 'Yes' : 'No'}<br/>
                      • Last Sync: {lastSyncTimeRef.current ? new Date(lastSyncTimeRef.current).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Session Info */}
              {sessionId && (
                <div className="bg-blue-900/30 border border-blue-400/50 rounded p-2 sm:p-3 mb-4 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <div>
                      <strong className="text-blue-300 text-xs sm:text-sm">Session ID:</strong> 
                      <span className="ml-1 sm:ml-2 font-mono text-xs sm:text-sm text-blue-200">{sessionId}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-blue-200">
                      {connectionState === 'connected' ? '🟢 2/2 Connected' : '🟡 Connecting...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Video Player Section */}
        <section className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 glass-card m-2">
          <div id="video-container" className="w-full max-w-4xl">
                          <div className="text-xs text-white/70 mb-2">
              Debug: videoUrl = "{videoUrl}" | extractVideoId = "{extractVideoId(videoUrl)}"
            </div>
            
            {videoUrl && extractVideoId(videoUrl) ? (
              <div className="w-full bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden relative">
                <div className="text-xs sm:text-sm text-white mb-2 p-2 bg-white/20 rounded">
                  🎬 Playing: {extractVideoId(videoUrl)}
                </div>
                <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96">
                  <YouTubePlayer
                    key={extractVideoId(videoUrl)}
                    ref={playerRef}
                    videoId={extractVideoId(videoUrl)}
                    onStateChange={(state, player) => {
                      if (!isSyncing && player) {
                        const currentTime = player.getCurrentTime();
                        const isPlaying = state === 1; // 1 = playing
                        const newState = { currentTime, isPlaying, videoId: extractVideoId(videoUrl) };
                        setVideoState(newState);
                        
                        // Send state update to other users
                        if (socket && sessionId) {
                          console.log('📺 Sending video state update:', newState);
                          socket.emit('video-state-update', {
                            sessionId,
                            state: newState
                          });
                        }
                      }
                    }}
                    onReady={(player) => {
                      console.log('🎬 YouTube player ready');
                      // Store the player reference immediately
                      playerRef.current = player;
                      
                      if (videoState.currentTime > 0) {
                        console.log('🎬 Seeking to initial time:', videoState.currentTime);
                        setTimeout(() => {
                          try {
                            player.seekTo(videoState.currentTime, true);
                          } catch (error) {
                            console.error('🎬 Error seeking on ready:', error);
                          }
                        }, 500);
                      }
                    }}
                    seekTo={videoState.currentTime}
                    play={videoState.isPlaying}
                    pause={!videoState.isPlaying}
                  />
                </div>
                {isSyncing && (
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-blue-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm z-10 animate-pulse">
                    🔄 Syncing...
                  </div>
                )}
                <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-black bg-opacity-50 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm z-10">
                  {Math.floor(videoState.currentTime)}s / {videoState.isPlaying ? '▶️' : '⏸️'}
                </div>
              </div>
            ) : (
              <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="text-4xl sm:text-6xl mb-4">📺</div>
                  <p className="text-white mb-2 text-sm sm:text-base">Enter a YouTube URL above to start watching together!</p>
                  <div className="text-xs sm:text-sm text-white/70 space-y-1">
                    <p>• Paste a YouTube URL in the input field</p>
                    <p>• Click "🎬 Load Video" to display the player</p>
                    <p>• Click "📺 Share Video" to share with others</p>
                    <p>• Or use the Quick Start buttons below</p>
                  </div>
                  {videoUrl && (
                    <p className="text-xs sm:text-sm text-red-300 mt-2">
                      Invalid YouTube URL: {videoUrl}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Chat Section */}
        <aside className="w-full lg:w-80 xl:w-96 glass-card border-t lg:border-t-0 lg:border-l border-white/20 flex flex-col p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-white">💬 Chat</h3>
            <button
              onClick={() => setChatMessages([])}
              className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
            >
              Clear Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto mb-2 space-y-2 max-h-32 sm:max-h-48 lg:max-h-64 bg-white/10 backdrop-blur-sm rounded p-2">
            {chatMessages.length === 0 ? (
              <div className="text-center text-white/70 text-xs sm:text-sm py-4">
                No messages yet. Start chatting!
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={msg.id || idx} className={`p-2 rounded text-xs sm:text-sm ${
                  msg.sender === 'me' ? 'bg-blue-500/30 ml-2 sm:ml-4' : 
                  msg.sender === 'system' ? 'bg-white/20 text-center' :
                  'bg-white/20 mr-2 sm:mr-4'
                }`}>
                  <div className="text-xs text-white/70 mb-1">
                    {msg.sender === 'me' ? 'You' : msg.sender === 'system' ? 'System' : 'Peer'} • {msg.timestamp}
                  </div>
                  <div className="break-words text-white">{msg.text}</div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-2 sm:px-3 py-2 border border-white/30 rounded text-white text-xs sm:text-sm bg-white/10 backdrop-blur-sm placeholder-white/50"
              disabled={!sessionId || !socket}
            />
            <button
              type="submit"
              disabled={!message.trim() || !sessionId || !socket}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm"
            >
              Send
            </button>
          </form>
        </aside>
      </main>
    </div>
  )
}

export default App

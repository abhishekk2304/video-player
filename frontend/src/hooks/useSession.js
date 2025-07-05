import { useEffect, useState, useCallback } from 'react';
import { socket } from '../utils/socket';

export function useSession() {
  const [sessionId, setSessionId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoState, setVideoState] = useState(null);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('🟢 Socket connected in useSession');
      setConnected(true);
    });
    socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected in useSession');
      setConnected(false);
    });
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const createSession = useCallback((cb) => {
    console.log('🔄 Creating session...');
    socket.connect();
    socket.emit('create-session', (data) => {
      console.log('📋 Create session response:', data);
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setIsHost(true);
        setError(null);
        cb && cb(data.sessionId);
      } else {
        setError('Failed to create session');
      }
    });
  }, []);

  const joinSession = useCallback((id, cb) => {
    console.log('🔄 Joining session:', id);
    if (!socket.connected) {
      console.log('🔌 Socket not connected, connecting...');
      socket.connect();
    }
    
    // Add timeout for join session
    const timeout = setTimeout(() => {
      console.error('⏰ Join session timeout');
      setError('Join session timeout - please try again');
      cb && cb(null, 'Join session timeout');
    }, 10000); // 10 second timeout
    
    socket.emit('join-session', id, (data) => {
      clearTimeout(timeout);
      console.log('📋 Join session response:', data);
      if (data.error) {
        console.error('❌ Join session error:', data.error);
        setError(data.error);
        cb && cb(null, data.error);
      } else {
        console.log('✅ Join session successful:', data);
        setSessionId(data.sessionId);
        setIsHost(false);
        setVideoUrl(data.videoUrl);
        setVideoState(data.videoState);
        setError(null);
        cb && cb(data.sessionId);
      }
    });
  }, []);

  // Listen for session events (guest joined, host/guest disconnected, etc.)
  useEffect(() => {
    function onGuestJoined() {
      console.log('👥 Guest joined session');
    }
    function onHostDisconnected() { 
      console.log('👤 Host disconnected');
      setError('Host disconnected'); 
    }
    function onGuestDisconnected() { 
      console.log('👤 Guest disconnected');
      setError('Guest disconnected'); 
    }
    socket.on('guest-joined', onGuestJoined);
    socket.on('host-disconnected', onHostDisconnected);
    socket.on('guest-disconnected', onGuestDisconnected);
    return () => {
      socket.off('guest-joined', onGuestJoined);
      socket.off('host-disconnected', onHostDisconnected);
      socket.off('guest-disconnected', onGuestDisconnected);
    };
  }, []);

  return {
    sessionId,
    isHost,
    connected,
    error,
    videoUrl,
    videoState,
    createSession,
    joinSession,
    setError,
    setVideoUrl,
    setVideoState,
  };
} 
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

console.log('Connecting to backend at:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'], // Allow fallback to polling
  timeout: 20000,
});

// Add connection event listeners for debugging
socket.on('connect', () => {
  console.log('✅ Connected to backend');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
}); 
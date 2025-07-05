import { useEffect, useRef, useCallback } from 'react';
import { socket } from '../utils/socket';

// Check WebRTC availability
const isWebRTCAvailable = () => {
  return typeof window !== 'undefined' && 
         window.RTCPeerConnection && 
         window.RTCSessionDescription && 
         window.RTCIceCandidate;
};

export function useWebRTC({ sessionId, isHost, onData, onConnectionStateChange }) {
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);

  // Check WebRTC support
  useEffect(() => {
    if (!isWebRTCAvailable()) {
      console.error('❌ WebRTC is not supported in this browser');
      onConnectionStateChange && onConnectionStateChange('unsupported');
      return;
    }
    console.log('✅ WebRTC is supported');
  }, [onConnectionStateChange]);

  // Send signaling messages
  const sendSignal = useCallback((type, payload) => {
    if (!sessionId) return;
    if (type === 'offer') {
      socket.emit('webrtc-offer', payload);
    } else if (type === 'answer') {
      socket.emit('webrtc-answer', payload);
    } else if (type === 'ice-candidate') {
      socket.emit('ice-candidate', payload);
    }
  }, [sessionId]);

  // Send data over data channel
  const sendData = useCallback((data) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Setup peer connection
  useEffect(() => {
    if (!sessionId || !isWebRTCAvailable()) return;
    
    try {
      const pc = new window.RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });
      peerRef.current = pc;

      // Data channel (host creates, guest receives)
      if (isHost) {
        const dc = pc.createDataChannel('data');
        dataChannelRef.current = dc;
        dc.onopen = () => {
          console.log('🟢 Data channel opened (host)');
          onConnectionStateChange && onConnectionStateChange('open');
        };
        dc.onclose = () => {
          console.log('🔴 Data channel closed (host)');
          onConnectionStateChange && onConnectionStateChange('closed');
        };
        dc.onmessage = (e) => {
          console.log('📨 Received data (host):', e.data);
          onData && onData(JSON.parse(e.data));
        };
      } else {
        pc.ondatachannel = (e) => {
          dataChannelRef.current = e.channel;
          e.channel.onopen = () => {
            console.log('🟢 Data channel opened (guest)');
            onConnectionStateChange && onConnectionStateChange('open');
          };
          e.channel.onclose = () => {
            console.log('🔴 Data channel closed (guest)');
            onConnectionStateChange && onConnectionStateChange('closed');
          };
          e.channel.onmessage = (ev) => {
            console.log('📨 Received data (guest):', ev.data);
            onData && onData(JSON.parse(ev.data));
          };
        };
      }

      // ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          console.log('🧊 ICE candidate generated');
          sendSignal('ice-candidate', e.candidate);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
      };

      // Signaling handlers
      socket.on('webrtc-offer', async (offer) => {
        if (!isHost) {
          console.log('📥 Received offer');
          try {
            await pc.setRemoteDescription(new window.RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('📤 Sending answer');
            sendSignal('answer', answer);
          } catch (err) {
            console.error('❌ Error handling offer:', err);
          }
        }
      });
      
      socket.on('webrtc-answer', async (answer) => {
        if (isHost) {
          console.log('📥 Received answer');
          try {
            await pc.setRemoteDescription(new window.RTCSessionDescription(answer));
          } catch (err) {
            console.error('❌ Error handling answer:', err);
          }
        }
      });
      
      socket.on('ice-candidate', async (candidate) => {
        try {
          await pc.addIceCandidate(new window.RTCIceCandidate(candidate));
          console.log('🧊 Added ICE candidate');
        } catch (err) {
          console.error('❌ Error adding ICE candidate:', err);
        }
      });

      // Host initiates offer
      if (isHost) {
        socket.on('guest-joined', async () => {
          console.log('👥 Guest joined, creating offer');
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('📤 Sending offer');
            sendSignal('offer', offer);
          } catch (err) {
            console.error('❌ Error creating offer:', err);
          }
        });
      }

      return () => {
        socket.off('webrtc-offer');
        socket.off('webrtc-answer');
        socket.off('ice-candidate');
        socket.off('guest-joined');
        if (pc) {
          pc.close();
          console.log('🔌 Peer connection closed');
        }
      };
    } catch (err) {
      console.error('❌ Error setting up WebRTC:', err);
      onConnectionStateChange && onConnectionStateChange('error');
    }
    // eslint-disable-next-line
  }, [sessionId, isHost]);

  return {
    sendData,
    connection: peerRef.current,
    dataChannel: dataChannelRef.current,
    isSupported: isWebRTCAvailable(),
  };
} 
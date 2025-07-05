import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const YT_API_SRC = 'https://www.youtube.com/iframe_api';

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const tag = document.createElement('script');
    tag.src = YT_API_SRC;
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => {
      resolve(window.YT);
    };
  });
}

// YouTubePlayer.jsx
// A React component for embedding and controlling a YouTube video using the IFrame API.
// Usage: <YouTubePlayer videoId="..." onStateChange={...} onReady={...} ref={...} />
// Exposes playVideo, pauseVideo, seekTo, getCurrentTime, getPlayerState via ref.
//
// Props:
// - videoId: string (YouTube video ID)
// - onStateChange: function (callback for player state changes)
// - onReady: function (callback when player is ready)
// - seekTo: number (seek to this time in seconds)
// - play: boolean (play video if true)
// - pause: boolean (pause video if true)

const YouTubePlayer = forwardRef(({ videoId, onStateChange, onReady, seekTo, play, pause }, ref) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useImperativeHandle(ref, () => ({
    playVideo: () => playerRef.current?.playVideo(),
    pauseVideo: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds) => playerRef.current?.seekTo(seconds, true),
    getCurrentTime: () => playerRef.current?.getCurrentTime() || 0,
    getPlayerState: () => playerRef.current?.getPlayerState(),
  }));

  useEffect(() => {
    let ytPlayer;
    let destroyed = false;
    
    if (!videoId) {
      setIsLoading(false);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    console.log('🎬 YouTubePlayer: Loading video with ID:', videoId);
    
    loadYouTubeAPI().then((YT) => {
      if (destroyed) return;
      console.log('🎬 YouTubePlayer: API loaded, creating player');
      
      ytPlayer = new YT.Player(containerRef.current, {
        videoId,
        height: '100%',
        width: '100%',
        events: {
          onReady: (e) => {
            console.log('🎬 YouTubePlayer: Player ready');
            playerRef.current = e.target;
            setIsLoading(false);
            onReady && onReady(e.target);
          },
          onStateChange: (e) => {
            console.log('🎬 YouTubePlayer: State changed to:', e.data);
            // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            if (e.data === 3) {
              console.log('🎬 YouTubePlayer: Video is buffering...');
            }
            onStateChange && onStateChange(e.data, e.target);
          },
          onError: (e) => {
            console.error('🎬 YouTubePlayer: Error:', e.data);
            setError(`YouTube Error: ${e.data}`);
            setIsLoading(false);
          },
        },
        playerVars: {
          controls: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
          autoplay: 0,
          mute: 0,
        },
      });
    }).catch((error) => {
      console.error('🎬 YouTubePlayer: Failed to load API:', error);
      setError('Failed to load YouTube API');
      setIsLoading(false);
    });
    
    return () => {
      destroyed = true;
      if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy();
    };
  }, [videoId]);

  useEffect(() => {
    if (playerRef.current && typeof seekTo === 'number' && seekTo >= 0) {
      console.log('🎬 YouTubePlayer: Seeking to', seekTo, 'seconds');
      try {
        playerRef.current.seekTo(seekTo, true);
      } catch (error) {
        console.error('🎬 YouTubePlayer: Error seeking:', error);
      }
    }
  }, [seekTo]);

  useEffect(() => {
    if (playerRef.current && play) {
      console.log('🎬 YouTubePlayer: Playing video');
      try {
        playerRef.current.playVideo();
      } catch (error) {
        console.error('🎬 YouTubePlayer: Error playing:', error);
      }
    }
  }, [play]);

  useEffect(() => {
    if (playerRef.current && pause) {
      console.log('🎬 YouTubePlayer: Pausing video');
      try {
        playerRef.current.pauseVideo();
      } catch (error) {
        console.error('🎬 YouTubePlayer: Error pausing:', error);
      }
    }
  }, [pause]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-white">Loading video...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded">
          <div className="text-center p-4">
            <div className="text-red-500 text-2xl mb-2">⚠️</div>
            <p className="text-sm text-red-300">{error}</p>
            <p className="text-xs text-white/70 mt-1">Please check your internet connection</p>
          </div>
        </div>
      )}
      
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});

export default YouTubePlayer; 
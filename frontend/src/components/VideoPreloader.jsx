import React, { useEffect, useState } from 'react';

const VideoPreloader = ({ videoId, onPreloadComplete }) => {
  const [preloadStatus, setPreloadStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoId) {
      setPreloadStatus('idle');
      return;
    }

    setPreloadStatus('loading');
    setError(null);

    // Create a hidden iframe to preload the video
    const preloadIframe = document.createElement('iframe');
    preloadIframe.style.display = 'none';
    preloadIframe.style.position = 'absolute';
    preloadIframe.style.left = '-9999px';
    preloadIframe.style.top = '-9999px';
    preloadIframe.width = '1';
    preloadIframe.height = '1';
    
    // Use the privacy-enhanced domain for better performance
    preloadIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&fs=0&playsinline=1&vq=medium`;
    
    preloadIframe.onload = () => {
      console.log('🎬 VideoPreloader: Video preloaded successfully');
      setPreloadStatus('complete');
      onPreloadComplete && onPreloadComplete(videoId);
      
      // Remove the iframe after a delay to free up resources
      setTimeout(() => {
        if (preloadIframe.parentNode) {
          preloadIframe.parentNode.removeChild(preloadIframe);
        }
      }, 5000);
    };
    
    preloadIframe.onerror = () => {
      console.error('🎬 VideoPreloader: Failed to preload video');
      setPreloadStatus('error');
      setError('Failed to preload video');
    };

    document.body.appendChild(preloadIframe);

    return () => {
      if (preloadIframe.parentNode) {
        preloadIframe.parentNode.removeChild(preloadIframe);
      }
    };
  }, [videoId, onPreloadComplete]);

  // Don't render anything visible - this is a background component
  return null;
};

export default VideoPreloader; 
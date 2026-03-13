
import { useRef, useState, useCallback, MutableRefObject } from 'react';

export const useVideoSystem = (sessionPromiseRef: MutableRefObject<Promise<any> | null>) => {
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);

  const stopVideoInternal = useCallback(() => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoActive(false);
  }, []);

  const startVideo = useCallback(async (mode: 'user' | 'environment') => {
    try {
      // Cleanup previous stream if exists
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
        } 
      });
      
      // Attempt exposure compensation for better lighting
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      if ('exposureCompensation' in capabilities) {
          try {
              await track.applyConstraints({
                  advanced: [{ exposureCompensation: -0.35 } as any]
              });
          } catch (err) {
              console.log("Exposure compensation not supported", err);
          }
      }
      
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsVideoActive(true);

      // Setup Frame Capture Loop
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 1280; 
      canvas.height = 720; 

      videoIntervalRef.current = window.setInterval(() => {
         if (ctx && videoRef.current) {
           ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
           const base64Data = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
           
           sessionPromiseRef.current?.then(session => {
              session.sendRealtimeInput({
                media: { mimeType: 'image/jpeg', data: base64Data }
              });
           }).catch(() => {});
         }
      }, 150); // 150ms interval

    } catch (e) {
      console.error("Failed to start video", e);
      setIsVideoActive(false);
    }
  }, [sessionPromiseRef]);

  const toggleVideo = useCallback(() => {
    if (isVideoActive) {
      stopVideoInternal();
    } else {
      startVideo(facingMode);
    }
  }, [isVideoActive, facingMode, startVideo, stopVideoInternal]);

  const switchCamera = useCallback(() => {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);
      if (isVideoActive) {
          startVideo(newMode);
      }
  }, [facingMode, isVideoActive, startVideo]);

  return {
    videoRef,
    videoStreamRef,
    startVideo,
    stopVideo: stopVideoInternal,
    toggleVideo,
    switchCamera,
    facingMode,
    isVideoActive
  };
};

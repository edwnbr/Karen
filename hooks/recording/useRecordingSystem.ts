
import { useRef, useState, useCallback, MutableRefObject } from 'react';

export const useRecordingSystem = (
    recorderDestinationRef: MutableRefObject<MediaStreamAudioDestinationNode | null>,
    videoStreamRef: MutableRefObject<MediaStream | null>
) => {
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Video State
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(() => {
    if (!recorderDestinationRef.current) return;
    setAudioBlob(null);
    audioChunksRef.current = [];
    
    const mimeType = [
       'audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm';

    try {
      const recorder = new MediaRecorder(recorderDestinationRef.current.stream, { mimeType, audioBitsPerSecond: 128000 });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
      };
      recorder.start(100); 
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      console.error("Audio recording failed", e);
    }
  }, [recorderDestinationRef]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const startVideoRecording = useCallback(() => {
    if (!recorderDestinationRef.current || !videoStreamRef.current) return;
    setVideoBlob(null);
    videoChunksRef.current = [];

    const videoTrack = videoStreamRef.current.getVideoTracks()[0];
    const audioTrack = recorderDestinationRef.current.stream.getAudioTracks()[0];
    if (!videoTrack || !audioTrack) return;

    const combinedStream = new MediaStream([videoTrack, audioTrack]);
    const mimeType = [
        'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    try {
        const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 15000000, audioBitsPerSecond: 128000 });
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(videoChunksRef.current, { type: mimeType });
            setVideoBlob(blob);
        };
        recorder.start(100);
        videoRecorderRef.current = recorder;
        setIsVideoRecording(true);
    } catch (e) {
        console.error("Video recording failed", e);
    }
  }, [recorderDestinationRef, videoStreamRef]);

  const stopVideoRecording = useCallback(() => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop();
      setIsVideoRecording(false);
    }
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    isVideoRecording,
    startVideoRecording,
    stopVideoRecording,
    videoBlob
  };
};

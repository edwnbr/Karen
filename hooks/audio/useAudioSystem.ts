
import { useRef, useState, useCallback, MutableRefObject } from 'react';
import { createBlob, decodeAudioData, downsampleBuffer, decode } from '../../utils/audioUtils';

export const useAudioSystem = (sessionPromiseRef: MutableRefObject<Promise<any> | null>) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const recorderDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);

  const [volume, setVolume] = useState(0);

  const startAudioSystem = useCallback(async () => {
    // 1. Create Single AudioContext (Crucial for iOS)
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    audioContextRef.current = ctx;

    // 2. Setup Output Path (Speakers)
    const outputNode = ctx.createGain();
    outputNode.connect(ctx.destination);
    outputNodeRef.current = outputNode;

    // 3. Setup Recorder Destination (for recording mixed audio)
    const recorderDest = ctx.createMediaStreamDestination();
    outputNode.connect(recorderDest);
    recorderDestinationRef.current = recorderDest;

    // 4. Setup Visualizer (Analyser)
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.2;
    outputNode.connect(analyser);
    analyserRef.current = analyser;

    // 5. Volume Loop
    const updateVol = () => {
      if (analyserRef.current && audioContextRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const voiceData = data.slice(5, 50);
        const avg = voiceData.reduce((a, b) => a + b, 0) / voiceData.length;
        setVolume(avg / 255);
        requestAnimationFrame(updateVol);
      }
    };
    updateVol();

    // 6. Setup Microphone Input
    // iOS Note: No echoCancellation to prevent locking
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const micSource = ctx.createMediaStreamSource(stream);
    
    // Connect Mic to Recorder Destination (so we can record user voice)
    micSource.connect(recorderDest);

    // 7. Setup Processor to send audio to API
    // 4096 buffer size is safer for iOS
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    let hasSeenAudio = false;

    proc.onaudioprocess = (e) => {
      if (!hasSeenAudio) {
        hasSeenAudio = true;
        // Skip first chunk to avoid startup glitches
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);
      const inputClone = new Float32Array(inputData); // Clone for safety
      
      // Downsample to 16kHz
      const downsampledData = downsampleBuffer(inputClone, ctx.sampleRate, 16000);
      const pcm = createBlob(downsampledData, 16000);

      sessionPromiseRef.current?.then((session) => {
        if (session) {
             session.sendRealtimeInput({ media: pcm });
        }
      }).catch(() => {});
    };

    micSource.connect(proc);
    
    // Keep processor alive by connecting to destination (muted)
    const silentNode = ctx.createGain();
    silentNode.gain.value = 0;
    proc.connect(silentNode);
    silentNode.connect(ctx.destination);

    return { stream, ctx };
  }, [sessionPromiseRef]);

  const stopAudioSystem = useCallback(async () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    
    // Stop all active audio sources (bot speech)
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (audioContextRef.current) {
      try { await audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    
    setVolume(0);
  }, []);

  const queueAudioChunk = useCallback(async (base64: string) => {
    const ctx = audioContextRef.current;
    const outputNode = outputNodeRef.current;
    
    if (!ctx || !outputNode || !base64) return;

    if (ctx.state === 'suspended') await ctx.resume();

    try {
        const bytes = decode(base64);
        const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
        
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(outputNode);

        const now = ctx.currentTime;
        if (nextStartTimeRef.current < now) {
            nextStartTimeRef.current = now + 0.12;
        }

        src.start(nextStartTimeRef.current);
        nextStartTimeRef.current += buffer.duration;

        activeSourcesRef.current.add(src);
        src.onended = () => activeSourcesRef.current.delete(src);
    } catch (e) {
        console.error("Error queuing audio chunk", e);
    }
  }, []);

  const clearAudioQueue = useCallback(() => {
     activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
     activeSourcesRef.current.clear();
     nextStartTimeRef.current = 0;
  }, []);

  return {
    startAudioSystem,
    stopAudioSystem,
    queueAudioChunk,
    clearAudioQueue,
    volume,
    recorderDestinationRef, // Expose for recording system
    mediaStreamRef // Expose for video system if needed
  };
};

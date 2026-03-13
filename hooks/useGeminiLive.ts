
import { useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { useAudioSystem } from './audio/useAudioSystem';
import { useVideoSystem } from './video/useVideoSystem';
import { useRecordingSystem } from './recording/useRecordingSystem';
import { useChatMemory } from './memory/useChatMemory';
import { useConnectionState } from './connection/useConnectionState';
import { SYSTEM_INSTRUCTION } from '../config/systemInstruction';

export const useGeminiLive = ({ apiKey }: { apiKey: string }) => {
  // --- Modules ---
  const connection = useConnectionState();
  const memory = useChatMemory();
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Sub-systems
  const audioSystem = useAudioSystem(sessionPromiseRef);
  const videoSystem = useVideoSystem(sessionPromiseRef);
  
  const recordingSystem = useRecordingSystem(
    audioSystem.recorderDestinationRef,
    videoSystem.videoStreamRef
  );

  const maxRetries = 3;

  const disconnect = useCallback(async (isErrorCleanup = false) => {
    if (!isErrorCleanup) {
        connection.userDisconnectedRef.current = true;
        connection.clearReconnectTimeout();
    }

    // Stop Sub-systems
    recordingSystem.stopRecording();
    recordingSystem.stopVideoRecording();
    videoSystem.stopVideo();
    await audioSystem.stopAudioSystem();
    
    sessionPromiseRef.current = null;
    connection.setDisconnected();
  }, [audioSystem, videoSystem, recordingSystem, connection]);

  const connect = useCallback(async (isRetry = false) => {
    if (!isRetry) {
        connection.resetConnectionState();
    }

    await disconnect(true); 

    if (!apiKey) return connection.setIsError("API Key is missing");

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio System (Context + Mic)
      await audioSystem.startAudioSystem();
      
      connection.connectionStartTimeRef.current = Date.now();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            connection.setIsConnected(true);
            connection.setIsReconnecting(false);
            connection.setIsError(null);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const audioPart = msg.serverContent?.modelTurn?.parts?.find(p => p.inlineData);
            if (audioPart?.inlineData?.data) {
                audioSystem.queueAudioChunk(audioPart.inlineData.data);
            }

            // Handle Transcripts (Memory)
            if (msg.serverContent?.inputTranscription) memory.appendInput(msg.serverContent.inputTranscription.text);
            if (msg.serverContent?.outputTranscription) memory.appendOutput(msg.serverContent.outputTranscription.text);
            
            if (msg.serverContent?.turnComplete) {
                memory.handleTurnComplete();
            }

            // Handle Interruptions
            if (msg.serverContent?.interrupted) {
              audioSystem.clearAudioQueue();
              memory.clearTranscripts();
            }
          },
          onclose: (e) => {
             if (connection.userDisconnectedRef.current) {
                 connection.setIsConnected(false);
                 return;
             }
             console.log("Session closed", e);
             const sessionDuration = Date.now() - connection.connectionStartTimeRef.current;
             if (sessionDuration < 2000) {
                 connection.setIsConnected(false);
                 connection.setIsError("Сбой соединения (iOS). Попробуйте еще раз.");
                 connection.setIsReconnecting(false);
                 return;
             }
             handleAutoReconnect();
          },
          onerror: (e) => { 
            console.error('Session Error:', e);
             const sessionDuration = Date.now() - connection.connectionStartTimeRef.current;
             if (sessionDuration < 2000) {
                 connection.setIsConnected(false);
                 connection.setIsError("Сбой API. Попробуйте еще раз.");
                 connection.setIsReconnecting(false);
                 return;
             }
            handleAutoReconnect();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      
    } catch (e: any) {
      console.error("Connection failed", e);
      connection.setIsConnected(false);
      connection.setIsError("Не удалось подключиться. Проверьте права микрофона.");
    }
  }, [apiKey, disconnect, audioSystem, connection, memory]);

  const handleAutoReconnect = useCallback(() => {
     if (connection.userDisconnectedRef.current) return;

     if (connection.retryCountRef.current < maxRetries) {
         connection.setIsReconnecting(true);
         connection.setIsError(`Переподключение... ${connection.retryCountRef.current + 1}/${maxRetries}`);
         connection.retryCountRef.current += 1;
         
         connection.clearReconnectTimeout();
         
         connection.reconnectTimeoutRef.current = window.setTimeout(() => {
             connect(true);
         }, 5000); 
     } else {
         connection.setIsReconnecting(false);
         connection.setIsConnected(false);
         connection.setIsError("Связь потеряна.");
     }
  }, [connect, connection]);

  // Text / Image helper functions
  const sendTextMessage = (text: string) => {
    sessionPromiseRef.current?.then(session => {
        if (typeof session.send === 'function') {
           session.send({ parts: [{ text }] });
           memory.addMessage('user', text);
        }
    });
  };

  const sendImage = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      sessionPromiseRef.current?.then(session => {
        session.sendRealtimeInput({
          media: { data: base64Data, mimeType: file.type }
        });
        memory.addMessage('user', `[Фото: ${file.name}]`);
      });
    };
    reader.readAsDataURL(file);
  };

  return {
    // Connection
    isConnected: connection.isConnected, 
    isError: connection.isError, 
    isReconnecting: connection.isReconnecting, 
    connect, 
    disconnect,
    
    // Audio System exports
    volume: audioSystem.volume,

    // Recording System exports
    isRecording: recordingSystem.isRecording,
    startRecording: recordingSystem.startRecording,
    stopRecording: recordingSystem.stopRecording,
    audioBlob: recordingSystem.audioBlob,
    isVideoRecording: recordingSystem.isVideoRecording,
    startVideoRecording: recordingSystem.startVideoRecording,
    stopVideoRecording: recordingSystem.stopVideoRecording,
    videoBlob: recordingSystem.videoBlob,

    // Video System exports
    videoRef: videoSystem.videoRef,
    isVideoActive: videoSystem.isVideoActive,
    toggleVideo: videoSystem.toggleVideo,
    switchCamera: videoSystem.switchCamera,
    facingMode: videoSystem.facingMode,

    // Chat (Memory)
    sendTextMessage, 
    sendImage, 
    chatHistory: memory.chatHistory
  };
};

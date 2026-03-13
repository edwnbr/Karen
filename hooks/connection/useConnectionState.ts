
import { useState, useRef, useCallback } from 'react';

export const useConnectionState = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Refs for tracking connection lifecycle
  const userDisconnectedRef = useRef(false);
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectionStartTimeRef = useRef<number>(0);

  const resetConnectionState = useCallback(() => {
     retryCountRef.current = 0;
     userDisconnectedRef.current = false;
     setIsError(null);
  }, []);

  const setDisconnected = useCallback(() => {
      setIsConnected(false);
      // Don't reset error here, as we might want to show why it disconnected
  }, []);

  const clearReconnectTimeout = useCallback(() => {
      if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
      }
  }, []);

  return {
    isConnected, setIsConnected,
    isError, setIsError,
    isReconnecting, setIsReconnecting,
    userDisconnectedRef,
    retryCountRef,
    reconnectTimeoutRef,
    connectionStartTimeRef,
    resetConnectionState,
    setDisconnected,
    clearReconnectTimeout
  };
};

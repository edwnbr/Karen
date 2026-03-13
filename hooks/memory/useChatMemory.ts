
import { useState, useRef, useCallback } from 'react';
import { ChatMessage } from '../../types';

export const useChatMemory = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // Refs for accumulating streaming text
  const currentInputText = useRef('');
  const currentOutputText = useRef('');

  const addMessage = useCallback((role: 'user' | 'model', text: string) => {
    setChatHistory(prev => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  const appendInput = (text: string) => {
    currentInputText.current += text;
  };

  const appendOutput = (text: string) => {
    currentOutputText.current += text;
  };

  const handleTurnComplete = useCallback(() => {
    if (currentInputText.current) {
        addMessage('user', currentInputText.current);
    }
    if (currentOutputText.current) {
        addMessage('model', currentOutputText.current);
    }
    currentInputText.current = '';
    currentOutputText.current = '';
  }, [addMessage]);

  const clearTranscripts = useCallback(() => {
    currentInputText.current = '';
    currentOutputText.current = '';
  }, []);

  return {
    chatHistory,
    setChatHistory,
    addMessage,
    appendInput,
    appendOutput,
    handleTurnComplete,
    clearTranscripts,
    currentInputText,
    currentOutputText
  };
};

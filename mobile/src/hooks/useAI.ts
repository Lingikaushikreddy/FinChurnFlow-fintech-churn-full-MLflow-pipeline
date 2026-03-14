/**
 * useAI Hook - AI assistant utilities
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  sendChatMessage,
  fetchSuggestions,
  transcribeVoice,
  addUserMessage,
  setListening,
  setTranscript,
  clearChat,
  startNewSession,
  ChatMessage,
} from '../store/slices/aiSlice';
import voiceService, { VoiceLocale } from '../services/VoiceService';

interface UseAIOptions {
  autoFetchSuggestions?: boolean;
  language?: VoiceLocale;
}

export const useAI = (options: UseAIOptions = {}) => {
  const { autoFetchSuggestions = true, language = 'en-IN' } = options;
  const dispatch = useDispatch<AppDispatch>();
  const volumeRef = useRef(0);

  const {
    messages,
    sessionId,
    suggestions,
    isLoading,
    isListening,
    isTranscribing,
    error,
    transcript,
  } = useSelector((state: RootState) => state.ai);

  // Setup voice service
  useEffect(() => {
    voiceService.setLocale(language);
    voiceService.setCallbacks({
      onStart: () => dispatch(setListening(true)),
      onEnd: () => dispatch(setListening(false)),
      onResults: (results) => {
        if (results[0]) {
          dispatch(setTranscript(results[0]));
        }
      },
      onPartialResults: (results) => {
        if (results[0]) {
          dispatch(setTranscript(results[0]));
        }
      },
      onVolumeChanged: (vol) => {
        volumeRef.current = Math.min(1, Math.max(0, (vol + 10) / 20));
      },
      onError: (err) => {
        console.error('Voice error:', err);
        dispatch(setListening(false));
      },
    });

    return () => {
      voiceService.destroy();
    };
  }, [language, dispatch]);

  // Fetch suggestions on mount
  useEffect(() => {
    if (autoFetchSuggestions) {
      dispatch(fetchSuggestions());
    }
  }, [autoFetchSuggestions, dispatch]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      dispatch(addUserMessage(message));
      return dispatch(sendChatMessage({ message, sessionId: sessionId || undefined }));
    },
    [dispatch, sessionId]
  );

  const startListening = useCallback(async () => {
    await voiceService.startListening();
  }, []);

  const stopListening = useCallback(async () => {
    await voiceService.stopListening();
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  const transcribeAudio = useCallback(
    (audioBase64: string) => {
      return dispatch(transcribeVoice({ audioBase64, language }));
    },
    [dispatch, language]
  );

  const clearConversation = useCallback(() => {
    dispatch(clearChat());
  }, [dispatch]);

  const newSession = useCallback(() => {
    dispatch(startNewSession());
  }, [dispatch]);

  const loadSuggestions = useCallback(() => {
    return dispatch(fetchSuggestions());
  }, [dispatch]);

  const sendSuggestion = useCallback(
    (suggestion: { text: string; intent: string }) => {
      return sendMessage(suggestion.text);
    },
    [sendMessage]
  );

  // Get the last assistant message with an action
  const lastAction = messages
    .filter((m) => m.role === 'assistant' && m.action)
    .slice(-1)[0]?.action;

  return {
    // State
    messages,
    sessionId,
    suggestions,
    isLoading,
    isListening,
    isTranscribing,
    error,
    transcript,
    volume: volumeRef.current,

    // Computed
    hasMessages: messages.length > 0,
    lastAction,
    userMessages: messages.filter((m) => m.role === 'user'),
    assistantMessages: messages.filter((m) => m.role === 'assistant'),

    // Actions
    sendMessage,
    startListening,
    stopListening,
    toggleListening,
    transcribeAudio,
    clearConversation,
    newSession,
    loadSuggestions,
    sendSuggestion,
  };
};

export default useAI;

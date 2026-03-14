/**
 * AI Slice - Manages AI chat and voice assistant state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { aiAPI } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: {
    type: string;
    action?: string;
    screen?: string;
    label?: string;
    confirm?: boolean;
    params?: Record<string, any>;
    data?: any;
    status?: 'pending' | 'completed' | 'failed';
  };
}

export interface Suggestion {
  id: string;
  text: string;
  intent: string;
}

interface AIState {
  messages: ChatMessage[];
  sessionId: string | null;
  suggestions: Suggestion[];
  isLoading: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  error: string | null;
  transcript: string;
}

const initialState: AIState = {
  messages: [],
  sessionId: null,
  suggestions: [],
  isLoading: false,
  isListening: false,
  isTranscribing: false,
  error: null,
  transcript: '',
};

// Async thunks
export const sendChatMessage = createAsyncThunk(
  'ai/sendMessage',
  async (
    { message, sessionId }: { message: string; sessionId?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await aiAPI.chat(message, sessionId);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to send message'));
    }
  }
);

export const fetchSuggestions = createAsyncThunk(
  'ai/fetchSuggestions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await aiAPI.getSuggestions();
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch suggestions'));
    }
  }
);

export const transcribeVoice = createAsyncThunk(
  'ai/transcribe',
  async (
    { audioBase64, language = 'hi-IN' }: { audioBase64: string; language?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await aiAPI.voiceInput(audioBase64, language);
      return response;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to transcribe audio'));
    }
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    addUserMessage: (state, action: PayloadAction<string>) => {
      const message: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      };
      state.messages.push(message);
    },
    setListening: (state, action: PayloadAction<boolean>) => {
      state.isListening = action.payload;
      if (!action.payload) {
        state.transcript = '';
      }
    },
    setTranscript: (state, action: PayloadAction<string>) => {
      state.transcript = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.sessionId = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    startNewSession: (state) => {
      state.messages = [];
      state.sessionId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Send Chat Message
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessionId = action.payload.session_id || state.sessionId;

        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: action.payload.response || action.payload.message,
          timestamp: new Date().toISOString(),
          action: action.payload.action,
        };
        state.messages.push(assistantMessage);
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Suggestions
    builder
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.suggestions = action.payload.suggestions || action.payload;
      });

    // Transcribe Voice
    builder
      .addCase(transcribeVoice.pending, (state) => {
        state.isTranscribing = true;
      })
      .addCase(transcribeVoice.fulfilled, (state, action) => {
        state.isTranscribing = false;
        state.transcript = action.payload.text || action.payload.transcript || '';
      })
      .addCase(transcribeVoice.rejected, (state, action) => {
        state.isTranscribing = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  addUserMessage,
  setListening,
  setTranscript,
  clearChat,
  clearError,
  startNewSession,
} = aiSlice.actions;
export default aiSlice.reducer;

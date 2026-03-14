/**
 * Voice Service - Handles voice recognition and audio recording
 */

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import { Platform, PermissionsAndroid } from 'react-native';

export type VoiceLocale = 'en-IN' | 'hi-IN' | 'ta-IN' | 'te-IN' | 'mr-IN';

interface VoiceServiceCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onResults?: (results: string[]) => void;
  onPartialResults?: (results: string[]) => void;
  onError?: (error: string) => void;
  onVolumeChanged?: (volume: number) => void;
}

class VoiceService {
  private callbacks: VoiceServiceCallbacks = {};
  private isInitialized: boolean = false;
  private currentLocale: VoiceLocale = 'en-IN';

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechPartialResults = this.onSpeechPartialResults;
    Voice.onSpeechError = this.onSpeechError;
    Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged;

    this.isInitialized = true;
  }

  private onSpeechStart = (event: SpeechStartEvent) => {
    this.callbacks.onStart?.();
  };

  private onSpeechEnd = (event: SpeechEndEvent) => {
    this.callbacks.onEnd?.();
  };

  private onSpeechResults = (event: SpeechResultsEvent) => {
    if (event.value) {
      this.callbacks.onResults?.(event.value);
    }
  };

  private onSpeechPartialResults = (event: SpeechResultsEvent) => {
    if (event.value) {
      this.callbacks.onPartialResults?.(event.value);
    }
  };

  private onSpeechError = (event: SpeechErrorEvent) => {
    const errorMessage = event.error?.message || 'Voice recognition error';
    this.callbacks.onError?.(errorMessage);
  };

  private onSpeechVolumeChanged = (event: any) => {
    if (event.value !== undefined) {
      this.callbacks.onVolumeChanged?.(event.value);
    }
  };

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Razorpay Nano needs access to your microphone for voice commands.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }

  setCallbacks(callbacks: VoiceServiceCallbacks) {
    this.callbacks = callbacks;
  }

  setLocale(locale: VoiceLocale) {
    this.currentLocale = locale;
  }

  async startListening(): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.callbacks.onError?.('Microphone permission denied');
      return;
    }

    try {
      // Stop any existing recognition before starting a new one
      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        await Voice.stop();
      }
      await Voice.start(this.currentLocale);
    } catch (error: any) {
      console.error('Voice start error:', error);
      this.callbacks.onError?.(error.message || 'Failed to start voice recognition');
    }
  }

  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
    } catch (error: any) {
      console.error('Voice stop error:', error);
    }
  }

  async cancelListening(): Promise<void> {
    try {
      await Voice.cancel();
    } catch (error: any) {
      console.error('Voice cancel error:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const available = await Voice.isAvailable();
      return available === 1 || available === true;
    } catch {
      return false;
    }
  }

  async getSupportedLocales(): Promise<string[]> {
    try {
      const locales = await Voice.getSpeechRecognitionServices();
      return locales || [];
    } catch {
      return [];
    }
  }

  destroy() {
    Voice.destroy().then(Voice.removeAllListeners);
    this.isInitialized = false;
  }
}

// Export singleton instance
export const voiceService = new VoiceService();

// Export locale mapping for UI
export const VOICE_LOCALES: { code: VoiceLocale; name: string; nativeName: string }[] = [
  { code: 'en-IN', name: 'English', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
];

export default voiceService;

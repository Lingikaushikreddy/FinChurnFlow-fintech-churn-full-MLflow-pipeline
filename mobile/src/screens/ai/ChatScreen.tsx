/**
 * ChatScreen - AI Assistant chat interface
 * 
 * Phase 1: Supports voice commands for show_qr, create_payment_link, check_balance
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  TextInput,
  IconButton,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { AppDispatch, RootState } from '../../store';
import {
  sendChatMessage,
  fetchSuggestions,
  addUserMessage,
  setListening,
  setTranscript,
  startNewSession,
  ChatMessage as ChatMessageType,
} from '../../store/slices/aiSlice';
import { colors, spacing, shadows } from '../../theme';
import { ChatMessage, VoiceButton, VoiceWaveform, AIAction } from '../../components';
import voiceService, { VoiceLocale, VOICE_LOCALES } from '../../services/VoiceService';
import { executeAction, ActionResult } from '../../services/ActionHandler';

const ChatScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    sessionId,
    suggestions,
    isLoading,
    isListening,
    transcript,
  } = useSelector((state: RootState) => state.ai);

  const [inputText, setInputText] = useState('');
  const [volume, setVolume] = useState(0);
  const transcriptRef = useRef('');

  // Update transcript ref whenever input changes (manual typing)
  useEffect(() => {
    transcriptRef.current = inputText;
  }, [inputText]);

  useEffect(() => {
    dispatch(fetchSuggestions());

    // Setup voice service callbacks
    voiceService.setCallbacks({
      onStart: () => {
        dispatch(setListening(true));
        transcriptRef.current = '';
        setInputText('');
      },
      onEnd: () => {
        dispatch(setListening(false));
        // Auto-send if we have text from voice
        const text = transcriptRef.current.trim();
        if (text) {
          handleSend(text);
        }
      },
      onResults: (results) => {
        if (results[0]) {
          const text = results[0];
          transcriptRef.current = text;
          setInputText(text);
          dispatch(setTranscript(text));
        }
      },
      onPartialResults: (results) => {
        if (results[0]) {
          transcriptRef.current = results[0];
          dispatch(setTranscript(results[0]));
        }
      },
      onVolumeChanged: (vol) => {
        setVolume(Math.min(1, Math.max(0, (vol + 10) / 20)));
      },
      onError: (error) => {
        console.error('Voice error:', error);
        dispatch(setListening(false));
      },
    });

    // Set locale based on app language
    const localeMap: Record<string, VoiceLocale> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
    };
    voiceService.setLocale(localeMap[i18n.language] || 'en-IN');

    return () => {
      voiceService.destroy();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(async (textOverride?: string) => {
    const text = (textOverride || inputText).trim();
    if (!text || isLoading) return;

    dispatch(addUserMessage(text));
    setInputText('');
    transcriptRef.current = '';
    Keyboard.dismiss();

    dispatch(sendChatMessage({ message: text, sessionId: sessionId || undefined }));
  }, [inputText, isLoading, sessionId, dispatch]);

  const handleVoicePress = async () => {
    if (isListening) {
      await voiceService.stopListening();
    } else {
      await voiceService.startListening();
    }
  };

  const handleSuggestionPress = (suggestion: { text: string; intent: string }) => {
    setInputText(suggestion.text);
  };

  const handleNewChat = () => {
    dispatch(startNewSession());
  };

  // Handle AI action execution - Phase 2
  const handleActionPress = useCallback(async (action: AIAction) => {
    // Guard against malformed actions
    if (!action || !action.label) {
      return { success: false, message: 'Invalid action' };
    }

    try {
      // executeAction now handles confirmation internally for confirm:true actions
      const result: ActionResult = await executeAction(action);

      if (result.success) {
        if (action.type === 'navigate') {
          Keyboard.dismiss();
        } else if (action.type === 'action' || action.type === 'whatsapp') {
          Alert.alert('Ho Gaya!', result.message);
        }
      } else {
        // Don't show error for cancelled actions
        if (result.message !== 'Action cancelled') {
          Alert.alert('Kuch gadbad ho gayi', result.message || 'Dobara try karein');
        }
      }

      return result;
    } catch (error: any) {
      console.error('Action execution error:', error);
      Alert.alert('Kuch gadbad ho gayi', error.message || 'Dobara try karein');
      throw error;
    }
  }, []);

  const renderMessage = ({ item }: { item: ChatMessageType }) => (
    <ChatMessage
      role={item.role}
      content={item.content}
      timestamp={item.timestamp}
      action={item.action as AIAction}
      onActionPress={handleActionPress}
    />
  );

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <Surface style={styles.welcomeCard}>
        <Icon name="robot" size={64} color={colors.primary} />
        <Text style={styles.welcomeTitle}>{t('ai.welcome')}</Text>
        <Text style={styles.welcomeText}>{t('ai.welcomeHint')}</Text>
      </Surface>

      {/* Suggestions */}
      <Text style={styles.suggestionsTitle}>{t('ai.trySaying')}</Text>
      <View style={styles.suggestionsContainer}>
        {suggestions.slice(0, 6).map((suggestion, index) => (
          <Chip
            key={index}
            icon="lightning-bolt"
            onPress={() => handleSuggestionPress(suggestion)}
            style={styles.suggestionChip}
            textStyle={styles.suggestionText}
          >
            {suggestion.text}
          </Chip>
        ))}

        {suggestions.length === 0 && (
          <>
            <Chip
              icon="link-plus"
              onPress={() => setInputText(t('ai.examples.createLink'))}
              style={styles.suggestionChip}
            >
              {t('ai.examples.createLink')}
            </Chip>
            <Chip
              icon="wallet"
              onPress={() => setInputText(t('ai.examples.checkBalance'))}
              style={styles.suggestionChip}
            >
              {t('ai.examples.checkBalance')}
            </Chip>
            <Chip
              icon="send"
              onPress={() => setInputText(t('ai.examples.sendMoney'))}
              style={styles.suggestionChip}
            >
              {t('ai.examples.sendMoney')}
            </Chip>
            <Chip
              icon="chart-bar"
              onPress={() => setInputText(t('ai.examples.getReport'))}
              style={styles.suggestionChip}
            >
              {t('ai.examples.getReport')}
            </Chip>
          </>
        )}
      </View>

      {/* Voice Hint */}
      <Surface style={styles.voiceHint}>
        <Icon name="microphone" size={24} color={colors.primary} />
        <Text style={styles.voiceHintText}>{t('ai.voiceHint')}</Text>
      </Surface>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={styles.headerTitleContainer}>
          <Icon name="robot" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>{t('ai.assistant')}</Text>
        </View>
        <IconButton
          icon="refresh"
          onPress={handleNewChat}
          disabled={messages.length === 0}
        />
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        renderWelcome()
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoading ? <ChatMessage role="assistant" content="" isLoading /> : null
          }
        />
      )}

      {/* Voice Feedback */}
      {isListening && (
        <Surface style={styles.listeningCard}>
          <VoiceWaveform isActive={isListening} volume={volume} barCount={7} />
          <Text style={styles.listeningText}>
            {transcript || t('ai.listening')}
          </Text>
        </Surface>
      )}

      {/* Input Area */}
      <Surface style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('ai.typeMessage')}
          mode="outlined"
          style={styles.input}
          dense
          right={
            inputText.trim() ? (
              <TextInput.Icon
                icon="send"
                onPress={() => handleSend()}
                disabled={isLoading}
              />
            ) : null
          }
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <VoiceButton
          isListening={isListening}
          onPress={handleVoicePress}
          size="medium"
          style={styles.voiceBtn}
        />
      </Surface>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  welcomeContainer: {
    flex: 1,
    padding: spacing.md,
  },
  welcomeCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.md,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
  },
  suggestionText: {
    fontSize: 13,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
    backgroundColor: colors.primaryLight + '15',
  },
  voiceHintText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  messageList: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listeningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  listeningText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  voiceBtn: {
    marginLeft: spacing.xs,
  },
});

export default ChatScreen;

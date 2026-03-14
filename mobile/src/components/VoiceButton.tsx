/**
 * VoiceButton - Animated FAB for voice input
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, shadows } from '../theme';

interface VoiceButtonProps {
  isListening: boolean;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  disabled?: boolean;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  onPress,
  size = 'medium',
  style,
  disabled = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const sizeConfig = {
    small: { button: 48, icon: 24 },
    medium: { button: 56, icon: 28 },
    large: { button: 72, icon: 36 },
  };

  const { button: buttonSize, icon: iconSize } = sizeConfig[size];

  useEffect(() => {
    if (isListening) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Scale up animation
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        useNativeDriver: true,
      }).start();
    } else {
      // Stop animations
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);

      // Scale down animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [isListening]);

  const handlePress = () => {
    // Press feedback animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isListening ? 1 : 1.1,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <View style={[styles.container, style]}>
      {/* Pulse ring (only visible when listening) */}
      {isListening && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: buttonSize * 1.5,
              height: buttonSize * 1.5,
              borderRadius: buttonSize * 0.75,
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.3],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
      )}

      {/* Main button */}
      <Animated.View
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: isListening ? colors.error : colors.primary,
            transform: [{ scale: scaleAnim }],
          },
          disabled && styles.disabled,
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.8}
          style={styles.touchable}
        >
          <Icon
            name={isListening ? 'stop' : 'microphone'}
            size={iconSize}
            color={colors.textInverse}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: colors.error,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  touchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default VoiceButton;

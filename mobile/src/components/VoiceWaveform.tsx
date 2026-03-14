/**
 * VoiceWaveform - Audio visualization component
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme';

interface VoiceWaveformProps {
  isActive: boolean;
  volume?: number; // 0-1 normalized volume
  barCount?: number;
  color?: string;
  height?: number;
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive,
  volume = 0.5,
  barCount = 5,
  color = colors.primary,
  height = 40,
}) => {
  // Create animated values for each bar
  const barAnims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isActive) {
      // Animate each bar with different delays/speeds
      const animations = barAnims.map((anim, index) => {
        const randomDuration = 300 + Math.random() * 200;
        const randomDelay = index * 50;

        return Animated.loop(
          Animated.sequence([
            Animated.delay(randomDelay),
            Animated.timing(anim, {
              toValue: 0.3 + volume * 0.7,
              duration: randomDuration,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: randomDuration,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ])
        );
      });

      Animated.parallel(animations).start();
    } else {
      // Reset all bars
      barAnims.forEach((anim) => {
        anim.stopAnimation();
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => {
      barAnims.forEach((anim) => anim.stopAnimation());
    };
  }, [isActive, volume]);

  // Update bar heights based on volume
  useEffect(() => {
    if (isActive && volume > 0) {
      barAnims.forEach((anim, index) => {
        const targetValue = 0.3 + (volume * 0.7 * ((index % 3) + 1)) / 3;
        Animated.timing(anim, {
          toValue: targetValue,
          duration: 100,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [volume, isActive]);

  const barWidth = 4;
  const barMargin = 3;

  return (
    <View style={[styles.container, { height }]}>
      {barAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width: barWidth,
              marginHorizontal: barMargin,
              backgroundColor: color,
              transform: [
                {
                  scaleY: anim,
                },
              ],
              height: height,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 2,
  },
});

export default VoiceWaveform;

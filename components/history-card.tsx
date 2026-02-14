// components/history-card.tsx
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface HistoryCardProps {
  title: string;
  thumbnail: string;
  position: number;
  duration: number;
  onPress?: () => void;
}

const CARD_WIDTH = 160;
const CARD_HEIGHT = 100;

export function HistoryCard({
  title,
  thumbnail,
  position,
  duration,
  onPress,
}: HistoryCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progressPercent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;
  const timeRemaining = duration > 0 ? duration - position : 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.card}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={300}
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.gradientOverlay}
          />

          

          {/* Time Remaining */}
          {duration > 0 && (
            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>
                {formatTime(position)}
              </Text>
            </View>
          )}

          {/* Progress Bar */}
          {duration > 0 && (
            <View style={styles.progressContainer}>
              <LinearGradient
                colors={['#FF6B6B', '#EE5A24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBar, { width: `${progressPercent}%` }]}
              />
            </View>
          )}
        </View>

        {/* Title */}
        <Text numberOfLines={2} style={styles.title}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 107, 107, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    lineHeight: 16,
  },
});

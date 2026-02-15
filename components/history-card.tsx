import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

interface HistoryCardProps {
  title: string;
  thumbnail: string;
  position: number;
  duration: number;
  onPress?: () => void;
  /** Chế độ hiển thị: 'horizontal' (list ngang) hoặc 'grid' (lưới) */
  variant?: 'horizontal' | 'grid';
  /** Chiều rộng tùy chỉnh cho chế độ horizontal (Mặc định: 220) */
  width?: number;
  style?: StyleProp<ViewStyle>;
}

export function HistoryCard({
  title,
  thumbnail,
  position,
  duration,
  onPress,
  variant = 'horizontal',
  width = 220,
  style,
}: HistoryCardProps) {
  const isGrid = variant === 'grid';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animation Press
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  // Format: MM:SS hoặc HH:MM:SS
  const formatTime = useCallback((seconds: number) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const progressPercent = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        isGrid ? styles.gridContainer : { width, marginLeft: 16 },
        style,
      ]}
    >
      <Pressable
        style={styles.pressable}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Thumbnail Container (16:9) */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradientOverlay}
          />

          {/* Time Badge (Current Position) */}
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
              <View style={styles.progressBarBackground}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                />
              </View>
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
  gridContainer: {
    flex: 1,
    // Margin/Gap được xử lý bởi parent container
  },
  pressable: {
    flex: 1,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9, // Tỉ lệ chuẩn
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8, // Cao hơn thanh progress một chút
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    lineHeight: 18,
  },
});
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

interface MovieCardProps {
  id: string;
  title: string;
  poster?: string;
  onPress?: () => void;
  variant?: 'horizontal' | 'grid';
}

const CARD_WIDTH = 160;
const CARD_HEIGHT = 100;

export function MovieCard({
  id,
  title,
  poster,
  onPress,
  variant = 'horizontal',
}: MovieCardProps) {
  const isGrid = variant === 'grid';
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={isGrid ? styles.gridCard : styles.card}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={isGrid ? styles.gridPoster : styles.poster}>
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={styles.posterImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <IconSymbol name="film" size={36} color="#555" />
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.gradientOverlay}
          />
        </View>

        <ThemedText style={styles.title} numberOfLines={2}>
          {title}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginLeft: 16,
    width: CARD_WIDTH,
  },
  poster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridCard: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 16,
  },
  gridPoster: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    lineHeight: 16,
  },
});
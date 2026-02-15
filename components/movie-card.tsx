import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

interface MovieCardProps {
  id: string;
  title: string;
  poster?: string;
  onPress?: () => void;
  variant?: 'horizontal' | 'grid';
  /** Chiều rộng tùy chỉnh cho variant horizontal (Mặc định: 220) */
  width?: number;
  style?: StyleProp<ViewStyle>;
}

export function MovieCard({
  id,
  title,
  poster,
  onPress,
  variant = 'horizontal',
  width = 220, // Kích thước mặc định rộng hơn chút để đẹp tỉ lệ 16:9
  style,
}: MovieCardProps) {
  const isGrid = variant === 'grid';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animation logic
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

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        // Nếu là grid thì flex, nếu horizontal thì dùng width cố định
        isGrid ? styles.gridContainer : { width, marginLeft: 16 },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        {/* Image Container - Luôn giữ tỉ lệ 16:9 */}
        <View style={styles.imageContainer}>
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={styles.image}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.placeholder}>
              <IconSymbol name="film" size={32} color="rgba(255,255,255,0.2)" />
            </View>
          )}

          {/* Gradient nhẹ để tạo chiều sâu */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Title Section */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    // Margin xử lý ở parent (FlatList columnWrapperStyle) hoặc truyền vào style prop
  },
  pressable: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    // ✨ MAGIC: Tự động tính chiều cao theo tỉ lệ 16:9
    aspectRatio: 16 / 9, 
    borderRadius: 12,
    backgroundColor: '#1a1a1a', // Skeleton background
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    lineHeight: 18,
  },
});
// components/video-gesture-handler.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View
} from 'react-native';

interface VideoGestureHandlerProps {
  onVolumeChange: (volume: number) => void;
  volume: number;
  children: React.ReactNode;
  isLocked: boolean;
}

export function VideoGestureHandler({
  onVolumeChange,
  volume,
  children,
  isLocked,
}: VideoGestureHandlerProps) {
  const [showIndicator, setShowIndicator] = useState<'brightness' | 'volume' | null>(null);
  const [indicatorValue, setIndicatorValue] = useState(0);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const startY = useRef(0);
  const startValue = useRef(0);
  const gestureType = useRef<'brightness' | 'volume' | null>(null);
  const currentBrightness = useRef(0.5);

  // ✅ Dùng ref để luôn có giá trị volume mới nhất
  const currentVolumeRef = useRef(volume);

  // ✅ Cập nhật ref mỗi khi volume thay đổi
  useEffect(() => {
    currentVolumeRef.current = volume;
  }, [volume]);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const showIndicatorAnimation = useCallback(() => {
    Animated.timing(indicatorAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [indicatorAnim]);

  const hideIndicatorAnimation = useCallback(() => {
    Animated.timing(indicatorAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowIndicator(null);
    });
  }, [indicatorAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isLocked) return false;
        return (
          Math.abs(gestureState.dy) > 15 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderGrant: async (event) => {
        const { locationX } = event.nativeEvent;
        startY.current = event.nativeEvent.locationY;

        if (locationX < screenWidth / 2) {
          // Brightness - bên trái
          gestureType.current = 'brightness';
          try {
            const current = await Brightness.getBrightnessAsync();
            currentBrightness.current = current;
            startValue.current = current;
          } catch {
            startValue.current = 0.5;
          }
        } else {
          // Volume - bên phải
          gestureType.current = 'volume';
          // ✅ Lấy giá trị volume hiện tại từ ref thay vì closure cũ
          startValue.current = currentVolumeRef.current;
        }

        setShowIndicator(gestureType.current);
        setIndicatorValue(startValue.current);
        showIndicatorAnimation();
      },
      onPanResponderMove: async (_, gestureState) => {
        if (!gestureType.current) return;

        const deltaRatio = -gestureState.dy / (screenHeight * 0.6);
        const newValue = Math.max(0, Math.min(1, startValue.current + deltaRatio));

        setIndicatorValue(newValue);

        if (gestureType.current === 'brightness') {
          try {
            await Brightness.setBrightnessAsync(newValue);
            currentBrightness.current = newValue;
          } catch (e) {
            // Brightness API may not be available
          }
        } else {
          onVolumeChange(newValue);
        }
      },
      onPanResponderRelease: () => {
        gestureType.current = null;
        hideIndicatorAnimation();
      },
    })
  ).current;

  const getIndicatorIcon = (): string => {
    if (showIndicator === 'brightness') {
      return indicatorValue > 0.5 ? 'sunny' : 'sunny-outline';
    }
    if (indicatorValue === 0) return 'volume-mute';
    if (indicatorValue < 0.5) return 'volume-low';
    return 'volume-high';
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}

      {showIndicator && (
        <Animated.View style={[styles.indicator, { opacity: indicatorAnim }]}>
          <View style={styles.indicatorBox}>
            <Ionicons
              name={getIndicatorIcon() as any}
              size={24}
              color="#fff"
            />
            <View style={styles.indicatorBarContainer}>
              <View style={styles.indicatorBarBg}>
                <View
                  style={[
                    styles.indicatorBarFill,
                    { height: `${indicatorValue * 100}%` },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.indicatorText}>
              {Math.round(indicatorValue * 100)}%
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -30,
    marginTop: -80,
    zIndex: 100,
  },
  indicatorBox: {
    width: 60,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  indicatorBarContainer: {
    flex: 1,
    width: 6,
    justifyContent: 'flex-end',
  },
  indicatorBarBg: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  indicatorBarFill: {
    width: '100%',
    backgroundColor: '#E50914',
    borderRadius: 3,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
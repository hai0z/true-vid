// components/video-loading-screen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface VideoLoadingScreenProps {
  posterUrl?: string;
  title?: string;
  step: 'connecting' | 'extracting' | 'preparing' | 'ready';
  /** Delay trước khi hiện (ms), mặc định 500ms để chờ xoay ngang */
  delayMs?: number;
}

const STEPS = [
  { key: 'connecting', label: 'Đang kết nối...', icon: 'globe-outline' as const },
  { key: 'extracting', label: 'Đang trích xuất video...', icon: 'code-slash-outline' as const },
  { key: 'preparing', label: 'Đang chuẩn bị phát...', icon: 'film-outline' as const },
  { key: 'ready', label: 'Sẵn sàng!', icon: 'checkmark-circle' as const },
];

export function VideoLoadingScreen({
  posterUrl,
  title,
  step,
  delayMs = 1000,
}: VideoLoadingScreenProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [dots, setDots] = useState('');
  const [visible, setVisible] = useState(false);

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  // Delay trước khi render nội dung (chờ xoay ngang)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs]);

  useEffect(() => {
    if (!visible) return;

    // Fade in sau khi delay
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Spinner rotation
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();

    // Pulse cho poster
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Animated dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      spin.stop();
      pulse.stop();
      clearInterval(dotsInterval);
    };
  }, [visible]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Trước khi delay xong → màn đen trống (chờ xoay ngang)
  if (!visible) {
    return <View style={styles.container} />;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Background poster (blurred) */}
      {posterUrl && (
        <View style={styles.posterBackground}>
          <Image
            source={{ uri: posterUrl }}
            style={styles.posterBgImage}
            blurRadius={25}
          />
          <View style={styles.posterOverlay} />
        </View>
      )}

      <View style={styles.contentContainer}>
        {/* Poster thumbnail 16:9 — không có spinner overlay */}
        {posterUrl && (
          <Animated.View
            style={[
              styles.posterContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Image
              source={{ uri: posterUrl }}
              style={styles.posterImage}
              resizeMode="cover"
            />
          </Animated.View>
        )}

        {/* Fallback spinner khi không có poster */}
        {!posterUrl && (
          <Animated.View
            style={[
              styles.defaultSpinner,
              { transform: [{ rotate: spinInterpolate }] },
            ]}
          >
            <View style={styles.spinnerArcLarge} />
          </Animated.View>
        )}

        {/* Title */}
        {title && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}

        {/* Loading steps */}
        <View style={styles.stepsContainer}>
          {STEPS.filter((s) => s.key !== 'ready').map((s, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <View key={s.key} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    isCompleted && styles.stepDotCompleted,
                    isActive && styles.stepDotActive,
                    isPending && styles.stepDotPending,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  ) : isActive ? (
                    <View style={styles.stepDotActiveInner} />
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                    isPending && styles.stepLabelPending,
                  ]}
                >
                  {s.label}
                  {isActive ? dots : ''}
                </Text>

                {isActive && (
                  <Ionicons
                    name={s.icon}
                    size={14}
                    color="#E50914"
                    style={styles.stepIcon}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: `${((currentStepIndex + 1) / (STEPS.length - 1)) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const THUMB_WIDTH = 200;
const THUMB_HEIGHT = THUMB_WIDTH * (9 / 16); // 16:9

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  posterBgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  contentContainer: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 40,
  },

  /* ===== Poster 16:9, không có spinner overlay ===== */
  posterContainer: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },

  /* ===== Fallback spinner (không có poster) ===== */
  defaultSpinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerArcLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#E50914',
    borderRightColor: '#E50914',
    position: 'absolute',
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  stepsContainer: {
    gap: 10,
    alignSelf: 'stretch',
    maxWidth: 280,
    alignItems: 'flex-start',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotCompleted: {
    backgroundColor: '#27ae60',
  },
  stepDotActive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E50914',
  },
  stepDotActiveInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E50914',
  },
  stepDotPending: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#fff',
  },
  stepLabelCompleted: {
    color: 'rgba(255,255,255,0.5)',
  },
  stepLabelPending: {
    color: 'rgba(255,255,255,0.25)',
  },
  stepIcon: {
    marginLeft: 4,
  },
  progressBarContainer: {
    width: 200,
    marginTop: 4,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
});
// components/resume-overlay.tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ResumeOverlayProps {
  savedPosition: number;
  duration: number;
  onResume: () => void;
  onStartOver: () => void;
  countdownSeconds?: number;
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function ResumeOverlay({
  savedPosition,
  duration,
  onResume,
  onStartOver,
  countdownSeconds = 6,
}: ResumeOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const countdownBarAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [countdown, setCountdown] = useState(countdownSeconds);
  const timerRef = useRef<number>(null);
  const countdownRef = useRef<number>(null);

  const progressPercent = duration > 0 ? (savedPosition / duration) * 100 : 0;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse play button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Countdown bar
    Animated.timing(countdownBarAnim, {
      toValue: 0,
      duration: countdownSeconds * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Countdown number
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto resume
    timerRef.current = setTimeout(() => {
      animateOut(onResume);
    }, countdownSeconds * 1000);

    return () => {
      pulse.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const animateOut = (callback: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => callback());
  };

  const countdownWidth = countdownBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Play button - chính là nút Resume */}
        <Pressable
          onPress={() => animateOut(onResume)}
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}
        >
          <Animated.View
            style={[
              styles.playCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {/* Progress ring background */}
            <View style={styles.progressRing}>
              <View
                style={[
                  styles.progressRingFill,
                  {
                    // Dùng border trick cho circular progress
                    borderTopColor:
                      progressPercent > 12.5 ? '#E50914' : 'transparent',
                    borderRightColor:
                      progressPercent > 37.5 ? '#E50914' : 'transparent',
                    borderBottomColor:
                      progressPercent > 62.5 ? '#E50914' : 'transparent',
                    borderLeftColor:
                      progressPercent > 87.5 ? '#E50914' : 'transparent',
                  },
                ]}
              />
            </View>
            <Ionicons name="play" size={36} color="#fff" style={{ marginLeft: 4 }} />
          </Animated.View>
        </Pressable>

        {/* Info */}
        <Text style={styles.title}>Tiếp tục xem</Text>

        <View style={styles.timeContainer}>
          <Text style={styles.currentTime}>{formatTime(savedPosition)}</Text>
          <Text style={styles.separator}> / </Text>
          <Text style={styles.totalTime}>{formatTime(duration)}</Text>
        </View>

        {/* Progress bar */}
       

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.resumeBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => animateOut(onResume)}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.resumeBtnText}>Tiếp tục</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.restartBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => animateOut(onStartOver)}
          >
            <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.restartBtnText}>Từ đầu</Text>
          </Pressable>
        </View>

        {/* Countdown */}
        <View style={styles.countdownSection}>
          <Text style={styles.countdownText}>
            Tự động tiếp tục sau {countdown}s
          </Text>
          <View style={styles.countdownBarBg}>
            <Animated.View
              style={[styles.countdownBarFill, { width: countdownWidth }]}
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },

  // Play circle
  playCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(229, 9, 20, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    overflow: 'hidden',
  },
  progressRingFill: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'transparent',
  },

  // Text
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentTime: {
    color: '#E50914',
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 20,
    fontWeight: '300',
  },
  totalTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 240,
  },
  progressBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  percentText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 32,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  resumeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  restartBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },

  // Countdown
  countdownSection: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  countdownText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '500',
  },
  countdownBarBg: {
    width: 160,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  countdownBarFill: {
    height: '100%',
    backgroundColor: 'rgba(229, 9, 20, 0.6)',
    borderRadius: 1,
  },
});
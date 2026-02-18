// components/video-gesture-handler.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ━━━ Constants ━━━
const NETFLIX_RED = '#E50914';
const GESTURE_THRESHOLD_Y = 12;
const DIRECTION_RATIO = 1.5;
const SENSITIVITY = 0.55;
const HIDE_DELAY = 400;
const FADE_IN = 150;
const FADE_OUT = 250;
const SAFETY_TIMEOUT = 4000; // ✅ Auto-hide nếu mọi thứ fail

// ━━━ Helpers ━━━
function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function getIcon(type: 'brightness' | 'volume' | null, value: number): string {
  if (type === 'brightness') return value > 0.5 ? 'sunny' : 'sunny-outline';
  if (value === 0) return 'volume-mute';
  return value < 0.5 ? 'volume-low' : 'volume-high';
}

// ━━━ Types ━━━
interface Props {
  onVolumeChange: (volume: number) => void;
  volume: number;
  children: React.ReactNode;
  isLocked: boolean;
  isDrawerOpen?: boolean;
}

function VideoGestureHandlerBase({
  onVolumeChange,
  volume,
  children,
  isLocked,
  isDrawerOpen = false,
}: Props) {
  // ── Visual state ──
  const [activeType, setActiveType] = useState<'brightness' | 'volume' | null>(null);
  const [displayPercent, setDisplayPercent] = useState(0);

  // ── Animated ──
  const opacity = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;

  // ── Timers ──
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);

  // ── Gesture state (refs, không re-render) ──
  const gestureTypeRef = useRef<'brightness' | 'volume' | null>(null);
  const isGestureActiveRef = useRef(false); // ✅ Track gesture lifecycle
  const startValueRef = useRef(0);
  const brightnessRef = useRef(0.5);
  const pendingValueRef = useRef(0);
  const needsTextUpdate = useRef(false);
  const barHeightRef = useRef(80);

  // ── Props sync refs ──
  const lockedRef = useRef(isLocked);
  const drawerRef = useRef(isDrawerOpen);
  const volumeRef = useRef(volume);
  const volumeCbRef = useRef(onVolumeChange);

  useEffect(() => { lockedRef.current = isLocked; }, [isLocked]);
  useEffect(() => { drawerRef.current = isDrawerOpen; }, [isDrawerOpen]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { volumeCbRef.current = onVolumeChange; }, [onVolumeChange]);

  // ── Cleanup ALL timers ──
  const clearAllTimers = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = undefined;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  // ━━━ CORE: Show indicator ━━━
  const showIndicator = useCallback((type: 'brightness' | 'volume', initialValue: number) => {
    // Clear mọi pending hide
    clearAllTimers();

    // Set state
    gestureTypeRef.current = type;
    isGestureActiveRef.current = true;

    // Update fill & text ngay
    fillAnim.setValue(initialValue);
    setDisplayPercent(Math.round(initialValue * 100));
    setActiveType(type);

    // ✅ Stop animation cũ trước khi start mới → tránh conflict
    opacity.stopAnimation(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN,
        useNativeDriver: true,
      }).start();
    });

    // ✅ Safety auto-hide: dù gì cũng ẩn sau N giây
    safetyTimerRef.current = setTimeout(() => {
      console.warn('[GestureHandler] Safety timeout - force hiding indicator');
      forceHide();
    }, SAFETY_TIMEOUT);
  }, [opacity, fillAnim, clearAllTimers]);

  // ━━━ CORE: Schedule hide (với delay) ━━━
  const scheduleHide = useCallback(() => {
    isGestureActiveRef.current = false;

    // Clear hide timer cũ nếu có
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    hideTimerRef.current = setTimeout(() => {
      // ✅ Double-check: nếu gesture mới đã bắt đầu → không ẩn
      if (isGestureActiveRef.current) return;

      opacity.stopAnimation(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_OUT,
          useNativeDriver: true,
        }).start(({ finished }) => {
          // ✅ Luôn reset, kể cả khi bị interrupt
          // Chỉ giữ nếu gesture mới đang active
          if (!isGestureActiveRef.current) {
            setActiveType(null);
            gestureTypeRef.current = null;
          }
        });
      });
    }, HIDE_DELAY);
  }, [opacity]);

  // ━━━ CORE: Force hide (không delay, cho safety/terminate) ━━━
  const forceHide = useCallback(() => {
    isGestureActiveRef.current = false;
    clearAllTimers();

    opacity.stopAnimation(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setActiveType(null);
        gestureTypeRef.current = null;
      });
    });
  }, [opacity, clearAllTimers]);

  // ── Refs for PanResponder access ──
  const showIndicatorRef = useRef(showIndicator);
  const scheduleHideRef = useRef(scheduleHide);
  const forceHideRef = useRef(forceHide);

  useEffect(() => { showIndicatorRef.current = showIndicator; }, [showIndicator]);
  useEffect(() => { scheduleHideRef.current = scheduleHide; }, [scheduleHide]);
  useEffect(() => { forceHideRef.current = forceHide; }, [forceHide]);

  // ── RAF text updater ──
  const scheduleTextUpdate = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = undefined;
      if (needsTextUpdate.current) {
        needsTextUpdate.current = false;
        setDisplayPercent(Math.round(pendingValueRef.current * 100));
      }
    });
  }, []);
  const scheduleTextRef = useRef(scheduleTextUpdate);
  useEffect(() => { scheduleTextRef.current = scheduleTextUpdate; }, [scheduleTextUpdate]);

  // ━━━ PanResponder (tạo 1 lần, dùng refs) ━━━
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (e, gs) => {
        if (lockedRef.current || drawerRef.current) return false;

        const w = Dimensions.get('window').width;
        const x = e.nativeEvent.locationX;
        const inZone = x < w / 3 || x > (w * 2) / 3;
        if (!inZone) return false;

        return (
          Math.abs(gs.dy) > GESTURE_THRESHOLD_Y &&
          Math.abs(gs.dy) > Math.abs(gs.dx) * DIRECTION_RATIO
        );
      },

      // ✅ KHÔNG ASYNC - đây là fix chính
      onPanResponderGrant: (e) => {
        if (lockedRef.current || drawerRef.current) return;

        const w = Dimensions.get('window').width;
        const x = e.nativeEvent.locationX;

        if (x < w / 3) {
          // ── Brightness ──
          // Dùng cached value trước, async update sau
          startValueRef.current = brightnessRef.current;

          // Fire-and-forget: update startValue khi có giá trị thật
          Brightness.getBrightnessAsync()
            .then((b) => {
              brightnessRef.current = b;
              // Chỉ update nếu gesture vẫn đang active VÀ chưa di chuyển nhiều
              if (isGestureActiveRef.current && gestureTypeRef.current === 'brightness') {
                startValueRef.current = b;
              }
            })
            .catch(() => {});

          showIndicatorRef.current('brightness', startValueRef.current);
        } else if (x > (w * 2) / 3) {
          // ── Volume ──
          startValueRef.current = volumeRef.current;
          showIndicatorRef.current('volume', startValueRef.current);
        }
      },

      onPanResponderMove: (_, gs) => {
        const type = gestureTypeRef.current;
        if (!type) return;

        const h = Dimensions.get('window').height;
        const delta = -gs.dy / (h * SENSITIVITY);
        const val = clamp(startValueRef.current + delta, 0, 1);

        // Animated fill (không re-render)
        fillAnim.setValue(val);

        // Batch text update
        pendingValueRef.current = val;
        needsTextUpdate.current = true;
        scheduleTextRef.current?.();

        // Apply
        if (type === 'brightness') {
          Brightness.setBrightnessAsync(val).catch(() => {});
          brightnessRef.current = val;
        } else {
          volumeCbRef.current(val);
        }
      },

      onPanResponderRelease: () => {
        scheduleHideRef.current();
      },

      onPanResponderTerminate: () => {
        // ✅ Gesture bị hệ thống cướp → force hide ngay
        forceHideRef.current();
      },
    })
  ).current;

  // ── Layout ──
  const handleBarLayout = useCallback((e: LayoutChangeEvent) => {
    barHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  // ── Derived render values ──
  const animatedFillHeight = useMemo(
    () => fillAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, barHeightRef.current],
      extrapolate: 'clamp',
    }),
    []
  );

  const icon = useMemo(
    () => getIcon(activeType, displayPercent / 100),
    [activeType, displayPercent]
  );

  const percentText = `${displayPercent}%`;
  const posStyle = activeType === 'brightness' ? styles.indicatorLeft : styles.indicatorRight;

  // ━━━ RENDER ━━━
  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}

      {activeType != null && (
        <Animated.View
          style={[styles.indicator, posStyle, { opacity }]}
          pointerEvents="none"
        >
          <View style={styles.box}>
            <Ionicons name={icon as any} size={24} color="#fff" />

            <View style={styles.barWrap}>
              <View style={styles.barBg} onLayout={handleBarLayout}>
                <Animated.View style={[styles.barFill, { height: animatedFillHeight }]} />
              </View>
            </View>

            <Text style={styles.text}>{percentText}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export const VideoGestureHandler = memo(VideoGestureHandlerBase);

// ━━━ STYLES ━━━
const styles = StyleSheet.create({
  container: { flex: 1 },

  indicator: {
    position: 'absolute',
    top: '50%',
    marginTop: -80,
    zIndex: 100,
  },
  indicatorLeft: { left: 40 },
  indicatorRight: { right: 40 },

  box: {
    width: 60,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },

  barWrap: { flex: 1, width: 6, justifyContent: 'flex-end' },
  barBg: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: NETFLIX_RED,
    borderRadius: 3,
  },

  text: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
import { useSettingsStore } from '@/store/use-settings-store';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { FlashList } from '@shopify/flash-list';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  GestureResponderEvent,
  Pressable,
  Image as RNImage,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Interfaces ───────────────────────────────────────────
export interface RelatedVideo {
  id: string;
  name: string;
  slug: string;
  thumb_url: string;
  time?: string;
  actors?: string[];
}

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  isBuffering: boolean;
  isMuted: boolean;
  isLocked: boolean;
  playbackSpeed: number;
  title?: string;
  videoUrl?: string;
  posterUrl?: string;
  relatedVideos?: RelatedVideo[];
  onRelatedVideoPress?: (video: RelatedVideo) => void;
  onGestureStateChange?: (isDrawerOpen: boolean) => void;
  showDrawer?: boolean;
  showRelatedMenu?: boolean;
  setShowRelatedMenu?: (show: boolean) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSeekStart: () => void;
  onSeekComplete: (time: number) => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onMuteToggle: () => void;
  onLockToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onGoBack: () => void;
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
}

// ─── Constants ────────────────────────────────────────────
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const HIDE_TIMEOUT = 2500;
const NETFLIX_RED = '#E50914';
const DRAWER_WIDTH = 350;
const LONG_PRESS_DELAY = 500;
const DOUBLE_TAP_DELAY = 300;
const SEEK_GUARD_TTL = 5000;
const SEEK_DEBOUNCE_MS = 100;
const RELATED_ITEM_HEIGHT = 100;

// ─── Helpers (thuần, không tạo closure mỗi render) ───────
function clamp(val: number, min: number, max: number): number {
  if (!isFinite(val) || isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

function formatTime(seconds: number): string {
  const safe = clamp(seconds, 0, 999999);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  if (hrs > 0)
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMO SUB-COMPONENTS (tách để giảm re-render)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Double Tap Overlay ──
const DoubleTapOverlay = memo(({
  side,
  seconds,
  opacity,
}: {
  side: 'left' | 'right';
  seconds: number;
  opacity: Animated.Value;
}) => (
  <Animated.View
    style={[
      styles.doubleTapIndicator,
      side === 'left' ? styles.dtLeft : styles.dtRight,
      { opacity },
    ]}
  >
    <View style={styles.dtIconContainer}>
      <Ionicons
        name={side === 'left' ? 'play-back' : 'play-forward'}
        size={40}
        color="#ffffff"
        style={styles.dtIconOffset}
      />
      <Text style={styles.dtText}>{seconds}s</Text>
    </View>
  </Animated.View>
));

// ── Long Press Speed Indicator ──
const LongPressIndicator = memo(({
  fadeAnim,
  slideAnim,
}: {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}) => (
  <Animated.View
    style={[
      styles.longPressOverlay,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}
  >
    <View style={styles.longPressIndicator}>
      <View style={styles.longPressDot} />
      <Ionicons name="play-forward" size={18} color="#fff" />
      <Text style={styles.longPressText}>Tốc độ 2x</Text>
    </View>
  </Animated.View>
));

// ── Speed Menu ──
const SpeedMenu = memo(({
  currentSpeed,
  onSpeedChange,
  onClose,
}: {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  onClose: () => void;
}) => (
  <Pressable style={styles.menuBackdrop} onPress={onClose}>
    <View style={styles.speedMenuContainer}>
      <Text style={styles.menuHeader}>Tốc độ</Text>
      {SPEEDS.map((speed) => (
        <Pressable
          key={speed}
          style={[styles.menuItem, currentSpeed === speed && styles.menuItemActive]}
          onPress={() => onSpeedChange(speed)}
        >
          <Text
            style={[
              styles.menuItemText,
              currentSpeed === speed && styles.menuItemTextActive,
            ]}
          >
            {speed}x
          </Text>
        </Pressable>
      ))}
    </View>
  </Pressable>
));

// ── Seek Preview ──
const SeekPreview = memo(({
  position,
  displayTime,
  videoUrl,
  posterUrl,
  thumbnailVideoRef,
  onThumbnailLoad,
}: {
  position: number;
  displayTime: number;
  videoUrl?: string;
  posterUrl?: string;
  thumbnailVideoRef: React.RefObject<Video | null>;
  onThumbnailLoad: () => void;
}) => {
  const clampedPos = Math.max(10, Math.min(90, position));

  return (
    <View style={[styles.seekPreview, { left: `${clampedPos}%` as any }]}>
      <View style={styles.seekPreviewContainer}>
        {videoUrl ? (
          <Video
            ref={thumbnailVideoRef}
            source={{ uri: videoUrl }}
            style={styles.seekPreviewImage}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted
            onLoad={onThumbnailLoad}
          />
        ) : posterUrl ? (
          <RNImage source={{ uri: posterUrl }} style={styles.seekPreviewImage} resizeMode="cover" />
        ) : (
          <View style={styles.seekPreviewPlaceholder}>
            <Ionicons name="film-outline" size={24} color="rgba(255,255,255,0.5)" />
          </View>
        )}
        <Text style={styles.seekPreviewTime}>{formatTime(displayTime)}</Text>
      </View>
      <View style={styles.seekPreviewArrow} />
    </View>
  );
});

// ── Related Video Item (cho FlashList) ──
const RelatedVideoItem = memo(({
  item,
  onPress,
}: {
  item: RelatedVideo;
  onPress: (video: RelatedVideo) => void;
}) => {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      style={({ pressed }) => [styles.relatedItem, pressed && styles.relatedItemPressed]}
      onPress={handlePress}
    >
      <View style={styles.relatedThumbContainer}>
        <Image source={{ uri: item.thumb_url }} style={styles.relatedThumb} contentFit="cover" />
        {item.time != null && (
          <View style={styles.relatedDurationBadge}>
            <Text style={styles.relatedDurationText}>{item.time}</Text>
          </View>
        )}
        <View style={styles.playIconOverlay}>
          <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.85)" />
        </View>
      </View>
      <View style={styles.relatedInfo}>
        <Text style={styles.relatedTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.relatedSubtitle} numberOfLines={1}>
          {item.actors && item.actors.length > 0
            ? item.actors.slice(0, 2).join(', ')
            : 'Video đề xuất'}
        </Text>
      </View>
    </Pressable>
  );
});

// ── Locked Overlay ──
const LockedOverlay = memo(({
  visible,
  fadeAnim,
  onToggle,
}: {
  visible: boolean;
  fadeAnim: Animated.Value;
  onToggle: () => void;
}) => {
  if (!visible) return null;
  return (
    <Animated.View style={[styles.lockOverlay, { opacity: fadeAnim }]}>
      <View style={styles.lockContainer}>
        <Text style={styles.lockText}>Đã khóa màn hình</Text>
        <Pressable style={styles.lockButton} onPress={onToggle}>
          <Ionicons name="lock-closed" size={24} color="#000" />
          <Text style={styles.unlockText}>Mở khóa</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

// ── Drawer Header ──
const DrawerHeader = memo(({
  paddingTop,
  onClose,
}: {
  paddingTop: number;
  onClose: () => void;
}) => (
  <View style={[styles.drawerHeader, { paddingTop }]}>
    <Text style={styles.drawerTitle}>Nội dung khác</Text>
    <Pressable onPress={onClose} hitSlop={10} style={styles.drawerCloseBtn}>
      <Ionicons name="close" size={24} color="#fff" />
    </Pressable>
  </View>
));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  buffered,
  isBuffering,
  isMuted,
  isLocked,
  playbackSpeed,
  title,
  videoUrl,
  posterUrl,
  relatedVideos = [],
  onRelatedVideoPress,
  onGestureStateChange,
  showDrawer = false,
  showRelatedMenu: showRelatedMenuProp,
  setShowRelatedMenu: setShowRelatedMenuProp,
  onPlayPause,
  onSeekStart,
  onSeekComplete,
  onSkipForward,
  onSkipBackward,
  onMuteToggle,
  onLockToggle,
  onSpeedChange,
  onGoBack,
  onDoubleTapLeft,
  onDoubleTapRight,
}: VideoControlsProps) {
  const insets = useSafeAreaInsets();
  const { skipDuration, doubleTapSkipDuration, showThumbnailPreview } = useSettingsStore();

  // ─── State ───
  const [visible, setVisible] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const [localShowRelatedMenu, setLocalShowRelatedMenu] = useState(false);
  const showRelatedMenu = showRelatedMenuProp ?? localShowRelatedMenu;
  const setShowRelatedMenu = setShowRelatedMenuProp ?? setLocalShowRelatedMenu;

  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [doubleTapSeconds, setDoubleTapSeconds] = useState(0);
  const [isLongPressSpeed, setIsLongPressSpeed] = useState(false);

  // Seek State
  const [seekDisplayTime, setSeekDisplayTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [guardedTime, setGuardedTime] = useState(0);
  const [thumbnailVideoReady, setThumbnailVideoReady] = useState(false);

  // ─── Refs (không gây re-render) ───
  const isSeekingRef = useRef(false);
  const seekValueRef = useRef(0);
  const seekPreviewPositionRef = useRef(0); // ✅ Chuyển từ state → ref
  const seekGuardRef = useRef<{ target: number; expireAt: number } | null>(null);

  const originalSpeedRef = useRef(playbackSpeed);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressingRef = useRef(false);
  const wasLongPressRef = useRef(false);

  const thumbnailVideoRef = useRef<Video>(null);
  const isThumbnailSeekingRef = useRef(false);
  const nextThumbnailSeekPosRef = useRef<number | null>(null);
  const lastSeekCompleteTime = useRef(0);
  const lastSeekCallTime = useRef(0);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef(0);
  const lastTapSide = useRef<'left' | 'right' | null>(null);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Animations ───
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const doubleTapAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const longPressFadeAnim = useRef(new Animated.Value(0)).current;
  const longPressSlideAnim = useRef(new Animated.Value(-20)).current;

  // ─── Derived values (cached) ───
  const safeDuration = useMemo(
    () => (isFinite(duration) && duration > 0 ? duration : 1),
    [duration]
  );
  const safeCurrentTime = useMemo(
    () => clamp(currentTime, 0, safeDuration),
    [currentTime, safeDuration]
  );
  const safeBuffered = useMemo(
    () => clamp(buffered, 0, safeDuration),
    [buffered, safeDuration]
  );
  const bufferedPercent = useMemo(
    () => `${(safeBuffered / safeDuration) * 100}%`,
    [safeBuffered, safeDuration]
  );

  const sliderValue = isSeekingRef.current ? seekValueRef.current : guardedTime;
  const displayTime = isSeeking ? seekDisplayTime : guardedTime;

  // Precompute inset-based paddings
  const topPadding = useMemo(() => insets.top + 10, [insets.top]);
  const bottomPadding = useMemo(() => insets.bottom + 10, [insets.bottom]);
  const drawerTopPadding = useMemo(() => insets.top + 16, [insets.top]);
  const drawerBottomPadding = useMemo(() => insets.bottom + 20, [insets.bottom]);

  // ─── Seek guard sync ───
  useEffect(() => {
    if (isSeekingRef.current) return;

    const guard = seekGuardRef.current;
    if (guard) {
      if (Math.abs(safeCurrentTime - guard.target) < 2 || Date.now() > guard.expireAt) {
        seekGuardRef.current = null;
        setGuardedTime(safeCurrentTime);
      }
      return;
    }
    setGuardedTime(safeCurrentTime);
  }, [safeCurrentTime]);

  // ─── Thumbnail video init ───
  useEffect(() => {
    if (!videoUrl) return;
    setThumbnailVideoReady(false);
    isThumbnailSeekingRef.current = false;
    nextThumbnailSeekPosRef.current = null;
  }, [videoUrl]);

  // ─── Cleanup ───
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
    };
  }, []);

  // ━━━ Callbacks ━━━

  const processThumbnailSeek = useCallback(
    async (timeMs: number) => {
      if (!thumbnailVideoRef.current || !thumbnailVideoReady) return;

      if (isThumbnailSeekingRef.current) {
        nextThumbnailSeekPosRef.current = timeMs;
        return;
      }

      isThumbnailSeekingRef.current = true;
      try {
        await thumbnailVideoRef.current.setPositionAsync(timeMs, {
          toleranceMillisBefore: 1000,
          toleranceMillisAfter: 1000,
        });
      } catch (error: any) {
        if (!error?.message?.includes('interrupted')) {
          console.warn('Thumbnail seek error:', error);
        }
      } finally {
        isThumbnailSeekingRef.current = false;
        if (nextThumbnailSeekPosRef.current !== null) {
          const next = nextThumbnailSeekPosRef.current;
          nextThumbnailSeekPosRef.current = null;
          processThumbnailSeek(next);
        }
      }
    },
    [thumbnailVideoReady]
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const resetHideTimer = useCallback(() => {
    clearHideTimer();
    if (isPlaying && visible && !showSpeedMenu && !showRelatedMenu) {
      hideTimer.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, HIDE_TIMEOUT);
    }
  }, [isPlaying, visible, showSpeedMenu, showRelatedMenu, fadeAnim, clearHideTimer]);

  useEffect(() => {
    resetHideTimer();
    return clearHideTimer;
  }, [resetHideTimer, clearHideTimer]);

  // ── Drawer animation ──
  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: showRelatedMenu ? 0 : DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onGestureStateChange?.(showRelatedMenu);
    if (showRelatedMenu) clearHideTimer();
    else resetHideTimer();
  }, [showRelatedMenu]);

  // ── Visibility toggle ──
  const toggleVisibility = useCallback(() => {
    if (showSpeedMenu) {
      setShowSpeedMenu(false);
      return;
    }
    if (showRelatedMenu) {
      setShowRelatedMenu(false);
      return;
    }

    if (visible) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() =>
        setVisible(false)
      );
    } else {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      resetHideTimer();
    }
  }, [showSpeedMenu, showRelatedMenu, visible, fadeAnim, resetHideTimer, setShowRelatedMenu]);

  // ── Long Press ──
  const handlePressIn = useCallback(() => {
    wasLongPressRef.current = false;
    if (isLocked || showSpeedMenu || showRelatedMenu || isSeekingRef.current) return;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      isLongPressingRef.current = true;

      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current);
        doubleTapTimer.current = null;
      }
      lastTapTime.current = 0;
      lastTapSide.current = null;

      if (visible) {
        clearHideTimer();
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
          setVisible(false)
        );
      }

      originalSpeedRef.current = playbackSpeed;
      setIsLongPressSpeed(true);
      onSpeedChange(2);

      Animated.parallel([
        Animated.timing(longPressFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(longPressSlideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }, LONG_PRESS_DELAY);
  }, [isLocked, showSpeedMenu, showRelatedMenu, playbackSpeed, onSpeedChange, visible, fadeAnim, clearHideTimer, longPressFadeAnim, longPressSlideAnim]);

  const handlePressOut = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isLongPressingRef.current) return;
    isLongPressingRef.current = false;
    setIsLongPressSpeed(false);
    onSpeedChange(originalSpeedRef.current);

    Animated.parallel([
      Animated.timing(longPressFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(longPressSlideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start();

    resetHideTimer();
  }, [onSpeedChange, longPressFadeAnim, longPressSlideAnim, resetHideTimer]);

  // ── Tap handler ──
  const handleTap = useCallback(
    (event: GestureResponderEvent) => {
      if (wasLongPressRef.current) {
        wasLongPressRef.current = false;
        return;
      }
      if (isSeekingRef.current) return;

      const { locationX } = event.nativeEvent;
      const now = Date.now();
      const side: 'left' | 'right' = locationX < SCREEN_W / 2 ? 'left' : 'right';

      if (now - lastTapTime.current < DOUBLE_TAP_DELAY && lastTapSide.current === side) {
        if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);

        if (side === 'left') onDoubleTapLeft();
        else onDoubleTapRight();

        setDoubleTapSeconds((prev) => prev + doubleTapSkipDuration);
        setDoubleTapSide(side);

        Animated.sequence([
          Animated.timing(doubleTapAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(doubleTapAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start(() => {
          setDoubleTapSide(null);
          setDoubleTapSeconds(0);
        });

        lastTapTime.current = 0;
        lastTapSide.current = null;
      } else {
        lastTapTime.current = now;
        lastTapSide.current = side;
        doubleTapTimer.current = setTimeout(() => {
          toggleVisibility();
          lastTapTime.current = 0;
          lastTapSide.current = null;
        }, DOUBLE_TAP_DELAY);
      }
    },
    [onDoubleTapLeft, onDoubleTapRight, doubleTapSkipDuration, doubleTapAnim, toggleVisibility]
  );

  // ── Seek handlers ──
  const handleSlidingStart = useCallback(
    (value: number) => {
      isSeekingRef.current = true;
      seekValueRef.current = clamp(value, 0, safeDuration);
      setIsSeeking(true);
      setSeekDisplayTime(seekValueRef.current);
      nextThumbnailSeekPosRef.current = null;
      isThumbnailSeekingRef.current = false;
      onSeekStart();
      clearHideTimer();
    },
    [safeDuration, onSeekStart, clearHideTimer]
  );

  const handleValueChange = useCallback(
    (value: number) => {
      if (!isSeekingRef.current) return;
      const clamped = clamp(value, 0, safeDuration);
      seekValueRef.current = clamped;
      setSeekDisplayTime(clamped);
      seekPreviewPositionRef.current = (clamped / safeDuration) * 100;
      processThumbnailSeek(clamped * 1000);
    },
    [safeDuration, processThumbnailSeek]
  );

  const handleSlidingComplete = useCallback(
    (value: number) => {
      const clamped = clamp(value, 0, safeDuration);
      const now = Date.now();

      if (
        now - lastSeekCallTime.current < SEEK_DEBOUNCE_MS &&
        Math.abs(clamped - lastSeekCompleteTime.current) < 0.5
      ) {
        isSeekingRef.current = false;
        setIsSeeking(false);
        return;
      }

      lastSeekCompleteTime.current = clamped;
      lastSeekCallTime.current = now;
      nextThumbnailSeekPosRef.current = null;

      seekGuardRef.current = { target: clamped, expireAt: Date.now() + SEEK_GUARD_TTL };
      setGuardedTime(clamped);
      onSeekComplete(clamped);

      isSeekingRef.current = false;
      setIsSeeking(false);
      resetHideTimer();
    },
    [safeDuration, onSeekComplete, resetHideTimer]
  );

  // ── Thumbnail load ──
  const handleThumbnailLoad = useCallback(() => {
    setThumbnailVideoReady(true);
  }, []);

  // ── Speed menu callbacks ──
  const handleSpeedSelect = useCallback(
    (speed: number) => {
      onSpeedChange(speed);
      setShowSpeedMenu(false);
      resetHideTimer();
    },
    [onSpeedChange, resetHideTimer]
  );

  const handleCloseSpeedMenu = useCallback(() => setShowSpeedMenu(false), []);

  // ── Related video callbacks ──
  const handleRelatedPress = useCallback(
    (video: RelatedVideo) => {
      onRelatedVideoPress?.(video);
      setShowRelatedMenu(false);
    },
    [onRelatedVideoPress, setShowRelatedMenu]
  );

  const handleCloseDrawer = useCallback(() => setShowRelatedMenu(false), [setShowRelatedMenu]);
  const handleOpenDrawer = useCallback(() => setShowRelatedMenu(true), [setShowRelatedMenu]);
  const handleToggleSpeedMenu = useCallback(
    () => setShowSpeedMenu((prev) => !prev),
    []
  );

  // ── Center button handlers (stable, không tạo mới mỗi render) ──
  const handleSkipBackward = useCallback(() => {
    onSkipBackward();
    resetHideTimer();
  }, [onSkipBackward, resetHideTimer]);

  const handlePlayPause = useCallback(() => {
    onPlayPause();
    resetHideTimer();
  }, [onPlayPause, resetHideTimer]);

  const handleSkipForward = useCallback(() => {
    onSkipForward();
    resetHideTimer();
  }, [onSkipForward, resetHideTimer]);

  // ── FlashList renderItem (stable) ──
  const renderRelatedItem = useCallback(
    ({ item }: { item: RelatedVideo }) => (
      <RelatedVideoItem item={item} onPress={handleRelatedPress} />
    ),
    [handleRelatedPress]
  );

  const relatedKeyExtractor = useCallback((item: RelatedVideo) => item.id, []);

  // ── FlashList footer padding ──
  const relatedListStyle = useMemo(
    () => ({ paddingBottom: drawerBottomPadding }),
    [drawerBottomPadding]
  );

  // ━━━ RENDER: Locked ━━━
  if (isLocked) {
    return (
      <Pressable style={styles.fullscreen} onPress={toggleVisibility}>
        <LockedOverlay visible={visible} fadeAnim={fadeAnim} onToggle={onLockToggle} />
      </Pressable>
    );
  }

  // ━━━ RENDER: Drawer only ━━━
  if (showDrawer) {
    return (
      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: drawerAnim }] }]}>
        <LinearGradient
          colors={['rgba(15,15,15,0.95)', 'rgba(25,25,25,0.98)']}
          style={styles.drawerContent}
        >
          <DrawerHeader paddingTop={drawerTopPadding} onClose={handleCloseDrawer} />

          <FlashList
            data={relatedVideos}
            keyExtractor={relatedKeyExtractor}
            renderItem={renderRelatedItem}
            contentContainerStyle={relatedListStyle}
            showsVerticalScrollIndicator={false}
            drawDistance={300}
          />
        </LinearGradient>
      </Animated.View>
    );
  }

  // ━━━ RENDER: Full Controls ━━━
  return (
    <Pressable
      style={styles.fullscreen}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handleTap}
    >
      {/* Loading Spinner */}
      {isBuffering && (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={NETFLIX_RED} />
        </View>
      )}

      {/* Double Tap */}
      {doubleTapSide && (
        <DoubleTapOverlay
          side={doubleTapSide}
          seconds={doubleTapSeconds}
          opacity={doubleTapAnim}
        />
      )}

      {/* Long Press 2x */}
      {isLongPressSpeed && (
        <LongPressIndicator fadeAnim={longPressFadeAnim} slideAnim={longPressSlideAnim} />
      )}

      {/* Controls */}
      {visible && (
        <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>
          {/* ── Top Bar ── */}
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'transparent']}
            style={[styles.topGradient, { paddingTop: topPadding }]}
          >
            <View style={styles.topBarContent}>
              <Pressable onPress={onGoBack} hitSlop={15}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
              </Pressable>

              <Text style={styles.titleText} numberOfLines={1}>
                {title || 'Đang phát'}
              </Text>

              <View style={styles.topRightIcons}>
                {relatedVideos.length > 0 && (
                  <Pressable onPress={handleOpenDrawer} hitSlop={10} style={styles.topIconSpacing}>
                    <MaterialIcons name="video-library" size={26} color="#fff" />
                  </Pressable>
                )}
                <Pressable onPress={handleToggleSpeedMenu} hitSlop={10}>
                  <MaterialIcons name="speed" size={26} color="#fff" />
                </Pressable>
                <Pressable onPress={onMuteToggle} hitSlop={10} style={styles.muteIconSpacing}>
                  <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={26} color="#fff" />
                </Pressable>
              </View>
            </View>
          </LinearGradient>

          {/* ── Center Controls ── */}
          <View style={styles.centerControls}>
            {!isBuffering && (
              <>
                <Pressable
                  onPress={handleSkipBackward}
                  style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
                >
                  <Ionicons name="play-back" size={42} color="#fff" />
                </Pressable>

                <Pressable
                  onPress={handlePlayPause}
                  style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}
                >
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={64} color="#fff" />
                </Pressable>

                <Pressable
                  onPress={handleSkipForward}
                  style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
                >
                  <Ionicons name="play-forward" size={42} color="#fff" />
                </Pressable>
              </>
            )}
          </View>

          {/* ── Bottom Bar ── */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={[styles.bottomGradient, { paddingBottom: bottomPadding }]}
          >
            {/* Seek Preview */}
            {isSeeking && showThumbnailPreview && (
              <SeekPreview
                position={seekPreviewPositionRef.current}
                displayTime={seekDisplayTime}
                videoUrl={videoUrl}
                posterUrl={posterUrl}
                thumbnailVideoRef={thumbnailVideoRef}
                onThumbnailLoad={handleThumbnailLoad}
              />
            )}

            {/* Slider */}
            <View style={styles.sliderContainer}>
              <View style={styles.progressTrackBackground} />
              <View style={[styles.bufferedBar, { width: bufferedPercent as any }]} />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={safeDuration}
                value={sliderValue}
                onSlidingStart={handleSlidingStart}
                onValueChange={handleValueChange}
                onSlidingComplete={handleSlidingComplete}
                minimumTrackTintColor={NETFLIX_RED}
                maximumTrackTintColor="transparent"
                thumbTintColor={NETFLIX_RED}
              />
            </View>

            {/* Time + Lock */}
            <View style={styles.bottomMetaRow}>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {formatTime(displayTime)} / {formatTime(safeDuration)}
                </Text>
              </View>
              <Pressable onPress={onLockToggle} hitSlop={15} style={styles.lockIconBtn}>
                <Ionicons name="lock-open-outline" size={22} color="#fff" />
                <Text style={styles.lockLabel}>Khóa</Text>
              </Pressable>
            </View>
          </LinearGradient>

          {/* Speed Menu Overlay */}
          {showSpeedMenu && (
            <SpeedMenu
              currentSpeed={playbackSpeed}
              onSpeedChange={handleSpeedSelect}
              onClose={handleCloseSpeedMenu}
            />
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const styles = StyleSheet.create({
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'space-between',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 20,
  },
  centerLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  btnPressed: { opacity: 0.5, transform: [{ scale: 0.95 }] },

  // ── Top ──
  topGradient: { height: 100, justifyContent: 'flex-start', paddingHorizontal: 16 },
  topBarContent: { flexDirection: 'row', alignItems: 'center', height: 50 },
  titleText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  topRightIcons: { flexDirection: 'row', alignItems: 'center' },
  topIconSpacing: { marginRight: 20 },
  muteIconSpacing: { marginLeft: 20 },

  // ── Center ──
  centerControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 50,
  },
  playBtn: { alignItems: 'center', justifyContent: 'center' },
  skipBtn: { alignItems: 'center', justifyContent: 'center', opacity: 0.9 },

  // ── Bottom ──
  bottomGradient: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 40 },
  sliderContainer: { height: 30, justifyContent: 'center', marginBottom: 4 },
  slider: { width: '100%', height: 40, zIndex: 5 },
  progressTrackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  bufferedBar: {
    position: 'absolute',
    left: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 2,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
  },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  lockIconBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 8,
  },
  lockLabel: {
    color: '#fff',
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // ── Locked ──
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContainer: { alignItems: 'center', gap: 20 },
  lockText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  lockButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  unlockText: { color: '#000', fontSize: 15, fontWeight: '700' },

  // ── Double Tap ──
  doubleTapIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 350,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dtLeft: {
    left: 0,
    borderTopRightRadius: SCREEN_H,
    borderBottomRightRadius: SCREEN_H,
  },
  dtRight: {
    right: 0,
    borderTopLeftRadius: SCREEN_H,
    borderBottomLeftRadius: SCREEN_H,
  },
  dtIconContainer: { alignItems: 'center' },
  dtIconOffset: { bottom: -16 },
  dtText: { color: '#fff', marginTop: 8, fontWeight: '700' },

  // ── Long Press 2x ──
  longPressOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  longPressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  longPressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NETFLIX_RED },
  longPressText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  // ── Speed Menu ──
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedMenuContainer: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    width: 250,
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  menuHeader: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 10,
    textTransform: 'uppercase',
  },
  menuItem: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },
  menuItemActive: { backgroundColor: '#fff' },
  menuItemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  menuItemTextActive: { color: '#000', fontWeight: '700' },

  // ── Drawer ──
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_WIDTH,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerContent: { flex: 1, paddingHorizontal: 16 },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  drawerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  drawerCloseBtn: { marginRight: 8 },

  relatedItem: {
    flexDirection: 'row',
    marginBottom: 4,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  relatedItemPressed: { opacity: 0.7, backgroundColor: 'rgba(255,255,255,0.08)' },
  relatedThumbContainer: {
    width: 140,
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  relatedThumb: { width: '100%', height: '100%' },
  relatedDurationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  relatedDurationText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  relatedInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  relatedTitle: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 6 },
  relatedSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 15 },

  // ── Seek Preview ──
  seekPreview: {
    position: 'relative',
    transform: [{ translateX: -80 }],
    zIndex: 9999,
    width: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekPreviewContainer: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  seekPreviewPlaceholder: {
    width: 160,
    height: 90,
    backgroundColor: 'rgba(40,40,40,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekPreviewImage: { width: 160, height: 90, backgroundColor: '#1a1a1a' },
  seekPreviewTime: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seekPreviewArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(20,20,20,0.95)',
  },
});
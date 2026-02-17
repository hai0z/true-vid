import { useSettingsStore } from '@/store/use-settings-store';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { FlashList } from "@shopify/flash-list";
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    GestureResponderEvent,
    Pressable,
    Image as RNImage,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// ─── Interfaces ───────────────────────────────────────────

export interface RelatedVideo {
  id: string;
  name: string;
  slug: string;
  thumb_url: string;
  time?: string; // VD: "24:00"
  actors?: string[]; // Danh sách diễn viên
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
  videoUrl?: string; // M3U8 URL để preview
  posterUrl?: string; // Poster image để hiển thị trong preview
  // New Props cho Related Videos
  relatedVideos?: RelatedVideo[];
  onRelatedVideoPress?: (video: RelatedVideo) => void;
  onGestureStateChange?: (isDrawerOpen: boolean) => void; // Callback để thông báo drawer state
  showDrawer?: boolean; // Để render chỉ drawer hoặc chỉ controls
  showRelatedMenu?: boolean; // State từ parent
  setShowRelatedMenu?: (show: boolean) => void; // Setter từ parent

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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_TIMEOUT = 2500;
const NETFLIX_RED = '#E50914';
const DRAWER_WIDTH = 350; // Độ rộng của menu bên phải

// ─── Helpers ──────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  if (!isFinite(val) || isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

function formatTime(seconds: number): string {
  const safe = clamp(seconds, 0, 999999);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────

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

  // Get settings from store
  const { skipDuration, doubleTapSkipDuration, showThumbnailPreview } = useSettingsStore();

  const [visible, setVisible] = useState(true);

  // Menu States
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Sử dụng state từ props hoặc local state
  const [localShowRelatedMenu, setLocalShowRelatedMenu] = useState(false);
  const showRelatedMenu = showRelatedMenuProp ?? localShowRelatedMenu;
  const setShowRelatedMenu = setShowRelatedMenuProp ?? setLocalShowRelatedMenu;

  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [doubleTapSeconds, setDoubleTapSeconds] = useState(0);

  // ─── Long Press 2x Speed ───
  const [isLongPressSpeed, setIsLongPressSpeed] = useState(false);
  const originalSpeedRef = useRef(playbackSpeed);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressingRef = useRef(false);
  const wasLongPressRef = useRef(false);
  const longPressFadeAnim = useRef(new Animated.Value(0)).current;
  const longPressSlideAnim = useRef(new Animated.Value(-20)).current;

  // Seek State
  const isSeekingRef = useRef(false);
  const seekValueRef = useRef(0);
  const [seekDisplayTime, setSeekDisplayTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreviewPosition, setSeekPreviewPosition] = useState(0);

  // ✅ Seek guard - chặn currentTime cũ sau khi seek
  const seekGuardRef = useRef<{ target: number; expireAt: number } | null>(null);
  const [guardedTime, setGuardedTime] = useState(0);

  // Thumbnail video player (hidden)
  const thumbnailVideoRef = useRef<Video>(null);
  const [thumbnailVideoReady, setThumbnailVideoReady] = useState(false);

  // Serialization mechanism để tránh seek conflict
  const isThumbnailSeekingRef = useRef(false);
  const nextThumbnailSeekPosRef = useRef<number | null>(null);

  // Debounce cho seek complete
  const lastSeekCompleteTime = useRef<number>(0);
  const lastSeekCallTime = useRef<number>(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const doubleTapAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current; // Start off-screen

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef(0);
  const lastTapSide = useRef<'left' | 'right' | null>(null);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenWidth = Dimensions.get('window').width;

  const safeDuration = isFinite(duration) && duration > 0 ? duration : 1;
  const safeCurrentTime = clamp(currentTime, 0, safeDuration);
  const safeBuffered = clamp(buffered, 0, safeDuration);

  // ✅ Sync guardedTime từ currentTime prop, nhưng chặn vị trí cũ sau seek
  useEffect(() => {
    // Đang kéo slider → không cập nhật
    if (isSeekingRef.current) return;

    const guard = seekGuardRef.current;
    if (guard) {
      const isCloseToTarget = Math.abs(safeCurrentTime - guard.target) < 2;
      const isExpired = Date.now() > guard.expireAt;

      if (isCloseToTarget || isExpired) {
        // Video đã đến đích hoặc guard hết hạn → chấp nhận
        seekGuardRef.current = null;
        setGuardedTime(safeCurrentTime);
      }
      // Chưa đến đích → giữ nguyên guardedTime (= seek target), KHÔNG update
      return;
    }

    // Không có guard → cập nhật bình thường
    setGuardedTime(safeCurrentTime);
  }, [safeCurrentTime]);

  // ✅ Dùng guardedTime thay vì safeCurrentTime
  const sliderValue = isSeekingRef.current ? seekValueRef.current : guardedTime;
  const displayTime = isSeeking ? seekDisplayTime : guardedTime;

  // Parse m3u8 thumbnails khi có videoUrl
  useEffect(() => {
    if (videoUrl) {
      console.log('🎬 Loading thumbnail video from m3u8:', videoUrl);
      // Reset states
      setThumbnailVideoReady(false);
      isThumbnailSeekingRef.current = false;
      nextThumbnailSeekPosRef.current = null;
    }
  }, [videoUrl]);

  // Cleanup long press timer
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // ── Logic ──

  // Serialized thumbnail seek để tránh conflict
  const processThumbnailSeek = useCallback(async (timeMs: number) => {
    if (!thumbnailVideoRef.current || !thumbnailVideoReady) {
      return;
    }

    // Nếu đang seek, lưu vị trí mới vào queue và return
    if (isThumbnailSeekingRef.current) {
      nextThumbnailSeekPosRef.current = timeMs;
      return;
    }

    // Khóa
    isThumbnailSeekingRef.current = true;

    try {
      await thumbnailVideoRef.current.setPositionAsync(timeMs, {
        toleranceMillisBefore: 1000,
        toleranceMillisAfter: 1000,
      });
    } catch (error: any) {
      // Bỏ qua lỗi seek interrupted
      if (!error?.message?.includes('interrupted')) {
        console.log('Error seeking thumbnail:', error);
      }
    } finally {
      // Mở khóa
      isThumbnailSeekingRef.current = false;

      // Kiểm tra queue: nếu có vị trí mới, seek tiếp
      if (nextThumbnailSeekPosRef.current !== null) {
        const nextTime = nextThumbnailSeekPosRef.current;
        nextThumbnailSeekPosRef.current = null;
        processThumbnailSeek(nextTime); // Đệ quy
      }
    }
  }, [thumbnailVideoReady]);

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPlaying && visible && !showSpeedMenu && !showRelatedMenu) {
      hideTimer.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, HIDE_TIMEOUT);
    }
  }, [isPlaying, visible, showSpeedMenu, showRelatedMenu, fadeAnim]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHideTimer]);

  // Drawer Animation Logic
  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: showRelatedMenu ? 0 : DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Thông báo state drawer cho parent
    onGestureStateChange?.(showRelatedMenu);

    if (showRelatedMenu) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      resetHideTimer();
    }
  }, [showRelatedMenu, onGestureStateChange]);

  const toggleVisibility = () => {
    if (showSpeedMenu) { setShowSpeedMenu(false); return; }
    if (showRelatedMenu) { setShowRelatedMenu(false); return; }

    if (visible) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setVisible(false));
    } else {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      resetHideTimer();
    }
  };

  // ── Long Press 2x Speed Handlers ──
  const handlePressIn = useCallback(() => {
    wasLongPressRef.current = false;

    // Không kích hoạt trong các trạng thái đặc biệt
    if (isLocked || showSpeedMenu || showRelatedMenu || isSeekingRef.current) return;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      isLongPressingRef.current = true;

      // Hủy mọi pending tap/double-tap
      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current);
        doubleTapTimer.current = null;
      }
      lastTapTime.current = 0;
      lastTapSide.current = null;

      // Ẩn controls nếu đang hiện
      if (visible) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }

      // Lưu tốc độ gốc & chuyển sang 2x
      originalSpeedRef.current = playbackSpeed;
      setIsLongPressSpeed(true);
      onSpeedChange(2);

      // Animation hiện indicator
      Animated.parallel([
        Animated.timing(longPressFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(longPressSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);
  }, [
    isLocked, showSpeedMenu, showRelatedMenu, playbackSpeed,
    onSpeedChange, visible, fadeAnim, longPressFadeAnim, longPressSlideAnim,
  ]);

  const handlePressOut = useCallback(() => {
    // Xoá timer nếu chưa kích hoạt
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressingRef.current) {
      isLongPressingRef.current = false;
      setIsLongPressSpeed(false);

      // Khôi phục tốc độ gốc
      onSpeedChange(originalSpeedRef.current);

      // Animation ẩn indicator
      Animated.parallel([
        Animated.timing(longPressFadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(longPressSlideAnim, {
          toValue: -20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      resetHideTimer();
    }
  }, [onSpeedChange, longPressFadeAnim, longPressSlideAnim, resetHideTimer]);

  const handleTap = (event: GestureResponderEvent) => {
    // ✅ Skip nếu vừa kết thúc long press
    if (wasLongPressRef.current) {
      wasLongPressRef.current = false;
      return;
    }

    if (isSeekingRef.current) return;
    const { locationX } = event.nativeEvent;
    const now = Date.now();
    const side = locationX < screenWidth / 2 ? 'left' : 'right';

    if (now - lastTapTime.current < 300 && lastTapSide.current === side) {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      if (side === 'left') {
        onDoubleTapLeft();
        setDoubleTapSeconds((prev) => prev + doubleTapSkipDuration);
      } else {
        onDoubleTapRight();
        setDoubleTapSeconds((prev) => prev + doubleTapSkipDuration);
      }
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
      }, 300);
    }
  };

  // Seek Handlers
  const handleSlidingStart = useCallback((value: number) => {
    isSeekingRef.current = true;
    seekValueRef.current = clamp(value, 0, safeDuration);
    setIsSeeking(true);
    setSeekDisplayTime(clamp(value, 0, safeDuration));

    // Reset queue khi bắt đầu seek
    nextThumbnailSeekPosRef.current = null;
    isThumbnailSeekingRef.current = false;

    onSeekStart();
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, [safeDuration, onSeekStart]);

  const handleValueChange = useCallback((value: number) => {
    if (!isSeekingRef.current) return;
    seekValueRef.current = clamp(value, 0, safeDuration);
    setSeekDisplayTime(seekValueRef.current);

    // Tính vị trí preview (0-100%)
    const percentage = (seekValueRef.current / safeDuration) * 100;
    setSeekPreviewPosition(percentage);

    // Gọi serialized seek - tự động xử lý queue
    processThumbnailSeek(seekValueRef.current * 1000);
  }, [safeDuration, processThumbnailSeek]);

  const handleSlidingComplete = useCallback((value: number) => {
    const clamped = clamp(value, 0, safeDuration);
    const now = Date.now();

    // Debounce nhẹ: không cho seek 2 lần trong 100ms vào cùng vị trí
    if (now - lastSeekCallTime.current < 100 && Math.abs(clamped - lastSeekCompleteTime.current) < 0.5) {
      isSeekingRef.current = false;
      setIsSeeking(false);
      return;
    }

    lastSeekCompleteTime.current = clamped;
    lastSeekCallTime.current = now;

    // Clear queue
    nextThumbnailSeekPosRef.current = null;

    // ✅ Set guard TRƯỚC khi tắt seeking → bảo vệ slider khỏi giật
    seekGuardRef.current = { target: clamped, expireAt: Date.now() + 5000 };
    setGuardedTime(clamped); // Giữ slider tại vị trí seek

    onSeekComplete(clamped);

    // ✅ Tắt seeking NGAY - guard sẽ bảo vệ
    isSeekingRef.current = false;
    setIsSeeking(false);

    resetHideTimer();
  }, [safeDuration, onSeekComplete, resetHideTimer]);

  // ── Render Item for Related Videos ──
  const renderRelatedItem = ({ item }: { item: RelatedVideo }) => (
    <Pressable
      style={({ pressed }) => [
        styles.relatedItem,
        pressed && styles.relatedItemPressed
      ]}
      onPress={() => {
        onRelatedVideoPress?.(item);
        setShowRelatedMenu(false);
      }}
    >
      <View style={styles.relatedThumbContainer}>
        <Image source={{ uri: item.thumb_url }} style={styles.relatedThumb} contentFit="cover" />
        {item.time && (
          <View style={styles.relatedDurationBadge}>
            <Text style={styles.relatedDurationText}>{item.time}</Text>
          </View>
        )}
        <View style={styles.playIconOverlay}>
          <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.85)" />
        </View>
      </View>
      <View style={styles.relatedInfo}>
        <Text style={styles.relatedTitle} numberOfLines={2}>{item.name}</Text>
        {item.actors && item.actors.length > 0 ? (
          <Text style={styles.relatedSubtitle} numberOfLines={1}>
            {item.actors.slice(0, 2).join(', ')}
          </Text>
        ) : (
          <Text style={styles.relatedSubtitle}>Video đề xuất</Text>
        )}
      </View>
    </Pressable>
  );

  // ── Locked View ──
  if (isLocked) {
    return (
      <Pressable style={styles.fullscreen} onPress={toggleVisibility}>
        {visible && (
          <Animated.View style={[styles.lockOverlay, { opacity: fadeAnim }]}>
            <View style={styles.lockContainer}>
              <Text style={styles.lockText}>Đã khóa màn hình</Text>
              <Pressable style={styles.lockButton} onPress={onLockToggle}>
                <Ionicons name="lock-closed" size={24} color="#000" />
                <Text style={styles.unlockText}>Mở khóa</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </Pressable>
    );
  }

  // ── Chỉ render drawer ──
  if (showDrawer) {
    return (
      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: drawerAnim }] }]}>
        <LinearGradient
          colors={['rgba(15,15,15,0.95)', 'rgba(25,25,25,0.98)']}
          style={styles.drawerContent}
        >
          <View style={[styles.drawerHeader, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.drawerTitle}>Nội dung khác</Text>
            <Pressable onPress={() => setShowRelatedMenu(false)} hitSlop={10} style={{
              marginRight: 8
            }}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <FlashList
            data={relatedVideos}
            keyExtractor={(item) => item.id}
            renderItem={renderRelatedItem}
            contentContainerStyle={[styles.relatedList, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          />
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Pressable 
      style={styles.fullscreen} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handleTap}
    >

      {/* Loading */}
      {isBuffering && (
        <View style={styles.centerLoading}><ActivityIndicator size="large" color={NETFLIX_RED} /></View>
      )}

      {/* Double Tap */}
      {doubleTapSide && (
        <Animated.View style={[styles.doubleTapIndicator, doubleTapSide === 'left' ? styles.dtLeft : styles.dtRight, { opacity: doubleTapAnim }]}>
          <View style={styles.dtIconContainer}>
            <Ionicons name={doubleTapSide === 'left' ? 'play-back' : 'play-forward'} size={40} color="#ffffff" style={{
              bottom: -16
            }} />
            <Text style={styles.dtText}>{doubleTapSeconds}s</Text>
          </View>
        </Animated.View>
      )}

      {/* ✅ Long Press 2x Indicator */}
      {isLongPressSpeed && (
        <Animated.View
          style={[
            styles.longPressOverlay,
            {
              opacity: longPressFadeAnim,
              transform: [{ translateY: longPressSlideAnim }],
            },
          ]}
        >
          <View style={styles.longPressIndicator}>
            <View style={styles.longPressDot} />
            <Ionicons name="play-forward" size={18} color="#fff" />
            <Text style={styles.longPressText}>Tốc độ 2x</Text>
          </View>
        </Animated.View>
      )}

      {/* Controls */}
      {visible && (
        <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>

          {/* Top Bar */}
          <LinearGradient colors={['rgba(0,0,0,0.85)', 'transparent']} style={[styles.topGradient, { paddingTop: insets.top + 10 }]}>
            <View style={styles.topBarContent}>
              <Pressable onPress={onGoBack} hitSlop={15}><Ionicons name="arrow-back" size={28} color="#fff" /></Pressable>

              <Text style={styles.titleText} numberOfLines={1}>{title || 'Đang phát'}</Text>

              <View style={styles.topRightIcons}>
                {/* Related Videos Button */}
                {relatedVideos.length > 0 && (
                  <Pressable onPress={() => setShowRelatedMenu(true)} hitSlop={10} style={{ marginRight: 20 }}>
                    <MaterialIcons name="video-library" size={26} color="#fff" />
                  </Pressable>
                )}

                <Pressable onPress={() => setShowSpeedMenu(!showSpeedMenu)} hitSlop={10}>
                  <MaterialIcons name="speed" size={26} color="#fff" />
                </Pressable>
                <Pressable onPress={onMuteToggle} hitSlop={10} style={{ marginLeft: 20 }}>
                  <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={26} color="#fff" />
                </Pressable>
              </View>
            </View>
          </LinearGradient>

          {/* Center Buttons */}
          <View style={styles.centerControls}>
            {!isBuffering && (
              <>
                <Pressable onPress={() => { onSkipBackward(); resetHideTimer(); }} style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}>
                  <View style={styles.skipButtonContainer}>
                    <Ionicons name="play-back" size={42} color="#fff" />
                  </View>
                </Pressable>
                <Pressable onPress={() => { onPlayPause(); resetHideTimer(); }} style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={64} color="#fff" />
                </Pressable>
                <Pressable onPress={() => { onSkipForward(); resetHideTimer(); }} style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}>
                  <View style={styles.skipButtonContainer}>
                    <Ionicons name="play-forward" size={42} color="#fff" />
                  </View>
                </Pressable>
              </>
            )}
          </View>

          {/* Bottom Bar */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={[styles.bottomGradient, { paddingBottom: insets.bottom + 10 }]}>
            {/* Seek Preview Thumbnail */}
            {isSeeking && showThumbnailPreview && (
              <View style={[styles.seekPreview, { left: `${Math.max(10, Math.min(90, seekPreviewPosition))}%` }]}>
                <View style={styles.seekPreviewContainer}>
                  {videoUrl ? (
                    <>
                      <Video
                        ref={thumbnailVideoRef}
                        source={{ uri: videoUrl }}
                        style={styles.seekPreviewImage}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                        isMuted={true}
                        onLoad={() => {
                          console.log('✅ Thumbnail video loaded');
                          setThumbnailVideoReady(true);
                        }}
                        onError={(error) => {
                          console.log('❌ Thumbnail video error:', error);
                        }}
                      />

                    </>
                  ) : posterUrl ? (
                    <>
                      <RNImage
                        source={{ uri: posterUrl }}
                        style={styles.seekPreviewImage}
                        resizeMode="cover"
                      />
                      <View style={styles.debugIndicator}>
                        <Text style={styles.debugText}>POSTER</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.seekPreviewPlaceholder}>
                      <Ionicons name="film-outline" size={24} color="rgba(255,255,255,0.5)" />
                    </View>
                  )}
                  <Text style={styles.seekPreviewTime}>{formatTime(seekDisplayTime)}</Text>
                </View>
                <View style={styles.seekPreviewArrow} />
              </View>
            )}

            <View style={styles.sliderContainer}>
              <View style={styles.progressTrackBackground} />
              <View style={[styles.bufferedBar, { width: `${(safeBuffered / safeDuration) * 100}%` }]} />
              <Slider
                style={styles.slider}
                minimumValue={0} maximumValue={safeDuration} value={sliderValue}
                onSlidingStart={handleSlidingStart} onValueChange={handleValueChange} onSlidingComplete={handleSlidingComplete}
                minimumTrackTintColor={NETFLIX_RED} maximumTrackTintColor="transparent" thumbTintColor={NETFLIX_RED}
              />
            </View>
            <View style={styles.bottomMetaRow}>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(displayTime)} / {formatTime(safeDuration)}</Text>
              </View>
              <Pressable onPress={onLockToggle} hitSlop={15} style={styles.lockIconBtn}>
                <Ionicons name="lock-open-outline" size={22} color="#fff" />
                <Text style={styles.lockLabel}>Khóa</Text>
              </Pressable>
            </View>
          </LinearGradient>

          {/* Speed Menu (Center Pop-up) */}
          {showSpeedMenu && (
            <Pressable style={styles.menuBackdrop} onPress={() => setShowSpeedMenu(false)}>
              <View style={styles.speedMenuContainer}>
                <Text style={styles.menuHeader}>Tốc độ</Text>
                {SPEEDS.map((speed) => (
                  <Pressable key={speed} style={[styles.menuItem, playbackSpeed === speed && styles.menuItemActive]} onPress={() => { onSpeedChange(speed); setShowSpeedMenu(false); resetHideTimer(); }}>
                    <Text style={[styles.menuItemText, playbackSpeed === speed && styles.menuItemTextActive]}>{speed}x</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          )}

        </Animated.View>
      )}
    </Pressable>
  );
}

// ─── STYLES ──────────────────────────────────────────────

const styles = StyleSheet.create({
  fullscreen: { ...StyleSheet.absoluteFillObject, zIndex: 10, justifyContent: 'space-between' },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 20 },
  centerLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 15 },
  btnPressed: { opacity: 0.5, transform: [{ scale: 0.95 }] },

  // Top
  topGradient: { height: 100, justifyContent: 'flex-start', paddingHorizontal: 16 },
  topBarContent: { flexDirection: 'row', alignItems: 'center', height: 50 },
  titleText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginHorizontal: 10 },
  topRightIcons: { flexDirection: 'row', alignItems: 'center' },

  // Center
  centerControls: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 50 },
  playBtn: { alignItems: 'center', justifyContent: 'center' },
  skipBtn: { alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  skipButtonContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  skipButtonText: {
    position: 'absolute',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    bottom: 2,
  },

  // Bottom
  bottomGradient: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 40 },
  sliderContainer: { height: 30, justifyContent: 'center', marginBottom: 4 },
  slider: { width: '100%', height: 40, zIndex: 5 },
  progressTrackBackground: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  bufferedBar: { position: 'absolute', left: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 },
  bottomMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -8 },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  lockIconBtn: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 8 },
  lockLabel: { color: '#fff', fontSize: 9, marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },

  // Locked
  lockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  lockContainer: { alignItems: 'center', gap: 20 },
  lockText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  lockButton: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 30, gap: 8 },
  unlockText: { color: '#000', fontSize: 15, fontWeight: '700' },

  // Double Tap
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
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  dtRight: {
    right: 0,
    borderTopLeftRadius: SCREEN_H,
    borderBottomLeftRadius: SCREEN_H,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  dtIconContainer: { alignItems: 'center' },
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
  longPressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NETFLIX_RED,
  },
  longPressText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Speed Menu
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  speedMenuContainer: { backgroundColor: 'rgba(30,30,30,0.95)', width: 250, borderRadius: 12, overflow: 'hidden', paddingVertical: 8 },
  menuHeader: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700', textAlign: 'center', marginVertical: 10, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },
  menuItemActive: { backgroundColor: '#fff' },
  menuItemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  menuItemTextActive: { color: '#000', fontWeight: '700' },

  // ── DRAWER STYLES ────────────────────────
  drawerContainer: {
    position: 'absolute', top: 0, bottom: 0, right: 0,
    width: DRAWER_WIDTH,
    zIndex: 100,
    // Shadow cho drawer nổi bật
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerContent: { flex: 1, paddingHorizontal: 16 },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  drawerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  relatedList: { paddingBottom: 20 },
  relatedItem: {
    flexDirection: 'row', marginBottom: 4,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  relatedItemPressed: { opacity: 0.7, backgroundColor: 'rgba(255,255,255,0.08)' },
  relatedThumbContainer: {
    width: 140,
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#1a1a1a'
  },
  relatedThumb: { width: '100%', height: '100%' },
  relatedDurationBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3
  },
  relatedDurationText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)'
  },
  relatedInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  relatedTitle: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 6 },
  relatedSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 15 },

  // ── SEEK PREVIEW ──────────────────────
  seekPreview: {
    position: 'relative',
    transform: [{ translateX: -80 }],
    zIndex: 9999,
    width: 160,
    justifyContent: 'center',
    alignItems: 'center'
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
  seekPreviewImage: {
    width: 160,
    height: 90,
    backgroundColor: '#1a1a1a',
  },
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
  debugIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  debugText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
});
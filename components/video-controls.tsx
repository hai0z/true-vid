// components/video-controls.tsx
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient'; // Cần cài đặt cái này
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
const HIDE_TIMEOUT = 4000;
const NETFLIX_RED = '#E50914';

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

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
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
  const [visible, setVisible] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [doubleTapSeconds, setDoubleTapSeconds] = useState(0);

  // Refs for Seeking logic
  const isSeekingRef = useRef(false);
  const seekValueRef = useRef(0);
  const [seekDisplayTime, setSeekDisplayTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const doubleTapAnim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef(0);
  const lastTapSide = useRef<'left' | 'right' | null>(null);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screenWidth = Dimensions.get('window').width;

  const safeDuration = isFinite(duration) && duration > 0 ? duration : 1;
  const safeCurrentTime = clamp(currentTime, 0, safeDuration);
  const safeBuffered = clamp(buffered, 0, safeDuration);
  const sliderValue = isSeekingRef.current ? seekValueRef.current : safeCurrentTime;
  const displayTime = isSeeking ? seekDisplayTime : safeCurrentTime;

  // ── Hide Timer Logic ──
  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPlaying && visible && !showSpeedMenu) {
      hideTimer.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, HIDE_TIMEOUT);
    }
  }, [isPlaying, visible, showSpeedMenu, fadeAnim]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  const toggleVisibility = () => {
    if (showSpeedMenu) {
      setShowSpeedMenu(false);
      return;
    }
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    } else {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      resetHideTimer();
    }
  };

  // ── Tap Handling ──
  const handleTap = (event: GestureResponderEvent) => {
    if (isSeekingRef.current) return;
    const { locationX } = event.nativeEvent;
    const now = Date.now();
    const side = locationX < screenWidth / 2 ? 'left' : 'right';

    if (now - lastTapTime.current < 300 && lastTapSide.current === side) {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      if (side === 'left') {
        onDoubleTapLeft();
        setDoubleTapSeconds((prev) => prev + 10);
      } else {
        onDoubleTapRight();
        setDoubleTapSeconds((prev) => prev + 10);
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

  // ── Seek Logic ──
  const handleSlidingStart = useCallback((value: number) => {
    isSeekingRef.current = true;
    seekValueRef.current = clamp(value, 0, safeDuration);
    setIsSeeking(true);
    setSeekDisplayTime(clamp(value, 0, safeDuration));
    onSeekStart();
    if (hideTimer.current) clearTimeout(hideTimer.current); // Keep controls visible while seeking
  }, [safeDuration, onSeekStart]);

  const handleValueChange = useCallback((value: number) => {
    if (!isSeekingRef.current) return;
    const clamped = clamp(value, 0, safeDuration);
    seekValueRef.current = clamped;
    setSeekDisplayTime(clamped);
  }, [safeDuration]);

  const handleSlidingComplete = useCallback((value: number) => {
    const clamped = clamp(value, 0, safeDuration);
    onSeekComplete(clamped);
    setTimeout(() => {
      isSeekingRef.current = false;
      seekValueRef.current = 0;
      setIsSeeking(false);
    }, 200);
    resetHideTimer();
  }, [safeDuration, onSeekComplete, resetHideTimer]);

  // ── LOCKED SCREEN ──
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

  return (
    <Pressable style={styles.fullscreen} onPress={handleTap}>
      
      {/* ── BUFFERING INDICATOR ── */}
      {isBuffering && (
        <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={NETFLIX_RED} />
        </View>
      )}

      {/* ── DOUBLE TAP ANIMATION ── */}
      {doubleTapSide && (
        <Animated.View
          style={[
            styles.doubleTapIndicator,
            doubleTapSide === 'left' ? styles.dtLeft : styles.dtRight,
            { opacity: doubleTapAnim },
          ]}
        >
          <View style={styles.dtIconContainer}>
            <Ionicons
              name={doubleTapSide === 'left' ? 'play-back' : 'play-forward'}
              size={40}
              color="#fff"
            />
            <Text style={styles.dtText}>{doubleTapSeconds} giây</Text>
          </View>
        </Animated.View>
      )}

      {/* ── CONTROLS OVERLAY ── */}
      {visible && (
        <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>
          
          {/* TOP GRADIENT BAR */}
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'transparent']}
            style={[styles.topGradient, { paddingTop: insets.top + 10 }]}
          >
            <View style={styles.topBarContent}>
              <Pressable onPress={onGoBack} hitSlop={15}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
              </Pressable>
              
              <Text style={styles.titleText} numberOfLines={1}>{title || 'Đang phát'}</Text>

              <View style={styles.topRightIcons}>
                <Pressable onPress={() => setShowSpeedMenu(!showSpeedMenu)} hitSlop={10}>
                    <MaterialIcons name="speed" size={26} color="#fff" />
                </Pressable>
                <Pressable onPress={onMuteToggle} hitSlop={10} style={{ marginLeft: 16 }}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={26} color="#fff" />
                </Pressable>
              </View>
            </View>
          </LinearGradient>

          {/* CENTER CONTROLS (PLAY/PAUSE) */}
          <View style={styles.centerControls}>
            {!isBuffering && (
                <>
                {/* REWIND */}
                <Pressable
                  onPress={() => { onSkipBackward(); resetHideTimer(); }}
                  style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
                >
                  <MaterialIcons name="replay-10" size={42} color="#fff" />
                </Pressable>

                {/* PLAY/PAUSE */}
                <Pressable
                  onPress={() => { onPlayPause(); resetHideTimer(); }}
                  style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}
                >
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={64} color="#fff" />
                </Pressable>

                {/* FORWARD */}
                <Pressable
                  onPress={() => { onSkipForward(); resetHideTimer(); }}
                  style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
                >
                  <MaterialIcons name="forward-10" size={42} color="#fff" />
                </Pressable>
                </>
            )}
          </View>

          {/* BOTTOM GRADIENT BAR */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={[styles.bottomGradient, { paddingBottom: insets.bottom + 10 }]}
          >
            {/* ROW 1: SLIDER */}
            <View style={styles.sliderContainer}>
                {/* Custom Buffered Bar */}
                <View style={styles.progressTrackBackground} />
                <View 
                    style={[
                        styles.bufferedBar, 
                        { width: `${(safeBuffered / safeDuration) * 100}%` }
                    ]} 
                />
                
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={safeDuration}
                  value={sliderValue}
                  onSlidingStart={handleSlidingStart}
                  onValueChange={handleValueChange}
                  onSlidingComplete={handleSlidingComplete}
                  minimumTrackTintColor={NETFLIX_RED}
                  maximumTrackTintColor="transparent" // Transparent vì ta dùng custom background
                  thumbTintColor={NETFLIX_RED}
                />
            </View>

            {/* ROW 2: TIME & LOCK */}
            <View style={styles.bottomMetaRow}>
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
                    <Text style={styles.timeDivider}> / </Text>
                    <Text style={styles.durationText}>{formatTime(safeDuration)}</Text>
                </View>

                {/* Lock Button at bottom right */}
                <Pressable onPress={onLockToggle} hitSlop={15} style={styles.lockIconBtn}>
                    <Ionicons name="lock-open-outline" size={22} color="#fff" />
                    <Text style={styles.lockLabel}>Khóa</Text>
                </Pressable>
            </View>

          </LinearGradient>

          {/* ── SPEED MENU (SIDE SHEET STYLE) ── */}
          {showSpeedMenu && (
            <Pressable style={styles.menuBackdrop} onPress={() => setShowSpeedMenu(false)}>
                <View style={styles.speedMenuContainer}>
                    <Text style={styles.menuHeader}>Tốc độ phát</Text>
                    {SPEEDS.map((speed) => (
                        <Pressable
                            key={speed}
                            style={[
                                styles.menuItem,
                                playbackSpeed === speed && styles.menuItemActive
                            ]}
                            onPress={() => {
                                onSpeedChange(speed);
                                setShowSpeedMenu(false);
                                resetHideTimer();
                            }}
                        >
                            <Text style={[
                                styles.menuItemText,
                                playbackSpeed === speed && styles.menuItemTextActive
                            ]}>
                                {speed}x
                            </Text>
                            {playbackSpeed === speed && (
                                <Ionicons name="checkmark" size={20} color="#000" />
                            )}
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

// ─── STYLES (NETFLIX THEME) ──────────────────────────────

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
  
  // Center Loading
  centerLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },

  // Button Animation
  btnPressed: {
    opacity: 0.5,
    transform: [{ scale: 0.95 }],
  },

  // ── TOP BAR ──
  topGradient: {
    height: 100,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  titleText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── CENTER CONTROLS ──
  centerControls: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 50, // Space between buttons
  },
  playBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    // No background circle for Netflix style, just icon
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },

  // ── BOTTOM BAR ──
  bottomGradient: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 40, // Fade gradient start earlier
  },
  sliderContainer: {
    height: 30,
    justifyContent: 'center',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 40,
    zIndex: 5,
  },
  // Custom Track Backgrounds
  progressTrackBackground: {
    position: 'absolute',
    left: 0, right: 0,
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

  // Bottom Meta Data
  bottomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8, // Pull closer to slider
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  timeDivider: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  durationText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    fontSize: 13,
  },
  lockIconBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockLabel: {
    color: '#fff',
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // ── LOCKED SCREEN ──
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContainer: {
    alignItems: 'center',
    gap: 20,
  },
  lockText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  lockButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  unlockText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── DOUBLE TAP ──
  doubleTapIndicator: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: '40%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.1)', // Subtle highlight area
  },
  dtLeft: {
    left: 0,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
  },
  dtRight: {
    right: 0,
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
  },
  dtIconContainer: {
    alignItems: 'center',
  },
  dtText: {
    color: '#fff',
    marginTop: 8,
    fontWeight: '700',
  },

  // ── SPEED MENU ──
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
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemActive: {
    backgroundColor: '#fff',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: '#000', // Black text on white active background
    fontWeight: '700',
  },
});
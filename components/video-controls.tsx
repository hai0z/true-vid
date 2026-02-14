// components/video-controls.tsx
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
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

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  buffered,
  isMuted,
  isLocked,
  playbackSpeed,
  title,
  onPlayPause,
  onSeek,
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
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [doubleTapSeconds, setDoubleTapSeconds] = useState(0);

  // ✅ Tách 2 animated value riêng
  // fadeAnim: chỉ dùng useNativeDriver: false (cho BlurView opacity)
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // doubleTapAnim: chỉ dùng useNativeDriver: true
  const doubleTapAnim = useRef(new Animated.Value(0)).current;

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef(0);
  const lastTapSide = useRef<'left' | 'right' | null>(null);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screenWidth = Dimensions.get('window').width;

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPlaying && visible && !showSpeedMenu) {
      hideTimer.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false, // ✅ luôn false
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
        duration: 200,
        useNativeDriver: false, // ✅
      }).start(() => setVisible(false));
    } else {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false, // ✅
      }).start();
      resetHideTimer();
    }
  };

  const handleTap = (event: GestureResponderEvent) => {
    const { locationX } = event.nativeEvent;
    const now = Date.now();
    const side: 'left' | 'right' =
      locationX < screenWidth / 2 ? 'left' : 'right';

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

      // ✅ doubleTapAnim chỉ dùng useNativeDriver: true
      Animated.sequence([
        Animated.timing(doubleTapAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true, // ✅ OK vì không dính BlurView
        }),
        Animated.timing(doubleTapAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true, // ✅
        }),
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

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = isSeeking ? seekValue : currentTime;

  // ---- Locked ----
  if (isLocked) {
    return (
      <Pressable style={styles.fullscreen} onPress={toggleVisibility}>
        {visible && (
          <Animated.View style={[styles.lockOverlay, { opacity: fadeAnim }]}>
            <BlurView intensity={40} tint="dark" style={styles.lockBlur}>
              <Pressable
                style={({ pressed }) => [
                  styles.lockButton,
                  pressed && styles.btnPressed,
                ]}
                onPress={onLockToggle}
              >
                <Ionicons name="lock-closed" size={28} color="#fff" />
              </Pressable>
            </BlurView>
          </Animated.View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.fullscreen} onPress={handleTap}>
      {/* Double Tap - dùng doubleTapAnim (native driver) */}
      {doubleTapSide && (
        <Animated.View
          style={[
            styles.doubleTapIndicator,
            doubleTapSide === 'left'
              ? styles.doubleTapLeft
              : styles.doubleTapRight,
            { opacity: doubleTapAnim },
          ]}
        >
          <View style={styles.doubleTapInner}>
            <Ionicons
              name={doubleTapSide === 'left' ? 'play-back' : 'play-forward'}
              size={36}
              color="#fff"
            />
            <Text style={styles.doubleTapText}>{doubleTapSeconds}s</Text>
          </View>
        </Animated.View>
      )}

      {/* Controls - dùng fadeAnim (JS driver) */}
      {visible && (
        <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>
          {/* ===== TOP ===== */}
          <BlurView intensity={60} tint="dark" style={styles.topBlur}>
            <View style={[styles.topBar, { paddingTop: insets.top || 8 }]}>
              <Pressable
                onPress={onGoBack}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Pressable>

              <View style={styles.titleContainer}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {title || 'Đang phát'}
                </Text>
              </View>

              <View style={styles.topActions}>
                <Pressable
                  onPress={onMuteToggle}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={22}
                    color="#fff"
                  />
                </Pressable>

                <Pressable
                  onPress={onLockToggle}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Ionicons name="lock-open" size={20} color="#fff" />
                </Pressable>

                <Pressable
                  onPress={() => setShowSpeedMenu(!showSpeedMenu)}
                  style={({ pressed }) => [
                    styles.speedBadge,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.speedBadgeText}>{playbackSpeed}x</Text>
                </Pressable>
              </View>
            </View>
          </BlurView>

          {/* ===== CENTER ===== */}
          <View style={styles.centerControls}>
            <Pressable
              onPress={onSkipBackward}
              style={({ pressed }) => [
                styles.sideControlOuter,
                pressed && styles.btnPressed,
              ]}
            >
              <BlurView
                intensity={40}
                tint="dark"
                style={styles.sideControlBlur}
              >
                <Ionicons name="play-back" size={28} color="#fff" />
                <Text style={styles.skipText}>10s</Text>
              </BlurView>
            </Pressable>

            <Pressable
              onPress={() => {
                onPlayPause();
                resetHideTimer();
              }}
              style={({ pressed }) => [
                styles.playButtonOuter,
                pressed && styles.playBtnPressed,
              ]}
            >
              <BlurView
                intensity={50}
                tint="dark"
                style={styles.playButtonBlur}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={40}
                  color="#fff"
                  style={!isPlaying ? { marginLeft: 4 } : undefined}
                />
              </BlurView>
            </Pressable>

            <Pressable
              onPress={onSkipForward}
              style={({ pressed }) => [
                styles.sideControlOuter,
                pressed && styles.btnPressed,
              ]}
            >
              <BlurView
                intensity={40}
                tint="dark"
                style={styles.sideControlBlur}
              >
                <Ionicons name="play-forward" size={28} color="#fff" />
                <Text style={styles.skipText}>10s</Text>
              </BlurView>
            </Pressable>
          </View>

          {/* ===== BOTTOM ===== */}
          <BlurView intensity={60} tint="dark" style={styles.bottomBlur}>
            <View
              style={[
                styles.bottomBar,
                { paddingBottom: insets.bottom || 8 },
              ]}
            >
              <Text style={styles.timeText}>{formatTime(displayTime)}</Text>

              <View style={styles.sliderContainer}>
                <View style={styles.bufferedBar}>
                  <View
                    style={[
                      styles.bufferedProgress,
                      {
                        width:
                          duration > 0
                            ? `${(buffered / duration) * 100}%`
                            : '0%',
                      },
                    ]}
                  />
                </View>

                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration || 1}
                  value={displayTime}
                  onSlidingStart={() => {
                    setIsSeeking(true);
                    onSeekStart();
                  }}
                  onValueChange={(value) => {
                    setSeekValue(value);
                    onSeek(value);
                  }}
                  onSlidingComplete={(value) => {
                    setIsSeeking(false);
                    onSeekComplete(value);
                    resetHideTimer();
                  }}
                  minimumTrackTintColor="#E50914"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#E50914"
                />
              </View>

              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </BlurView>

          {/* ===== SPEED MENU ===== */}
          {showSpeedMenu && (
            <Pressable
              style={styles.speedMenuBackdrop}
              onPress={() => setShowSpeedMenu(false)}
            >
              <BlurView
                intensity={80}
                tint="dark"
                style={styles.speedMenuBlur}
              >
                <Text style={styles.speedMenuTitle}>Tốc độ phát</Text>
                <View style={styles.speedOptions}>
                  {SPEEDS.map((speed) => (
                    <Pressable
                      key={speed}
                      style={({ pressed }) => [
                        styles.speedOption,
                        playbackSpeed === speed && styles.speedOptionActive,
                        pressed && styles.speedOptionPressed,
                      ]}
                      onPress={() => {
                        onSpeedChange(speed);
                        setShowSpeedMenu(false);
                        resetHideTimer();
                      }}
                    >
                      <Text
                        style={[
                          styles.speedOptionText,
                          playbackSpeed === speed &&
                            styles.speedOptionTextActive,
                        ]}
                      >
                        {speed}x
                      </Text>
                      {playbackSpeed === speed && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="#E50914"
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              </BlurView>
            </Pressable>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },

  btnPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.9 }],
  },
  playBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },

  // Top
  topBlur: {
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  titleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  speedBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 2,
  },
  speedBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Center
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  sideControlOuter: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  sideControlBlur: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  playButtonOuter: {
    borderRadius: 38,
    overflow: 'hidden',
  },
  playButtonBlur: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Bottom
  bottomBlur: {
    overflow: 'hidden',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    textAlign: 'center',
  },
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  bufferedBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 3,
    borderRadius: 1.5,
    top: '50%',
    marginTop: -1.5,
  },
  bufferedProgress: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1.5,
  },
  slider: {
    flex: 1,
    height: 40,
  },

  // Lock
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBlur: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  lockButton: {
    padding: 16,
    borderRadius: 30,
  },

  // Speed Menu
  speedMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    zIndex: 99,
  },
  speedMenuBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 14,
    minWidth: 160,
  },
  speedMenuTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  speedOptions: {
    gap: 2,
  },
  speedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  speedOptionActive: {
    backgroundColor: 'rgba(229,9,20,0.2)',
  },
  speedOptionPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  speedOptionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  speedOptionTextActive: {
    color: '#E50914',
    fontWeight: '700',
  },

  // Double Tap - dùng View thường thay vì BlurView
  doubleTapIndicator: {
    position: 'absolute',
    top: '30%',
    zIndex: 20,
  },
  doubleTapInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleTapLeft: {
    left: '15%',
  },
  doubleTapRight: {
    right: '15%',
  },
  doubleTapText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
});
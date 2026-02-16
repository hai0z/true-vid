import { ResumeOverlay } from '@/components/resume-overlay';
import { VideoControls } from '@/components/video-controls';
import { VideoGestureHandler } from '@/components/video-gesture-handler';
import { VideoLoadingScreen } from '@/components/video-loading-screen';
import moviesData from '@/constants/movies.json';
import { useMovieDetailBoth } from '@/hooks/use-movies';
import { useSettingsStore } from '@/store/use-settings-store';
import { useWatchHistoryStore } from '@/store/use-watch-history-store';
import { Movie } from '@/types/Movie';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

// ✅ Type definitions
interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  isBuffering: boolean;
}

interface VolumeState {
  volume: number;
  isMuted: boolean;
}

// ✅ Seeded random để kết quả ổn định trong cùng 1 render cycle
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

export default function PlayerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data } = useMovieDetailBoth(slug);
  const { addToHistory, getPosition } = useWatchHistoryStore();
  const router = useRouter();

  // ===== Settings =====
  const settings = useSettingsStore();
  const {
    autoPlay,
    defaultPlaybackSpeed,
    defaultVolume,
    skipDuration,
    doubleTapSkipDuration,
    autoResume,
    resumeThreshold,
  } = settings;

  // ===== Loading states (gộp lại) =====
  const [loadingState, setLoadingState] = useState({
    m3u8Url: null as string | null,
    videoError: null as string | null,
    isLoadingVideo: true,
    step: 'connecting' as 'connecting' | 'extracting' | 'preparing' | 'ready',
  });

  // ===== Resume states =====
  const [resumeState, setResumeState] = useState({
    showPrompt: false,
    savedPosition: 0,
    isVideoReady: false,
  });

  // ===== Playback states (gộp lại) =====
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: autoPlay,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    isBuffering: false,
  });

  // ===== Volume state (gộp lại) =====
  const [volumeState, setVolumeState] = useState<VolumeState>({
    volume: defaultVolume,
    isMuted: defaultVolume === 0,
  });

  // ===== UI states =====
  const [isLocked, setIsLocked] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(defaultPlaybackSpeed);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showRelatedMenu, setShowRelatedMenu] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // ===== Refs =====
  const playerFadeAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);
  const lastSavedPosition = useRef(0);
  const isSeeking = useRef(false);
  const seekTargetRef = useRef<number | null>(null);
  const volumeSynced = useRef(false);
  const isMounted = useRef(true);
  
  // Serialization cho seek
  const isMainSeekingRef = useRef(false);
  const nextMainSeekTimeRef = useRef<number | null>(null);

  // ✅ Refs cho callbacks (tránh stale closures)
  const volumeStateRef = useRef(volumeState);
  volumeStateRef.current = volumeState;

  // ===== Related Videos (với seeded random) =====
  const relatedVideos = useMemo(() => {
    if (!data?.movie) return [];
    
    const allMovies = moviesData as Movie[];
    const currentMovie = data.movie;
    
    // Tạo seed từ movie ID để shuffle ổn định
    const seed = currentMovie.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Phim cùng diễn viên
    const sameActorMovies = allMovies.filter(movie => {
      if (movie.id === currentMovie.id) return false;
      return movie.actors.some(actor => currentMovie.actors.includes(actor));
    });
    
    // Phim cùng thể loại
    const sameCategoryMovies = allMovies.filter(movie => {
      if (movie.id === currentMovie.id) return false;
      return movie.categories.some(cat =>
        currentMovie.categories.some(currentCat => currentCat.id === cat.id)
      );
    });
    
    // Phim còn lại (shuffle với seed)
    const otherMovies = allMovies.filter(
      movie => movie.id !== currentMovie.id &&
        !sameActorMovies.includes(movie) &&
        !sameCategoryMovies.includes(movie)
    );
    const shuffledOthers = seededShuffle(otherMovies, seed);
    
    // Kết hợp và loại trùng
    const combined = [
      ...sameActorMovies.slice(0, 15),
      ...sameCategoryMovies.slice(0, 15),
      ...shuffledOthers.slice(0, 10),
    ];
    
    const uniqueMovies = Array.from(
      new Map(combined.map(movie => [movie.id, movie])).values()
    ).slice(0, 35);
    
    return uniqueMovies.map(movie => ({
      id: movie.id,
      name: movie.name,
      slug: movie.slug,
      thumb_url: movie.thumb_url,
      time: movie.time,
      actors: movie.actors,
    }));
  }, [data?.movie]);

  // ===== Screen Orientation =====
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      let orientationSubscription: ScreenOrientation.Subscription | null = null;

      const lockLandscape = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          if (isMounted.current) {
            await ScreenOrientation.lockAsync(
              ScreenOrientation.OrientationLock.LANDSCAPE
            );
          }
        } catch (error) {
          console.log('Lỗi xoay màn hình:', error);
        }
      };

      const setupOrientationListener = () => {
        orientationSubscription = ScreenOrientation.addOrientationChangeListener(
          (event) => {
            const orientation = event.orientationInfo.orientation;
            if (
              orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
              orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
            ) {
              setIsExiting(true);
            }
          }
        );
      };

      lockLandscape();
      setupOrientationListener();

      return () => {
        isMounted.current = false;
        if (orientationSubscription) {
          ScreenOrientation.removeOrientationChangeListener(orientationSubscription);
        }
      };
    }, [])
  );

  // ===== WebView M3U8 Extraction =====
  const handleWebViewMessage = useCallback((event: any) => {
    if (!isMounted.current) return;
    
    try {
      const messageData = JSON.parse(event.nativeEvent.data);

      if (messageData.type === 'step_update') {
        setLoadingState(prev => ({ ...prev, step: messageData.step }));
      }

      if (messageData.type === 'm3u8_found' && !loadingState.m3u8Url) {
        const url = messageData.url;
        console.log('🎬 M3U8 URL Found:', url);
        
        setLoadingState(prev => ({ ...prev, step: 'preparing', m3u8Url: url }));

        setTimeout(() => {
          if (!isMounted.current) return;
          setLoadingState(prev => ({ ...prev, step: 'ready' }));
          
          setTimeout(() => {
            if (!isMounted.current) return;
            setLoadingState(prev => ({ ...prev, isLoadingVideo: false }));
            Animated.timing(playerFadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();
          }, 400);
        }, 600);
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  }, [loadingState.m3u8Url, playerFadeAnim]);

  // ===== Safe Seek với serialization =====
  const safeMainSeek = useCallback(async (timeMs: number) => {
    if (!videoRef.current || !isMounted.current) return;

    if (isMainSeekingRef.current) {
      nextMainSeekTimeRef.current = timeMs;
      return;
    }

    isMainSeekingRef.current = true;

    try {
      await videoRef.current.setPositionAsync(timeMs, {
        toleranceMillisBefore: 100,
        toleranceMillisAfter: 100,
      });
    } catch (error) {
      console.log('Seek error ignored:', error);
    } finally {
      isMainSeekingRef.current = false;

      if (nextMainSeekTimeRef.current !== null && isMounted.current) {
        const nextTime = nextMainSeekTimeRef.current;
        nextMainSeekTimeRef.current = null;
        safeMainSeek(nextTime);
      }
    }
  }, []);

  // ===== Video Load Handler =====
  const handleVideoLoad = useCallback(async () => {
    if (!isMounted.current) return;
    console.log('✅ Video loaded successfully');
    
    setResumeState(prev => ({ ...prev, isVideoReady: true }));

    if (videoRef.current) {
      try {
        await videoRef.current.setVolumeAsync(defaultVolume);
        await videoRef.current.setRateAsync(defaultPlaybackSpeed, true);
        
        if (!volumeSynced.current) {
          setVolumeState({ volume: defaultVolume, isMuted: defaultVolume === 0 });
          volumeSynced.current = true;
        }
      } catch (error) {
        console.log('Error setting initial video state:', error);
      }
    }

    // Kiểm tra resume
    if (data?.movie && autoResume) {
      const saved = getPosition(data.movie.id);
      const status = await videoRef.current?.getStatusAsync();
      const totalDuration = status?.isLoaded
        ? (status.durationMillis ?? 0) / 1000
        : 0;

      const hasSignificantProgress = saved > resumeThreshold;
      const hasNotFinished = totalDuration > 0 ? saved / totalDuration < 0.95 : true;

      if (hasSignificantProgress && hasNotFinished) {
        setResumeState({
          showPrompt: true,
          savedPosition: saved,
          isVideoReady: true,
        });
        setPlayback(prev => ({ ...prev, duration: totalDuration }));
        await videoRef.current?.pauseAsync();
        return;
      }
    }

    // Không có resume
    if (videoRef.current) {
      if (autoPlay) {
        await videoRef.current.playAsync();
      } else {
        await videoRef.current.pauseAsync();
      }
    }
  }, [data?.movie, autoResume, autoPlay, defaultVolume, defaultPlaybackSpeed, getPosition, resumeThreshold]);

  // ===== Resume Handlers =====
  const handleResume = useCallback(async () => {
    if (!isMounted.current) return;
    
    setResumeState(prev => ({ ...prev, showPrompt: false }));
    
    if (videoRef.current && resumeState.savedPosition > 0) {
      console.log('⏩ Resuming from:', resumeState.savedPosition.toFixed(0), 's');

      isSeeking.current = true;
      seekTargetRef.current = resumeState.savedPosition;
      setPlayback(prev => ({ ...prev, currentTime: resumeState.savedPosition }));

      await videoRef.current.setPositionAsync(resumeState.savedPosition * 1000, {
        toleranceMillisBefore: 0,
        toleranceMillisAfter: 0,
      });
      await videoRef.current.playAsync();
      isSeeking.current = false;

      setTimeout(() => {
        seekTargetRef.current = null;
      }, 3000);
    }
  }, [resumeState.savedPosition]);

  const handleStartOver = useCallback(async () => {
    if (!isMounted.current) return;
    
    setResumeState(prev => ({ ...prev, showPrompt: false }));
    
    if (videoRef.current) {
      console.log('🔄 Starting from beginning');

      isSeeking.current = true;
      seekTargetRef.current = 0;
      setPlayback(prev => ({ ...prev, currentTime: 0 }));

      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
      isSeeking.current = false;

      setTimeout(() => {
        seekTargetRef.current = null;
      }, 3000);
    }
  }, []);

  // ===== Playback Status Update =====
  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded || !isMounted.current) return;

      const reportedTime = status.positionMillis / 1000;

      // ✅ Quyết định có chấp nhận position từ native hay không
      let acceptPosition = true;

      if (isSeeking.current) {
        // Đang kéo slider → không chấp nhận
        acceptPosition = false;
      } else if (seekTargetRef.current !== null) {
        // Vừa seek xong → chỉ chấp nhận khi position đã khớp với đích
        if (Math.abs(reportedTime - seekTargetRef.current) < 1.5) {
          // Video đã seek đến đúng chỗ → xoá guard, chấp nhận
          seekTargetRef.current = null;
          acceptPosition = true;
        } else {
          // Video chưa đến đích → giữ nguyên currentTime cũ (không giật)
          acceptPosition = false;
        }
      }

      setPlayback(prev => ({
        ...prev,
        currentTime: acceptPosition ? reportedTime : prev.currentTime,
        duration: status.durationMillis ? status.durationMillis / 1000 : prev.duration,
        isPlaying: status.isPlaying,
        isBuffering: status.isBuffering,
        buffered: status.playableDurationMillis 
          ? status.playableDurationMillis / 1000 
          : prev.buffered,
      }));

      // Save history mỗi 5 giây
      if (data?.movie) {
        const position = reportedTime;
        const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
        if (Math.abs(position - lastSavedPosition.current) >= 5) {
          lastSavedPosition.current = position;
          addToHistory(data.movie, position, dur);
        }
      }
    },
    [data?.movie, addToHistory]
  );

  // ===== Control Handlers =====
  const handlePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    setPlayback(prev => ({ ...prev, currentTime: time }));
  }, []);

  const handleSeekStart = useCallback(() => {
    isSeeking.current = true;
  }, []);

  const handleSeekComplete = useCallback(async (time: number) => {
    seekTargetRef.current = time;
    await safeMainSeek(time * 1000);
    isSeeking.current = false;
    
    // Fallback: tự xoá guard sau 3s phòng trường hợp position ko bao giờ khớp
    setTimeout(() => {
      seekTargetRef.current = null;
    }, 3000);
  }, [safeMainSeek]);

  const handleSkip = useCallback(async (direction: 'forward' | 'backward', seconds: number) => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    const delta = direction === 'forward' ? seconds * 1000 : -seconds * 1000;
    const newPos = Math.max(0, Math.min(
      status.positionMillis + delta,
      status.durationMillis || status.positionMillis
    ));

    const newTime = newPos / 1000;
    isSeeking.current = true;
    seekTargetRef.current = newTime;
    setPlayback(prev => ({ ...prev, currentTime: newTime }));
    await safeMainSeek(newPos);
    isSeeking.current = false;

    setTimeout(() => {
      seekTargetRef.current = null;
    }, 3000);
  }, [safeMainSeek]);

  const handleSkipForward = useCallback(() => handleSkip('forward', skipDuration), [handleSkip, skipDuration]);
  const handleSkipBackward = useCallback(() => handleSkip('backward', skipDuration), [handleSkip, skipDuration]);
  const handleDoubleTapLeft = useCallback(() => handleSkip('backward', doubleTapSkipDuration), [handleSkip, doubleTapSkipDuration]);
  const handleDoubleTapRight = useCallback(() => handleSkip('forward', doubleTapSkipDuration), [handleSkip, doubleTapSkipDuration]);

  const handleMuteToggle = useCallback(async () => {
    if (!videoRef.current) return;
    
    const currentState = volumeStateRef.current;
    const newMuted = !currentState.isMuted;
    
    if (currentState.isMuted && currentState.volume === 0) {
      setVolumeState({ volume: 0.25, isMuted: false });
      await videoRef.current.setVolumeAsync(0.25);
    } else {
      setVolumeState(prev => ({ ...prev, isMuted: newMuted }));
    }
    await videoRef.current.setIsMutedAsync(newMuted);
  }, []);

  const handleLockToggle = useCallback(() => {
    setIsLocked(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback(async (speed: number) => {
    if (!videoRef.current) return;
    setPlaybackSpeed(speed);
    await videoRef.current.setRateAsync(speed, true);
  }, []);

  const handleVolumeChange = useCallback(async (vol: number) => {
    if (!videoRef.current) return;
    
    const newMuted = vol === 0;
    setVolumeState({ volume: vol, isMuted: newMuted });
    
    await videoRef.current.setVolumeAsync(vol);
    await videoRef.current.setIsMutedAsync(newMuted);
  }, []);

  const handleGoBack = useCallback(async () => {
    try {
      setIsExiting(true);

      if (videoRef.current && data?.movie) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          const position = status.positionMillis / 1000;
          const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
          addToHistory(data.movie, position, dur);
        }
        await videoRef.current.pauseAsync();
      }

      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
      await new Promise(resolve => setTimeout(resolve, 150));
      router.back();
    } catch (error) {
      console.log('Error going back:', error);
      router.back();
    }
  }, [router, data, addToHistory]);

  const handleRelatedVideoPress = useCallback(async (video: { slug: string }) => {
    try {
      if (videoRef.current && data?.movie) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          const position = status.positionMillis / 1000;
          const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
          addToHistory(data.movie, position, dur);
        }
        await videoRef.current.pauseAsync();
      }

      router.replace(`/(home)/player/${video.slug}` as any);
    } catch (error) {
      console.log('Error switching video:', error);
    }
  }, [router, data, addToHistory]);

  // ===== Derived values =====
  // Phân biệt API cũ vs mới:
  // - API cũ: có 2 episodes, episode[1] là server hoạt động
  // - API mới: có 1 episode, episode[0] với m3u8 trực tiếp
  const hasMultipleEpisodes = (data?.movie?.episodes?.length ?? 0) > 1;
  const videoUrl = hasMultipleEpisodes
    ? data?.movie?.episodes?.[1]?.server_data?.[0]?.link  // API cũ: dùng episode[1]
    : data?.movie?.episodes?.[0]?.server_data?.[0]?.link; // API mới: dùng episode[0]
  
  const posterUrl = data?.movie?.thumb_url || undefined;
  const movieTitle = data?.movie?.name;
  const isResumeVisible = resumeState.showPrompt && resumeState.isVideoReady;

  // ✅ Kiểm tra xem videoUrl có phải là m3u8 trực tiếp không
  const isDirectM3u8 = videoUrl?.includes('.m3u8') || false;

  // ✅ Log để debug
  console.log('🎬 Player Debug:', {
    hasData: !!data,
    hasMovie: !!data?.movie,
    movieId: data?.movie?.id,
    movieSlug: data?.movie?.slug,
    episodesCount: data?.movie?.episodes?.length,
    hasMultipleEpisodes,
    episode0ServerCount: data?.movie?.episodes?.[0]?.server_data?.length,
    episode1ServerCount: data?.movie?.episodes?.[1]?.server_data?.length,
    videoUrl,
    isDirectM3u8,
    isVideoUrlDirect: videoUrl?.startsWith('http'),
  });

  // ✅ Nếu là m3u8 trực tiếp, skip WebView extraction
  if (isDirectM3u8 && loadingState.isLoadingVideo && !loadingState.m3u8Url) {
    console.log('✅ Direct M3U8 detected, skipping WebView extraction');
    setLoadingState({
      m3u8Url: videoUrl || null,
      videoError: null,
      isLoadingVideo: false,
      step: 'ready',
    });
  }

  // ===== Render: Loading Screen =====
  if (loadingState.isLoadingVideo) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />

        <VideoLoadingScreen
          posterUrl={posterUrl}
          title={movieTitle}
          step={loadingState.step}
        />

        <View style={styles.hiddenWebViewContainer}>
          <WebView
            source={{ uri: videoUrl! }}
            style={styles.hiddenWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            containerStyle={{ backgroundColor: 'black' }}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            onLoadStart={() => setLoadingState(prev => ({ ...prev, step: 'connecting' }))}
            onLoadEnd={() => {
              if (loadingState.step === 'connecting') {
                setLoadingState(prev => ({ ...prev, step: 'extracting' }));
              }
            }}
            injectedJavaScriptBeforeContentLoaded={`
              (function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'step_update',
                  step: 'extracting'
                }));

                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
                  if (url && url.includes('.m3u8')) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'm3u8_found',
                      url: url
                    }));
                  }
                  return originalFetch.apply(this, args);
                };

                const originalOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(method, url) {
                  if (typeof url === 'string' && url.includes('.m3u8')) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'm3u8_found',
                      url: url
                    }));
                  }
                  return originalOpen.apply(this, arguments);
                };

                let m3u8Found = false;
                let checkCount = 0;
                const checkVideo = setInterval(() => {
                  checkCount++;
                  if (m3u8Found || checkCount >= 15) {
                    clearInterval(checkVideo);
                    return;
                  }
                  const videos = document.querySelectorAll('video');
                  videos.forEach(video => {
                    if (m3u8Found) return;
                    const src = video.src || video.currentSrc;
                    if (src && src.includes('.m3u8')) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'm3u8_found',
                        url: src
                      }));
                      m3u8Found = true;
                      clearInterval(checkVideo);
                    }
                  });
                }, 1000);
              })();
              true;
            `}
            onMessage={handleWebViewMessage}
            onError={() => {
              setLoadingState(prev => ({
                ...prev,
                videoError: 'Không thể tải video',
                isLoadingVideo: false,
              }));
            }}
          />
        </View>
      </View>
    );
  }

  // ===== Render: Error Screen =====
  if (!loadingState.m3u8Url || loadingState.videoError) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
        <Text style={styles.errorText}>
          {loadingState.videoError || 'Không tìm thấy URL video'}
        </Text>
      </View>
    );
  }

  // ===== Render: Player Screen =====
  return (
    <Animated.View style={[styles.container, { opacity: playerFadeAnim }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade',
        }}
      />

      <VideoGestureHandler
        onVolumeChange={handleVolumeChange}
        volume={volumeState.volume}
        isLocked={isLocked || isResumeVisible}
        isDrawerOpen={isDrawerOpen}
      >
        <Video
          ref={videoRef}
          source={{ uri: loadingState.m3u8Url }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={autoPlay && !resumeState.showPrompt}
          isMuted={volumeState.isMuted}
          volume={volumeState.volume}
          rate={playbackSpeed}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={error => {
            console.log('❌ Video Error:', error);
            setLoadingState(prev => ({ ...prev, videoError: 'Lỗi phát video' }));
          }}
          onLoad={handleVideoLoad}
        />

        {/* ✅ CHỈ 1 VideoControls với showDrawer={false} */}
        {!isExiting && !isResumeVisible && (
          <VideoControls
            isPlaying={playback.isPlaying}
            currentTime={playback.currentTime}
            duration={playback.duration}
            buffered={playback.buffered}
            isBuffering={playback.isBuffering}
            isMuted={volumeState.isMuted}
            isLocked={isLocked}
            playbackSpeed={playbackSpeed}
            title={movieTitle}
            videoUrl={loadingState.m3u8Url}
            posterUrl={posterUrl}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSeekStart={handleSeekStart}
            onSeekComplete={handleSeekComplete}
            onSkipForward={handleSkipForward}
            onSkipBackward={handleSkipBackward}
            onMuteToggle={handleMuteToggle}
            onLockToggle={handleLockToggle}
            onSpeedChange={handleSpeedChange}
            onGoBack={handleGoBack}
            onDoubleTapLeft={handleDoubleTapLeft}
            onDoubleTapRight={handleDoubleTapRight}
            relatedVideos={relatedVideos}
            onRelatedVideoPress={handleRelatedVideoPress}
            onGestureStateChange={setIsDrawerOpen}
            showDrawer={false}
            showRelatedMenu={showRelatedMenu}
            setShowRelatedMenu={setShowRelatedMenu}
          />
        )}

        {/* Resume Overlay */}
        {!isExiting && isResumeVisible && (
          <ResumeOverlay
            savedPosition={resumeState.savedPosition}
            duration={playback.duration}
            onResume={handleResume}
            onStartOver={handleStartOver}
            countdownSeconds={8}
          />
        )}
      </VideoGestureHandler>

      {/* ✅ CHỈ 1 VideoControls với showDrawer={true} - NẰM NGOÀI */}
      {!isExiting && !isResumeVisible && (
        <VideoControls
          isPlaying={playback.isPlaying}
          currentTime={playback.currentTime}
          duration={playback.duration}
          buffered={playback.buffered}
          isBuffering={playback.isBuffering}
          isMuted={volumeState.isMuted}
          isLocked={isLocked}
          playbackSpeed={playbackSpeed}
          title={movieTitle}
          videoUrl={loadingState.m3u8Url}
          posterUrl={posterUrl}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onSeekStart={handleSeekStart}
          onSeekComplete={handleSeekComplete}
          onSkipForward={handleSkipForward}
          onSkipBackward={handleSkipBackward}
          onMuteToggle={handleMuteToggle}
          onLockToggle={handleLockToggle}
          onSpeedChange={handleSpeedChange}
          onGoBack={handleGoBack}
          onDoubleTapLeft={handleDoubleTapLeft}
          onDoubleTapRight={handleDoubleTapRight}
          relatedVideos={relatedVideos}
          onRelatedVideoPress={handleRelatedVideoPress}
          onGestureStateChange={setIsDrawerOpen}
          showDrawer={true}
          showRelatedMenu={showRelatedMenu}
          setShowRelatedMenu={setShowRelatedMenu}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  video: {
    flex: 1,
  },
  hiddenWebViewContainer: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
  hiddenWebView: {
    width: 1,
    height: 1,
  },
});
import { ResumeOverlay } from '@/components/resume-overlay';
import { VideoControls } from '@/components/video-controls';
import { VideoGestureHandler } from '@/components/video-gesture-handler';
import { VideoLoadingScreen } from '@/components/video-loading-screen';
import moviesData from '@/constants/movies.json';
import { useMovieDetail } from '@/hooks/use-movies';
import { useWatchHistoryStore } from '@/store/use-watch-history-store';
import { Movie } from '@/types/Movie';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function PlayerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data } = useMovieDetail(slug);
  const { addToHistory, getPosition } = useWatchHistoryStore();
  const router = useRouter();

  // ===== Loading states =====
  const [m3u8Url, setM3u8Url] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [loadingStep, setLoadingStep] = useState<
    'connecting' | 'extracting' | 'preparing' | 'ready'
  >('connecting');

  // ===== Resume states =====
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedResumePosition, setSavedResumePosition] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // ===== Playback states =====
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(volume === 0);
  const [isLocked, setIsLocked] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ===== Drawer state =====
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showRelatedMenu, setShowRelatedMenu] = useState(false);

  // ===== Transition animation =====
  const playerFadeAnim = useRef(new Animated.Value(0)).current;

  const videoRef = useRef<Video>(null);
  const lastSavedPosition = useRef(0);
  const isSeeking = useRef(false);
  const volumeSynced = useRef(false);

  // ===== Related Videos =====
  const relatedVideos = useMemo(() => {
    if (!data?.movie) return [];
    
    const allMovies = moviesData as Movie[];
    const currentMovie = data.movie;
    
    // 1. Phim cùng diễn viên
    const sameActorMovies = allMovies.filter(movie => {
      if (movie.id === currentMovie.id) return false;
      return movie.actors.some(actor => currentMovie.actors.includes(actor));
    });
    
    // 2. Phim cùng thể loại
    const sameCategoryMovies = allMovies.filter(movie => {
      if (movie.id === currentMovie.id) return false;
      return movie.categories.some(cat =>
        currentMovie.categories.some(currentCat => currentCat.id === cat.id)
      );
    });
    
    // 3. Phim ngẫu nhiên
    const randomMovies = allMovies.filter(movie => movie.id !== currentMovie.id);
    
    // Kết hợp: ưu tiên cùng diễn viên > cùng thể loại > ngẫu nhiên
    const combined = [
      ...sameActorMovies.slice(0, 50),
      ...sameCategoryMovies.slice(0, 50),
      ...randomMovies.sort(() => Math.random() - 0.5).slice(0, 50),
    ];
    
    // Loại bỏ trùng lặp và lấy 20 phim
    const uniqueMovies = Array.from(
      new Map(combined.map(movie => [movie.id, movie])).values()
    ).slice(0, 35);
    
    // Map sang RelatedVideo format
    return uniqueMovies.map(movie => ({
      id: movie.id,
      name: movie.name,
      slug: movie.slug,
      thumb_url: movie.thumb_url,
      time: movie.time,
      actors: movie.actors,
    })).sort(()=>Math.random()-0.5);
  }, [data?.movie]);

  // ===== Screen Orientation =====
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const lockLandscape = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          if (isMounted) {
            await ScreenOrientation.lockAsync(
              ScreenOrientation.OrientationLock.LANDSCAPE
            );
          }
        } catch (error) {
          console.log('Lỗi xoay màn hình:', error);
        }
      };

      lockLandscape();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  // ===== WebView M3U8 Extraction =====
  const handleWebViewMessage = (event: any) => {
    try {
      const messageData = JSON.parse(event.nativeEvent.data);

      if (messageData.type === 'step_update') {
        setLoadingStep(messageData.step);
      }

      if (messageData.type === 'm3u8_found' && !m3u8Url) {
        const url = messageData.url;
        console.log('🎬 M3U8 URL Found:', url);
        setLoadingStep('preparing');
        setM3u8Url(url);

        // Delay nhỏ để hiển thị step "preparing" trước khi chuyển
        setTimeout(() => {
          setLoadingStep('ready');
          // Fade transition sang player
          setTimeout(() => {
            setIsLoadingVideo(false);
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
  };

  // ===== Video Load Handler =====
  const handleVideoLoad = async () => {
    console.log('✅ Video loaded successfully');
    setIsVideoReady(true);

    if (videoRef.current) {
      // Đồng bộ volume thực tế từ player
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded && !volumeSynced.current) {
        const realVolume = status.volume ?? 1;
        setVolume(realVolume);
        setIsMuted(status.isMuted ?? false);
        volumeSynced.current = true;
      }
    }

    // ✅ Kiểm tra có vị trí đã lưu không
    if (data?.movie) {
      const saved = getPosition(data.movie.id);
      // Chỉ show resume nếu đã xem > 30 giây và chưa xem gần hết (< 95%)
      const status = await videoRef.current?.getStatusAsync();
      const totalDuration = status?.isLoaded
        ? (status.durationMillis ?? 0) / 1000
        : 0;

      const hasSignificantProgress = saved > 30;
      const hasNotFinished =
        totalDuration > 0 ? saved / totalDuration < 0.95 : true;

      if (hasSignificantProgress && hasNotFinished) {
        setSavedResumePosition(saved);
        setDuration(totalDuration);
        setShowResumePrompt(true);

        // Pause video trong khi chờ user chọn
        await videoRef.current?.pauseAsync();
      }
    }
  };

  // ===== Resume Handlers =====
  const handleResume = useCallback(async () => {
    setShowResumePrompt(false);
    if (videoRef.current && savedResumePosition > 0) {
      console.log('⏩ Resuming from:', savedResumePosition.toFixed(0), 's');

      // Chặn status update trong lúc seek
      isSeeking.current = true;
      setCurrentTime(savedResumePosition);

      await videoRef.current.setPositionAsync(savedResumePosition * 1000, {
        toleranceMillisBefore: 0,
        toleranceMillisAfter: 0,
      });
      await videoRef.current.playAsync();

      setTimeout(() => {
        isSeeking.current = false;
      }, 200);
    }
  }, [savedResumePosition]);

  const handleStartOver = useCallback(async () => {
    setShowResumePrompt(false);
    if (videoRef.current) {
      console.log('🔄 Starting from beginning');

      isSeeking.current = true;
      setCurrentTime(0);

      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();

      setTimeout(() => {
        isSeeking.current = false;
      }, 200);
    }
  }, []);

  // ===== Playback Status Update =====
  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;

      if (!isSeeking.current) {
        setCurrentTime(status.positionMillis / 1000);
      }

      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);

      if (status.playableDurationMillis) {
        setBuffered(status.playableDurationMillis / 1000);
      }

      // Save history mỗi 5 giây
      if (data?.movie) {
        const position = status.positionMillis / 1000;
        const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
        if (Math.abs(position - lastSavedPosition.current) >= 5) {
          lastSavedPosition.current = position;
          addToHistory(data.movie, position, dur);
        }
      }
    },
    [data, addToHistory]
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
    setCurrentTime(time);
  }, []);

  const handleSeekStart = useCallback(() => {
    isSeeking.current = true;
  }, []);

  const handleSeekComplete = useCallback(async (time: number) => {
    if (!videoRef.current) return;

    // 1. Cập nhật UI ngay lập tức để không giật
    setCurrentTime(time);

    try {
      // 2. Seek video với tolerance = 0 để chính xác hơn
      await videoRef.current.setPositionAsync(time * 1000, {
        toleranceMillisBefore: 0,
        toleranceMillisAfter: 0,
      });
    } finally {
      // 3. ⚡ DELAY trước khi mở lại status update
      //    Đợi vài frame để onPlaybackStatusUpdate
      //    kịp báo đúng position mới
      setTimeout(() => {
        isSeeking.current = false;
      }, 200);
    }
  }, []);

  const handleSkipForward = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPos = Math.min(
        status.positionMillis + 10000,
        status.durationMillis || status.positionMillis
      );

      isSeeking.current = true;
      setCurrentTime(newPos / 1000);

      await videoRef.current.setPositionAsync(newPos);

      setTimeout(() => {
        isSeeking.current = false;
      }, 200);
    }
  }, []);

  const handleSkipBackward = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPos = Math.max(status.positionMillis - 10000, 0);

      isSeeking.current = true;
      setCurrentTime(newPos / 1000);

      await videoRef.current.setPositionAsync(newPos);

      setTimeout(() => {
        isSeeking.current = false;
      }, 200);
    }
  }, []);

  const handleMuteToggle = useCallback(async () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    // Nếu đang mute → unmute thì restore volume về 0.25 nếu đang 0
    if (isMuted && volume === 0) {
      setVolume(0.25);
      await videoRef.current.setVolumeAsync(0.25);
    }
    await videoRef.current.setIsMutedAsync(newMuted);
  }, [isMuted, volume]);

  const handleLockToggle = useCallback(() => {
    setIsLocked(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback(async (speed: number) => {
    if (!videoRef.current) return;
    setPlaybackSpeed(speed);
    await videoRef.current.setRateAsync(speed, true);
  }, []);

  const handleVolumeChange = useCallback(
    async (vol: number) => {
      if (!videoRef.current) return;
      setVolume(vol);
      await videoRef.current.setVolumeAsync(vol);
      if (vol > 0 && isMuted) {
        setIsMuted(false);
        await videoRef.current.setIsMutedAsync(false);
      }
      if (vol === 0) {
        setIsMuted(true);
        await videoRef.current.setIsMutedAsync(true);
      }
    },
    [isMuted]
  );

  const handleGoBack = useCallback(async () => {
    try {
      // Lưu lịch sử lần cuối trước khi thoát
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

  const handleRelatedVideoPress = useCallback(async (video: any) => {
    try {
      // Lưu lịch sử trước khi chuyển
      if (videoRef.current && data?.movie) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          const position = status.positionMillis / 1000;
          const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
          addToHistory(data.movie, position, dur);
        }
        await videoRef.current.pauseAsync();
      }

      // Chuyển sang video mới
      router.replace(`/(home)/player/${video.slug}` as any);
    } catch (error) {
      console.log('Error switching video:', error);
    }
  }, [router, data, addToHistory]);

  const handleDoubleTapLeft = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPos = Math.max(status.positionMillis - 10000, 0);

      isSeeking.current = true;
      setCurrentTime(newPos / 1000);

      await videoRef.current.setPositionAsync(newPos);

      setTimeout(() => {
        isSeeking.current = false;
      }, 200);
    }
  }, []);

  const handleDoubleTapRight = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPos = Math.min(
        status.positionMillis + 10000,
        status.durationMillis || status.positionMillis
      );

      isSeeking.current = true;
      setCurrentTime(newPos / 1000);

      await videoRef.current.setPositionAsync(newPos);

      setTimeout(() => {
        isSeeking.current = false;
      }, 200);
    }
  }, []);

  // ===== Render =====
  const videoUrl = data?.movie?.episodes?.[1]?.server_data?.[0]?.link;
  const posterUrl =
    data?.movie?.thumb_url || undefined;
  const movieTitle = data?.movie?.name;

  const isResumeVisible = showResumePrompt && isVideoReady;

  

  // ===== Loading Screen =====
  if (isLoadingVideo) {
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
          step={loadingStep}
        />

        {/* Hidden WebView để extract M3U8 */}
        <View style={styles.hiddenWebViewContainer}>
          <WebView
            source={{ uri: videoUrl! }}
            style={styles.hiddenWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            containerStyle={{ backgroundColor: 'black' }}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            onLoadStart={() => setLoadingStep('connecting')}
            onLoadEnd={() => {
              if (loadingStep === 'connecting') {
                setLoadingStep('extracting');
              }
            }}
            injectedJavaScriptBeforeContentLoaded={`
              (function() {
                // Thông báo step
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
              setVideoError('Không thể tải video');
              setIsLoadingVideo(false);
            }}
          />
        </View>
      </View>
    );
  }

  // ===== Error Screen =====
  if (!m3u8Url || videoError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          {videoError || 'Không tìm thấy URL video'}
        </Text>
      </View>
    );
  }

  // ===== Player Screen =====
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
        volume={volume}
        isLocked={isLocked || isResumeVisible}
        isDrawerOpen={isDrawerOpen}
      >
        <Video
          ref={videoRef}
          source={{ uri: m3u8Url }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={!showResumePrompt}
          isMuted={isMuted}
          volume={volume}
          rate={playbackSpeed}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={error => {
            console.log('❌ Video Error:', error);
            setVideoError('Lỗi phát video');
          }}
          onLoad={handleVideoLoad}
          
        />

        {!isResumeVisible && (
          <VideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            isBuffering={isBuffering}
            isMuted={isMuted}
            isLocked={isLocked}
            playbackSpeed={playbackSpeed}
            title={movieTitle}
            videoUrl={m3u8Url}
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
        {/* ✅ Resume Overlay */}
        {showResumePrompt && isVideoReady && (
          <ResumeOverlay
            savedPosition={savedResumePosition}
            duration={duration}
            onResume={handleResume}
            onStartOver={handleStartOver}
            countdownSeconds={8}
          />
        )}
      </VideoGestureHandler>

      {/* Drawer nằm ngoài gesture handler */}
      {!isResumeVisible && (
        <VideoControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          isBuffering={isBuffering}
          isMuted={isMuted}
          isLocked={isLocked}
          playbackSpeed={playbackSpeed}
          title={movieTitle}
          videoUrl={m3u8Url}
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
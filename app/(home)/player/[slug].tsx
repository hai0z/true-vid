// app/player/[slug].tsx
import { VideoControls } from '@/components/video-controls';
import { VideoGestureHandler } from '@/components/video-gesture-handler';
import { useMovieDetail } from '@/hooks/use-movies';
import { useWatchHistoryStore } from '@/store/use-watch-history-store';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function PlayerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data } = useMovieDetail(slug);
  const { addToHistory, getPosition } = useWatchHistoryStore();
  const router = useRouter();

  const [m3u8Url, setM3u8Url] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(volume ===0);

  const [isLocked, setIsLocked] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const videoRef = useRef<Video>(null);
  const lastSavedPosition = useRef(0);
  const isSeeking = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Dùng ref để đảm bảo không chạy lệnh nếu component đã unmount giữa chừng
      let isMounted = true; 

      const lockLandscape = async () => {
        try {
          // ⏳ Đợi 1 chút cho Animation chuyển trang chạy xong hẳn
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (isMounted) {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          }
        } catch (error) {
          console.log('Lỗi xoay màn hình:', error);
        }
      };

      lockLandscape();

      return () => {
        isMounted = false;
        // Khi rời đi thì xoay dọc lại
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [])
  );

  const handleWebViewMessage = (event: any) => {
    try {
      const messageData = JSON.parse(event.nativeEvent.data);
      if (messageData.type === 'm3u8_found' && !m3u8Url) {
        const url = messageData.url;
        console.log('🎬 M3U8 URL Found:', url);
        setM3u8Url(url);
        setIsLoadingVideo(false);
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  };

 const handlePlaybackStatusUpdate = useCallback(
  (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (!isSeeking.current) {
      setCurrentTime(status.positionMillis / 1000);
    }

    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering);

    // ✅ Đồng bộ volume lần đầu
    if (volume === -1 && status.volume !== undefined) {
      setVolume(status.volume);
    }

    if(volume ===0){
      setIsMuted(true)
    }
    if (status.playableDurationMillis) {
      setBuffered(status.playableDurationMillis / 1000);
    }

    
    // Save history
    if (data?.movie) {
      const position = status.positionMillis / 1000;
      const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
      if (Math.abs(position - lastSavedPosition.current) >= 5) {
        lastSavedPosition.current = position;
        addToHistory(data.movie, position, dur);
      }
    }
  },
  [data, addToHistory, volume]
);

  const handleVideoLoad = async () => {
   console.log('✅ Video loaded successfully');

  if (videoRef.current) {
    // Lấy volume thực tế từ video player
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const realVolume = status.volume ?? 1;
      console.log('🔊 Real volume:', realVolume);
      setVolume(realVolume);
    }
  }

  if (data?.movie && videoRef.current) {
    const savedPosition = getPosition(data.movie.id);
    if (savedPosition > 0) {
      console.log('⏩ Continuing from:', savedPosition.toFixed(0), 's');
      await videoRef.current.setPositionAsync(savedPosition * 1000);
    }
  }
  };

  // --- Control Handlers ---

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
    await videoRef.current.setPositionAsync(time * 1000);
    isSeeking.current = false;
  }, []);

  const handleSkipForward = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPos = Math.min(
        status.positionMillis + 10000,
        status.durationMillis || status.positionMillis
      );
      await videoRef.current.setPositionAsync(newPos);
    }
  }, []);

  const handleSkipBackward = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPos = Math.max(status.positionMillis - 10000, 0);
      await videoRef.current.setPositionAsync(newPos);
    }
  }, []);

  const handleMuteToggle = useCallback(async () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;

    setIsMuted(newMuted);
    if(isMuted){
      setVolume(0.25)
    }
    await videoRef.current.setIsMutedAsync(newMuted);
  }, [isMuted]);

  const handleLockToggle = useCallback(() => {
    setIsLocked((prev) => !prev);
  }, []);

  const handleSpeedChange = useCallback(async (speed: number) => {
    if (!videoRef.current) return;
    setPlaybackSpeed(speed);
    await videoRef.current.setRateAsync(speed, true);
  }, []);

  const handleVolumeChange = useCallback(async (vol: number) => {
    if (!videoRef.current) return;
    setVolume(vol);
    await videoRef.current.setVolumeAsync(vol);
    if (vol > 0 && isMuted) {
      setIsMuted(false);
      await videoRef.current.setIsMutedAsync(false);
    }
  }, [isMuted]);

  const handleGoBack = useCallback(async () => {
    try {
      // Dừng video để tránh tiếng chạy nền khi chuyển cảnh
      if (videoRef.current) {
        await videoRef.current.pauseAsync();
      }
      
      // Ép về màn hình dọc TRƯỚC KHI back
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      
      // Đợi 1 chút để UI kịp phản hồi (tuỳ chọn, nhưng giúp mượt hơn trên Android)
      // await new Promise(resolve => setTimeout(resolve, 100)); 
      
      router.back();
    } catch (error) {
      console.log('Error changing orientation:', error);
      router.back();
    }
  }, [router]);

  const handleDoubleTapLeft = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPos = Math.max(status.positionMillis - 10000, 0);
      await videoRef.current.setPositionAsync(newPos);
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
      await videoRef.current.setPositionAsync(newPos);
    }
  }, []);

  const videoUrl = data?.movie?.episodes?.[1]?.server_data?.[0]?.link;

  if (!videoUrl) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Không tìm thấy video</Text>
      </View>
    );
  }

  if (isLoadingVideo) {
    return (
      <View style={styles.loadingContainer} >
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Đang tải video...</Text>

        <View style={styles.hiddenWebViewContainer}>
          <WebView
            source={{ uri: videoUrl }}
            style={styles.hiddenWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
             containerStyle={{ backgroundColor: 'black' }} 
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            injectedJavaScriptBeforeContentLoaded={`
              (function() {
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
                  if (m3u8Found || checkCount >= 10) {
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

  if (!m3u8Url || videoError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          {videoError || 'Không tìm thấy URL video'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: false, // Chặn vuốt ngang
          animation: 'fade',     // (Tuỳ chọn) Đổi animation sang fade để tránh cảm giác bị "trượt"
        }} 
      />
      <VideoGestureHandler
        onVolumeChange={handleVolumeChange}
        volume={volume}
        isLocked={isLocked}
      >
        <Video
          ref={videoRef}
          source={{ uri: m3u8Url }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isMuted={isMuted}
          volume={volume === -1 ? 1 : volume}  
          rate={playbackSpeed}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={(error) => {
            console.log('❌ Video Error:', error);
            setVideoError('Lỗi phát video');
          }}
          onLoad={handleVideoLoad}
        />

        <VideoControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          isBuffering={isBuffering}
          isMuted={isMuted}
          isLocked={isLocked}
          playbackSpeed={playbackSpeed}
          title={data?.movie?.name}
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
        />
      </VideoGestureHandler>
    </View>
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
  },
  loadingText: {
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

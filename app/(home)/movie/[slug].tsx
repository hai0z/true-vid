import ParallaxScrollView from '@/components/parallax-scroll-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useMovieDetailBoth } from '@/hooks/use-movies';
import { useFavoritesStore } from '@/store/use-favorites-store';
import { useWatchHistoryStore } from '@/store/use-watch-history-store';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export default function MovieDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  
  const { data, isLoading } = useMovieDetailBoth(slug);
  const { favorites, addFavorite, removeFavorite } = useFavoritesStore();
  const { history } = useWatchHistoryStore();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (!data?.movie) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff' }}>Không tìm thấy phim</Text>
      </View>
    );
  }

  const movie = data.movie;
  const isFavorite = favorites.some(fav => fav.id === movie.id);
  
  // Check watch history
  const watchHistory = history.find(h => h.movie.id === movie.id);
  const hasWatched = !!watchHistory;
  const watchProgress = watchHistory 
    ? (watchHistory.position / watchHistory.duration) * 100 
    : 0;

  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(movie.id);
    } else {
      addFavorite(movie);
    }
  };
  
  const formatWatchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="chevron.left" size={24} color="#fff" />
      </Pressable>

      <ParallaxScrollView
        headerBackgroundColor={{ light: '#000', dark: '#000' }}
        headerImage={
          <>
            <Image
              source={{ uri: movie.thumb_url }}
              style={styles.headerImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', '#15171890', '#151718']}
              style={styles.headerGradient}
            />
          </>
        }
      >
        <Text  style={styles.title}>
          {movie.name}
        </Text>

        <View style={styles.metaContainer}>
          {movie.quality && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{movie.quality}</Text>
            </View>
          )}
          {movie.time && (
            <Text style={styles.metaText}>{movie.time}</Text>
          )}
          {movie.status && (
            <Text style={styles.metaText}>{movie.status}</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <Pressable 
            style={styles.playButton}
            onPress={() => router.push(`/(home)/player/${movie.slug}` as any)}
          >
            <IconSymbol name="play.fill" size={20} color="#000" />
            <Text style={styles.playButtonText}>
              {hasWatched ? 'Tiếp tục' : 'Phát'}
            </Text>
          </Pressable>

          <Pressable 
            style={styles.iconButton}
            onPress={handleToggleFavorite}
          >
            <IconSymbol 
              name={isFavorite ? "heart.fill" : "heart"} 
              size={24} 
              color={isFavorite ?'red':'#fff'}
            />
          </Pressable>
        </View>

        {hasWatched && (
          <View style={styles.watchStatusContainer}>
            <View style={styles.watchStatusHeader}>
              <IconSymbol name="clock.fill" size={16} color="#FF6B6B" />
              <Text style={styles.watchStatusText}>
                Đã xem {watchProgress < 95 ? `${Math.round(watchProgress)}%` : 'hết'}
                {watchHistory && watchProgress < 95 && (
                  <Text style={styles.watchStatusTime}>
                    {' '}• {formatWatchTime(watchHistory.position)} / {formatWatchTime(watchHistory.duration)}
                  </Text>
                )}
              </Text>
            </View>
            {watchProgress < 95 && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${watchProgress}%` }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {movie.content && (
          <View style={styles.section}>
            <Text style={styles.description}>
              {movie.content.replace(/<[^>]*>/g, '')}
            </Text>
          </View>
        )}

        <View style={styles.infoGrid}>
          {movie.categories && movie.categories.length > 0 && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Thể loại:</Text>
              <Text style={styles.infoValue}>
                {movie.categories.map(cat => cat.name).join(', ')}
              </Text>
            </View>
          )}

          {movie.actors && movie.actors.length > 0 && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Diễn viên:</Text>
              <View style={styles.actorsContainer}>
                {movie.actors.map((actor, index) => (
                  <View key={index} style={styles.actorWrapper}>
                    <Pressable
                      style={styles.actorButton}
                      onPress={() => router.push(`/(home)/actor/${encodeURIComponent(actor)}` as any)}
                    >
                      <Text style={styles.actorText}>{actor}</Text>
                    </Pressable>
                    {index < movie.actors.length - 1 && (
                      <Text style={styles.actorSeparator}>, </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {movie.country && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Quốc gia:</Text>
              <Text style={styles.infoValue}>{movie.country.name}</Text>
            </View>
          )}
        </View>
      </ParallaxScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#fff',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  badge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#fff',
    opacity: 0.8,
  },
  infoGrid: {
    marginBottom: 24,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.6,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    flex: 1,
  },
  actorsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  actorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actorButton: {
    paddingVertical: 2,
  },
  actorText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  actorSeparator: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  watchStatusContainer: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  watchStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watchStatusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  watchStatusTime: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.7,
    fontWeight: '400',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
});

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useMovieDetail } from '@/hooks/use-movies';
import { useFavoritesStore } from '@/store/use-favorites-store';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

export default function MovieDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data, isLoading } = useMovieDetail(slug);
  const { favorites, addFavorite, removeFavorite } = useFavoritesStore();

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!data?.movie) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Không tìm thấy phim</ThemedText>
      </ThemedView>
    );
  }

  const movie = data.movie;
  const isFavorite = favorites.some(fav => fav.id === movie.id);

  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(movie.id);
    } else {
      addFavorite(movie);
    }
  };

  return (
    <ThemedView style={styles.container}>
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
        <ThemedText type="title" style={styles.title}>
          {movie.name}
        </ThemedText>

        <View style={styles.metaContainer}>
          {movie.quality && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{movie.quality}</ThemedText>
            </View>
          )}
          {movie.time && (
            <ThemedText style={styles.metaText}>{movie.time}</ThemedText>
          )}
          {movie.status && (
            <ThemedText style={styles.metaText}>{movie.status}</ThemedText>
          )}
        </View>

        <View style={styles.actionButtons}>
          <Pressable 
            style={styles.playButton}
            onPress={() => router.push(`/(home)/player/${movie.slug}` as any)}
          >
            <IconSymbol name="play.fill" size={20} color="#000" />
            <ThemedText style={styles.playButtonText}>Phát</ThemedText>
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

        {movie.content && (
          <View style={styles.section}>
            <ThemedText style={styles.description}>
              {movie.content.replace(/<[^>]*>/g, '')}
            </ThemedText>
          </View>
        )}

        <View style={styles.infoGrid}>
          {movie.categories && movie.categories.length > 0 && (
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Thể loại:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {movie.categories.map(cat => cat.name).join(', ')}
              </ThemedText>
            </View>
          )}

          {movie.actors && movie.actors.length > 0 && (
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Diễn viên:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {movie.actors.join(', ')}
              </ThemedText>
            </View>
          )}

          {movie.country && (
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Quốc gia:</ThemedText>
              <ThemedText style={styles.infoValue}>{movie.country.name}</ThemedText>
            </View>
          )}
        </View>
      </ParallaxScrollView>
    </ThemedView>
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
    opacity: 0.6,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    opacity: 0.8,
    flex: 1,
  },
});

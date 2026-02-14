import { HistoryCard } from '@/components/history-card';
import { MovieCard } from '@/components/movie-card';
import { MovieSlider } from '@/components/movie-slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useMovies, useMoviesByCategory } from '@/hooks/use-movies';
import { useWatchHistoryStore } from '@/store/use-watch-history-store';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';

const HISTORY_CARD_WIDTH = 160;
const HISTORY_CARD_HEIGHT = 100;

export default function MoviesScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { history } = useWatchHistoryStore();
  const { data: allMovies, isLoading: isLoadingAll } = useMovies(1);
  const { data: vietnamMovies } = useMoviesByCategory('viet-nam-clip', 1);
  const { data: vietsubMovies } = useMoviesByCategory('vietsub', 1);
  const { data: europeMovies } = useMoviesByCategory('chau-au', 1);
  const { data: chinaMovies } = useMoviesByCategory('trung-quoc', 1);
  const { data: koreaMovies } = useMoviesByCategory('han-quoc-18-', 1);
  const { data: uncensoredMovies } = useMoviesByCategory('khong-che', 1);
  const { data: javHdMovies } = useMoviesByCategory('jav-hd', 1);
  const { data: hentaiMovies } = useMoviesByCategory('hentai', 1);

  const categoryData = [
    { name: 'Việt Sub', slug: 'vietsub', movies: vietsubMovies?.movies || [], icon: 'language-outline' },
    { name: 'JAV HD', slug: 'jav-hd', movies: javHdMovies?.movies || [], icon: 'film-outline' },
    { name: 'Không Che', slug: 'khong-che', movies: uncensoredMovies?.movies || [], icon: 'eye-outline' },
    { name: 'Châu Âu', slug: 'chau-au', movies: europeMovies?.movies || [], icon: 'globe-outline' },
    { name: 'Việt Nam', slug: 'viet-nam-clip', movies: vietnamMovies?.movies || [], icon: 'flag-outline' },
    { name: 'Trung Quốc', slug: 'trung-quoc', movies: chinaMovies?.movies || [], icon: 'earth-outline' },
    { name: 'Hàn Quốc', slug: 'han-quoc-18-', movies: koreaMovies?.movies || [], icon: 'heart-outline' },
    { name: 'Hentai', slug: 'hentai', movies: hentaiMovies?.movies || [], icon: 'color-palette-outline' },
  ];

  // Header opacity animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });



  

  return (
    <ThemedView style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.headerWrapper]}>
        <BlurView intensity={90} tint="dark" style={styles.header}>
          <Animated.View style={[styles.headerBg, { opacity: headerBgOpacity }]} />
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A24']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoBadge}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                </LinearGradient>
                <ThemedText type="title" style={styles.headerTitle}>
                  PhimHay
                </ThemedText>
              </View>
            </View>
           
          </View>
        </BlurView>
      </Animated.View>

      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {isLoadingAll ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <ThemedText style={styles.loadingText}>Đang tải phim...</ThemedText>
          </ThemedView>
        ) : (
          <>
            {/* Hero Slider */}
            <View style={styles.sliderContainer}>
              <MovieSlider
                movies={allMovies?.movies || []}
                onPressMovie={(movie) =>
                  router.push(`/(home)/movie/${movie.slug}` as any)
                }
                onPressPlay={(movie) =>
                  router.push(`/(home)/player/${movie.slug}` as any)
                }
              />
              <LinearGradient
                colors={['transparent', '#151718', '#151718']}
                style={styles.sliderGradient}
              />
            </View>

            {/* Watch History Section */}
            {history.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <LinearGradient
                      colors={['#FF6B6B', '#EE5A24']}
                      style={styles.sectionIndicator}
                    />
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Xem gần đây
                    </ThemedText>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.clearHistoryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <ThemedText style={styles.clearHistoryText}>
                      Xem tất cả
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.historyScrollContent}
                  decelerationRate="fast"
                  snapToInterval={HISTORY_CARD_WIDTH + 12}
                >
                  {history.slice(0, 10).map((item, index) => (
                    <View
                      key={item.movie.id}
                      style={[
                        index === 0 && { marginLeft: 12 },
                      ]}
                    >
                      <HistoryCard
                        title={item.movie.name}
                        thumbnail={item.movie.thumb_url}
                        position={item.position}
                        duration={item.duration}
                        onPress={() => router.push(`/(home)/player/${item.movie.slug}` as any)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Category Sections */}
            {categoryData.map(
              (category, index) =>
                category.movies.length > 0 && (
                  <View key={`${category.slug}-${index}`} style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleRow}>
                        <LinearGradient
                          colors={['#FF6B6B', '#EE5A24']}
                          style={styles.sectionIndicator}
                        />
                        <ThemedText type="subtitle" style={styles.sectionTitle}>
                          {category.name}
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={() =>
                          router.push(
                            `/(home)/category/${category.slug}` as any
                          )
                        }
                        style={({ pressed }) => [
                          styles.seeMoreButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <ThemedText style={styles.seeMoreText}>
                          Xem thêm
                        </ThemedText>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color="rgba(255,255,255,0.5)"
                        />
                      </Pressable>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.movieScrollContent}
                      decelerationRate="fast"
                    >
                      {category.movies.slice(0, 10).map((movie, movieIndex) => (
                        <View
                          key={movie.id}
                          style={[
                            styles.movieCardWrapper,
                           
                          ]}
                        >
                          <MovieCard
                            id={movie.id}
                            title={movie.name}
                            poster={movie.thumb_url}
                            onPress={() =>
                              router.push(
                                `/(home)/movie/${movie.slug}` as any
                              )
                            }
                          />
                        </View>
                      ))}

                    
                    </ScrollView>
                  </View>
                )
            )}

            {/* Bottom Spacer */}
            <View style={styles.bottomSpacer} />
          </>
        )}
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─── Header ───────────────────────────
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  header: {
    overflow: 'hidden',
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Content ──────────────────────────
  content: {
    flex: 1,
  },

  // ─── Loading ──────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },

  // ─── Slider ───────────────────────────
  sliderContainer: {
    position: 'relative',
    marginBottom: 8,
    paddingTop:96
  },
  sliderGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  // ─── Sections ─────────────────────────
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },

  // ─── See More Button ──────────────────
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  seeMoreText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.96 }],
  },

  // ─── History Section ──────────────────
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  clearHistoryText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  historyScrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  historyCard: {
    width: HISTORY_CARD_WIDTH,
    overflow: 'hidden',
  },
  historyCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  historyThumbnailContainer: {
    width: HISTORY_CARD_WIDTH,
    height: HISTORY_CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  historyThumbnail: {
    width: '100%',
    height: '100%',
  },
  historyThumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  historyPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,107,107,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
  timeRemainingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeRemainingText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  historyProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  historyProgressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  historyTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 16,
  },

  // ─── Movie Cards ──────────────────────
  movieScrollContent: {
    paddingRight: 16,
  },
  movieCardWrapper: {
    marginRight: 2,
  },

  // ─── See More Card ────────────────────
  seeMoreCard: {
    width: 120,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  seeMoreCardPressed: {
    opacity: 0.6,
  },
  seeMoreCardGradient: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  seeMoreCardText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
  },

  // ─── Bottom ───────────────────────────
  bottomSpacer: {
    height: 100,
  },
});
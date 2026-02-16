import { HistoryCard } from '@/components/history-card';
import { MovieCard } from '@/components/movie-card';
import { MovieSlider } from '@/components/movie-slider';
import { useLatestMovies, useMovies, useMoviesByCategory } from '@/hooks/use-movies';
import { useWatchHistoryStore } from '@/store/use-watch-history-store';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

const HISTORY_CARD_WIDTH = 160;
const HISTORY_CARD_HEIGHT = 100;

// Config danh mục - dễ dàng thêm/bớt
const CATEGORIES_CONFIG = [
  { name: 'Mới cập nhật', slug: 'moi-cap-nhat', icon: 'language-outline' },
  { name: 'Việt Sub', slug: 'vietsub', icon: 'language-outline' },
  { name: 'Không Che', slug: 'khong-che', icon: 'eye-outline' },
  { name: 'Châu Âu', slug: 'chau-au', icon: 'globe-outline' },
  { name: 'Việt Nam', slug: 'viet-nam-clip', icon: 'flag-outline' },
  { name: 'Trung Quốc', slug: 'trung-quoc', icon: 'earth-outline' },
  { name: 'Hàn Quốc', slug: 'han-quoc-18-', icon: 'heart-outline' },
  { name: 'Hentai', slug: 'hentai', icon: 'color-palette-outline' },
];

export default function MoviesScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { history } = useWatchHistoryStore();
  
  // Fetch slider (banner chính)
  const { data: allMovies, isLoading: isLoadingSlider } = useMovies(1);
  
  // Fetch latest movies from new API
  const { data: latestMovies, isLoading: isLoadingLatest } = useLatestMovies(1);
  
  // Fetch tất cả danh mục (React tự động chạy song song)
  const { data: vietnamMovies } = useMoviesByCategory('viet-nam-clip', 1);
  const { data: vietsubMovies } = useMoviesByCategory('vietsub', 1);
  const { data: europeMovies } = useMoviesByCategory('chau-au', 1);
  const { data: chinaMovies } = useMoviesByCategory('trung-quoc', 1);
  const { data: koreaMovies } = useMoviesByCategory('han-quoc-18-', 1);
  const { data: uncensoredMovies } = useMoviesByCategory('khong-che', 1);
  const { data: javHdMovies } = useMoviesByCategory('jav-hd', 1);
  const { data: hentaiMovies } = useMoviesByCategory('hentai', 1);

  // Đề xuất JAV HD (lấy từ local data)
  const recommendedMovies = useMemo(() => {
    const moviesData = require('@/constants/movies.json');
    const javHdMovies = moviesData.filter((movie: any) => 
      movie.categories?.some((cat: any) => cat.slug === 'jav-hd')
    );
    // Shuffle và lấy 10 phim ngẫu nhiên
    return javHdMovies.sort(() => Math.random() - 0.5).slice(0, 15);
  }, []);

  // Gom dữ liệu bằng useMemo để tránh tính toán lại mỗi lần scroll
  const sections = useMemo(() => {
    const dataMap: Record<string, any> = {
      'viet-nam-clip': vietnamMovies,
      'vietsub': vietsubMovies,
      'chau-au': europeMovies,
      'trung-quoc': chinaMovies,
      'han-quoc-18-': koreaMovies,
      'khong-che': uncensoredMovies,
      'jav-hd': javHdMovies,
      'hentai': hentaiMovies,
      'moi-cap-nhat': latestMovies
    };

    return CATEGORIES_CONFIG.map(cat => ({
      ...cat,
      movies: dataMap[cat.slug]?.movies || []
    })).filter(section => section.movies.length > 0);
  }, [vietnamMovies, vietsubMovies, europeMovies, chinaMovies, koreaMovies, uncensoredMovies, javHdMovies, hentaiMovies, latestMovies]);

 

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });



  

  return (
    <View style={styles.container}>
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
                <Text  style={styles.headerTitle}>
                  AvTube
                </Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <Pressable 
                onPress={() => router.push('/(home)/history' as any)}
                style={styles.headerIconButton}
              >
                <Ionicons name="time-outline" size={22} color="#fff" />
              </Pressable>
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
        {isLoadingSlider ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#FF6B6B" />
              <Text style={styles.loadingTitle}>Đang tải phim</Text>
              <Text style={styles.loadingSubtitle}>Vui lòng đợi trong giây lát...</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Hero Slider */}
            <View style={styles.sliderContainer}>
              <MovieSlider
                movies={recommendedMovies.slice(10,15)}
                onPressMovie={(movie) =>
                  router.push(`/(home)/movie/${movie.slug}` as any)
                }
                onPressPlay={(movie) =>
                  router.push(`/(home)/player/${movie.slug}` as any)
                }
              />
              <LinearGradient
                colors={['transparent', '#0A0A0A', '#0A0A0A']}
                style={styles.sliderGradient}
              />
            </View>

            {/* Recommended Section - JAV HD */}
            {recommendedMovies.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <LinearGradient
                      colors={['#FF6B6B', '#EE5A24']}
                      style={styles.sectionIndicator}
                    />
                    <Ionicons name="star" size={18} color="#FFD700" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>
                      Đề xuất cho bạn
                    </Text>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.movieScrollContent}
                  decelerationRate="fast"
                >
                  {recommendedMovies.slice(0,9).map((movie: any, index: number) => (
                    <View
                      key={movie.id}
                      style={styles.movieCardWrapper}
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
            )}

            {/* Watch History Section */}
            {history.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <LinearGradient
                      colors={['#FF6B6B', '#EE5A24']}
                      style={styles.sectionIndicator}
                    />
                    <Text  style={styles.sectionTitle}>
                      Xem gần đây
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(home)/history' as any)}
                    style={({ pressed }) => [
                      styles.clearHistoryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.clearHistoryText}>
                      Xem tất cả
                    </Text>
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
            {sections.map(
              (category, index) => (
                  <View key={`${category.slug}-${index}`} style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleRow}>
                        <LinearGradient
                          colors={['#FF6B6B', '#EE5A24']}
                          style={styles.sectionIndicator}
                        />
                        <Text  style={styles.sectionTitle}>
                          {category.name}
                        </Text>
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
                        <Text style={styles.seeMoreText}>
                          Xem thêm
                        </Text>
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
                      {category.movies.slice(0, 10).map((movie:any, movieIndex:number) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
    backgroundColor: '#0A0A0A',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    minHeight: Dimensions.get('screen').height
  },
  loadingContent: {
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '400',
  },

  // ─── Slider ───────────────────────────
  sliderContainer: {
    position: 'relative',
    marginBottom: 8,
    paddingTop:48
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 4,
  },
  clearHistoryText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  historyScrollContent: {
    paddingRight: 16,
    gap: 4,
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
    backgroundColor: 'rgba(255,255,255,0.03)',
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

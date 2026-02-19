import { HistoryCard } from '@/components/history-card';
import { MovieCard } from '@/components/movie-card';
import { MovieSlider } from '@/components/movie-slider';
import { useLatestMovies, useMovies, useMoviesByCategory } from '@/hooks/use-movies';
import { useWatchHistoryStore } from '@/store/use-watch-history-store';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const HISTORY_CARD_WIDTH = 160;
const HISTORY_CARD_HEIGHT = 100;
const MOVIE_CARD_WIDTH = 130;
const SCREEN_HEIGHT = Dimensions.get('screen').height;

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

// ━━━ Section type cho FlashList dọc ━━━
type SectionItem =
  | { type: 'slider'; id: string; movies: any[] }
  | { type: 'recommended'; id: string; movies: any[] }
  | { type: 'history'; id: string; items: any[] }
  | { type: 'category'; id: string; movies: any[]; name: string; slug: string };

// ━━━ Separators ━━━
const MovieSeparator = memo(() => <View style={{ width: 2 }} />);
const HistorySeparator = memo(() => <View style={{ width: 4 }} />);

// ━━━ Horizontal Movie FlashList (memo) ━━━
const HorizontalMovieList = memo(({
  movies,
  onPressMovie,
}: {
  movies: any[];
  onPressMovie: (slug: string) => void;
}) => {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<any>) => (
      <MovieCard
        id={item.id}
        title={item.name}
        poster={item.thumb_url}
        onPress={() => onPressMovie(item.slug)}
      />
    ),
    [onPressMovie]
  );

  const keyExtractor = useCallback((item: any) => `movie-${item.id}`, []);

  return (
    <FlashList
      horizontal
      data={movies}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={MovieSeparator}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      drawDistance={300}
    />
  );
});

// ━━━ Horizontal History FlashList (memo) ━━━
const HorizontalHistoryList = memo(({
  items,
  onPressItem,
}: {
  items: any[];
  onPressItem: (slug: string) => void;
}) => {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<any>) => (
      <HistoryCard
        title={item.movie.name}
        thumbnail={item.movie.thumb_url}
        position={item.position}
        duration={item.duration}
        onPress={() => onPressItem(item.movie.slug)}
      />
    ),
    [onPressItem]
  );

  const keyExtractor = useCallback(
    (item: any) => `history-${item.movie.id}`,
    []
  );

  return (
    <FlashList
      horizontal
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={HistorySeparator}
      showsHorizontalScrollIndicator={false}
      snapToInterval={HISTORY_CARD_WIDTH + 12}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  );
});

// ━━━ Section Header (memo) ━━━
const SectionHeader = memo(({
  title,
  icon,
  iconColor,
  actionLabel,
  onAction,
}: {
  title: string;
  icon?: string;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      <LinearGradient
        colors={['#FF6B6B', '#EE5A24']}
        style={styles.sectionIndicator}
      />
      {icon && (
        <Ionicons
          name={icon as any}
          size={18}
          color={iconColor || '#fff'}
          style={styles.sectionIcon}
        />
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {actionLabel && onAction && (
      <Pressable
        onPress={onAction}
        style={({ pressed }) => [
          styles.seeMoreButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.seeMoreText}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
      </Pressable>
    )}
  </View>
));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MoviesScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { history } = useWatchHistoryStore();

  // ─── Data fetching ───
  const { data: allMovies, isLoading: isLoadingSlider } = useMovies(1);
  const { data: latestMovies } = useLatestMovies(1);
  const { data: vietnamMovies } = useMoviesByCategory('viet-nam-clip', 1);
  const { data: vietsubMovies } = useMoviesByCategory('vietsub', 1);
  const { data: europeMovies } = useMoviesByCategory('chau-au', 1);
  const { data: chinaMovies } = useMoviesByCategory('trung-quoc', 1);
  const { data: koreaMovies } = useMoviesByCategory('han-quoc-18-', 1);
  const { data: uncensoredMovies } = useMoviesByCategory('khong-che', 1);
  const { data: javHdMovies } = useMoviesByCategory('jav-hd', 1);
  const { data: hentaiMovies } = useMoviesByCategory('hentai', 1);

  // ─── Local data ───
  const recommendedMovies = useMemo(() => {
    const moviesData = require('@/constants/movies.json');
    const javHd = moviesData.filter((movie: any) =>
      movie.categories?.some((cat: any) => cat.slug === 'jav-hd')
    );
    return javHd.sort(() => Math.random() - 0.5).slice(0, 15);
  }, []);

  // ─── Category sections ───
  const categorySections = useMemo(() => {
    const dataMap: Record<string, any> = {
      'viet-nam-clip': vietnamMovies,
      vietsub: vietsubMovies,
      'chau-au': europeMovies,
      'trung-quoc': chinaMovies,
      'han-quoc-18-': koreaMovies,
      'khong-che': uncensoredMovies,
      'jav-hd': javHdMovies,
      hentai: hentaiMovies,
      'moi-cap-nhat': latestMovies,
    };

    return CATEGORIES_CONFIG.map((cat) => ({
      ...cat,
      movies: dataMap[cat.slug]?.movies || [],
    })).filter((s) => s.movies.length > 0);
  }, [
    vietnamMovies, vietsubMovies, europeMovies, chinaMovies,
    koreaMovies, uncensoredMovies, javHdMovies, hentaiMovies, latestMovies,
  ]);

  // ─── Build section data cho FlashList dọc ───
  const sectionData = useMemo<SectionItem[]>(() => {
    const data: SectionItem[] = [];

    // Slider
    data.push({
      type: 'slider',
      id: 'slider',
      movies: recommendedMovies.slice(10, 15),
    });

    // Recommended
    if (recommendedMovies.length > 0) {
      data.push({
        type: 'recommended',
        id: 'recommended',
        movies: recommendedMovies.slice(0, 9),
      });
    }

    // Watch history
    if (history.length > 0) {
      data.push({
        type: 'history',
        id: 'history',
        items: history.slice(0, 10),
      });
    }

    // Categories
    categorySections.forEach((section) => {
      data.push({
        type: 'category',
        id: `cat-${section.slug}`,
        movies: section.movies.slice(0, 10),
        name: section.name,
        slug: section.slug,
      });
    });

    return data;
  }, [recommendedMovies, history, categorySections]);

  // ─── Stable navigation callbacks ───
  const navigateToMovie = useCallback(
    (slug: string) => router.push(`/(home)/movie/${slug}` as any),
    [router]
  );

  const navigateToPlayer = useCallback(
    (slug: string) => router.push(`/(home)/player/${slug}` as any),
    [router]
  );

  const navigateToCategory = useCallback(
    (slug: string) => router.push(`/(home)/category/${slug}` as any),
    [router]
  );

  const navigateToHistory = useCallback(
    () => router.push('/(home)/history' as any),
    [router]
  );

  // ─── Scroll animation (useNativeDriver: false vì FlashList) ───
  const handleScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
      ),
    [scrollY]
  );

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });

  // ─── FlashList: renderItem ───
  const renderSectionItem = useCallback(
    ({ item }: ListRenderItemInfo<SectionItem>) => {
      switch (item.type) {
        case 'slider':
          return (
            <View style={styles.sliderContainer}>
              <MovieSlider
                movies={item.movies}
                onPressMovie={(movie) => navigateToMovie(movie.slug)}
                onPressPlay={(movie) => navigateToPlayer(movie.slug)}
              />
              <LinearGradient
                colors={['transparent', '#0A0A0A', '#0A0A0A']}
                style={styles.sliderGradient}
              />
            </View>
          );

        case 'recommended':
          return (
            <View style={styles.sectionContainer}>
              <SectionHeader
                title="Đề xuất cho bạn"
                icon="star"
                iconColor="#FFD700"
              />
              <HorizontalMovieList
                movies={item.movies}
                onPressMovie={navigateToMovie}
              />
            </View>
          );

        case 'history':
          return (
            <View style={styles.sectionContainer}>
              <SectionHeader
                title="Xem gần đây"
                actionLabel="Xem tất cả"
                onAction={navigateToHistory}
              />
              <HorizontalHistoryList
                items={item.items}
                onPressItem={navigateToPlayer}
              />
            </View>
          );

        case 'category':
          return (
            <View style={styles.sectionContainer}>
              <SectionHeader
                title={item.name}
                actionLabel="Xem thêm"
                onAction={() => navigateToCategory(item.slug)}
              />
              <HorizontalMovieList
                movies={item.movies}
                onPressMovie={navigateToMovie}
              />
            </View>
          );

        default:
          return null;
      }
    },
    [navigateToMovie, navigateToPlayer, navigateToCategory, navigateToHistory]
  );

  // ─── FlashList: getItemType (tối ưu recycling) ───
  const getItemType = useCallback((item: SectionItem) => item.type, []);

  // ─── FlashList: keyExtractor ───
  const keyExtractor = useCallback((item: SectionItem) => item.id, []);

  // ─── FlashList: overrideItemLayout (cải thiện ước tính kích thước) ───
  const overrideItemLayout = useCallback(
    (layout: { span?: number; size?: number }, item: SectionItem) => {
      switch (item.type) {
        case 'slider':
          layout.size = 360;
          break;
        case 'history':
          layout.size = 210;
          break;
        case 'recommended':
        case 'category':
          layout.size = 270;
          break;
      }
    },
    []
  );

  // ─── Footer spacer ───
  const ListFooter = useCallback(
    () => <View style={styles.bottomSpacer} />,
    []
  );

  // ━━━ RENDER ━━━
  return (
    <View style={styles.container}>
      {/* ── Animated Header ── */}
      <Animated.View style={styles.headerWrapper}>
        <BlurView intensity={90} tint="dark" style={styles.header}>
          <Animated.View
            style={[styles.headerBg, { opacity: headerBgOpacity }]}
          />
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
                <Text style={styles.headerTitle}>AvTube</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={navigateToHistory}
                style={styles.headerIconButton}
              >
                <Ionicons name="time-outline" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </BlurView>
      </Animated.View>

      {/* ── Main Content ── */}
      {isLoadingSlider ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingTitle}>Đang tải phim</Text>
            <Text style={styles.loadingSubtitle}>
              Vui lòng đợi trong giây lát...
            </Text>
          </View>
        </View>
      ) : (
        <FlashList
          data={sectionData}
          renderItem={renderSectionItem}
          getItemType={getItemType}
          keyExtractor={keyExtractor}
          overrideItemLayout={overrideItemLayout}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          drawDistance={500}
          ListFooterComponent={ListFooter}
          contentContainerStyle={{ backgroundColor: '#0A0A0A' }}
        />
      )}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // ─── Header ───
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

  // ─── Loading ───
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT,
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

  // ─── Slider ───
  sliderContainer: {
    position: 'relative',
    marginBottom: 8,
    paddingTop: 120,
  },
  sliderGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  // ─── Sections ───
  sectionContainer: {
    paddingBottom: 28,
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

  // ─── Buttons ───
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

  // ─── Bottom ───
  bottomSpacer: {
    height: 100,
  },
});
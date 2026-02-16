import { MovieCard } from '@/components/movie-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import actorsData from '@/constants/actors.json';
import moviesData from '@/constants/movies.json';
import { Movie } from '@/types/Movie';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from "@shopify/flash-list";
import { BlurView } from 'expo-blur';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
interface Actor {
  id: string;
  name: string;
  thumb_url: string;
  movieCount: number;
}

export default function ActorDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const isDark = true; // Force dark mode
  const scrollY = useRef(new Animated.Value(0)).current;

  const actors = actorsData as Actor[];
  const movies = moviesData as Movie[];

  const C = useMemo(
    () => ({
      bg: isDark ? '#0A0A0A' : '#ffffff',
      card: isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f8',
      accent: isDark ? '#FF6B6B' : '#EE5A24',
      accentSoft: isDark ? 'rgba(255,107,107,0.12)' : 'rgba(238,90,36,0.12)',
      muted: isDark ? 'rgba(255,255,255,0.5)' : '#9e9eaf',
      text: isDark ? '#fff' : '#1a1a2e',
    }),
    [isDark],
  );

  // Decode actor name from URL
  const actorName = decodeURIComponent(name || '');

  // Find actor info
  const actor = useMemo(
    () => actors.find((a) => a.name === actorName),
    [actorName, actors],
  );

  // Get all movies of this actor
  const actorMovies = useMemo(
    () => movies.filter((movie) => movie.actors.includes(actorName)),
    [actorName, movies],
  );

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

  if (!actor) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <IconSymbol name="person.fill.xmark" size={60} color={C.muted} />
          <Text style={[styles.errorText, { color: C.text }]}>
            Không tìm thấy diễn viên
          </Text>
          <Pressable
            style={[styles.backButton, { backgroundColor: C.accentSoft }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: C.accent }]}>
              Quay lại
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Fixed Header */}
      <Animated.View style={styles.headerWrapper}>
        <BlurView intensity={90} tint="dark" style={styles.header}>
          <Animated.View style={[styles.headerBg, { opacity: headerBgOpacity }]} />
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>
            <Animated.View style={{ opacity: headerOpacity, flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {actor.name}
              </Text>
            </Animated.View>
          </View>
        </BlurView>
      </Animated.View>

      <FlashList
        data={actorMovies}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
       onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={styles.actorInfoSection}>
            <View style={styles.actorHeader}>
              <Text style={[styles.actorName, { color: C.text }]}>
                {actor.name}
              </Text>
              <View style={[styles.movieCountBadge, { backgroundColor: C.accentSoft }]}>
                <IconSymbol name="film.fill" size={14} color={C.accent} />
                <Text style={[styles.movieCountText, { color: C.accent }]}>
                  {actorMovies.length} phim
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <MovieCard
              id={item.id}
              title={item.name}
              poster={item.thumb_url}
              variant="grid"
              onPress={() => router.push(`/(home)/movie/${item.slug}`)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="film.stack" size={60} color={C.muted} />
            <Text style={[styles.emptyText, { color: C.text }]}>
              Chưa có phim nào
            </Text>
          </View>
        }
      />
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
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // ─── Actor Info ───────────────────────
  actorInfoSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  actorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actorName: {
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
  },
  movieCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  movieCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ─── List Content ─────────────────────
  listContent: {
    paddingTop: Platform.OS === 'ios' ? 96 : 88,
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  itemContainer: {
    flex: 1,
    paddingInline:4,
    paddingBlock:4
  },
  // ─── Empty State ──────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  // ─── Error State ──────────────────────
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

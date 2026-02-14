import { IconSymbol } from '@/components/ui/icon-symbol';
import actorsData from '@/constants/actors.json';
import moviesData from '@/constants/movies.json';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Movie } from '@/types/Movie';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, View
} from 'react-native';

interface Actor {
  id: string;
  name: string;
  thumb_url: string;
  movieCount: number;
}

export default function ActorsScreen() {
  const colorScheme = useColorScheme();
  const isDark = true; // Force dark mode
  const scrollY = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');

  const actors = actorsData as Actor[];
  const movies = moviesData as Movie[];

  const C = useMemo(
    () => ({
      bg: isDark ? '#0A0A0A' : '#ffffff',
      headerBg: isDark ? '#0A0A0A' : '#ffffff',
      card: isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f8',
      border: isDark ? 'rgba(255,255,255,0.08)' : '#e2e2e8',
      accent: isDark ? '#FF6B6B' : '#EE5A24',
      accentSoft: isDark ? 'rgba(255,107,107,0.12)' : 'rgba(238,90,36,0.12)',
      muted: isDark ? 'rgba(255,255,255,0.5)' : '#9e9eaf',
      text: isDark ? '#fff' : '#1a1a2e',
    }),
    [isDark],
  );

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });

  const filteredActors = useMemo(() => {
    if (!searchQuery.trim()) return actors;
    const query = searchQuery.toLowerCase();
    return actors.filter((actor) =>
      actor.name.toLowerCase().includes(query),
    );
  }, [searchQuery, actors]);

  const handleActorPress = (actorName: string) => {
    // Navigate to actor detail page
    router.push(`/(home)/actor/${encodeURIComponent(actorName)}` as any);
  };

  const renderActorCard = ({ item }: { item: Actor }) => (
    <Pressable
      style={[styles.actorCard, { backgroundColor: C.card }]}
      onPress={() => handleActorPress(item.name)}
    >
      <View style={styles.actorImageContainer}>
        {item.thumb_url ? (
          <Image
            source={{ uri: item.thumb_url }}
            style={styles.actorImage}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[styles.actorPlaceholder, { backgroundColor: C.accentSoft }]}>
            <IconSymbol name="person.fill" size={32} color={C.accent} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.actorGradient}
        />
      </View>
      <View style={styles.actorInfo}>
        <Text style={[styles.actorName, { color: C.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={[styles.movieCountBadge, { backgroundColor: C.accentSoft }]}>
          <IconSymbol name="film.fill" size={10} color={C.accent} />
          <Text style={[styles.movieCountText, { color: C.accent }]}>
            {item.movieCount}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Animated Header */}
      <Animated.View style={styles.headerWrapper}>
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
                  <IconSymbol name="person.2.fill" size={16} color="#fff" />
                </LinearGradient>
                <Text  style={styles.headerTitle}>
                  Diễn viên
                </Text>
              </View>
            </View>
            <Text style={styles.count}>
              {filteredActors.length} người
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <IconSymbol name="magnifyingglass" size={16} color={C.muted} />
              <TextInput
                style={[styles.searchInput, { color: C.text }]}
                placeholder="Tìm diễn viên..."
                placeholderTextColor={C.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={12}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>
      </Animated.View>

      {/* Actors List */}
      {filteredActors.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyCircle, { backgroundColor: C.accentSoft }]}>
            <IconSymbol name="person.fill.questionmark" size={36} color={C.accent} />
          </View>
          <Text style={[styles.emptyText, { color: C.text }]}>
            Không tìm thấy diễn viên
          </Text>
          <Text style={[styles.emptySub, { color: C.muted }]}>
            Thử từ khóa khác
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredActors}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          renderItem={renderActorCard}
        />
      )}
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
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
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
  count: {
    fontSize: 14,
    opacity: 0.6,
    color:'#fff'
  },
  // ─── Search ───────────────────────────
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  // ─── List Content ─────────────────────
  listContent: {
    paddingTop: Platform.OS === 'ios' ? 170 : 162,
    paddingHorizontal: 6,
    paddingBottom: 80,
  },
  row: {
    gap: 6,
    marginBottom: 6,
  },
  // ─── Actor Card ───────────────────────
  actorCard: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 3,
  },
  actorImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actorImage: {
    width: '100%',
    height: '100%',
  },
  actorPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actorGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  actorInfo: {
    padding: 6,
    gap: 4,
  },
  actorName: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  movieCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
  },
  movieCountText: {
    fontSize: 9,
    fontWeight: '700',
  },
  // ─── Empty State ──────────────────────
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
});

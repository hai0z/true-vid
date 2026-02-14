import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { MovieCard } from '@/components/movie-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import moviesData from '@/constants/movies.json';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Movie } from '@/types/Movie';

// ─── Constants ────────────────────────────────────────────
const SEARCH_HISTORY_KEY = 'movie_search_history';
const MAX_HISTORY = 10;
const DEBOUNCE_MS = 400;

// ─── Helpers ──────────────────────────────────────────────

/** Bỏ dấu tiếng Việt + lowercase để so khớp tốt hơn */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Cho điểm relevance – điểm càng cao càng khớp */
function scoreMovie(movie: Movie, raw: string): number {
  const q = normalize(raw);
  if (!q) return 0;

  let score = 0;
  const name = normalize(movie.name);

  // ── Name matches (quan trọng nhất) ──
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 80;
  else if (name.includes(` ${q}`)) score += 60; // word boundary
  else if (name.includes(q)) score += 40;

  // ── Actor match ──
  if (movie.actors.some((a) => normalize(a).includes(q))) score += 30;

  // ── Category match ──
  if (movie.categories.some((c) => normalize(c.name).includes(q)))
    score += 20;

  // ── Content / description match ──
  if (normalize(movie.content).includes(q)) score += 10;

  return score;
}

// ─── Custom hooks ─────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const movies = moviesData as Movie[];

  // ── State ──
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const isSearching = query.trim() !== debouncedQuery.trim();

  // ── Refs ──
  const inputRef = useRef<TextInput>(null);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Colors ──
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
      tagBg: isDark ? 'rgba(255,255,255,0.05)' : '#ededf4',
    }),
    [isDark],
  );

  // ── Animate border on focus ──
  const animateFocus = (toValue: number) =>
    Animated.spring(borderAnim, {
      toValue,
      useNativeDriver: false,
      tension: 60,
      friction: 9,
    }).start();

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.accent],
  });

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });

  // ── History CRUD ──
  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw));
    });
  }, []);

  const persistHistory = useCallback(async (next: string[]) => {
    setHistory(next);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  }, []);

  const addHistory = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      persistHistory([t, ...history.filter((h) => h !== t)].slice(0, MAX_HISTORY));
    },
    [history, persistHistory],
  );

  const removeHistory = useCallback(
    (term: string) => persistHistory(history.filter((h) => h !== term)),
    [history, persistHistory],
  );

  const clearAllHistory = useCallback(() => persistHistory([]), [persistHistory]);

  // ── Suggested categories ──
  const popularCategories = useMemo(() => {
    const map = new Map<string, number>();
    movies.forEach((m) =>
      m.categories.forEach((c) => map.set(c.name, (map.get(c.name) ?? 0) + 1)),
    );
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
  }, [movies]);

  // ── Filtered + scored results ──
  const results = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];
    return movies
      .map((m) => ({ movie: m, score: scoreMovie(m, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.movie);
  }, [debouncedQuery, movies]);

  // ── Handlers ──
  const onMoviePress = (slug: string) => {
    addHistory(query.trim());
    Keyboard.dismiss();
    router.push(`/(home)/movie/${slug}`);
  };

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const cancel = () => {
    setQuery('');
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  const onSubmit = () => {
    if (query.trim()) addHistory(query.trim());
    Keyboard.dismiss();
  };

  // ── Render helpers ──
  const renderSearchBar = () => (
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
                <IconSymbol name="magnifyingglass" size={16} color="#fff" />
              </LinearGradient>
              <Text  style={styles.headerTitle}>
                Tìm kiếm
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <Animated.View
              style={[
                styles.searchBox,
                {
                  backgroundColor: C.card,
                  borderColor,
                  flex: 1,
                },
              ]}>
              <IconSymbol
                name="magnifyingglass"
                size={18}
                color={focused ? C.accent : C.muted}
              />
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: C.text }]}
                placeholder="Phim, diễn viên, thể loại…"
                placeholderTextColor={C.muted}
                value={query}
                onChangeText={setQuery}
                onFocus={() => {
                  setFocused(true);
                  animateFocus(1);
                }}
                onBlur={() => {
                  setFocused(false);
                  animateFocus(0);
                }}
                onSubmitEditing={onSubmit}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={clearQuery} hitSlop={12}>
                  <IconSymbol name="xmark.circle.fill" size={18} color={C.muted} />
                </TouchableOpacity>
              )}
            </Animated.View>

            {focused && (
              <TouchableOpacity onPress={cancel} style={styles.cancelBtn}>
                <Text style={[styles.cancelTxt, { color: C.accent }]}>
                  Huỷ
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );

  const renderIdleContent = () => (
    <View style={styles.idleWrap}>
      {/* ── Recent searches ── */}
      {history.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              Gần đây
            </Text>
            <TouchableOpacity onPress={clearAllHistory}>
              <Text style={[styles.clearAll, { color: C.accent }]}>
                Xoá tất cả
              </Text>
            </TouchableOpacity>
          </View>

          {history.map((h, i) => (
            <TouchableOpacity
              key={`h-${i}`}
              style={[styles.historyRow, { borderBottomColor: C.border }]}
              activeOpacity={0.6}
              onPress={() => setQuery(h)}>
              <IconSymbol name="clock" size={16} color={C.muted} />
              <Text
                style={[styles.historyTxt, { color: C.text }]}
                numberOfLines={1}>
                {h}
              </Text>
              <TouchableOpacity onPress={() => removeHistory(h)} hitSlop={12}>
                <IconSymbol name="xmark" size={12} color={C.muted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Popular categories ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>
          Thể loại phổ biến
        </Text>
        <View style={styles.tags}>
          {popularCategories.map((cat, i) => (
            <TouchableOpacity
              key={`c-${i}`}
              style={[styles.tag, { backgroundColor: C.accentSoft }]}
              activeOpacity={0.7}
              onPress={() => setQuery(cat)}>
              <Text style={[styles.tagTxt, { color: C.accent }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Illustration ── */}
      {history.length === 0 && (
        <View style={styles.emptyCenter}>
          <View
            style={[styles.emptyCircle, { backgroundColor: C.accentSoft }]}>
            <IconSymbol name="magnifyingglass" size={36} color={C.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>
            Khám phá bộ phim yêu thích
          </Text>
          <Text style={[styles.emptySub, { color: C.muted }]}>
            Tìm theo tên phim, diễn viên hoặc thể loại
          </Text>
        </View>
      )}
    </View>
  );

  const renderNoResults = () => (
    <View style={styles.emptyCenter}>
      <View style={[styles.emptyCircle, { backgroundColor: C.accentSoft }]}>
        <IconSymbol name="magnifyingglass" size={36} color={C.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: C.text }]}>
        Không tìm thấy kết quả
      </Text>
      <Text style={[styles.emptySub, { color: C.muted }]}>
        Thử từ khoá khác hoặc kiểm tra lại chính tả
      </Text>
    </View>
  );

  const renderSearching = () => (
    <View style={styles.searchingContainer}>
      <View style={styles.searchingContent}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={[styles.searchingText, { color: C.text }]}>
          Đang tìm kiếm...
        </Text>
        <Text style={[styles.emptySub, { color: C.muted }]}>
          "{query}"
        </Text>
      </View>
    </View>
  );

  // ── Main render ──
  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {renderSearchBar()}

      {query.trim() ? (
        isSearching ? (
          renderSearching()
        ) : debouncedQuery.trim() && results.length > 0 ? (
          <Animated.FlatList
            key="results-grid"  
            data={results}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
            ListHeaderComponent={
              <View style={styles.resultBar}>
                <View style={[styles.resultPill, { backgroundColor: C.accentSoft }]}>
                  <Text style={[styles.resultTxt, { color: C.accent }]}>
                    {results.length} kết quả
                  </Text>
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
                  onPress={() => onMoviePress(item.slug)}
                />
              </View>
            )}
          />
        ) : debouncedQuery.trim() ? (
          renderNoResults()
        ) : (
          renderSearching()
        )
      ) : (
        <Animated.FlatList
          data={[]}
          renderItem={null}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          ListHeaderComponent={renderIdleContent}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  /* ── Header / Search bar ── */
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingLeft: 2,
  },
  cancelTxt: {
    fontSize: 15,
    fontWeight: '600',
  },

  /* ── Idle / suggestions ── */
  idleWrap: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 170 : 162,
  },
  section: {
    marginBottom: 28,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  clearAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyTxt: {
    flex: 1,
    fontSize: 15,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagTxt: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Results grid ── */
  grid: {
    paddingTop: Platform.OS === 'ios' ? 170 : 162,
    paddingHorizontal: 12,
    paddingBottom: 30,
    gap: 12,
  },
  gridRow: {
    gap: 12,
    justifyContent: 'flex-start',
  },
  itemContainer: {
    flex: 1,
    maxWidth: '50%',
  },
  resultBar: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  resultPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  resultTxt: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Empty states ── */
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  /* ── Searching state ── */
  searchingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 200,
  },
  searchingContent: {
    alignItems: 'center',
    gap: 12,
  },
  searchingText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
});

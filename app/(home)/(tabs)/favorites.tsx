import { MovieCard } from '@/components/movie-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { likeVietSubs } from '@/constants/Data';
import { useFavoritesStore } from '@/store/use-favorites-store';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Animated, Button, StyleSheet, View } from 'react-native';

// Gọi hàm này khi cần
export default function FavoritesScreen() {
  const { favorites } = useFavoritesStore();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
const importData = useFavoritesStore((state) => state.importLegacyData);

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <ThemedView style={styles.container}>
      {/* Animated Blur Header */}
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
                  <Ionicons name="heart" size={16} color="#fff" />
                </LinearGradient>
                <ThemedText type="title" style={styles.headerTitle}>
                  Yêu thích
                </ThemedText>
              </View>
            </View>
            {favorites.length > 0 && (
              <ThemedText style={styles.count}>{favorites.length} phim</ThemedText>
            )}
          </View>
        </BlurView>
      </Animated.View>

      {favorites.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <IconSymbol name="heart" size={60} color="#666" />
          <ThemedText style={styles.emptyText}>
            Chưa có phim yêu thích
          </ThemedText>
          <Button title="Nạp dữ liệu" onPress={() => importData(likeVietSubs)} />
          <ThemedText style={styles.emptySubtext}>
            Nhấn vào biểu tượng trái tim để thêm phim vào danh sách yêu thích
          </ThemedText>
        </ThemedView>
      ) : (
        <Animated.FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <MovieCard
                id={item.id}
                title={item.name}
                poster={item.thumb_url}
                variant="grid"
                onPress={() => router.push(`/(home)/movie/${item.slug}` as any)}
              />
            </View>
          )}
        />
      )}
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
  count: {
    fontSize: 14,
    opacity: 0.6,
  },
  // ─── List Content ─────────────────────
  listContent: {
    paddingTop: 108,
    paddingHorizontal: 12,
    paddingBottom: 80,
    gap: 12,
  },
  row: {
    gap: 12,
    justifyContent: 'flex-start',
  },
  itemContainer: {
    flex: 1,
    maxWidth: '50%',
  },
  // ─── Empty State ──────────────────────
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -50,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    opacity: 0.8,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
});
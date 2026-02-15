import { IconSymbol } from '@/components/ui/icon-symbol';
import actorsData from '@/constants/actors.json';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Actor {
  id: string;
  name: string;
  thumb_url: string;
  movieCount: number;
}

// ─── Constants ───
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMNS = 2; // Số cột
const SPACING = 8;
const HORIZONTAL_PADDING = 12;
const ITEMS_PER_PAGE = 24; // Số lượng load mỗi lần

const CARD_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - (SPACING * (COLUMNS - 1))) / COLUMNS;

// ─── Component: Actor Card ───
const ActorCard = memo(({ item, onPress }: { item: Actor; onPress: (name: string) => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.actorCard}
        onPress={() => onPress(item.name)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.imageWrapper}>
          {item.thumb_url ? (
            <Image
              source={{ uri: item.thumb_url }}
              style={styles.actorImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.placeholder}>
              <IconSymbol name="person.fill" size={24} color="#555" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            locations={[0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
         
          <View style={styles.nameOverlay}>
            <Text style={styles.actorName} numberOfLines={2}>{item.name}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}, (prev, next) => prev.item.id === next.item.id);

// ─── Main Screen ───
export default function ActorsScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const listRef = useRef<Animated.FlatList<any>>(null);
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleData, setVisibleData] = useState<Actor[]>([]); // Dữ liệu đang hiển thị
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const actors = actorsData as Actor[];

  // 1. Lọc dữ liệu gốc (Master List)
  const allFilteredActors = useMemo(() => {
    if (!searchQuery.trim()) return actors;
    const query = searchQuery.toLowerCase();
    return actors.filter((actor) => actor.name.toLowerCase().includes(query));
  }, [searchQuery, actors]);

  // 2. Reset khi search thay đổi
  useEffect(() => {
    setPage(1);
    setVisibleData(allFilteredActors.slice(0, ITEMS_PER_PAGE));
    // Scroll lên đầu khi tìm kiếm
    if(listRef.current && visibleData.length > 0) {
        listRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [allFilteredActors]);

  // 3. Hàm Load More (Pagination Logic)
  const loadMore = useCallback(() => {
    if (isLoadingMore || visibleData.length >= allFilteredActors.length) return;

    setIsLoadingMore(true);
    
    // Giả lập delay mạng một chút để UI mượt hơn (nếu dữ liệu local thì có thể bỏ setTimeout)
    setTimeout(() => {
      const nextPage = page + 1;
      const newItems = allFilteredActors.slice(0, nextPage * ITEMS_PER_PAGE);
      
      setVisibleData(newItems);
      setPage(nextPage);
      setIsLoadingMore(false);
    }, 200);
  }, [page, isLoadingMore, visibleData.length, allFilteredActors]);

  // Header Animation
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 0.95],
    extrapolate: 'clamp',
  });

  const handleActorPress = useCallback((actorName: string) => {
    Keyboard.dismiss();
    router.push(`/(home)/actor/${encodeURIComponent(actorName)}` as any);
  }, []);

  const renderItem = useCallback(({ item }: { item: Actor }) => (
    <ActorCard item={item} onPress={handleActorPress} />
  ), [handleActorPress]);

  const HEADER_HEIGHT = insets.top + 110;

  // Footer Component (Loading Spinner)
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FF6B6B" />
      </View>
    );
  }, [isLoadingMore]);

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.headerBg, { opacity: headerBgOpacity }]} />
        
        <View style={styles.headerInner}>
          <View style={styles.titleRow}>
            <View style={styles.logoGroup}>
              <LinearGradient colors={['#FF6B6B', '#EE5A24']} style={styles.iconBadge}>
                <IconSymbol name="person.2.fill" size={14} color="#fff" />
              </LinearGradient>
              <Text style={styles.screenTitle}>Diễn viên</Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalText}>{allFilteredActors.length}</Text>
            </View>
          </View>

          <View style={styles.searchBar}>
            <IconSymbol name="magnifyingglass" size={16} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm diễn viên..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                <IconSymbol name="xmark.circle.fill" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ─── Content ─── */}
      {visibleData.length === 0 ? (
        <View style={[styles.emptyState, { paddingTop: HEADER_HEIGHT }]}>
          <View style={styles.emptyIcon}>
            <IconSymbol name="person.fill.questionmark" size={40} color="#FF6B6B" />
          </View>
          <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
        </View>
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={visibleData}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          contentContainerStyle={{
            paddingTop: HEADER_HEIGHT + 10,
            paddingBottom: 80, // Để chừa chỗ cho footer
            paddingHorizontal: HORIZONTAL_PADDING,
          }}
          columnWrapperStyle={{ gap: SPACING }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING }} />}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          renderItem={renderItem}
          // Pagination Props
          onEndReached={loadMore}
          onEndReachedThreshold={0.5} // Load khi scroll còn 50% màn hình
          ListFooterComponent={renderFooter}
          keyboardDismissMode="on-drag"
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
  // Header
  headerWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerInner: { paddingHorizontal: 16, gap: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  logoGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  totalBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  totalText: { fontSize: 12, fontWeight: '600', color: '#aaa' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 10, height: 40, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 0, height: '100%' },

  // List & Card
  actorCard: {
    width: CARD_WIDTH,
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  imageWrapper: { width: '100%', aspectRatio: 16/9 },
  actorImage: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' },
  nameOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, paddingBottom: 10 },
  actorName: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 },
  countBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255, 107, 107, 0.9)', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  countText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },

  // Footer & Empty
  footerLoader: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,107,107,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
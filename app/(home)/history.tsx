import { IconSymbol } from '@/components/ui/icon-symbol';
import { useWatchHistoryStore } from '@/store/use-watch-history-store';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View
} from 'react-native';

// Tạo Animated SectionList
const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

// ─── HELPER: Format Time ──────────────────────
const formatDuration = (seconds: number) => {
  if (!seconds) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// ─── HELPER: Date Logic ───────────────────────
const getSectionTitle = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Reset time part for accurate date comparison
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = n.getTime() - d.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${Math.ceil(diffDays)} ngày trước`;
  
  return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
};

// ─── COMPONENT: YouTube Style Card ────────────
const HistoryItemCard = ({
  item,
  onPress,
  onRemove,
}: {
  item: any;
  onPress: () => void;
  onRemove?: () => void;
}) => {
  // Tính % đã xem
  const progress = useMemo(() => {
    if (!item.duration || item.duration === 0) return 0;
    const p = (item.position / item.duration) * 100;
    return Math.min(Math.max(p, 0), 100);
  }, [item.position, item.duration]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardContainer,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* Thumbnail Section (16:9) */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: item.movie.thumb_url }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        
        {/* Time Badge (Duration) */}
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{formatDuration(item.duration)}</Text>
        </View>

        {/* Progress Bar (YouTube Style) */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <View style={styles.textContent}>
          {/* Tên phim */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.movie.name}
          </Text>
          
          {/* Metadata: chỉ hiện vị trí đã xem hoặc tên gốc nếu cần */}
          <Text style={styles.cardMeta} numberOfLines={1}>
            Dừng tại {formatDuration(item.position)}
          </Text>
        </View>

      
      </View>
    </Pressable>
  );
};

// ─── MAIN SCREEN ──────────────────────────────
export default function HistoryScreen() {
  const { history, clearHistory, removeFromHistory } = useWatchHistoryStore();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Khóa màn hình dọc khi vào trang này
  useFocusEffect(
    useCallback(() => {
      const lockPortrait = async () => {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        } catch (error) {
          console.log('Error locking orientation:', error);
        }
      };
      
      lockPortrait();
    }, [])
  );

  // Header Animation
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });

  const handleClearHistory = () => {
    // Hiển thị dialog xác nhận
    if (history.length === 0) return;
    
    // Sử dụng Alert native
    const { Alert } = require('react-native');
    Alert.alert(
      'Xóa lịch sử',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ],
      { cancelable: true }
    );
  };

  // 1. Nhóm dữ liệu theo ngày (SectionList data format)
  const groupedData = useMemo(() => {
    // Sắp xếp mới nhất lên đầu
    const sortedHistory = [...history].sort((a, b) => b.watchedAt - a.watchedAt);

    const sections: { title: string; data: typeof history }[] = [];
    
    sortedHistory.forEach((item) => {
      const title = getSectionTitle(item.watchedAt);
      const existingSection = sections.find((s) => s.title === title);
      
      if (existingSection) {
        existingSection.data.push(item);
      } else {
        sections.push({ title, data: [item] });
      }
    });

    return sections;
  }, [history]);

  return (
    <View style={styles.container}>
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
                  <Ionicons name="time" size={16} color="#fff" />
                </LinearGradient>
                <Text style={styles.headerTitle}>Lịch sử</Text>
              </View>
            </View>
            {history.length > 0 && (
              <Pressable onPress={handleClearHistory} style={styles.clearButton}>
                <Text style={styles.clearText}>Xóa tất cả</Text>
              </Pressable>
            )}
          </View>
        </BlurView>
      </Animated.View>

      {/* Content */}
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <IconSymbol name="clock.arrow.circlepath" size={40} color="#666" />
          </View>
          <Text style={styles.emptyText}>Chưa có lịch sử</Text>
          <Text style={styles.emptySubtext}>Phim bạn xem sẽ lưu tại đây</Text>
        </View>
      ) : (
        <AnimatedSectionList
          sections={groupedData}
          keyExtractor={(item: any) => item.movie.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          renderSectionHeader={({ section: { title } }: any) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item }: any) => (
            <HistoryItemCard
              item={item}
              onPress={() => router.push(`/(home)/movie/${item.movie.slug}` as any)}
              onRemove={() => removeFromHistory(item.movie.id)}
            />
          )}
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
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
  // ─── List Content ─────────────────────
  listContent: {
    paddingTop: 108,
    paddingBottom: 80,
  },

  // ─── Section Header ───
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    opacity: 0.9,
  },

  // ─── Card Style ───
  cardContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  thumbnailContainer: {
    width: 160,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginRight: 12,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8, // Cao hơn progress bar một chút
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  progressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF0000',
  },
  infoContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  textContent: {
    flex: 1,
    paddingTop: 4,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 6,
  },
  cardMeta: {
    color: '#aaa',
    fontSize: 12,
  },
  moreButton: {
    paddingLeft: 10,
    paddingTop: 4,
  },

  // ─── Empty State ──────────────────────
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -50,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#fff',
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
});
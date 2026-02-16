import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlayerGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const guides = [
    {
      title: 'Điều khiển cơ bản',
      items: [
        { icon: 'hand.tap', text: 'Chạm 1 lần: Hiện/ẩn điều khiển' },
        { icon: 'hand.tap.fill', text: 'Chạm 2 lần trái: Tua lùi' },
        { icon: 'hand.tap.fill', text: 'Chạm 2 lần phải: Tua tới' },
        { icon: 'hand.point.up.left.fill', text: 'Giữ màn hình 0.5s: Tốc độ 2x' },
      ],
    },
    {
      title: 'Cử chỉ vuốt',
      items: [
        { icon: 'arrow.up.arrow.down', text: 'Vuốt dọc bên trái: Điều chỉnh độ sáng' },
        { icon: 'arrow.up.arrow.down', text: 'Vuốt dọc bên phải: Điều chỉnh âm lượng' },
      ],
    },
    {
      title: 'Thanh điều khiển',
      items: [
        { icon: 'play.circle', text: 'Nút phát/tạm dừng' },
        { icon: 'goforward.10', text: 'Nút tua tới/lùi' },
        { icon: 'speaker.wave.2', text: 'Nút bật/tắt tiếng' },
        { icon: 'lock', text: 'Nút khóa màn hình' },
        { icon: 'gauge', text: 'Nút chọn tốc độ phát' },
        { icon: 'list.bullet', text: 'Nút xem video liên quan' },
      ],
    },
    {
      title: 'Thanh tua video',
      items: [
        { icon: 'slider.horizontal.3', text: 'Kéo thanh tua để di chuyển vị trí' },
        { icon: 'photo', text: 'Xem trước thumbnail khi tua (nếu bật)' },
      ],
    },
    {
      title: 'Tính năng khác',
      items: [
        { icon: 'arrow.clockwise', text: 'Tự động tiếp tục từ vị trí đã xem' },
        { icon: 'play.circle', text: 'Tự động phát khi mở video' },
        { icon: 'rotate.right', text: 'Tự động xoay ngang khi vào player' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <BlurView intensity={90} tint="dark" style={[styles.header, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['rgba(10,10,10,0.95)', 'rgba(10,10,10,0.8)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Hướng dẫn sử dụng</Text>
          <View style={{ width: 28 }} />
        </View>
      </BlurView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <LinearGradient
            colors={['#FF6B6B', '#EE5A24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.introIcon}
          >
            <Ionicons name="play-circle" size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.introTitle}>Trình phát video</Text>
          <Text style={styles.introText}>
            Khám phá các tính năng và cử chỉ điều khiển để có trải nghiệm xem phim tốt nhất
          </Text>
        </View>

        {/* Guides */}
        {guides.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#FF6B6B', '#EE5A24']}
                style={styles.sectionIndicator}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.guideItem}>
                  <View style={styles.guideIconContainer}>
                    <IconSymbol name={item.icon as any} size={22} color="#FF6B6B" />
                  </View>
                  <Text style={styles.guideText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={24} color="#FFD700" />
            <Text style={styles.tipsTitle}>Mẹo</Text>
          </View>
          <Text style={styles.tipsText}>
            • Bạn có thể tùy chỉnh thời gian tua, tốc độ phát mặc định và các cài đặt khác trong phần Cài đặt
          </Text>
          <Text style={styles.tipsText}>
            • Khóa màn hình để tránh chạm nhầm khi xem
          </Text>
          <Text style={styles.tipsText}>
            • Sử dụng tính năng xem trước thumbnail để tìm cảnh nhanh hơn
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  introCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  sectionContent: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guideIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,107,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  tipsCard: {
    backgroundColor: 'rgba(255,215,0,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
  },
  tipsText: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 22,
    marginBottom: 8,
  },
});

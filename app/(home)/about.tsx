import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const appInfo = [
    { label: 'Phiên bản', value: '1.0.0' },
    { label: 'Build', value: '2026.02.16' },
    { label: 'Nền tảng', value: 'React Native + Expo' },
  ];

  const features = [
    'Xem phim chất lượng cao',
    'Tự động lưu lịch sử xem',
    'Đề xuất phim thông minh',
    'Tua nhanh với thumbnail preview',
    'Tùy chỉnh player linh hoạt',
    'Giao diện thân thiện, dễ sử dụng',
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <BlurView intensity={90} tint="dark" style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} hitSlop={15}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Về ứng dụng</Text>
          <View style={{ width: 24 }} />
        </View>
      </BlurView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App Icon & Name */}
        <View style={styles.appHeader}>
          <LinearGradient
            colors={['#FF6B6B', '#EE5A24']}
            style={styles.appIcon}
          >
            <Ionicons name="play" size={48} color="#fff" />
          </LinearGradient>
          <Text style={styles.appName}>AvTube</Text>
          <Text style={styles.appTagline}>Xem phim mọi lúc, mọi nơi</Text>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>
          <View style={styles.infoCard}>
            {appInfo.map((info, index) => (
              <View key={index} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{info.label}</Text>
                <Text style={styles.infoValue}>{info.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tính năng nổi bật</Text>
          <View style={styles.featuresCard}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#FF6B6B" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Developer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhà phát triển</Text>
          <View style={styles.infoCard}>
            <Text style={styles.developerText}>
              Ứng dụng được phát triển với ❤️ bởi hai0z
            </Text>
            <Text style={styles.copyrightText}>
              © 2026 AvTube. All rights reserved.
            </Text>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liên hệ & Hỗ trợ</Text>
          <View style={styles.contactCard}>
            <Pressable style={styles.contactButton}>
              <Ionicons name="mail-outline" size={20} color="#FF6B6B" />
              <Text style={styles.contactText}>support@avtube.com</Text>
            </Pressable>
            <Pressable style={styles.contactButton}>
              <Ionicons name="globe-outline" size={20} color="#FF6B6B" />
              <Text style={styles.contactText}>www.avtube.com</Text>
            </Pressable>
          </View>
        </View>
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
  appHeader: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  featuresCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  developerText: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  copyrightText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
});

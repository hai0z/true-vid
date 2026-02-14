import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const colorScheme = useColorScheme();
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });

  const settingsSections = [
    {
      title: 'Tài khoản',
      items: [
        { icon: 'person.circle', label: 'Thông tin cá nhân', action: () => {} },
        { icon: 'lock', label: 'Đổi mật khẩu', action: () => {} },
      ],
    },
    {
      title: 'Cài đặt phát',
      items: [
        { 
          icon: 'play.circle', 
          label: 'Tự động phát', 
          toggle: true,
          value: autoPlay,
          onToggle: setAutoPlay,
        },
        { icon: 'film', label: 'Chất lượng video', action: () => {} },
      ],
    },
    {
      title: 'Thông báo',
      items: [
        { 
          icon: 'bell', 
          label: 'Nhận thông báo', 
          toggle: true,
          value: notifications,
          onToggle: setNotifications,
        },
      ],
    },
    {
      title: 'Khác',
      items: [
        { icon: 'info.circle', label: 'Về ứng dụng', action: () => {} },
        { icon: 'doc.text', label: 'Điều khoản sử dụng', action: () => {} },
        { icon: 'hand.raised', label: 'Chính sách bảo mật', action: () => {} },
      ],
    },
  ];

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
                  <Ionicons name="settings" size={16} color="#fff" />
                </LinearGradient>
                <Text  style={styles.headerTitle}>
                  Cài đặt
                </Text>
              </View>
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
        contentContainerStyle={styles.scrollContent}
      >
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <Pressable
                  key={itemIndex}
                  style={styles.settingItem}
                  onPress={item.action}
                  disabled={item.toggle}
                >
                  <View style={styles.settingLeft}>
                    <IconSymbol name={item.icon as any} size={24} color="#666" />
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                    />
                  ) : (
                    <IconSymbol name="chevron.right" size={20} color="#666" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        
        <Pressable style={styles.logoutButton}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
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
  // ─── Content ──────────────────────────
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 108,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  logoutButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

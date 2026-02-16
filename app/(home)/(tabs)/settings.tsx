import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSettingsStore } from '@/store/use-settings-store';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

// Define types for settings items
type SettingItemToggle = {
  icon: string;
  label: string;
  toggle: true;
  value: boolean;
  onToggle: (value: boolean) => void;
  subtitle?: string;
};

type SettingItemAction = {
  icon: string;
  label: string;
  toggle?: false;
  value?: string;
  action?: () => void;
  subtitle?: string;
};

type SettingItem = SettingItemToggle | SettingItemAction;

type SettingsSection = {
  title: string;
  items: SettingItem[];
};

export default function SettingsScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  
  // Settings store
  const {
    notifications,
    autoPlay,
    defaultPlaybackSpeed,
    defaultVolume,
    skipDuration,
    autoResume,
    showThumbnailPreview,
    setNotifications,
    setAutoPlay,
    setDefaultPlaybackSpeed,
    setDefaultVolume,
    setSkipDuration,
    setDoubleTapSkipDuration,
    setAutoResume,
    setShowThumbnailPreview,
  } = useSettingsStore();

  // Modal states
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0.3, 0.5],
    extrapolate: 'clamp',
  });

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const skipOptions = [5, 10, 15, 30];

  const settingsSections: SettingsSection[] = [
    {
      title: 'Cài đặt phát video',
      items: [
        { 
          icon: 'play.circle', 
          label: 'Tự động phát', 
          toggle: true,
          value: autoPlay,
          onToggle: setAutoPlay,
        },
        { 
          icon: 'goforward', 
          label: 'Tự động tiếp tục', 
          toggle: true,
          value: autoResume,
          onToggle: setAutoResume,
          subtitle: 'Tiếp tục từ vị trí đã xem',
        },
        { 
          icon: 'gauge', 
          label: 'Tốc độ phát mặc định', 
          value: `${defaultPlaybackSpeed}x`,
          action: () => setShowSpeedModal(true),
        },
        { 
          icon: 'speaker.wave.2', 
          label: 'Âm lượng mặc định', 
          value: `${Math.round(defaultVolume * 100)}%`,
          action: () => setShowVolumeModal(true),
        },
        { 
          icon: 'forward', 
          label: 'Thời gian tua', 
          value: `${skipDuration}s`,
          action: () => setShowSkipModal(true),
          subtitle: 'Thời gian tua khi nhấn nút hoặc double tap',
        },
        { 
          icon: 'photo', 
          label: 'Xem trước thumbnail', 
          toggle: true,
          value: showThumbnailPreview,
          onToggle: setShowThumbnailPreview,
          subtitle: 'Hiển thị ảnh xem trước khi tua',
        },
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
          subtitle: 'Thông báo phim mới',
        },
      ],
    },
    {
      title: 'Khác',
      items: [
        { 
          icon: 'play.rectangle', 
          label: 'Hướng dẫn sử dụng player', 
          action: () => router.push('/(home)/player-guide' as any),
          subtitle: 'Cách điều khiển và sử dụng trình phát',
        },
        { 
          icon: 'info.circle', 
          label: 'Về ứng dụng', 
          value: 'v1.0.0', 
          action: () => router.push('/(home)/about' as any),
        },
        { 
          icon: 'doc.text', 
          label: 'Điều khoản sử dụng', 
          action: () => router.push('/(home)/terms' as any),
        },
        { 
          icon: 'hand.raised', 
          label: 'Chính sách bảo mật', 
          action: () => router.push('/(home)/privacy' as any),
        },
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
                <Text style={styles.headerTitle}>
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
                  onPress={item.toggle ? undefined : item.action}
                  disabled={item.toggle === true}
                >
                  <View style={styles.settingLeft}>
                    <IconSymbol name={item.icon as any} size={24} color="#FF6B6B" />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      {item.subtitle && (
                        <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.settingRight}>
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#333', true: '#FF6B6B' }}
                        thumbColor="#fff"
                      />
                    ) : item.value ? (
                      <View style={styles.valueContainer}>
                        <Text style={styles.valueText}>{item.value}</Text>
                        <IconSymbol name="chevron.right" size={20} color="#666" />
                      </View>
                    ) : (
                      <IconSymbol name="chevron.right" size={20} color="#666" />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Speed Modal */}
      <Modal visible={showSpeedModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowSpeedModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tốc độ phát</Text>
            {speedOptions.map(speed => (
              <Pressable
                key={speed}
                style={[
                  styles.modalOption,
                  defaultPlaybackSpeed === speed && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setDefaultPlaybackSpeed(speed);
                  setShowSpeedModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  defaultPlaybackSpeed === speed && styles.modalOptionTextActive,
                ]}>
                  {speed}x
                </Text>
                {defaultPlaybackSpeed === speed && (
                  <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Volume Modal */}
      <Modal visible={showVolumeModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowVolumeModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Âm lượng mặc định</Text>
            <View style={styles.sliderContainer}>
              <Ionicons name="volume-low" size={20} color="#666" />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={defaultVolume}
                onValueChange={setDefaultVolume}
                minimumTrackTintColor="#FF6B6B"
                maximumTrackTintColor="#333"
                thumbTintColor="#FF6B6B"
              />
              <Ionicons name="volume-high" size={20} color="#666" />
            </View>
            <Text style={styles.sliderValue}>{Math.round(defaultVolume * 100)}%</Text>
          </View>
        </Pressable>
      </Modal>

      {/* Skip Duration Modal */}
      <Modal visible={showSkipModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowSkipModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thời gian tua</Text>
            {skipOptions.map(duration => (
              <Pressable
                key={duration}
                style={[
                  styles.modalOption,
                  skipDuration === duration && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSkipDuration(duration);
                  setDoubleTapSkipDuration(duration);
                  setShowSkipModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  skipDuration === duration && styles.modalOptionTextActive,
                ]}>
                  {duration} giây
                </Text>
                {skipDuration === duration && (
                  <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
    color: '#666',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 15,
    color: '#999',
  },
  
  // ─── Modal ────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalOptionActive: {
    backgroundColor: 'rgba(255,107,107,0.15)',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  modalOptionTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
});

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const colorScheme = useColorScheme();

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
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Cài đặt</ThemedText>
      </ThemedView>
      
      <ScrollView style={styles.content}>
        {settingsSections.map((section, sectionIndex) => (
          <ThemedView key={sectionIndex} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            <ThemedView style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <Pressable
                  key={itemIndex}
                  style={styles.settingItem}
                  onPress={item.action}
                  disabled={item.toggle}
                >
                  <View style={styles.settingLeft}>
                    <IconSymbol name={item.icon as any} size={24} color="#666" />
                    <ThemedText style={styles.settingLabel}>{item.label}</ThemedText>
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
            </ThemedView>
          </ThemedView>
        ))}
        
        <Pressable style={styles.logoutButton}>
          <ThemedText style={styles.logoutText}>Đăng xuất</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
  },
  content: {
    flex: 1,
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
    borderBottomColor: '#333',
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';


export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Tìm kiếm</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.searchContainer}>
        <View style={[
          styles.searchBox,
          { backgroundColor: isDark ? '#333' : '#f0f0f0' }
        ]}>
          <IconSymbol name="magnifyingglass" size={20} color="#666" />
          <TextInput
            style={[
              styles.searchInput,
              { color: isDark ? '#fff' : '#000' }
            ]}
            placeholder="Tìm kiếm phim..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </ThemedView>
      
      <ScrollView style={styles.content}>
        {searchQuery ? (
          <ThemedView style={styles.results}>
            {[1, 2, 3, 4].map((item) => (
              <Pressable key={item} style={styles.resultItem}>
                <View style={styles.resultPoster}>
                  <IconSymbol name="film" size={30} color="#666" />
                </View>
                <ThemedView style={styles.resultInfo}>
                  <ThemedText style={styles.resultTitle}>
                    Kết quả {item}
                  </ThemedText>
                  <ThemedText style={styles.resultMeta}>
                    2024 • Hành động
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </ThemedView>
        ) : (
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="magnifyingglass" size={60} color="#666" />
            <ThemedText style={styles.emptyText}>
              Nhập từ khóa để tìm kiếm phim
            </ThemedText>
          </ThemedView>
        )}
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
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  results: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  resultPoster: {
    width: 80,
    height: 120,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultMeta: {
    fontSize: 14,
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.6,
  },
});

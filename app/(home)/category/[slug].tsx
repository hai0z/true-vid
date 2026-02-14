import { MovieCard } from '@/components/movie-card';
import { useMoviesByCategory } from '@/hooks/use-movies';
import { Movie } from '@/types/Movie';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

const CATEGORY_NAMES: Record<string, string> = {
  'viet-nam-clip': 'Việt Nam',
  'vietsub': 'Việt sub',
  'chau-au': 'Châu Âu',
  'trung-quoc': 'Trung Quốc',
  'han-quoc-18-': 'Hàn Quốc',
  'khong-che': 'Không che',
  'jav-hd': 'JAV HD',
  'hentai': 'Hentai',
};

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);

  const { data, isLoading, isFetching } = useMoviesByCategory(slug, page);

  const categoryName = CATEGORY_NAMES[slug] || slug;

  useEffect(() => {
    if (data?.movies) {
      // Nếu là trang 1 thì reset, trang > 1 thì nối thêm
      setAllMovies(prev => page === 1 ? data.movies : [...prev, ...data.movies]);
    }
  }, [data, page]);

  const loadMore = () => {
    if (!isFetching && data?.page && data.page.current_page < data.page.last_page) {
      setPage(prev => prev + 1);
    }
  };

  const renderItem = ({ item }: { item: Movie }) => (
    <View style={styles.itemContainer}>
      <MovieCard
        id={item.id}
        title={item.name}
        poster={item.thumb_url}
        variant="grid" // ✅ Quan trọng: Dùng vertical cho lưới 2 cột
        onPress={() => router.push(`/(home)/movie/${item.slug}` as any)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: categoryName,
          headerShown: true, // Hoặc false tuỳ layout của bạn
          headerTransparent: true, // Để content tràn lên trên (dùng padding để đẩy xuống)
          headerTintColor: '#fff',
        }}
      />

      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <FlatList
          data={allMovies}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          
          // Cấu hình Grid 2 cột
          numColumns={2}
          columnWrapperStyle={styles.row} // Style cho hàng ngang (khoảng cách giữa 2 cột)
          
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          
          // Loader ở cuối khi cuộn
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : <View style={{ height: 20 }} /> // Spacer dưới cùng
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 12, // Khoảng cách lề trái phải toàn màn hình
    paddingTop: 110,       // Khoảng cách cho Header trong suốt (chỉnh số này nếu header che mất item)
    paddingBottom: 40,
    gap: 12,               // Khoảng cách dọc giữa các hàng (React Native 0.71+)
  },
  row: {
    gap: 12,               // Khoảng cách ngang giữa 2 cột
    justifyContent: 'flex-start', // Căn trái để tránh bị giãn khi hàng lẻ 1 item
  },
  itemContainer: {
    flex: 1,               // Chia đều không gian
    maxWidth: '50%',       // Giới hạn chiều rộng để không bị vỡ layout
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
  },
});

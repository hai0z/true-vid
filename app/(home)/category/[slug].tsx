import { MovieCard } from '@/components/movie-card';
import { useLatestMovies, useMoviesByCategory } from '@/hooks/use-movies';
import { Movie } from '@/types/Movie';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const CATEGORY_NAMES: Record<string, string> = {
  'viet-nam-clip': 'Việt Nam',
  'vietsub': 'Việt sub',
  'chau-au': 'Châu Âu',
  'trung-quoc': 'Trung Quốc',
  'han-quoc-18-': 'Hàn Quốc',
  'khong-che': 'Không che',
  'jav-hd': 'JAV HD',
  'hentai': 'Hentai',
  'moi-cap-nhat': 'Mới cập nhật',
};

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);

  // Nếu slug là 'moi-cap-nhat' thì dùng useLatestMovies (API mới), còn lại dùng useMoviesByCategory
  const isNewUpdates = slug === 'moi-cap-nhat';
  
  const latestQuery = useLatestMovies(page);
  const categoryQuery = useMoviesByCategory(slug, page);

  const data = isNewUpdates ? latestQuery.data : categoryQuery.data;
  const isLoading = isNewUpdates ? latestQuery.isLoading : categoryQuery.isLoading;
  const isFetching = isNewUpdates ? latestQuery.isFetching : categoryQuery.isFetching;

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

  const renderItem = useCallback(({ item }: { item: Movie }) => (
    <View style={styles.itemContainer}>
      <MovieCard
        id={item.id}
        title={item.name}
        poster={item.thumb_url}
        variant="grid"
        onPress={() => router.push(`/(home)/movie/${item.slug}` as any)}
      />
    </View>
  ), [router]);

  const renderFooter = useCallback(() => {
    if (!isFetching || page === 1) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }, [isFetching, page]);

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
        <FlashList
          data={allMovies}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          removeClippedSubviews={true}
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
    paddingHorizontal: 12,
    paddingTop: 110,
    paddingBottom: 40,
  },
  itemContainer: {
    flex: 1,
    padding: 6, // Khoảng cách giữa các items
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
  },
});

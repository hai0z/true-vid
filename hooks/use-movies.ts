import { movieService } from '@/services/movie-service';
import { useQuery } from '@tanstack/react-query';

export const useMovies = (page: number = 1) => {
  return useQuery({
    queryKey: ['movies', 'all', page],
    queryFn: () => movieService.getAll(page),
  });
};

export const useMoviesByCategory = (categoryId: string, page: number = 1) => {
  return useQuery({
    queryKey: ['movies', 'category', categoryId, page],
    queryFn: () => movieService.getByCategory(categoryId, page),
    enabled: categoryId !== 'all',
  });
};

export const useSearchMovies = (query: string, page: number = 1) => {
  return useQuery({
    queryKey: ['movies', 'search', query, page],
    queryFn: () => movieService.search(query, page),
    enabled: query.length > 0,
  });
};

export const useMovieDetail = (slug: string) => {
  return useQuery({
    queryKey: ['movies', 'detail', slug],
    queryFn: () => movieService.getDetail(slug),
    enabled: !!slug,
  });
};

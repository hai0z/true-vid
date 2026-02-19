import { movieService } from '@/services/movie-service';
import { convertNewApiMovieToMovie, convertNewApiResponseToApiResponse, NewApiRoot } from '@/utils/api-converter';
import { useQuery } from '@tanstack/react-query';

export const useMovies = (page: number = 1) => {
  return useQuery({
    queryKey: ['movies', 'all', page],
    queryFn: () => movieService.getAll(page),
  });
};

export const useMoviesByCategory = (
  categoryId: string,
  page: number = 1,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['movies', 'category', categoryId, page],
    queryFn: () => movieService.getByCategory(categoryId, page),
    enabled: enabled && categoryId !== 'all',
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

export const useLatestMovies = (page: number = 1, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['movies', 'latest', page],
    queryFn: async () => {
      const response = await fetch(`https://topxx.vip/api/v1/movies/latest?page=${page}`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest movies');
      }
      const data: NewApiRoot = await response.json();
      return convertNewApiResponseToApiResponse(data, 'vi');
    },
    enabled,
  });
};

export const useMovieDetailBoth = (slug: string) => {
  return useQuery({
    queryKey: ['movies', 'detail-both', slug],
    queryFn: async () => {
      // Try both APIs in parallel
      const [oldResult, newResult] = await Promise.allSettled([
        movieService.getDetail(slug).catch(() => null),
        fetch(`https://topxx.vip/api/v1/movies/${slug}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.data) {
              const movie = convertNewApiMovieToMovie(data.data, 'vi');
              return { status: true, msg: 'Success', movie };
            }
            return null;
          })
          .catch(() => null)
      ]);

      // Return first successful result
      if (oldResult.status === 'fulfilled' && oldResult.value?.movie) {
        return oldResult.value;
      }
      if (newResult.status === 'fulfilled' && newResult.value?.movie) {
        return newResult.value;
      }

      throw new Error('Movie not found in both APIs');
    },
    enabled: !!slug,
    retry: false,
  });
};

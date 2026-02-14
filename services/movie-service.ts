import { ApiResponse, MovieDetail } from '@/types/Movie';

const API_BASE_URL = 'https://xxvnapi.com/api';

export const movieService = {
  getAll: async (page: number = 1): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/phim-moi-cap-nhat?page=${page}`);
    if (!response.ok) {
      throw new Error('Failed to fetch movies');
    }
    return response.json();
  },

  getByCategory: async (categoryId: string, page: number = 1): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/chuyen-muc/${categoryId}?page=${page}`);
    if (!response.ok) {
      throw new Error('Failed to fetch movies by category');
    }
    return response.json();
  },

  search: async (query: string, page: number = 1): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/tim-kiem?keyword=${encodeURIComponent(query)}&page=${page}`);
    if (!response.ok) {
      throw new Error('Failed to search movies');
    }
    return response.json();
  },

  getDetail: async (slug: string): Promise<MovieDetail> => {
    const response = await fetch(`${API_BASE_URL}/phim/${slug}`);
    if (!response.ok) {
      throw new Error('Failed to fetch movie detail');
    }
    return response.json();
  },
};

import { Movie } from '@/types/Movie';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FavoritesState {
  favorites: Movie[];
  addFavorite: (movie: Movie) => void;
  removeFavorite: (movieId: string) => void;
  isFavorite: (movieId: string) => boolean;
  importLegacyData: (movies: Movie[]) => void; // Thêm hàm này
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({

      favorites: [],
      addFavorite: (movie) =>
        set((state) => ({
          favorites: [movie,...state.favorites],
        })),
      removeFavorite: (movieId) =>
        set((state) => ({
          favorites: state.favorites.filter((m) => m.id !== movieId),
        })),
      isFavorite: (movieId) => get().favorites.some((m) => m.id === movieId),
      importLegacyData: (movies) => {
        set((state) => {
          // Lọc bỏ những phim đã tồn tại để tránh trùng lặp id
          const newMovies = movies.filter(
            (m) => !state.favorites.some((fav) => fav.id === m.id)
          );
          return { favorites: [...state.favorites, ...newMovies] };
        });
      },
      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => AsyncStorage),
      
    }
  )
);

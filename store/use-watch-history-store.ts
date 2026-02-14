import { Movie } from '@/types/Movie';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WatchHistory {
  movie: Movie;
  watchedAt: number; // timestamp
  position: number; // seconds
  duration: number; // seconds
}

interface WatchHistoryState {
  history: WatchHistory[];
  addToHistory: (movie: Movie, position: number, duration: number) => void;
  getPosition: (movieId: string) => number;
  clearHistory: () => void;
  removeFromHistory: (movieId: string) => void;
}

export const useWatchHistoryStore = create<WatchHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      addToHistory: (movie, position, duration) =>
        set((state) => {
          // Remove existing entry for this movie
          const filtered = state.history.filter((h) => h.movie.id !== movie.id);
          
          // Add new entry at the beginning
          return {
            history: [
              {
                movie,
                watchedAt: Date.now(),
                position,
                duration,
              },
              ...filtered,
            ].slice(0, 20), // Keep only last 20 items
          };
        }),
      getPosition: (movieId) => {
        const item = get().history.find((h) => h.movie.id === movieId);
        return item?.position || 0;
      },
      clearHistory: () => set({ history: [] }),
      removeFromHistory: (movieId) =>
        set((state) => ({
          history: state.history.filter((h) => h.movie.id !== movieId),
        })),
    }),
    {
      name: 'watch-history-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

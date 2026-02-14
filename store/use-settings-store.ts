import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  notifications: boolean;
  autoPlay: boolean;
  videoQuality: 'auto' | 'high' | 'medium' | 'low';
  setNotifications: (enabled: boolean) => void;
  setAutoPlay: (enabled: boolean) => void;
  setVideoQuality: (quality: 'auto' | 'high' | 'medium' | 'low') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: true,
      autoPlay: false,
      videoQuality: 'auto',
      setNotifications: (enabled) => set({ notifications: enabled }),
      setAutoPlay: (enabled) => set({ autoPlay: enabled }),
      setVideoQuality: (quality) => set({ videoQuality: quality }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

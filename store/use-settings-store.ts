import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  // Thông báo
  notifications: boolean;
  
  // Player settings
  autoPlay: boolean;
  defaultPlaybackSpeed: number;
  defaultVolume: number;
  skipDuration: number; // Thời gian skip (giây)
  doubleTapSkipDuration: number; // Thời gian skip khi double tap
  autoResume: boolean; // Tự động tiếp tục từ vị trí đã xem
  resumeThreshold: number; // Ngưỡng để hiện resume prompt (giây)
  showThumbnailPreview: boolean; // Hiện thumbnail khi seek
  
  // Actions
  setNotifications: (enabled: boolean) => void;
  setAutoPlay: (enabled: boolean) => void;
  setDefaultPlaybackSpeed: (speed: number) => void;
  setDefaultVolume: (volume: number) => void;
  setSkipDuration: (duration: number) => void;
  setDoubleTapSkipDuration: (duration: number) => void;
  setAutoResume: (enabled: boolean) => void;
  setResumeThreshold: (threshold: number) => void;
  setShowThumbnailPreview: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: true,
      autoPlay: false,
      defaultPlaybackSpeed: 1,
      defaultVolume: 0.5,
      skipDuration: 10,
      doubleTapSkipDuration: 10,
      autoResume: true,
      resumeThreshold: 30,
      showThumbnailPreview: true,
      
      setNotifications: (enabled) => set({ notifications: enabled }),
      setAutoPlay: (enabled) => set({ autoPlay: enabled }),
      setDefaultPlaybackSpeed: (speed) => set({ defaultPlaybackSpeed: speed }),
      setDefaultVolume: (volume) => set({ defaultVolume: volume }),
      setSkipDuration: (duration) => set({ skipDuration: duration }),
      setDoubleTapSkipDuration: (duration) => set({ doubleTapSkipDuration: duration }),
      setAutoResume: (enabled) => set({ autoResume: enabled }),
      setResumeThreshold: (threshold) => set({ resumeThreshold: threshold }),
      setShowThumbnailPreview: (enabled) => set({ showThumbnailPreview: enabled }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

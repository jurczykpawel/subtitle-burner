import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// UI Store (persisted) - panels, preferences, layout
// ============================================================

type SidebarTab = 'style' | 'templates' | 'subtitles';

interface UIStoreState {
  // Panel visibility
  sidebarVisible: boolean;
  timelineVisible: boolean;
  sidebarTab: SidebarTab;

  // Layout
  sidebarWidth: number;
  timelineHeight: number;

  // Preferences
  autoSave: boolean;
  autoSaveIntervalMs: number;
  showWaveform: boolean;
  subtitlePreviewInTimeline: boolean;

  // Theme
  theme: 'dark' | 'light' | 'system';
}

interface UIStoreActions {
  // Panels
  toggleSidebar: () => void;
  toggleTimeline: () => void;
  setSidebarTab: (tab: SidebarTab) => void;

  // Layout
  setSidebarWidth: (width: number) => void;
  setTimelineHeight: (height: number) => void;

  // Preferences
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (ms: number) => void;
  toggleWaveform: () => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;

  // Reset
  reset: () => void;
}

export type UIStore = UIStoreState & UIStoreActions;

const DEFAULT_STATE: UIStoreState = {
  sidebarVisible: true,
  timelineVisible: true,
  sidebarTab: 'subtitles',
  sidebarWidth: 320,
  timelineHeight: 160,
  autoSave: true,
  autoSaveIntervalMs: 2000,
  showWaveform: false,
  subtitlePreviewInTimeline: true,
  theme: 'dark',
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      // Panels
      toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
      toggleTimeline: () => set((s) => ({ timelineVisible: !s.timelineVisible })),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),

      // Layout
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(240, Math.min(600, width)) }),
      setTimelineHeight: (height) => set({ timelineHeight: Math.max(80, Math.min(400, height)) }),

      // Preferences
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveInterval: (ms) => set({ autoSaveIntervalMs: Math.max(500, Math.min(30000, ms)) }),
      toggleWaveform: () => set((s) => ({ showWaveform: !s.showWaveform })),
      setTheme: (theme) => set({ theme }),

      // Reset
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'subtitle-burner-ui',
      partialize: (state) => ({
        sidebarVisible: state.sidebarVisible,
        timelineVisible: state.timelineVisible,
        sidebarTab: state.sidebarTab,
        sidebarWidth: state.sidebarWidth,
        timelineHeight: state.timelineHeight,
        autoSave: state.autoSave,
        autoSaveIntervalMs: state.autoSaveIntervalMs,
        showWaveform: state.showWaveform,
        subtitlePreviewInTimeline: state.subtitlePreviewInTimeline,
        theme: state.theme,
      }),
    }
  )
);

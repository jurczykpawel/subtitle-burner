import { create } from 'zustand';
import type { SubtitleCue, SubtitleStyle, VideoMetadata } from '@subtitle-burner/types';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';

interface EditorState {
  // Video
  video: VideoMetadata | null;
  videoUrl: string | null;
  setVideo: (video: VideoMetadata | null, url: string | null) => void;

  // Playback
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;

  // Subtitles
  cues: SubtitleCue[];
  selectedCueId: string | null;
  setCues: (cues: SubtitleCue[]) => void;
  addCue: (cue: SubtitleCue) => void;
  updateCue: (id: string, updates: Partial<SubtitleCue>) => void;
  removeCue: (id: string) => void;
  setSelectedCueId: (id: string | null) => void;

  // Style
  style: SubtitleStyle;
  setStyle: (style: Partial<SubtitleStyle>) => void;

  // UI State
  zoom: number;
  setZoom: (zoom: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  // Video
  video: null,
  videoUrl: null,
  setVideo: (video, url) => set({ video, videoUrl: url }),

  // Playback
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  // Subtitles
  cues: [],
  selectedCueId: null,
  setCues: (cues) => set({ cues }),
  addCue: (cue) => set((state) => ({ cues: [...state.cues, cue] })),
  updateCue: (id, updates) =>
    set((state) => ({
      cues: state.cues.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  removeCue: (id) =>
    set((state) => ({
      cues: state.cues.filter((c) => c.id !== id),
      selectedCueId: state.selectedCueId === id ? null : state.selectedCueId,
    })),
  setSelectedCueId: (selectedCueId) => set({ selectedCueId }),

  // Style
  style: DEFAULT_SUBTITLE_STYLE,
  setStyle: (updates) =>
    set((state) => ({ style: { ...state.style, ...updates } })),

  // UI
  zoom: 1,
  setZoom: (zoom) => set({ zoom }),
}));

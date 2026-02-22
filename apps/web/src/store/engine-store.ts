import { create } from 'zustand';
import {
  SubtitleEngine,
  TemplateEngine,
  RenderEngine,
  PlaybackController,
  ProjectSerializer,
} from '@subtitle-burner/core';
import type { RenderQuality } from '@subtitle-burner/types';

// ============================================================
// Engine Store - lazy engine instances, FFmpeg state, render state
// ============================================================

type FFmpegStatus = 'idle' | 'loading' | 'ready' | 'error';
type RenderStatus = 'idle' | 'rendering' | 'uploading' | 'done' | 'error';
type TranscriptionStatus = 'idle' | 'loading' | 'extracting' | 'transcribing' | 'ready' | 'error';

interface EngineStoreState {
  // Engine instances (lazy)
  subtitleEngine: SubtitleEngine | null;
  templateEngine: TemplateEngine | null;
  renderEngine: RenderEngine | null;
  playbackController: PlaybackController | null;
  projectSerializer: ProjectSerializer | null;

  // FFmpeg state
  ffmpegStatus: FFmpegStatus;
  ffmpegError: string | null;

  // Server render state
  renderStatus: RenderStatus;
  renderProgress: number;
  renderMessage: string;
  renderJobId: string | null;
  renderResultUrl: string | null;
  renderPreset: RenderQuality;

  // Transcription state
  transcriptionStatus: TranscriptionStatus;
  transcriptionProgress: number;
  transcriptionError: string | null;
}

interface EngineStoreActions {
  // Engine initialization
  getSubtitleEngine: () => SubtitleEngine;
  getTemplateEngine: () => TemplateEngine;
  getRenderEngine: () => RenderEngine;
  getPlaybackController: () => PlaybackController;
  getProjectSerializer: () => ProjectSerializer;

  // FFmpeg
  setFFmpegStatus: (status: FFmpegStatus, error?: string) => void;

  // Render
  setRenderStatus: (status: RenderStatus, progress?: number, message?: string) => void;
  setRenderJobId: (id: string | null) => void;
  setRenderResultUrl: (url: string | null) => void;
  setRenderPreset: (preset: RenderQuality) => void;
  resetRender: () => void;

  // Transcription
  setTranscriptionStatus: (status: TranscriptionStatus, progress?: number, error?: string) => void;
  resetTranscription: () => void;

  // Reset
  reset: () => void;
}

export type EngineStore = EngineStoreState & EngineStoreActions;

export const useEngineStore = create<EngineStore>((set, get) => ({
  // Initial state
  subtitleEngine: null,
  templateEngine: null,
  renderEngine: null,
  playbackController: null,
  projectSerializer: null,
  ffmpegStatus: 'idle',
  ffmpegError: null,
  renderStatus: 'idle',
  renderProgress: 0,
  renderMessage: '',
  renderJobId: null,
  renderResultUrl: null,
  renderPreset: 'balanced',
  transcriptionStatus: 'idle',
  transcriptionProgress: 0,
  transcriptionError: null,

  // Lazy engine getters
  getSubtitleEngine: () => {
    let engine = get().subtitleEngine;
    if (!engine) {
      engine = new SubtitleEngine();
      set({ subtitleEngine: engine });
    }
    return engine;
  },

  getTemplateEngine: () => {
    let engine = get().templateEngine;
    if (!engine) {
      engine = new TemplateEngine();
      set({ templateEngine: engine });
    }
    return engine;
  },

  getRenderEngine: () => {
    let engine = get().renderEngine;
    if (!engine) {
      engine = new RenderEngine();
      set({ renderEngine: engine });
    }
    return engine;
  },

  getPlaybackController: () => {
    let controller = get().playbackController;
    if (!controller) {
      controller = new PlaybackController();
      set({ playbackController: controller });
    }
    return controller;
  },

  getProjectSerializer: () => {
    let serializer = get().projectSerializer;
    if (!serializer) {
      serializer = new ProjectSerializer();
      set({ projectSerializer: serializer });
    }
    return serializer;
  },

  // FFmpeg
  setFFmpegStatus: (ffmpegStatus, ffmpegError) =>
    set({ ffmpegStatus, ffmpegError: ffmpegError ?? null }),

  // Render
  setRenderStatus: (renderStatus, renderProgress, renderMessage) =>
    set({
      renderStatus,
      renderProgress: renderProgress ?? get().renderProgress,
      renderMessage: renderMessage ?? get().renderMessage,
    }),

  setRenderJobId: (renderJobId) => set({ renderJobId }),
  setRenderResultUrl: (renderResultUrl) => set({ renderResultUrl }),
  setRenderPreset: (renderPreset) => set({ renderPreset }),

  resetRender: () =>
    set({
      renderStatus: 'idle',
      renderProgress: 0,
      renderMessage: '',
      renderJobId: null,
      renderResultUrl: null,
    }),

  // Transcription
  setTranscriptionStatus: (transcriptionStatus, progress, error) =>
    set({
      transcriptionStatus,
      transcriptionProgress: progress ?? get().transcriptionProgress,
      transcriptionError: error ?? (transcriptionStatus === 'error' ? get().transcriptionError : null),
    }),

  resetTranscription: () =>
    set({
      transcriptionStatus: 'idle',
      transcriptionProgress: 0,
      transcriptionError: null,
    }),

  // Reset
  reset: () =>
    set({
      subtitleEngine: null,
      templateEngine: null,
      renderEngine: null,
      playbackController: null,
      projectSerializer: null,
      ffmpegStatus: 'idle',
      ffmpegError: null,
      renderStatus: 'idle',
      renderProgress: 0,
      renderMessage: '',
      renderJobId: null,
      renderResultUrl: null,
      renderPreset: 'balanced',
      transcriptionStatus: 'idle',
      transcriptionProgress: 0,
      transcriptionError: null,
    }),
}));

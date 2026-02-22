import { create } from 'zustand';
import type { SubtitleCue, SubtitleStyle, VideoMetadata, Action, ProjectState } from '@subtitle-burner/types';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';
import { ActionSystem } from '@subtitle-burner/core';

// ============================================================
// Project Store - cues, style, template, video, undo/redo
// ============================================================

interface ProjectStoreState {
  // Video
  video: VideoMetadata | null;
  videoUrl: string | null;
  videoFile: File | null;

  // Project data
  cues: readonly SubtitleCue[];
  style: SubtitleStyle;
  activeTemplateId: string | null;
  activeTemplateName: string | null;
  selectedCueId: string | null;

  // Project metadata
  projectName: string;
  projectId: string | null;
  isDirty: boolean;

  // Undo/redo
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
}

interface ProjectStoreActions {
  // Video
  setVideo: (video: VideoMetadata | null, url: string | null, file?: File | null) => void;

  // Cues (through action system for undo/redo)
  setCues: (cues: readonly SubtitleCue[]) => void;
  setSelectedCueId: (id: string | null) => void;

  // Style
  setStyle: (style: SubtitleStyle) => void;

  // Template
  setActiveTemplate: (id: string | null, name: string | null) => void;

  // Action system
  executeAction: (action: Action<ProjectState>) => void;
  undo: () => void;
  redo: () => void;

  // Project management
  setProjectMeta: (name: string, id: string | null) => void;
  markClean: () => void;

  // Reset
  reset: () => void;
}

export type ProjectStore = ProjectStoreState & ProjectStoreActions;

const actionSystem = new ActionSystem<ProjectState>();

function getProjectState(state: ProjectStoreState): ProjectState {
  return {
    cues: state.cues,
    style: state.style,
    activeTemplateId: state.activeTemplateId,
  };
}

function updateUndoRedoState() {
  return {
    canUndo: actionSystem.canUndo(),
    canRedo: actionSystem.canRedo(),
    undoDescription: actionSystem.getUndoDescription(),
    redoDescription: actionSystem.getRedoDescription(),
  };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  video: null,
  videoUrl: null,
  videoFile: null,
  cues: [],
  style: DEFAULT_SUBTITLE_STYLE,
  activeTemplateId: null,
  activeTemplateName: null,
  selectedCueId: null,
  projectName: '',
  projectId: null,
  isDirty: false,
  canUndo: false,
  canRedo: false,
  undoDescription: null,
  redoDescription: null,

  // Video
  setVideo: (video, url, file = null) => set({ video, videoUrl: url, videoFile: file }),

  // Cues (direct set without undo, for initial load / import)
  setCues: (cues) => set({ cues, isDirty: true }),

  setSelectedCueId: (selectedCueId) => set({ selectedCueId }),

  // Style
  setStyle: (style) => set({ style, isDirty: true }),

  // Template
  setActiveTemplate: (id, name) => set({ activeTemplateId: id, activeTemplateName: name }),

  // Action system (for undo/redo support)
  executeAction: (action) => {
    const current = getProjectState(get());
    const next = actionSystem.execute(current, action);
    set({
      cues: next.cues,
      style: next.style,
      activeTemplateId: next.activeTemplateId,
      isDirty: true,
      ...updateUndoRedoState(),
    });
  },

  undo: () => {
    const current = getProjectState(get());
    const result = actionSystem.undo(current);
    if (result) {
      set({
        cues: result.state.cues,
        style: result.state.style,
        activeTemplateId: result.state.activeTemplateId,
        isDirty: true,
        ...updateUndoRedoState(),
      });
    }
  },

  redo: () => {
    const current = getProjectState(get());
    const result = actionSystem.redo(current);
    if (result) {
      set({
        cues: result.state.cues,
        style: result.state.style,
        activeTemplateId: result.state.activeTemplateId,
        isDirty: true,
        ...updateUndoRedoState(),
      });
    }
  },

  // Project management
  setProjectMeta: (name, id) => set({ projectName: name, projectId: id }),
  markClean: () => set({ isDirty: false }),

  // Reset
  reset: () => {
    actionSystem.clear();
    set({
      video: null,
      videoUrl: null,
      videoFile: null,
      cues: [],
      style: DEFAULT_SUBTITLE_STYLE,
      activeTemplateId: null,
      activeTemplateName: null,
      selectedCueId: null,
      projectName: '',
      projectId: null,
      isDirty: false,
      canUndo: false,
      canRedo: false,
      undoDescription: null,
      redoDescription: null,
    });
  },
}));

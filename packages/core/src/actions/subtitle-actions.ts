import type { Action, ProjectState, SubtitleCue } from '@subtitle-burner/types';
import { SubtitleEngine } from '../engines/subtitle-engine';

const engine = new SubtitleEngine();

// ==========================================
// AddCue
// ==========================================

export class AddCueAction implements Action<ProjectState> {
  readonly type = 'ADD_CUE';
  readonly description: string;
  readonly timestamp = Date.now();
  private addedCueId: string | null = null;

  constructor(private cue: Omit<SubtitleCue, 'id'>) {
    this.description = `Add subtitle "${cue.text.slice(0, 30)}"`;
  }

  execute(state: ProjectState): ProjectState {
    const newCues = engine.addCue(state.cues, this.cue);
    // Track the ID of the newly added cue for inverse
    const addedCue = newCues.find(
      (c) => !state.cues.some((existing) => existing.id === c.id)
    );
    if (addedCue) this.addedCueId = addedCue.id;
    return { ...state, cues: newCues };
  }

  inverse(): Action<ProjectState> {
    return new RemoveCueAction(this.addedCueId!);
  }
}

// ==========================================
// RemoveCue
// ==========================================

export class RemoveCueAction implements Action<ProjectState> {
  readonly type = 'REMOVE_CUE';
  readonly description: string;
  readonly timestamp = Date.now();
  private removedCue: SubtitleCue | null = null;

  constructor(private cueId: string) {
    this.description = `Remove subtitle`;
  }

  execute(state: ProjectState): ProjectState {
    this.removedCue = engine.getCueById(state.cues, this.cueId) ?? null;
    return { ...state, cues: engine.removeCue(state.cues, this.cueId) };
  }

  inverse(): Action<ProjectState> {
    if (!this.removedCue) {
      return new NoOpAction('Restore removed subtitle');
    }
    const { id: _, ...cueWithoutId } = this.removedCue;
    return new RestoreCueAction(this.removedCue);
  }
}

// ==========================================
// UpdateCue
// ==========================================

export class UpdateCueAction implements Action<ProjectState> {
  readonly type = 'UPDATE_CUE';
  readonly description: string;
  readonly timestamp = Date.now();
  private previousValues: Partial<Omit<SubtitleCue, 'id'>> | null = null;

  constructor(
    private cueId: string,
    private patch: Partial<Omit<SubtitleCue, 'id'>>
  ) {
    this.description = `Update subtitle`;
  }

  execute(state: ProjectState): ProjectState {
    const existing = engine.getCueById(state.cues, this.cueId);
    if (existing) {
      // Store previous values for inverse
      this.previousValues = {};
      for (const key of Object.keys(this.patch) as Array<keyof typeof this.patch>) {
        (this.previousValues as any)[key] = (existing as any)[key];
      }
    }
    return { ...state, cues: engine.updateCue(state.cues, this.cueId, this.patch) };
  }

  inverse(): Action<ProjectState> {
    if (!this.previousValues) return new NoOpAction('Revert subtitle update');
    return new UpdateCueAction(this.cueId, this.previousValues);
  }
}

// ==========================================
// SplitCue
// ==========================================

export class SplitCueAction implements Action<ProjectState> {
  readonly type = 'SPLIT_CUE';
  readonly description = 'Split subtitle';
  readonly timestamp = Date.now();
  private originalCue: SubtitleCue | null = null;
  private newCueId: string | null = null;

  constructor(
    private cueId: string,
    private atTime: number
  ) {}

  execute(state: ProjectState): ProjectState {
    this.originalCue = engine.getCueById(state.cues, this.cueId) ?? null;
    const newCues = engine.splitCue(state.cues, this.cueId, this.atTime);
    // Find the newly created cue
    const added = newCues.find((c) => !state.cues.some((e) => e.id === c.id));
    if (added) this.newCueId = added.id;
    return { ...state, cues: newCues };
  }

  inverse(): Action<ProjectState> {
    if (!this.originalCue || !this.newCueId) return new NoOpAction('Unsplit subtitle');
    return new MergeCuesAction([this.originalCue.id, this.newCueId], this.originalCue);
  }
}

// ==========================================
// MergeCues
// ==========================================

export class MergeCuesAction implements Action<ProjectState> {
  readonly type = 'MERGE_CUES';
  readonly description = 'Merge subtitles';
  readonly timestamp = Date.now();
  private originalCues: SubtitleCue[] = [];

  constructor(
    private cueIds: string[],
    private restoreTarget?: SubtitleCue
  ) {}

  execute(state: ProjectState): ProjectState {
    this.originalCues = state.cues.filter((c) => this.cueIds.includes(c.id)) as SubtitleCue[];
    return { ...state, cues: engine.mergeCues(state.cues, this.cueIds) };
  }

  inverse(): Action<ProjectState> {
    return new RestoreMultipleCuesAction(this.originalCues, this.cueIds[0]);
  }
}

// ==========================================
// Helper actions (internal)
// ==========================================

/** Restores a specific cue with its original ID */
class RestoreCueAction implements Action<ProjectState> {
  readonly type = 'RESTORE_CUE';
  readonly description = 'Restore subtitle';
  readonly timestamp = Date.now();

  constructor(private cue: SubtitleCue) {}

  execute(state: ProjectState): ProjectState {
    return { ...state, cues: [...state.cues, this.cue] };
  }

  inverse(): Action<ProjectState> {
    return new RemoveCueAction(this.cue.id);
  }
}

/** Restores multiple cues (used as inverse of merge) */
class RestoreMultipleCuesAction implements Action<ProjectState> {
  readonly type = 'RESTORE_MULTIPLE_CUES';
  readonly description = 'Restore merged subtitles';
  readonly timestamp = Date.now();

  constructor(
    private cues: SubtitleCue[],
    private mergedId: string
  ) {}

  execute(state: ProjectState): ProjectState {
    const without = state.cues.filter((c) => c.id !== this.mergedId);
    return { ...state, cues: [...without, ...this.cues] };
  }

  inverse(): Action<ProjectState> {
    return new MergeCuesAction(this.cues.map((c) => c.id));
  }
}

class NoOpAction implements Action<ProjectState> {
  readonly type = 'NO_OP';
  readonly timestamp = Date.now();

  constructor(readonly description: string) {}

  execute(state: ProjectState): ProjectState {
    return state;
  }

  inverse(): Action<ProjectState> {
    return new NoOpAction(this.description);
  }
}

import { describe, it, expect } from 'vitest';
import {
  AddCueAction,
  RemoveCueAction,
  UpdateCueAction,
  SplitCueAction,
  MergeCuesAction,
} from '../subtitle-actions';
import { ActionSystem } from '../action-system';
import type { ProjectState, SubtitleCue } from '@subtitle-burner/types';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';

function makeState(cues: SubtitleCue[] = []): ProjectState {
  return {
    cues,
    style: DEFAULT_SUBTITLE_STYLE,
    activeTemplateId: null,
  };
}

function makeCue(overrides: Partial<SubtitleCue> & { id: string }): SubtitleCue {
  return {
    startTime: 0,
    endTime: 5,
    text: 'Hello',
    ...overrides,
  };
}

describe('AddCueAction', () => {
  it('adds a cue to state', () => {
    const action = new AddCueAction({ startTime: 1, endTime: 3, text: 'New' });
    const state = action.execute(makeState());
    expect(state.cues).toHaveLength(1);
    expect(state.cues[0].text).toBe('New');
  });

  it('inverse removes the added cue', () => {
    const system = new ActionSystem<ProjectState>();
    let state = makeState();
    state = system.execute(state, new AddCueAction({ startTime: 1, endTime: 3, text: 'New' }));
    expect(state.cues).toHaveLength(1);

    const undone = system.undo(state)!;
    expect(undone.state.cues).toHaveLength(0);
  });

  it('has descriptive type and description', () => {
    const action = new AddCueAction({ startTime: 0, endTime: 1, text: 'Test subtitle' });
    expect(action.type).toBe('ADD_CUE');
    expect(action.description).toContain('Test subtitle');
  });
});

describe('RemoveCueAction', () => {
  it('removes a cue from state', () => {
    const cue = makeCue({ id: 'cue-1' });
    const action = new RemoveCueAction('cue-1');
    const state = action.execute(makeState([cue]));
    expect(state.cues).toHaveLength(0);
  });

  it('inverse restores the removed cue', () => {
    const cue = makeCue({ id: 'cue-1', text: 'Restored' });
    const system = new ActionSystem<ProjectState>();
    let state = makeState([cue]);
    state = system.execute(state, new RemoveCueAction('cue-1'));
    expect(state.cues).toHaveLength(0);

    const undone = system.undo(state)!;
    expect(undone.state.cues).toHaveLength(1);
    expect(undone.state.cues[0].text).toBe('Restored');
  });
});

describe('UpdateCueAction', () => {
  it('updates specific fields', () => {
    const cue = makeCue({ id: 'cue-1', text: 'Old' });
    const action = new UpdateCueAction('cue-1', { text: 'New' });
    const state = action.execute(makeState([cue]));
    expect(state.cues[0].text).toBe('New');
  });

  it('inverse restores previous values', () => {
    const cue = makeCue({ id: 'cue-1', text: 'Original', startTime: 1 });
    const system = new ActionSystem<ProjectState>();
    let state = makeState([cue]);
    state = system.execute(state, new UpdateCueAction('cue-1', { text: 'Changed' }));
    expect(state.cues[0].text).toBe('Changed');

    const undone = system.undo(state)!;
    expect(undone.state.cues[0].text).toBe('Original');
  });
});

describe('SplitCueAction', () => {
  it('splits a cue at the given time', () => {
    const cue = makeCue({ id: 'cue-1', startTime: 0, endTime: 10, text: 'Hello' });
    const action = new SplitCueAction('cue-1', 5);
    const state = action.execute(makeState([cue]));
    expect(state.cues).toHaveLength(2);
    expect(state.cues[0].endTime).toBe(5);
    expect(state.cues[1].startTime).toBe(5);
  });

  it('inverse merges the split cues back', () => {
    const cue = makeCue({ id: 'cue-1', startTime: 0, endTime: 10, text: 'Hello' });
    const system = new ActionSystem<ProjectState>();
    let state = makeState([cue]);
    state = system.execute(state, new SplitCueAction('cue-1', 5));
    expect(state.cues).toHaveLength(2);

    const undone = system.undo(state)!;
    expect(undone.state.cues).toHaveLength(1);
  });
});

describe('MergeCuesAction', () => {
  it('merges multiple cues into one', () => {
    const cues = [
      makeCue({ id: 'cue-1', startTime: 0, endTime: 5, text: 'Hello' }),
      makeCue({ id: 'cue-2', startTime: 5, endTime: 10, text: 'World' }),
    ];
    const action = new MergeCuesAction(['cue-1', 'cue-2']);
    const state = action.execute(makeState(cues));
    expect(state.cues).toHaveLength(1);
    expect(state.cues[0].text).toBe('Hello World');
    expect(state.cues[0].startTime).toBe(0);
    expect(state.cues[0].endTime).toBe(10);
  });

  it('inverse restores original separate cues', () => {
    const cues = [
      makeCue({ id: 'cue-1', startTime: 0, endTime: 5, text: 'Hello' }),
      makeCue({ id: 'cue-2', startTime: 5, endTime: 10, text: 'World' }),
    ];
    const system = new ActionSystem<ProjectState>();
    let state = makeState(cues);
    state = system.execute(state, new MergeCuesAction(['cue-1', 'cue-2']));
    expect(state.cues).toHaveLength(1);

    const undone = system.undo(state)!;
    expect(undone.state.cues).toHaveLength(2);
  });
});

describe('Full undo/redo workflow', () => {
  it('supports complex editing sequence', () => {
    const system = new ActionSystem<ProjectState>();
    let state = makeState();

    // Add two cues
    state = system.execute(state, new AddCueAction({ startTime: 0, endTime: 5, text: 'First' }));
    state = system.execute(state, new AddCueAction({ startTime: 5, endTime: 10, text: 'Second' }));
    expect(state.cues).toHaveLength(2);

    // Update first cue
    const firstId = state.cues[0].id;
    state = system.execute(state, new UpdateCueAction(firstId, { text: 'Updated' }));
    expect(state.cues[0].text).toBe('Updated');

    // Undo update
    const u1 = system.undo(state)!;
    expect(u1.state.cues[0].text).toBe('First');

    // Undo second add
    const u2 = system.undo(u1.state)!;
    expect(u2.state.cues).toHaveLength(1);

    // Redo second add
    const r1 = system.redo(u2.state)!;
    expect(r1.state.cues).toHaveLength(2);

    // New action should clear redo
    state = system.execute(r1.state, new AddCueAction({ startTime: 10, endTime: 15, text: 'Third' }));
    expect(system.canRedo()).toBe(false);
    expect(state.cues).toHaveLength(3);
  });
});

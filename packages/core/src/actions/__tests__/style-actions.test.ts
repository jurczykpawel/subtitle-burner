import { describe, it, expect } from 'vitest';
import { UpdateStyleAction, ApplyTemplateAction } from '../style-actions';
import { ActionSystem } from '../action-system';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';
import { BUILT_IN_TEMPLATES } from '../../engines/template-engine';
import type { ProjectState } from '@subtitle-burner/types';

function makeState(overrides?: Partial<ProjectState>): ProjectState {
  return {
    cues: [],
    style: { ...DEFAULT_SUBTITLE_STYLE },
    activeTemplateId: null,
    ...overrides,
  };
}

describe('UpdateStyleAction', () => {
  it('updates style properties', () => {
    const action = new UpdateStyleAction({ fontSize: 48 });
    const state = action.execute(makeState());
    expect(state.style.fontSize).toBe(48);
  });

  it('sanitizes updated style', () => {
    const action = new UpdateStyleAction({ fontSize: 999 });
    const state = action.execute(makeState());
    expect(state.style.fontSize).toBe(120); // clamped
  });

  it('preserves unchanged properties', () => {
    const action = new UpdateStyleAction({ fontSize: 48 });
    const state = action.execute(makeState());
    expect(state.style.fontFamily).toBe(DEFAULT_SUBTITLE_STYLE.fontFamily);
    expect(state.style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
  });

  it('inverse restores previous style', () => {
    const system = new ActionSystem<ProjectState>();
    let state = makeState();
    state = system.execute(state, new UpdateStyleAction({ fontSize: 48 }));
    expect(state.style.fontSize).toBe(48);

    const undone = system.undo(state)!;
    expect(undone.state.style.fontSize).toBe(DEFAULT_SUBTITLE_STYLE.fontSize);
  });

  it('inverse only contains changed keys', () => {
    const action = new UpdateStyleAction({ fontSize: 48 });
    action.execute(makeState());
    const inverse = action.inverse() as UpdateStyleAction;
    expect(inverse.type).toBe('UPDATE_STYLE');
  });

  it('description reflects single property change', () => {
    const action = new UpdateStyleAction({ fontSize: 48 });
    expect(action.description).toBe('Update fontSize');
  });

  it('description reflects multiple property changes', () => {
    const action = new UpdateStyleAction({ fontSize: 48, fontColor: '#FF0000' });
    expect(action.description).toBe('Update 2 style properties');
  });
});

describe('ApplyTemplateAction', () => {
  const template = BUILT_IN_TEMPLATES[1]; // Cinematic

  it('applies template style', () => {
    const action = new ApplyTemplateAction(template.id, template.style);
    const state = action.execute(makeState());
    expect(state.style.fontFamily).toBe(template.style.fontFamily);
    expect(state.style.fontSize).toBe(template.style.fontSize);
    expect(state.activeTemplateId).toBe(template.id);
  });

  it('inverse restores previous style and template', () => {
    const system = new ActionSystem<ProjectState>();
    let state = makeState({ activeTemplateId: 'old-template' });
    state = system.execute(state, new ApplyTemplateAction(template.id, template.style));
    expect(state.activeTemplateId).toBe(template.id);

    const undone = system.undo(state)!;
    expect(undone.state.style.fontFamily).toBe(DEFAULT_SUBTITLE_STYLE.fontFamily);
    expect(undone.state.activeTemplateId).toBe('old-template');
  });

  it('has correct type and description', () => {
    const action = new ApplyTemplateAction(template.id, template.style);
    expect(action.type).toBe('APPLY_TEMPLATE');
    expect(action.description).toBe('Apply template');
  });
});

import { describe, it, expect } from 'vitest';
import { ActionSystem } from '../action-system';
import type { Action } from '@subtitle-burner/types';

// Simple counter state for testing
interface CounterState {
  count: number;
}

class IncrementAction implements Action<CounterState> {
  readonly type = 'INCREMENT';
  readonly description: string;
  readonly timestamp = Date.now();

  constructor(private amount: number = 1) {
    this.description = `Increment by ${amount}`;
  }

  execute(state: CounterState): CounterState {
    return { count: state.count + this.amount };
  }

  inverse(): Action<CounterState> {
    return new IncrementAction(-this.amount);
  }
}

describe('ActionSystem', () => {
  it('executes an action and returns new state', () => {
    const system = new ActionSystem<CounterState>();
    const state = system.execute({ count: 0 }, new IncrementAction(5));
    expect(state.count).toBe(5);
  });

  it('tracks undo/redo state', () => {
    const system = new ActionSystem<CounterState>();
    system.execute({ count: 0 }, new IncrementAction(1));
    expect(system.canUndo()).toBe(true);
    expect(system.canRedo()).toBe(false);
  });

  describe('undo', () => {
    it('undoes the last action', () => {
      const system = new ActionSystem<CounterState>();
      const state1 = system.execute({ count: 0 }, new IncrementAction(5));
      expect(state1.count).toBe(5);

      const result = system.undo(state1);
      expect(result).not.toBeNull();
      expect(result!.state.count).toBe(0);
    });

    it('returns null when nothing to undo', () => {
      const system = new ActionSystem<CounterState>();
      expect(system.undo({ count: 0 })).toBeNull();
    });

    it('enables redo after undo', () => {
      const system = new ActionSystem<CounterState>();
      const state = system.execute({ count: 0 }, new IncrementAction(1));
      system.undo(state);
      expect(system.canRedo()).toBe(true);
    });

    it('can undo multiple actions in order', () => {
      const system = new ActionSystem<CounterState>();
      let state: CounterState = { count: 0 };
      state = system.execute(state, new IncrementAction(1));
      state = system.execute(state, new IncrementAction(2));
      state = system.execute(state, new IncrementAction(3));
      expect(state.count).toBe(6);

      const r1 = system.undo(state)!;
      expect(r1.state.count).toBe(3);

      const r2 = system.undo(r1.state)!;
      expect(r2.state.count).toBe(1);

      const r3 = system.undo(r2.state)!;
      expect(r3.state.count).toBe(0);

      expect(system.undo(r3.state)).toBeNull();
    });
  });

  describe('redo', () => {
    it('redoes after undo', () => {
      const system = new ActionSystem<CounterState>();
      let state: CounterState = { count: 0 };
      state = system.execute(state, new IncrementAction(5));
      const undone = system.undo(state)!;
      expect(undone.state.count).toBe(0);

      const redone = system.redo(undone.state)!;
      expect(redone.state.count).toBe(5);
    });

    it('returns null when nothing to redo', () => {
      const system = new ActionSystem<CounterState>();
      expect(system.redo({ count: 0 })).toBeNull();
    });

    it('clears redo stack on new action (branching)', () => {
      const system = new ActionSystem<CounterState>();
      let state: CounterState = { count: 0 };
      state = system.execute(state, new IncrementAction(5));
      const undone = system.undo(state)!;
      expect(system.canRedo()).toBe(true);

      // New action should clear redo
      system.execute(undone.state, new IncrementAction(10));
      expect(system.canRedo()).toBe(false);
    });
  });

  describe('descriptions', () => {
    it('getUndoDescription returns last action description', () => {
      const system = new ActionSystem<CounterState>();
      system.execute({ count: 0 }, new IncrementAction(5));
      expect(system.getUndoDescription()).toBe('Increment by 5');
    });

    it('getUndoDescription returns null when empty', () => {
      const system = new ActionSystem<CounterState>();
      expect(system.getUndoDescription()).toBeNull();
    });

    it('getRedoDescription returns after undo', () => {
      const system = new ActionSystem<CounterState>();
      const state = system.execute({ count: 0 }, new IncrementAction(5));
      system.undo(state);
      expect(system.getRedoDescription()).toBe('Increment by 5');
    });
  });

  describe('counts', () => {
    it('tracks undo/redo counts', () => {
      const system = new ActionSystem<CounterState>();
      let state: CounterState = { count: 0 };
      state = system.execute(state, new IncrementAction(1));
      state = system.execute(state, new IncrementAction(2));
      expect(system.getUndoCount()).toBe(2);
      expect(system.getRedoCount()).toBe(0);

      system.undo(state);
      expect(system.getUndoCount()).toBe(1);
      expect(system.getRedoCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('clears both stacks', () => {
      const system = new ActionSystem<CounterState>();
      const state = system.execute({ count: 0 }, new IncrementAction(1));
      system.undo(state);
      system.clear();
      expect(system.canUndo()).toBe(false);
      expect(system.canRedo()).toBe(false);
    });
  });

  describe('stack limit', () => {
    it('limits undo stack to 100 entries', () => {
      const system = new ActionSystem<CounterState>();
      let state: CounterState = { count: 0 };
      for (let i = 0; i < 110; i++) {
        state = system.execute(state, new IncrementAction(1));
      }
      expect(system.getUndoCount()).toBe(100);
    });
  });
});

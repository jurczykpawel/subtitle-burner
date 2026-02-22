import type { Action } from '@subtitle-burner/types';

const MAX_STACK_SIZE = 100;

/**
 * ActionSystem - undo/redo stack with inverse action generation.
 * Inspired by OpenReel's action-based editing pattern.
 */
export class ActionSystem<TState> {
  private undoStack: Action<TState>[] = [];
  private redoStack: Action<TState>[] = [];

  execute(state: TState, action: Action<TState>): TState {
    const newState = action.execute(state);
    this.undoStack.push(action);
    if (this.undoStack.length > MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
    // Clear redo on new action (branching point)
    this.redoStack = [];
    return newState;
  }

  undo(state: TState): { state: TState; description: string } | null {
    const action = this.undoStack.pop();
    if (!action) return null;

    const inverse = action.inverse();
    const newState = inverse.execute(state);
    this.redoStack.push(action);
    return { state: newState, description: action.description };
  }

  redo(state: TState): { state: TState; description: string } | null {
    const action = this.redoStack.pop();
    if (!action) return null;

    const newState = action.execute(state);
    this.undoStack.push(action);
    return { state: newState, description: action.description };
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoDescription(): string | null {
    const last = this.undoStack[this.undoStack.length - 1];
    return last?.description ?? null;
  }

  getRedoDescription(): string | null {
    const last = this.redoStack[this.redoStack.length - 1];
    return last?.description ?? null;
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

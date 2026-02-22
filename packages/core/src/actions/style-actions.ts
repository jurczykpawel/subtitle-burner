import type { Action, ProjectState, SubtitleStyle } from '@subtitle-burner/types';
import { sanitizeStyle } from '../engines/template-engine';

export class UpdateStyleAction implements Action<ProjectState> {
  readonly type = 'UPDATE_STYLE';
  readonly description: string;
  readonly timestamp = Date.now();
  private previousStyle: SubtitleStyle | null = null;

  constructor(private patch: Partial<SubtitleStyle>) {
    const keys = Object.keys(patch);
    this.description =
      keys.length === 1
        ? `Update ${keys[0]}`
        : `Update ${keys.length} style properties`;
  }

  execute(state: ProjectState): ProjectState {
    this.previousStyle = state.style;
    return {
      ...state,
      style: sanitizeStyle({ ...state.style, ...this.patch }),
    };
  }

  inverse(): Action<ProjectState> {
    if (!this.previousStyle) return new UpdateStyleAction({});
    // Compute only the changed keys for a minimal inverse
    const inversePatch: Partial<SubtitleStyle> = {};
    for (const key of Object.keys(this.patch) as Array<keyof SubtitleStyle>) {
      (inversePatch as any)[key] = this.previousStyle[key];
    }
    return new UpdateStyleAction(inversePatch);
  }
}

export class ApplyTemplateAction implements Action<ProjectState> {
  readonly type = 'APPLY_TEMPLATE';
  readonly description: string;
  readonly timestamp = Date.now();
  private previousStyle: SubtitleStyle | null = null;
  private previousTemplateId: string | null = null;

  constructor(
    private templateId: string,
    private templateStyle: SubtitleStyle
  ) {
    this.description = `Apply template`;
  }

  execute(state: ProjectState): ProjectState {
    this.previousStyle = state.style;
    this.previousTemplateId = state.activeTemplateId;
    return {
      ...state,
      style: sanitizeStyle(this.templateStyle),
      activeTemplateId: this.templateId,
    };
  }

  inverse(): Action<ProjectState> {
    if (!this.previousStyle) return new ApplyTemplateAction('', this.templateStyle);
    return new RestoreStyleAction(this.previousStyle, this.previousTemplateId);
  }
}

class RestoreStyleAction implements Action<ProjectState> {
  readonly type = 'RESTORE_STYLE';
  readonly description = 'Restore previous style';
  readonly timestamp = Date.now();

  constructor(
    private style: SubtitleStyle,
    private templateId: string | null
  ) {}

  execute(state: ProjectState): ProjectState {
    return {
      ...state,
      style: this.style,
      activeTemplateId: this.templateId,
    };
  }

  inverse(): Action<ProjectState> {
    return new RestoreStyleAction(this.style, this.templateId);
  }
}

// Engines
export { SubtitleEngine } from './engines/subtitle-engine';
export {
  TemplateEngine,
  BUILT_IN_TEMPLATES,
  ALLOWED_FONT_FAMILIES,
  sanitizeStyle,
} from './engines/template-engine';
export { RenderEngine, QUALITY_PRESETS } from './engines/render-engine';
export {
  PlaybackController,
  DEFAULT_PLAYBACK_STATE,
} from './engines/playback-controller';

// Actions
export { ActionSystem } from './actions/action-system';
export {
  AddCueAction,
  RemoveCueAction,
  UpdateCueAction,
  SplitCueAction,
  MergeCuesAction,
} from './actions/subtitle-actions';
export {
  UpdateStyleAction,
  ApplyTemplateAction,
} from './actions/style-actions';

// Caption Animation
export {
  renderAnimatedCaption,
  CAPTION_ANIMATION_STYLES,
  getAnimationStyleDisplayName,
} from './engines/caption-animation-renderer';
export type {
  WordSegment,
  WordSegmentStyle,
  AnimatedCaptionFrame,
} from './engines/caption-animation-renderer';

// Serializer
export { ProjectSerializer } from './serializer/project-serializer';
export { sbpSchema, subtitleCueSchema, subtitleStyleSchema } from './serializer/sbp-schema';

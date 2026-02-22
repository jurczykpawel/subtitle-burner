import type { RenderOptions, RenderQuality, SubtitleCue, SubtitleStyle } from '@subtitle-burner/types';

const QUALITY_PRESETS: Record<RenderQuality, { preset: RenderOptions['preset']; crf: number }> = {
  fast: { preset: 'ultrafast', crf: 28 },
  balanced: { preset: 'fast', crf: 23 },
  quality: { preset: 'medium', crf: 18 },
};

/**
 * RenderEngine - builds FFmpeg commands without executing them.
 * Actual execution happens in the worker.
 */
export class RenderEngine {
  buildFFmpegArgs(options: RenderOptions): string[] {
    const args: string[] = [
      '-i',
      options.videoPath,
      '-vf',
      `ass=${options.assContent}`,
    ];

    if (options.codec !== 'copy') {
      args.push('-c:v', options.codec);
      args.push('-preset', options.preset);
      args.push('-crf', String(options.crf));
    } else {
      args.push('-c:v', 'copy');
    }

    args.push('-c:a', 'copy');

    if (options.resolution) {
      args.push(
        '-vf',
        `scale=${options.resolution.width}:${options.resolution.height},ass=${options.assContent}`
      );
      // Override the earlier -vf by removing it and using combined filter
      const vfIndex = args.indexOf('-vf');
      if (vfIndex !== -1) {
        args.splice(vfIndex, 2);
      }
      args.push(
        '-vf',
        `scale=${options.resolution.width}:${options.resolution.height},ass=${options.assContent}`
      );
    }

    args.push('-progress', 'pipe:1');
    args.push('-y');
    args.push(options.outputPath);

    return args;
  }

  buildRenderOptions(
    videoPath: string,
    assPath: string,
    outputPath: string,
    quality: RenderQuality = 'balanced'
  ): RenderOptions {
    const preset = QUALITY_PRESETS[quality];
    return {
      videoPath,
      assContent: assPath,
      outputPath,
      codec: 'libx264',
      preset: preset.preset,
      crf: preset.crf,
    };
  }

  /** Estimate render time in seconds based on video duration and resolution */
  estimateRenderTime(
    durationSec: number,
    resolution: { width: number; height: number },
    quality: RenderQuality = 'balanced'
  ): number {
    const pixels = resolution.width * resolution.height;
    const multiplier =
      quality === 'fast' ? 0.3 : quality === 'balanced' ? 0.6 : 1.0;
    // Rough estimate: 1080p balanced ≈ 60% of real-time
    const baseRatio = (pixels / (1920 * 1080)) * multiplier;
    return Math.ceil(durationSec * Math.max(0.1, baseRatio));
  }

  validateRenderInput(
    cues: readonly SubtitleCue[],
    style: SubtitleStyle
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (cues.length === 0) {
      errors.push('No subtitle cues provided');
    }

    for (const cue of cues) {
      if (cue.startTime < 0) errors.push(`Cue ${cue.id}: negative start time`);
      if (cue.endTime <= cue.startTime)
        errors.push(`Cue ${cue.id}: end time must be after start time`);
      if (cue.text.trim().length === 0) errors.push(`Cue ${cue.id}: empty text`);
    }

    if (style.fontSize <= 0) errors.push('Font size must be positive');
    if (style.position < 0 || style.position > 100)
      errors.push('Position must be between 0 and 100');

    return { valid: errors.length === 0, errors };
  }
}

export { QUALITY_PRESETS };

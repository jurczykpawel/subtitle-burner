import { describe, it, expect } from 'vitest';
import { RenderEngine, QUALITY_PRESETS } from '../render-engine';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';
import type { SubtitleCue } from '@subtitle-burner/types';

const engine = new RenderEngine();

function makeCue(overrides?: Partial<SubtitleCue>): SubtitleCue {
  return {
    id: '1',
    startTime: 0,
    endTime: 5,
    text: 'Hello',
    ...overrides,
  };
}

describe('RenderEngine', () => {
  describe('QUALITY_PRESETS', () => {
    it('has fast, balanced, and quality presets', () => {
      expect(QUALITY_PRESETS).toHaveProperty('fast');
      expect(QUALITY_PRESETS).toHaveProperty('balanced');
      expect(QUALITY_PRESETS).toHaveProperty('quality');
    });

    it('fast has highest CRF (lowest quality)', () => {
      expect(QUALITY_PRESETS.fast.crf).toBeGreaterThan(QUALITY_PRESETS.balanced.crf);
    });

    it('quality has lowest CRF (highest quality)', () => {
      expect(QUALITY_PRESETS.quality.crf).toBeLessThan(QUALITY_PRESETS.balanced.crf);
    });
  });

  describe('buildRenderOptions', () => {
    it('builds render options with defaults', () => {
      const opts = engine.buildRenderOptions('/input.mp4', '/subs.ass', '/output.mp4');
      expect(opts.videoPath).toBe('/input.mp4');
      expect(opts.assContent).toBe('/subs.ass');
      expect(opts.outputPath).toBe('/output.mp4');
      expect(opts.codec).toBe('libx264');
    });

    it('applies quality preset', () => {
      const fast = engine.buildRenderOptions('/in.mp4', '/s.ass', '/out.mp4', 'fast');
      expect(fast.preset).toBe('ultrafast');
      expect(fast.crf).toBe(28);

      const quality = engine.buildRenderOptions('/in.mp4', '/s.ass', '/out.mp4', 'quality');
      expect(quality.preset).toBe('medium');
      expect(quality.crf).toBe(18);
    });
  });

  describe('buildFFmpegArgs', () => {
    it('builds basic FFmpeg arguments', () => {
      const opts = engine.buildRenderOptions('/in.mp4', '/subs.ass', '/out.mp4');
      const args = engine.buildFFmpegArgs(opts);
      expect(args).toContain('-i');
      expect(args).toContain('/in.mp4');
      expect(args).toContain('-c:a');
      expect(args).toContain('copy');
      expect(args).toContain('-y');
      expect(args).toContain('/out.mp4');
    });

    it('includes codec and preset for non-copy codec', () => {
      const opts = engine.buildRenderOptions('/in.mp4', '/subs.ass', '/out.mp4', 'balanced');
      const args = engine.buildFFmpegArgs(opts);
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
      expect(args).toContain('-preset');
      expect(args).toContain('fast');
      expect(args).toContain('-crf');
      expect(args).toContain('23');
    });

    it('uses -c:v copy when codec is copy', () => {
      const opts = engine.buildRenderOptions('/in.mp4', '/subs.ass', '/out.mp4');
      const copyOpts = { ...opts, codec: 'copy' as const };
      const args = engine.buildFFmpegArgs(copyOpts);
      expect(args).toContain('-c:v');
      expect(args).toContain('copy');
    });

    it('includes progress pipe', () => {
      const opts = engine.buildRenderOptions('/in.mp4', '/subs.ass', '/out.mp4');
      const args = engine.buildFFmpegArgs(opts);
      expect(args).toContain('-progress');
      expect(args).toContain('pipe:1');
    });
  });

  describe('estimateRenderTime', () => {
    it('returns a positive number', () => {
      const estimate = engine.estimateRenderTime(60, { width: 1920, height: 1080 });
      expect(estimate).toBeGreaterThan(0);
    });

    it('fast quality estimates less time than quality', () => {
      const fast = engine.estimateRenderTime(60, { width: 1920, height: 1080 }, 'fast');
      const quality = engine.estimateRenderTime(60, { width: 1920, height: 1080 }, 'quality');
      expect(fast).toBeLessThan(quality);
    });

    it('higher resolution estimates more time', () => {
      const hd = engine.estimateRenderTime(60, { width: 1280, height: 720 });
      const fhd = engine.estimateRenderTime(60, { width: 1920, height: 1080 });
      expect(fhd).toBeGreaterThan(hd);
    });
  });

  describe('validateRenderInput', () => {
    it('validates correct input', () => {
      const result = engine.validateRenderInput([makeCue()], DEFAULT_SUBTITLE_STYLE);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty cues', () => {
      const result = engine.validateRenderInput([], DEFAULT_SUBTITLE_STYLE);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No subtitle cues provided');
    });

    it('reports negative start time', () => {
      const result = engine.validateRenderInput(
        [makeCue({ startTime: -1 })],
        DEFAULT_SUBTITLE_STYLE
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('negative start time'))).toBe(true);
    });

    it('reports end time before start time', () => {
      const result = engine.validateRenderInput(
        [makeCue({ startTime: 5, endTime: 3 })],
        DEFAULT_SUBTITLE_STYLE
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('end time must be after start time'))).toBe(true);
    });

    it('reports empty text', () => {
      const result = engine.validateRenderInput(
        [makeCue({ text: '   ' })],
        DEFAULT_SUBTITLE_STYLE
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('empty text'))).toBe(true);
    });
  });
});

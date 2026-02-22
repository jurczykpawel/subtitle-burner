import { describe, it, expect } from 'vitest';
import { SubtitleEngine } from '../subtitle-engine';
import type { SubtitleCue } from '@subtitle-burner/types';

const engine = new SubtitleEngine();

function makeCue(overrides: Partial<SubtitleCue> & { id: string }): SubtitleCue {
  return {
    startTime: 0,
    endTime: 1,
    text: 'Hello',
    ...overrides,
  };
}

describe('SubtitleEngine', () => {
  describe('addCue', () => {
    it('adds a cue with auto-generated id', () => {
      const cues = engine.addCue([], { startTime: 1, endTime: 3, text: 'Test' });
      expect(cues).toHaveLength(1);
      expect(cues[0].id).toBeTruthy();
      expect(cues[0].text).toBe('Test');
      expect(cues[0].startTime).toBe(1);
      expect(cues[0].endTime).toBe(3);
    });

    it('clamps negative startTime to 0', () => {
      const cues = engine.addCue([], { startTime: -5, endTime: 3, text: 'Test' });
      expect(cues[0].startTime).toBe(0);
    });

    it('enforces minimum endTime of startTime + 0.1', () => {
      const cues = engine.addCue([], { startTime: 5, endTime: 5, text: 'Test' });
      expect(cues[0].endTime).toBe(5.1);
    });

    it('sanitizes HTML tags from text', () => {
      const cues = engine.addCue([], {
        startTime: 0,
        endTime: 1,
        text: 'Hello <b>world</b>',
      });
      expect(cues[0].text).toBe('Hello world');
    });

    it('strips script tags (XSS prevention)', () => {
      const cues = engine.addCue([], {
        startTime: 0,
        endTime: 1,
        text: 'Hello<script>alert("xss")</script>World',
      });
      expect(cues[0].text).toBe('HelloWorld');
      expect(cues[0].text).not.toContain('script');
    });

    it('truncates text to 500 characters', () => {
      const longText = 'A'.repeat(600);
      const cues = engine.addCue([], { startTime: 0, endTime: 1, text: longText });
      expect(cues[0].text).toHaveLength(500);
    });

    it('does not mutate original array', () => {
      const original: readonly SubtitleCue[] = [makeCue({ id: '1' })];
      const result = engine.addCue(original, { startTime: 2, endTime: 3, text: 'New' });
      expect(result).toHaveLength(2);
      expect(original).toHaveLength(1);
    });
  });

  describe('removeCue', () => {
    it('removes a cue by id', () => {
      const cues = [makeCue({ id: '1' }), makeCue({ id: '2' })];
      const result = engine.removeCue(cues, '1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('returns same array when id not found', () => {
      const cues = [makeCue({ id: '1' })];
      const result = engine.removeCue(cues, 'nonexistent');
      expect(result).toHaveLength(1);
    });

    it('does not mutate original array', () => {
      const original = [makeCue({ id: '1' }), makeCue({ id: '2' })];
      engine.removeCue(original, '1');
      expect(original).toHaveLength(2);
    });
  });

  describe('updateCue', () => {
    it('updates specific fields of a cue', () => {
      const cues = [makeCue({ id: '1', text: 'Old' })];
      const result = engine.updateCue(cues, '1', { text: 'New' });
      expect(result[0].text).toBe('New');
    });

    it('sanitizes updated text', () => {
      const cues = [makeCue({ id: '1' })];
      const result = engine.updateCue(cues, '1', { text: '<img src=x onerror=alert(1)>' });
      expect(result[0].text).not.toContain('<');
    });

    it('clamps negative startTime', () => {
      const cues = [makeCue({ id: '1', startTime: 5, endTime: 10 })];
      const result = engine.updateCue(cues, '1', { startTime: -3 });
      expect(result[0].startTime).toBe(0);
    });

    it('enforces minimum endTime gap when updating startTime', () => {
      const cues = [makeCue({ id: '1', startTime: 5, endTime: 10 })];
      const result = engine.updateCue(cues, '1', { startTime: 10, endTime: 10 });
      expect(result[0].endTime).toBeGreaterThanOrEqual(result[0].startTime + 0.1);
    });

    it('does not modify other cues', () => {
      const cues = [makeCue({ id: '1', text: 'A' }), makeCue({ id: '2', text: 'B' })];
      const result = engine.updateCue(cues, '1', { text: 'Changed' });
      expect(result[1].text).toBe('B');
    });
  });

  describe('setCues', () => {
    it('sanitizes all cue texts', () => {
      const cues = [
        makeCue({ id: '1', text: '<b>Bold</b>' }),
        makeCue({ id: '2', text: '<script>hack</script>' }),
      ];
      const result = engine.setCues(cues);
      expect(result[0].text).toBe('Bold');
      expect(result[1].text).toBe('');
    });
  });

  describe('sortCues', () => {
    it('sorts cues by startTime', () => {
      const cues = [
        makeCue({ id: '1', startTime: 5 }),
        makeCue({ id: '2', startTime: 1 }),
        makeCue({ id: '3', startTime: 3 }),
      ];
      const result = engine.sortCues(cues);
      expect(result.map((c) => c.id)).toEqual(['2', '3', '1']);
    });

    it('does not mutate original array', () => {
      const cues = [
        makeCue({ id: '1', startTime: 5 }),
        makeCue({ id: '2', startTime: 1 }),
      ];
      engine.sortCues(cues);
      expect(cues[0].id).toBe('1');
    });
  });

  describe('getCueAtTime', () => {
    it('returns cues active at the given time', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 5 }),
        makeCue({ id: '2', startTime: 3, endTime: 8 }),
        makeCue({ id: '3', startTime: 10, endTime: 15 }),
      ];
      const result = engine.getCueAtTime(cues, 4);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['1', '2']);
    });

    it('excludes cues at their exact endTime (exclusive)', () => {
      const cues = [makeCue({ id: '1', startTime: 0, endTime: 5 })];
      expect(engine.getCueAtTime(cues, 5)).toHaveLength(0);
    });

    it('includes cues at their exact startTime (inclusive)', () => {
      const cues = [makeCue({ id: '1', startTime: 5, endTime: 10 })];
      expect(engine.getCueAtTime(cues, 5)).toHaveLength(1);
    });
  });

  describe('getCueById', () => {
    it('returns the matching cue', () => {
      const cues = [makeCue({ id: '1' }), makeCue({ id: '2' })];
      expect(engine.getCueById(cues, '2')?.id).toBe('2');
    });

    it('returns undefined when not found', () => {
      expect(engine.getCueById([], 'missing')).toBeUndefined();
    });
  });

  describe('getOverlaps', () => {
    it('detects overlapping cues', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 5 }),
        makeCue({ id: '2', startTime: 3, endTime: 8 }),
      ];
      const overlaps = engine.getOverlaps(cues);
      expect(overlaps).toHaveLength(1);
      expect(overlaps[0]).toEqual(['1', '2']);
    });

    it('returns empty for non-overlapping cues', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 3 }),
        makeCue({ id: '2', startTime: 5, endTime: 8 }),
      ];
      expect(engine.getOverlaps(cues)).toHaveLength(0);
    });

    it('handles touching cues as non-overlapping', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 5 }),
        makeCue({ id: '2', startTime: 5, endTime: 10 }),
      ];
      expect(engine.getOverlaps(cues)).toHaveLength(0);
    });
  });

  describe('getGaps', () => {
    it('finds gaps larger than minGap', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 3 }),
        makeCue({ id: '2', startTime: 8, endTime: 10 }),
      ];
      const gaps = engine.getGaps(cues, 2);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].afterCueId).toBe('1');
      expect(gaps[0].gapSeconds).toBe(5);
    });

    it('ignores gaps smaller than minGap', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 3 }),
        makeCue({ id: '2', startTime: 4, endTime: 6 }),
      ];
      expect(engine.getGaps(cues, 5)).toHaveLength(0);
    });
  });

  describe('splitCue', () => {
    it('splits a cue into two at the given time', () => {
      const cues = [makeCue({ id: '1', startTime: 0, endTime: 10, text: 'Hello' })];
      const result = engine.splitCue(cues, '1', 5);
      expect(result).toHaveLength(2);
      expect(result[0].endTime).toBe(5);
      expect(result[1].startTime).toBe(5);
      expect(result[1].endTime).toBe(10);
    });

    it('keeps the original id on the first part', () => {
      const cues = [makeCue({ id: '1', startTime: 0, endTime: 10 })];
      const result = engine.splitCue(cues, '1', 5);
      expect(result[0].id).toBe('1');
      expect(result[1].id).not.toBe('1');
    });

    it('does nothing if split time is outside cue range', () => {
      const cues = [makeCue({ id: '1', startTime: 0, endTime: 10 })];
      expect(engine.splitCue(cues, '1', 0)).toBe(cues);
      expect(engine.splitCue(cues, '1', 10)).toBe(cues);
      expect(engine.splitCue(cues, '1', -1)).toBe(cues);
      expect(engine.splitCue(cues, '1', 15)).toBe(cues);
    });

    it('does nothing if cue not found', () => {
      const cues = [makeCue({ id: '1', startTime: 0, endTime: 10 })];
      expect(engine.splitCue(cues, 'nonexistent', 5)).toBe(cues);
    });
  });

  describe('mergeCues', () => {
    it('merges multiple cues into one', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 3, text: 'Hello' }),
        makeCue({ id: '2', startTime: 3, endTime: 6, text: 'World' }),
      ];
      const result = engine.mergeCues(cues, ['1', '2']);
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe(0);
      expect(result[0].endTime).toBe(6);
      expect(result[0].text).toBe('Hello World');
    });

    it('uses the first cue id for the merged result', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 3 }),
        makeCue({ id: '2', startTime: 3, endTime: 6 }),
      ];
      const result = engine.mergeCues(cues, ['1', '2']);
      expect(result[0].id).toBe('1');
    });

    it('does nothing with less than 2 ids', () => {
      const cues = [makeCue({ id: '1' })];
      expect(engine.mergeCues(cues, ['1'])).toBe(cues);
    });

    it('preserves other cues', () => {
      const cues = [
        makeCue({ id: '1', startTime: 0, endTime: 3 }),
        makeCue({ id: '2', startTime: 3, endTime: 6 }),
        makeCue({ id: '3', startTime: 10, endTime: 15 }),
      ];
      const result = engine.mergeCues(cues, ['1', '2']);
      expect(result).toHaveLength(2);
      expect(result[1].id).toBe('3');
    });
  });

  describe('shiftCues', () => {
    it('shifts selected cues by delta', () => {
      const cues = [
        makeCue({ id: '1', startTime: 5, endTime: 10 }),
        makeCue({ id: '2', startTime: 15, endTime: 20 }),
      ];
      const result = engine.shiftCues(cues, ['1'], 3);
      expect(result[0].startTime).toBe(8);
      expect(result[0].endTime).toBe(13);
      expect(result[1].startTime).toBe(15); // unaffected
    });

    it('clamps to 0 for negative results', () => {
      const cues = [makeCue({ id: '1', startTime: 2, endTime: 5 })];
      const result = engine.shiftCues(cues, ['1'], -10);
      expect(result[0].startTime).toBe(0);
      expect(result[0].endTime).toBe(0.1);
    });
  });
});

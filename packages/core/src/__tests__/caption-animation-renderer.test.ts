import { describe, it, expect } from 'vitest';
import {
  renderAnimatedCaption,
  CAPTION_ANIMATION_STYLES,
  getAnimationStyleDisplayName,
} from '../engines/caption-animation-renderer';
import type { SubtitleCue } from '@subtitle-burner/types';

const makeCue = (overrides: Partial<SubtitleCue> = {}): SubtitleCue => ({
  id: 'cue-1',
  startTime: 0,
  endTime: 3,
  text: 'Hello beautiful world',
  words: [
    { text: 'Hello', startTime: 0, endTime: 1 },
    { text: 'beautiful', startTime: 1, endTime: 2 },
    { text: 'world', startTime: 2, endTime: 3 },
  ],
  ...overrides,
});

describe('renderAnimatedCaption', () => {
  it('returns invisible frame when currentTime is outside cue range', () => {
    const cue = makeCue();
    expect(renderAnimatedCaption(cue, -1).visible).toBe(false);
    expect(renderAnimatedCaption(cue, 4).visible).toBe(false);
  });

  it('returns static frame for "none" animation', () => {
    const cue = makeCue({ animationStyle: 'none' });
    const frame = renderAnimatedCaption(cue, 1.5);
    expect(frame.visible).toBe(true);
    expect(frame.segments).toHaveLength(1);
    expect(frame.segments[0].text).toBe('Hello beautiful world');
  });

  it('returns static frame when no words are present', () => {
    const cue = makeCue({ words: undefined, animationStyle: 'karaoke' });
    const frame = renderAnimatedCaption(cue, 1.5);
    expect(frame.visible).toBe(true);
    expect(frame.segments).toHaveLength(1);
    expect(frame.segments[0].text).toBe('Hello beautiful world');
  });

  describe('word-highlight', () => {
    it('highlights active word', () => {
      const cue = makeCue({ animationStyle: 'word-highlight' });
      const frame = renderAnimatedCaption(cue, 1.5);
      expect(frame.segments).toHaveLength(3);
      expect(frame.segments[0].style).toBe('normal'); // Hello (past)
      expect(frame.segments[1].style).toBe('highlighted'); // beautiful (active)
      expect(frame.segments[1].scale).toBe(1.15);
      expect(frame.segments[2].style).toBe('normal'); // world (upcoming)
    });
  });

  describe('word-by-word', () => {
    it('shows only the active word', () => {
      const cue = makeCue({ animationStyle: 'word-by-word' });
      const frame = renderAnimatedCaption(cue, 1.5);
      expect(frame.segments).toHaveLength(1);
      expect(frame.segments[0].text).toBe('beautiful');
    });

    it('shows last word after all words finish', () => {
      const cue = makeCue({ animationStyle: 'word-by-word' });
      // currentTime = 3 is endTime, which should still show something
      const frame = renderAnimatedCaption(cue, 3);
      expect(frame.visible).toBe(true);
      expect(frame.segments[0].text).toBe('world');
    });
  });

  describe('karaoke', () => {
    it('renders upcoming words with upcomingColor', () => {
      const cue = makeCue({ animationStyle: 'karaoke' });
      const frame = renderAnimatedCaption(cue, 0.5);
      // "Hello" is active (0-1), "beautiful" and "world" are upcoming
      expect(frame.segments[0].style).toBe('active');
      expect(frame.segments[0].color).toContain('linear-gradient');
      expect(frame.segments[1].style).toBe('normal');
      expect(frame.segments[1].color).toBe('rgba(255, 255, 255, 0.5)');
    });

    it('renders completed words with highlightColor', () => {
      const cue = makeCue({ animationStyle: 'karaoke' });
      const frame = renderAnimatedCaption(cue, 2.5);
      // "Hello" and "beautiful" are complete, "world" is active
      expect(frame.segments[0].style).toBe('highlighted');
      expect(frame.segments[0].color).toBe('#ffff00');
      expect(frame.segments[1].style).toBe('highlighted');
      expect(frame.segments[2].style).toBe('active');
      expect(frame.segments[2].scale).toBe(1.05);
    });

    it('uses custom highlight/upcoming colors', () => {
      const cue = makeCue({ animationStyle: 'karaoke' });
      const frame = renderAnimatedCaption(cue, 0.5, {
        highlightColor: '#ff0000',
        upcomingColor: '#333333',
      });
      expect(frame.segments[0].color).toContain('#ff0000');
      expect(frame.segments[1].color).toBe('#333333');
    });
  });

  describe('bounce', () => {
    it('hides upcoming words', () => {
      const cue = makeCue({ animationStyle: 'bounce' });
      const frame = renderAnimatedCaption(cue, 0.5);
      expect(frame.segments[0].opacity).toBeGreaterThan(0); // Hello visible
      expect(frame.segments[1].opacity).toBe(0); // beautiful hidden
      expect(frame.segments[2].opacity).toBe(0); // world hidden
    });

    it('animates active word with bounce easing', () => {
      const cue = makeCue({ animationStyle: 'bounce' });
      const frame = renderAnimatedCaption(cue, 1.3);
      // beautiful started at 1.0, 0.3s has passed → animation complete
      expect(frame.segments[1].opacity).toBe(1);
      expect(frame.segments[1].scale).toBeCloseTo(1, 0);
    });
  });

  describe('typewriter', () => {
    it('shows words progressively', () => {
      const cue = makeCue({ animationStyle: 'typewriter' });
      const frame0 = renderAnimatedCaption(cue, 0.5);
      expect(frame0.segments).toHaveLength(1); // Only "Hello"

      const frame1 = renderAnimatedCaption(cue, 1.5);
      expect(frame1.segments).toHaveLength(2); // "Hello" + "beautiful"

      const frame2 = renderAnimatedCaption(cue, 2.5);
      expect(frame2.segments).toHaveLength(3); // all words
    });

    it('last word fades in', () => {
      const cue = makeCue({ animationStyle: 'typewriter' });
      const frame = renderAnimatedCaption(cue, 1.01); // just after "beautiful" starts
      const lastSeg = frame.segments[frame.segments.length - 1];
      expect(lastSeg.opacity).toBeLessThan(1);
    });
  });
});

describe('CAPTION_ANIMATION_STYLES', () => {
  it('has 6 styles', () => {
    expect(CAPTION_ANIMATION_STYLES).toHaveLength(6);
  });
});

describe('getAnimationStyleDisplayName', () => {
  it('returns human-readable names', () => {
    expect(getAnimationStyleDisplayName('karaoke')).toBe('Karaoke');
    expect(getAnimationStyleDisplayName('word-highlight')).toBe('Word Highlight');
    expect(getAnimationStyleDisplayName('none')).toBe('Static');
  });
});

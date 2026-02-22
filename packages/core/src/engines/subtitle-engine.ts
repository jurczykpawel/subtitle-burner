import type { SubtitleCue } from '@subtitle-burner/types';

const MAX_CUE_TEXT_LENGTH = 500;

/** Strip HTML/script tags from subtitle text (XSS prevention) */
function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .slice(0, MAX_CUE_TEXT_LENGTH);
}

/**
 * SubtitleEngine - stateless cue management.
 * All methods accept state and return new state (immutable pattern).
 */
export class SubtitleEngine {
  addCue(
    cues: readonly SubtitleCue[],
    cue: Omit<SubtitleCue, 'id'>
  ): readonly SubtitleCue[] {
    const newCue: SubtitleCue = {
      id: crypto.randomUUID(),
      startTime: Math.max(0, cue.startTime),
      endTime: Math.max(cue.startTime + 0.1, cue.endTime),
      text: sanitizeText(cue.text),
      ...(cue.words ? { words: cue.words } : {}),
      ...(cue.animationStyle ? { animationStyle: cue.animationStyle } : {}),
    };
    return [...cues, newCue];
  }

  removeCue(cues: readonly SubtitleCue[], id: string): readonly SubtitleCue[] {
    return cues.filter((c) => c.id !== id);
  }

  updateCue(
    cues: readonly SubtitleCue[],
    id: string,
    patch: Partial<Omit<SubtitleCue, 'id'>>
  ): readonly SubtitleCue[] {
    return cues.map((c) => {
      if (c.id !== id) return c;
      return {
        ...c,
        ...patch,
        text: patch.text !== undefined ? sanitizeText(patch.text) : c.text,
        startTime:
          patch.startTime !== undefined ? Math.max(0, patch.startTime) : c.startTime,
        endTime:
          patch.endTime !== undefined
            ? Math.max((patch.startTime ?? c.startTime) + 0.1, patch.endTime)
            : c.endTime,
      };
    });
  }

  setCues(cues: SubtitleCue[]): readonly SubtitleCue[] {
    return cues.map((c) => ({
      ...c,
      text: sanitizeText(c.text),
    }));
  }

  sortCues(cues: readonly SubtitleCue[]): readonly SubtitleCue[] {
    return [...cues].sort((a, b) => a.startTime - b.startTime);
  }

  /** Get cues active at a given time */
  getCueAtTime(cues: readonly SubtitleCue[], time: number): readonly SubtitleCue[] {
    return cues.filter((c) => time >= c.startTime && time < c.endTime);
  }

  getCueById(cues: readonly SubtitleCue[], id: string): SubtitleCue | undefined {
    return cues.find((c) => c.id === id);
  }

  /** Find overlapping cue pairs */
  getOverlaps(cues: readonly SubtitleCue[]): ReadonlyArray<[string, string]> {
    const sorted = this.sortCues(cues);
    const overlaps: [string, string][] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].startTime >= sorted[i].endTime) break;
        overlaps.push([sorted[i].id, sorted[j].id]);
      }
    }
    return overlaps;
  }

  /** Find gaps larger than minGap seconds between cues */
  getGaps(
    cues: readonly SubtitleCue[],
    minGap: number
  ): ReadonlyArray<{ afterCueId: string; gapSeconds: number }> {
    const sorted = this.sortCues(cues);
    const gaps: { afterCueId: string; gapSeconds: number }[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].startTime - sorted[i].endTime;
      if (gap >= minGap) {
        gaps.push({ afterCueId: sorted[i].id, gapSeconds: gap });
      }
    }
    return gaps;
  }

  /** Split a cue into two at the given time */
  splitCue(
    cues: readonly SubtitleCue[],
    id: string,
    atTime: number
  ): readonly SubtitleCue[] {
    const cue = this.getCueById(cues, id);
    if (!cue) return cues;
    if (atTime <= cue.startTime || atTime >= cue.endTime) return cues;

    // Split words between the two cues based on timing
    const firstWords = cue.words?.filter((w) => w.endTime <= atTime);
    const secondWords = cue.words?.filter((w) => w.startTime >= atTime);

    const first: SubtitleCue = {
      id: cue.id,
      startTime: cue.startTime,
      endTime: atTime,
      text: firstWords && firstWords.length > 0
        ? firstWords.map((w) => w.text).join(' ')
        : cue.text,
      ...(firstWords && firstWords.length > 0 ? { words: firstWords } : {}),
      ...(cue.animationStyle ? { animationStyle: cue.animationStyle } : {}),
    };
    const second: SubtitleCue = {
      id: crypto.randomUUID(),
      startTime: atTime,
      endTime: cue.endTime,
      text: secondWords && secondWords.length > 0
        ? secondWords.map((w) => w.text).join(' ')
        : cue.text,
      ...(secondWords && secondWords.length > 0 ? { words: secondWords } : {}),
      ...(cue.animationStyle ? { animationStyle: cue.animationStyle } : {}),
    };

    return cues.map((c) => (c.id === id ? first : c)).concat(second);
  }

  /** Merge multiple cues into one (uses earliest start, latest end, joined text) */
  mergeCues(cues: readonly SubtitleCue[], ids: string[]): readonly SubtitleCue[] {
    if (ids.length < 2) return cues;

    const toMerge = cues.filter((c) => ids.includes(c.id));
    if (toMerge.length < 2) return cues;

    const sorted = [...toMerge].sort((a, b) => a.startTime - b.startTime);

    // Merge words from all cues (if any have word-level timing)
    const allWords = sorted.flatMap((c) => c.words ?? []);

    const merged: SubtitleCue = {
      id: sorted[0].id,
      startTime: Math.min(...sorted.map((c) => c.startTime)),
      endTime: Math.max(...sorted.map((c) => c.endTime)),
      text: sanitizeText(sorted.map((c) => c.text).join(' ')),
      ...(allWords.length > 0 ? { words: allWords } : {}),
      ...(sorted[0].animationStyle ? { animationStyle: sorted[0].animationStyle } : {}),
    };

    const otherIds = new Set(ids.slice(1));
    return cues
      .filter((c) => !otherIds.has(c.id))
      .map((c) => (c.id === merged.id ? merged : c));
  }

  /** Shift cues by delta seconds */
  shiftCues(
    cues: readonly SubtitleCue[],
    ids: string[],
    deltaSeconds: number
  ): readonly SubtitleCue[] {
    const idSet = new Set(ids);
    return cues.map((c) => {
      if (!idSet.has(c.id)) return c;
      return {
        ...c,
        startTime: Math.max(0, c.startTime + deltaSeconds),
        endTime: Math.max(0.1, c.endTime + deltaSeconds),
      };
    });
  }
}

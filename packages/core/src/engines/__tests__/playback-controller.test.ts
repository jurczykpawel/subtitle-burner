import { describe, it, expect } from 'vitest';
import { PlaybackController, DEFAULT_PLAYBACK_STATE } from '../playback-controller';
import type { PlaybackState } from '@subtitle-burner/types';

const controller = new PlaybackController();

function makeState(overrides?: Partial<PlaybackState>): PlaybackState {
  return { ...DEFAULT_PLAYBACK_STATE, duration: 60, ...overrides };
}

describe('PlaybackController', () => {
  describe('DEFAULT_PLAYBACK_STATE', () => {
    it('has correct defaults', () => {
      expect(DEFAULT_PLAYBACK_STATE.currentTime).toBe(0);
      expect(DEFAULT_PLAYBACK_STATE.duration).toBe(0);
      expect(DEFAULT_PLAYBACK_STATE.isPlaying).toBe(false);
      expect(DEFAULT_PLAYBACK_STATE.playbackRate).toBe(1);
    });
  });

  describe('seek', () => {
    it('sets currentTime to requested time', () => {
      const state = controller.seek(makeState(), 30);
      expect(state.currentTime).toBe(30);
    });

    it('clamps to 0 for negative time', () => {
      const state = controller.seek(makeState(), -10);
      expect(state.currentTime).toBe(0);
    });

    it('clamps to duration for time beyond duration', () => {
      const state = controller.seek(makeState({ duration: 60 }), 100);
      expect(state.currentTime).toBe(60);
    });

    it('does not mutate original state', () => {
      const original = makeState();
      controller.seek(original, 30);
      expect(original.currentTime).toBe(0);
    });
  });

  describe('stepForward', () => {
    it('advances by default 5 seconds', () => {
      const state = controller.stepForward(makeState({ currentTime: 10 }));
      expect(state.currentTime).toBe(15);
    });

    it('advances by custom seconds', () => {
      const state = controller.stepForward(makeState({ currentTime: 10 }), 10);
      expect(state.currentTime).toBe(20);
    });

    it('clamps to duration', () => {
      const state = controller.stepForward(makeState({ currentTime: 58, duration: 60 }));
      expect(state.currentTime).toBe(60);
    });
  });

  describe('stepBackward', () => {
    it('goes back by default 5 seconds', () => {
      const state = controller.stepBackward(makeState({ currentTime: 10 }));
      expect(state.currentTime).toBe(5);
    });

    it('clamps to 0', () => {
      const state = controller.stepBackward(makeState({ currentTime: 2 }));
      expect(state.currentTime).toBe(0);
    });
  });

  describe('frameStep', () => {
    it('steps forward by one frame (1/30 sec)', () => {
      const state = controller.frameStep(makeState({ currentTime: 1 }), 1);
      expect(state.currentTime).toBeCloseTo(1 + 1 / 30, 5);
    });

    it('steps backward by one frame', () => {
      const state = controller.frameStep(makeState({ currentTime: 1 }), -1);
      expect(state.currentTime).toBeCloseTo(1 - 1 / 30, 5);
    });
  });

  describe('togglePlay', () => {
    it('starts playing when paused', () => {
      const state = controller.togglePlay(makeState({ isPlaying: false }));
      expect(state.isPlaying).toBe(true);
    });

    it('pauses when playing', () => {
      const state = controller.togglePlay(makeState({ isPlaying: true }));
      expect(state.isPlaying).toBe(false);
    });

    it('does nothing with zero duration', () => {
      const state = controller.togglePlay(makeState({ duration: 0 }));
      expect(state.isPlaying).toBe(false);
    });

    it('restarts from beginning if at the end', () => {
      const state = controller.togglePlay(
        makeState({ currentTime: 60, duration: 60, isPlaying: false })
      );
      expect(state.currentTime).toBe(0);
      expect(state.isPlaying).toBe(true);
    });
  });

  describe('play', () => {
    it('sets isPlaying to true', () => {
      const state = controller.play(makeState());
      expect(state.isPlaying).toBe(true);
    });

    it('does nothing with zero duration', () => {
      const state = controller.play(makeState({ duration: 0 }));
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('pause', () => {
    it('sets isPlaying to false', () => {
      const state = controller.pause(makeState({ isPlaying: true }));
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('setRate', () => {
    it('sets playback rate', () => {
      const state = controller.setRate(makeState(), 2);
      expect(state.playbackRate).toBe(2);
    });

    it('clamps to 0.25 minimum', () => {
      const state = controller.setRate(makeState(), 0.1);
      expect(state.playbackRate).toBe(0.25);
    });

    it('clamps to 4 maximum', () => {
      const state = controller.setRate(makeState(), 10);
      expect(state.playbackRate).toBe(4);
    });
  });

  describe('setDuration', () => {
    it('sets duration and clamps currentTime', () => {
      const state = controller.setDuration(makeState({ currentTime: 50 }), 30);
      expect(state.duration).toBe(30);
      expect(state.currentTime).toBe(30);
    });

    it('does not change currentTime if within bounds', () => {
      const state = controller.setDuration(makeState({ currentTime: 10 }), 30);
      expect(state.currentTime).toBe(10);
    });

    it('clamps negative duration to 0', () => {
      const state = controller.setDuration(makeState(), -5);
      expect(state.duration).toBe(0);
    });
  });

  describe('clampTime', () => {
    it('clamps between 0 and duration', () => {
      expect(controller.clampTime(-5, 60)).toBe(0);
      expect(controller.clampTime(30, 60)).toBe(30);
      expect(controller.clampTime(100, 60)).toBe(60);
    });
  });
});

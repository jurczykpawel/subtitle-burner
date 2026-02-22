import type { PlaybackState } from '@subtitle-burner/types';

export const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,
};

/**
 * PlaybackController - stateless time management.
 * Returns new PlaybackState on every operation.
 */
export class PlaybackController {
  seek(state: PlaybackState, time: number): PlaybackState {
    return {
      ...state,
      currentTime: this.clampTime(time, state.duration),
    };
  }

  stepForward(state: PlaybackState, seconds: number = 5): PlaybackState {
    return this.seek(state, state.currentTime + seconds);
  }

  stepBackward(state: PlaybackState, seconds: number = 5): PlaybackState {
    return this.seek(state, state.currentTime - seconds);
  }

  /** Step forward/backward by a single frame (assuming 30fps) */
  frameStep(state: PlaybackState, direction: 1 | -1): PlaybackState {
    const frameDuration = 1 / 30;
    return this.seek(state, state.currentTime + frameDuration * direction);
  }

  togglePlay(state: PlaybackState): PlaybackState {
    if (state.duration === 0) return state;
    // If at the end, restart from beginning
    if (!state.isPlaying && state.currentTime >= state.duration) {
      return { ...state, currentTime: 0, isPlaying: true };
    }
    return { ...state, isPlaying: !state.isPlaying };
  }

  play(state: PlaybackState): PlaybackState {
    if (state.duration === 0) return state;
    return { ...state, isPlaying: true };
  }

  pause(state: PlaybackState): PlaybackState {
    return { ...state, isPlaying: false };
  }

  setRate(state: PlaybackState, rate: number): PlaybackState {
    const clamped = Math.min(4, Math.max(0.25, rate));
    return { ...state, playbackRate: clamped };
  }

  setDuration(state: PlaybackState, duration: number): PlaybackState {
    return {
      ...state,
      duration: Math.max(0, duration),
      currentTime: Math.min(state.currentTime, Math.max(0, duration)),
    };
  }

  clampTime(time: number, duration: number): number {
    return Math.min(Math.max(0, time), Math.max(0, duration));
  }
}

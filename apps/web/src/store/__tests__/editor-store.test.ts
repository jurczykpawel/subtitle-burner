import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../editor-store';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';

describe('editor-store', () => {
  beforeEach(() => {
    useEditorStore.setState({
      video: null,
      videoUrl: null,
      videoFile: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      cues: [],
      selectedCueId: null,
      style: DEFAULT_SUBTITLE_STYLE,
      zoom: 1,
    });
  });

  it('sets video metadata and URL', () => {
    const meta = {
      id: '1',
      filename: 'test.mp4',
      fileSize: 1000,
      duration: 60,
      width: 1920,
      height: 1080,
      mimeType: 'video/mp4',
    };
    useEditorStore.getState().setVideo(meta, 'blob:test');

    expect(useEditorStore.getState().video).toEqual(meta);
    expect(useEditorStore.getState().videoUrl).toBe('blob:test');
  });

  it('adds and removes cues', () => {
    const cue = { id: 'c1', startTime: 0, endTime: 2, text: 'Hello' };
    useEditorStore.getState().addCue(cue);

    expect(useEditorStore.getState().cues).toHaveLength(1);
    expect(useEditorStore.getState().cues[0].text).toBe('Hello');

    useEditorStore.getState().removeCue('c1');
    expect(useEditorStore.getState().cues).toHaveLength(0);
  });

  it('updates a cue', () => {
    useEditorStore.getState().addCue({ id: 'c1', startTime: 0, endTime: 2, text: 'Old' });
    useEditorStore.getState().updateCue('c1', { text: 'New' });

    expect(useEditorStore.getState().cues[0].text).toBe('New');
  });

  it('clears selectedCueId when removing selected cue', () => {
    useEditorStore.getState().addCue({ id: 'c1', startTime: 0, endTime: 2, text: 'A' });
    useEditorStore.getState().setSelectedCueId('c1');
    useEditorStore.getState().removeCue('c1');

    expect(useEditorStore.getState().selectedCueId).toBeNull();
  });

  it('keeps selectedCueId when removing different cue', () => {
    useEditorStore.getState().addCue({ id: 'c1', startTime: 0, endTime: 2, text: 'A' });
    useEditorStore.getState().addCue({ id: 'c2', startTime: 3, endTime: 5, text: 'B' });
    useEditorStore.getState().setSelectedCueId('c1');
    useEditorStore.getState().removeCue('c2');

    expect(useEditorStore.getState().selectedCueId).toBe('c1');
  });

  it('updates style partially', () => {
    useEditorStore.getState().setStyle({ fontSize: 48 });

    expect(useEditorStore.getState().style.fontSize).toBe(48);
    expect(useEditorStore.getState().style.fontFamily).toBe(DEFAULT_SUBTITLE_STYLE.fontFamily);
  });

  it('sets playback state', () => {
    useEditorStore.getState().setCurrentTime(10.5);
    useEditorStore.getState().setDuration(120);
    useEditorStore.getState().setIsPlaying(true);

    expect(useEditorStore.getState().currentTime).toBe(10.5);
    expect(useEditorStore.getState().duration).toBe(120);
    expect(useEditorStore.getState().isPlaying).toBe(true);
  });

  it('sets zoom', () => {
    useEditorStore.getState().setZoom(2.5);
    expect(useEditorStore.getState().zoom).toBe(2.5);
  });
});

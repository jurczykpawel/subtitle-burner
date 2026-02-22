import { describe, it, expect } from 'vitest';
import { ProjectSerializer } from '../project-serializer';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';
import type { SBPProject, VideoMetadata } from '@subtitle-burner/types';

const serializer = new ProjectSerializer();

const sampleVideo: VideoMetadata = {
  id: 'video-1',
  filename: 'test.mp4',
  duration: 120,
  width: 1920,
  height: 1080,
  mimeType: 'video/mp4',
  fileSize: 50_000_000,
};

function createSampleProject(): SBPProject {
  return serializer.createProject({
    name: 'Test Project',
    video: sampleVideo,
    cues: [
      { id: 'cue-1', startTime: 0, endTime: 5, text: 'Hello' },
      { id: 'cue-2', startTime: 5, endTime: 10, text: 'World' },
    ],
    style: DEFAULT_SUBTITLE_STYLE,
    generatedBy: 'ui',
  });
}

describe('ProjectSerializer', () => {
  describe('createProject', () => {
    it('creates a valid project with required fields', () => {
      const project = createSampleProject();
      expect(project.version).toBe(1);
      expect(project.metadata.name).toBe('Test Project');
      expect(project.metadata.generatedBy).toBe('ui');
      expect(project.metadata.appVersion).toBeTruthy();
      expect(project.metadata.createdAt).toBeTruthy();
      expect(project.metadata.updatedAt).toBeTruthy();
    });

    it('includes video metadata', () => {
      const project = createSampleProject();
      expect(project.video.filename).toBe('test.mp4');
      expect(project.video.duration).toBe(120);
      expect(project.video.width).toBe(1920);
      expect(project.video.height).toBe(1080);
    });

    it('includes cues', () => {
      const project = createSampleProject();
      expect(project.cues).toHaveLength(2);
      expect(project.cues[0].text).toBe('Hello');
    });

    it('includes optional template reference', () => {
      const project = serializer.createProject({
        name: 'With Template',
        video: sampleVideo,
        cues: [],
        style: DEFAULT_SUBTITLE_STYLE,
        generatedBy: 'api',
        templateId: 'template-1',
        templateName: 'Cinematic',
      });
      expect(project.template?.id).toBe('template-1');
      expect(project.template?.name).toBe('Cinematic');
    });

    it('excludes template when not fully specified', () => {
      const project = serializer.createProject({
        name: 'No Template',
        video: sampleVideo,
        cues: [],
        style: DEFAULT_SUBTITLE_STYLE,
        generatedBy: 'ui',
        templateId: 'template-1',
        // missing templateName
      });
      expect(project.template).toBeUndefined();
    });

    it('includes render settings when preset given', () => {
      const project = serializer.createProject({
        name: 'With Render',
        video: sampleVideo,
        cues: [],
        style: DEFAULT_SUBTITLE_STYLE,
        generatedBy: 'api',
        renderPreset: 'quality',
      });
      expect(project.renderSettings?.preset).toBe('quality');
    });
  });

  describe('serialize / deserialize', () => {
    it('round-trips a project', () => {
      const project = createSampleProject();
      const json = serializer.serialize(project);
      const parsed = serializer.deserialize(json);
      expect(parsed.metadata.name).toBe(project.metadata.name);
      expect(parsed.cues).toHaveLength(project.cues.length);
      expect(parsed.version).toBe(1);
    });

    it('serialize produces valid JSON', () => {
      const project = createSampleProject();
      const json = serializer.serialize(project);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('serialize produces formatted JSON', () => {
      const project = createSampleProject();
      const json = serializer.serialize(project);
      expect(json).toContain('\n'); // indented
    });
  });

  describe('validate', () => {
    it('validates a correct project', () => {
      const project = createSampleProject();
      expect(() => serializer.validate(project)).not.toThrow();
    });

    it('throws for invalid version', () => {
      const project = createSampleProject();
      (project as any).version = 2;
      expect(() => serializer.validate(project)).toThrow('Invalid .sbp file');
    });

    it('throws for missing required fields', () => {
      expect(() => serializer.validate({})).toThrow('Invalid .sbp file');
    });

    it('throws for invalid cue data', () => {
      const project = createSampleProject();
      (project.cues[0] as any).startTime = -5;
      expect(() => serializer.validate(project)).toThrow();
    });

    it('throws for invalid style data', () => {
      const project = createSampleProject();
      (project.style as any).fontColor = 'not-a-color';
      expect(() => serializer.validate(project)).toThrow();
    });
  });

  describe('isValid', () => {
    it('returns true for valid project', () => {
      const p = createSampleProject();
      expect(serializer.isValid(p)).toBe(true);
    });

    it('returns false for invalid data', () => {
      expect(serializer.isValid({})).toBe(false);
      expect(serializer.isValid(null)).toBe(false);
      expect(serializer.isValid('string')).toBe(false);
    });
  });

  describe('toBlob', () => {
    it('creates a Blob with correct type', () => {
      const project = createSampleProject();
      const blob = serializer.toBlob(project);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });
  });

  describe('fromBuffer', () => {
    it('parses from a Buffer', () => {
      const project = createSampleProject();
      const json = serializer.serialize(project);
      const buffer = Buffer.from(json, 'utf-8');
      const parsed = serializer.fromBuffer(buffer);
      expect(parsed.metadata.name).toBe('Test Project');
    });
  });

  describe('migrate', () => {
    it('passes through version 1 projects', () => {
      const project = createSampleProject();
      const migrated = serializer.migrate(project);
      expect(migrated.version).toBe(1);
    });

    it('throws for unsupported versions', () => {
      expect(() => serializer.migrate({ version: 99 })).toThrow('Unsupported .sbp version');
    });

    it('throws for non-object data', () => {
      expect(() => serializer.migrate(null)).toThrow('Invalid project data');
      expect(() => serializer.migrate('string')).toThrow('Invalid project data');
    });
  });
});

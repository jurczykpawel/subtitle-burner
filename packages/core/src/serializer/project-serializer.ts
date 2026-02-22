import type {
  SBPProject,
  SubtitleCue,
  SubtitleStyle,
  VideoMetadata,
  RenderQuality,
} from '@subtitle-burner/types';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';
import { sbpSchema } from './sbp-schema';

const APP_VERSION = '2.0.0';

export interface CreateProjectOptions {
  name: string;
  video: VideoMetadata;
  cues: readonly SubtitleCue[];
  style: SubtitleStyle;
  generatedBy: 'ui' | 'api';
  templateId?: string;
  templateName?: string;
  renderPreset?: RenderQuality;
  sourceVideoHash?: string;
}

/**
 * ProjectSerializer - serialize/deserialize .sbp project files.
 */
export class ProjectSerializer {
  serialize(project: SBPProject): string {
    return JSON.stringify(project, null, 2);
  }

  deserialize(content: string): SBPProject {
    const parsed = JSON.parse(content);
    return this.validate(parsed);
  }

  validate(data: unknown): SBPProject {
    const result = sbpSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Invalid .sbp file: ${result.error.issues.map((i) => i.message).join(', ')}`);
    }
    return result.data as SBPProject;
  }

  isValid(data: unknown): data is SBPProject {
    return sbpSchema.safeParse(data).success;
  }

  createProject(options: CreateProjectOptions): SBPProject {
    const now = new Date().toISOString();
    return {
      version: 1,
      metadata: {
        name: options.name,
        createdAt: now,
        updatedAt: now,
        appVersion: APP_VERSION,
        generatedBy: options.generatedBy,
        sourceVideoHash: options.sourceVideoHash,
        sourceVideoFilename: options.video.filename,
      },
      video: {
        filename: options.video.filename,
        duration: options.video.duration,
        width: options.video.width,
        height: options.video.height,
        mimeType: options.video.mimeType,
        fileSize: options.video.fileSize,
      },
      cues: options.cues.map((c) => ({ ...c })),
      style: { ...options.style },
      template:
        options.templateId && options.templateName
          ? { id: options.templateId, name: options.templateName }
          : undefined,
      renderSettings: options.renderPreset
        ? { preset: options.renderPreset }
        : undefined,
    };
  }

  /** Create a Blob for browser download */
  toBlob(project: SBPProject): Blob {
    return new Blob([this.serialize(project)], {
      type: 'application/json',
    });
  }

  /** Parse from a File object (browser) */
  async fromFile(file: File): Promise<SBPProject> {
    const text = await file.text();
    return this.deserialize(text);
  }

  /** Parse from a Buffer (Node.js) */
  fromBuffer(buffer: Buffer): SBPProject {
    return this.deserialize(buffer.toString('utf-8'));
  }

  /** Migrate old versions to current (future-proofing) */
  migrate(data: unknown): SBPProject {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid project data');
    }

    const obj = data as Record<string, unknown>;

    // Currently only version 1 exists
    if (obj.version === 1) {
      return this.validate(data);
    }

    throw new Error(`Unsupported .sbp version: ${obj.version}`);
  }
}

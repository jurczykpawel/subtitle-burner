// ==========================================
// Subtitle Types
// ==========================================

export interface SubtitleCue {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
}

export interface SubtitleTrack {
  id: string;
  videoId: string;
  cues: SubtitleCue[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Style Types
// ==========================================

export type TextAlignment = 'left' | 'center' | 'right';

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  backgroundColor: string;
  backgroundOpacity: number;
  outlineColor: string;
  outlineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  position: number; // vertical percentage 0-100 (0 = top, 100 = bottom)
  alignment: TextAlignment;
  lineHeight: number;
  padding: number;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Arial',
  fontSize: 24,
  fontColor: '#FFFFFF',
  fontWeight: 'normal',
  fontStyle: 'normal',
  backgroundColor: '#000000',
  backgroundOpacity: 0.7,
  outlineColor: '#000000',
  outlineWidth: 2,
  shadowColor: '#000000',
  shadowBlur: 4,
  position: 90,
  alignment: 'center',
  lineHeight: 1.4,
  padding: 8,
};

// ==========================================
// Video Types
// ==========================================

export interface VideoMetadata {
  id: string;
  filename: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  mimeType: string;
}

// ==========================================
// Render Job Types
// ==========================================

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface RenderJob {
  id: string;
  videoId: string;
  userId?: string;
  style: SubtitleStyle;
  status: JobStatus;
  progress: number;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ==========================================
// User Types
// ==========================================

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  tier: UserTier;
  createdAt: string;
}

// ==========================================
// Adapter Types
// ==========================================

export type DeploymentMode = 'cloud' | 'vps';

export interface StorageAdapter {
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  delete(path: string): Promise<void>;
}

export interface QueueAdapter {
  enqueue(jobId: string, payload: Record<string, unknown>): Promise<void>;
  getStatus(jobId: string): Promise<JobStatus>;
}

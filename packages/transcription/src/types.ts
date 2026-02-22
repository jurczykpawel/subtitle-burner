// ==========================================
// Transcription Provider Interface
// ==========================================

export interface TranscriptionWord {
  readonly text: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly confidence?: number;
}

export interface TranscriptionResult {
  readonly words: readonly TranscriptionWord[];
  readonly text: string;
  readonly language: string;
  readonly duration: number;
}

export type TranscriptionStatus =
  | 'idle'
  | 'loading-model'
  | 'extracting-audio'
  | 'transcribing'
  | 'grouping'
  | 'completed'
  | 'error';

export interface TranscriptionProgress {
  readonly status: TranscriptionStatus;
  readonly progress: number; // 0-100
  readonly message: string;
}

export interface TranscribeOptions {
  readonly language?: string;
  readonly onProgress?: (p: TranscriptionProgress) => void;
  readonly signal?: AbortSignal;
}

/**
 * TranscriptionProvider - common interface for all transcription backends.
 * Providers can be local (in-browser) or cloud-based.
 */
export interface TranscriptionProvider {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  isAvailable(): Promise<boolean>;
  transcribe(
    audio: Float32Array,
    sampleRate: number,
    options?: TranscribeOptions,
  ): Promise<TranscriptionResult>;
  dispose?(): void;
}

// ==========================================
// Provider Configs
// ==========================================

export interface LocalWhisperConfig {
  readonly provider: 'local';
  readonly model?: 'tiny' | 'base' | 'small';
}

export interface CloudflareWhisperConfig {
  readonly provider: 'cloudflare';
  readonly apiToken: string;
  readonly accountId: string;
}

export interface OpenRouterConfig {
  readonly provider: 'openrouter';
  readonly apiKey: string;
  readonly model?: string;
}

export interface OllamaConfig {
  readonly provider: 'ollama';
  readonly baseUrl?: string;
  readonly model?: string;
}

export type ProviderConfig =
  | LocalWhisperConfig
  | CloudflareWhisperConfig
  | OpenRouterConfig
  | OllamaConfig;

// ==========================================
// Word Grouping Config
// ==========================================

export interface WordGroupingConfig {
  readonly maxWordsPerCue: number;
  readonly maxDurationPerCue: number;
  readonly breakOnPunctuation: boolean;
}

export const DEFAULT_GROUPING_CONFIG: WordGroupingConfig = {
  maxWordsPerCue: 10,
  maxDurationPerCue: 5,
  breakOnPunctuation: true,
};

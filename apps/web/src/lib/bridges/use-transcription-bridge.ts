'use client';

import { useCallback, useRef } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useEngineStore } from '@/store/engine-store';
import {
  extractAudioFromElement,
  groupWordsIntoCues,
  createProvider,
} from '@subtitle-burner/transcription';
import type { ProviderConfig, TranscriptionProvider } from '@subtitle-burner/transcription';

/**
 * Bridge between UI and transcription system.
 * Handles audio extraction, transcription, and word grouping.
 */
export function useTranscriptionBridge() {
  const status = useEngineStore((s) => s.transcriptionStatus);
  const progress = useEngineStore((s) => s.transcriptionProgress);
  const error = useEngineStore((s) => s.transcriptionError);
  const setTranscriptionStatus = useEngineStore((s) => s.setTranscriptionStatus);
  const resetTranscription = useEngineStore((s) => s.resetTranscription);
  const setCues = useProjectStore((s) => s.setCues);

  const providerRef = useRef<TranscriptionProvider | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const transcribe = useCallback(
    async (videoElement: HTMLVideoElement, config: ProviderConfig = { provider: 'local' }) => {
      // Abort any previous transcription
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      try {
        // Step 1: Create/reuse provider
        setTranscriptionStatus('loading', 5);
        if (
          !providerRef.current ||
          providerRef.current.id !== config.provider
        ) {
          providerRef.current?.dispose?.();
          providerRef.current = createProvider(config);
        }

        const provider = providerRef.current;
        const available = await provider.isAvailable();
        if (!available) {
          throw new Error(`Transcription provider "${provider.name}" is not available.`);
        }

        // Step 2: Extract audio from video element
        setTranscriptionStatus('extracting', 10);
        const { audio, sampleRate } = await extractAudioFromElement(videoElement);

        if (abort.signal.aborted) return;

        // Step 3: Transcribe
        setTranscriptionStatus('transcribing', 20);
        const result = await provider.transcribe(audio, sampleRate, {
          onProgress: (p) => {
            // Map provider progress (0-100) to our range (20-90)
            const mapped = 20 + (p.progress / 100) * 70;
            setTranscriptionStatus('transcribing', mapped);
          },
          signal: abort.signal,
        });

        if (abort.signal.aborted) return;

        // Step 4: Group words into cues
        setTranscriptionStatus('ready', 95);
        const cues = groupWordsIntoCues(result.words);

        // Step 5: Update project store
        setCues(cues);
        setTranscriptionStatus('ready', 100);
      } catch (err) {
        if (abort.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Transcription failed';
        setTranscriptionStatus('error', 0, message);
      }
    },
    [setCues, setTranscriptionStatus]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    resetTranscription();
  }, [resetTranscription]);

  const dispose = useCallback(() => {
    abortRef.current?.abort();
    providerRef.current?.dispose?.();
    providerRef.current = null;
    resetTranscription();
  }, [resetTranscription]);

  return {
    // State
    status,
    progress,
    error,
    isTranscribing: status === 'loading' || status === 'extracting' || status === 'transcribing',

    // Actions
    transcribe,
    cancel,
    dispose,
  };
}

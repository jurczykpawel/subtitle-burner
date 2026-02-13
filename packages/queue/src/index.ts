import type { QueueAdapter, DeploymentMode } from '@subtitle-burner/types';

export function detectDeploymentMode(): DeploymentMode {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.INNGEST_EVENT_KEY) {
    return 'cloud';
  }
  return 'vps';
}

export function createQueue(): QueueAdapter {
  const mode = detectDeploymentMode();

  if (mode === 'cloud') {
    // Inngest adapter - loaded dynamically to avoid bundling unused deps
    throw new Error('Inngest adapter not yet implemented');
  }

  // BullMQ adapter
  throw new Error('BullMQ adapter not yet implemented');
}

export type { QueueAdapter, DeploymentMode };

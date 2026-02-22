import { getAuthUser } from '@/lib/api/auth';
import { apiError, apiSuccess } from '@/lib/api/errors';
import { getTierLimits } from '@/lib/api/validation';
import { createRenderSchema } from '@/lib/api/schemas';
import {
  getVideoById,
  createRenderJob,
  tryConsumeRenderCredit,
} from '@subtitle-burner/database';
import { createQueue } from '@subtitle-burner/queue';

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Invalid JSON');
  }
  const parsed = createRenderSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid request body');
  const { videoId } = parsed.data;

  const video = await getVideoById(videoId, auth.dbUser.id);
  if (!video) return apiError(404, 'Video not found');

  // Atomic rate limit check (TOCTOU-safe)
  const limits = getTierLimits(auth.dbUser.tier);
  const allowed = await tryConsumeRenderCredit(auth.dbUser.id, limits.rendersPerDay);
  if (!allowed) {
    return apiError(429, 'Daily render limit reached. Upgrade to Pro for unlimited renders.');
  }

  // Create job
  const job = await createRenderJob({
    userId: auth.dbUser.id,
    videoId,
    style: {},
  });

  // Enqueue with timeout to avoid hanging if Redis is down
  try {
    const queue = await createQueue();
    const enqueueWithTimeout = Promise.race([
      queue.enqueue(job.id, { jobId: job.id, videoId }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Queue connection timeout')), 5000)
      ),
    ]);
    await enqueueWithTimeout;
  } catch {
    return apiError(503, 'Render queue unavailable. Please try again later.');
  }

  return apiSuccess(job, 201);
}

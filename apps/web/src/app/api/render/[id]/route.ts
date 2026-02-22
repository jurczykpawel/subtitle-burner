import { getAuthUser } from '@/lib/api/auth';
import { apiError, apiSuccess } from '@/lib/api/errors';
import { getRenderJob } from '@subtitle-burner/database';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const { id } = await params;
  const job = await getRenderJob(id, auth.dbUser.id);
  if (!job) return apiError(404, 'Render job not found');

  return apiSuccess({
    id: job.id,
    status: job.status,
    progress: job.progress,
    outputUrl: job.outputUrl,
    error: job.status === 'FAILED' ? 'Render failed. Please try again.' : null,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}

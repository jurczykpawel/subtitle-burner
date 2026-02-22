import { NextRequest } from 'next/server';
import { API_SCOPES } from '@subtitle-burner/types';
import { getRenderJob } from '@subtitle-burner/database';
import { withAuth, successResponse, errorResponse } from '@/lib/api/v1/middleware';
import type { AuthContext } from '@/lib/api/v1/types';

/** GET /api/v1/render/:id - Get render job status */
export const GET = withAuth(
  { scope: API_SCOPES.RENDER_READ },
  async (req: NextRequest, ctx: AuthContext) => {
    const id = new URL(req.url).pathname.split('/').pop()!;

    const job = await getRenderJob(id, ctx.user.id);
    if (!job) {
      return errorResponse('NOT_FOUND', 'Render job not found', 404);
    }

    return successResponse({
      id: job.id,
      status: job.status.toLowerCase(),
      progress: job.progress,
      outputUrl: job.status === 'COMPLETED' ? `/api/v1/render/${job.id}/download` : null,
      projectUrl: job.status === 'COMPLETED' && job.projectFile
        ? `/api/v1/render/${job.id}/project`
        : null,
      error: job.status === 'FAILED' ? job.error : null,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  }
);

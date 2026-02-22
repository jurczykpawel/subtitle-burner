import { NextRequest, NextResponse } from 'next/server';
import { API_SCOPES } from '@subtitle-burner/types';
import { getRenderJob } from '@subtitle-burner/database';
import { createStorage } from '@subtitle-burner/storage';
import { withAuth, errorResponse } from '@/lib/api/v1/middleware';
import type { AuthContext } from '@/lib/api/v1/types';

/** GET /api/v1/render/:id/project - Download .sbp project file */
export const GET = withAuth(
  { scope: API_SCOPES.RENDER_READ },
  async (req: NextRequest, ctx: AuthContext) => {
    const id = new URL(req.url).pathname.split('/').at(-2)!;

    const job = await getRenderJob(id, ctx.user.id);
    if (!job) {
      return errorResponse('NOT_FOUND', 'Render job not found', 404);
    }

    if (job.status !== 'COMPLETED' || !job.projectFile) {
      return errorResponse('VALIDATION_ERROR', 'Project file not available', 400);
    }

    const storage = await createStorage();
    const buffer = await storage.download(job.projectFile);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="project-${job.id}.sbp"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  }
);

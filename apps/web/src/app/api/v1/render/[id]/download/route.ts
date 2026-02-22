import { NextRequest, NextResponse } from 'next/server';
import { API_SCOPES } from '@subtitle-burner/types';
import { getRenderJob } from '@subtitle-burner/database';
import { createStorage } from '@subtitle-burner/storage';
import { withAuth, errorResponse } from '@/lib/api/v1/middleware';
import type { AuthContext } from '@/lib/api/v1/types';

/** GET /api/v1/render/:id/download - Download rendered video */
export const GET = withAuth(
  { scope: API_SCOPES.RENDER_READ },
  async (req: NextRequest, ctx: AuthContext) => {
    const id = new URL(req.url).pathname.split('/').at(-2)!;

    const job = await getRenderJob(id, ctx.user.id);
    if (!job) {
      return errorResponse('NOT_FOUND', 'Render job not found', 404);
    }

    if (job.status !== 'COMPLETED' || !job.outputUrl) {
      return errorResponse('VALIDATION_ERROR', 'Render not yet completed', 400);
    }

    const storage = await createStorage();
    const signedUrl = await storage.getSignedUrl(job.outputUrl, 600);

    return NextResponse.redirect(signedUrl);
  }
);

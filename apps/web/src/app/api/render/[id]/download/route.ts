import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth';
import { apiError } from '@/lib/api/errors';
import { getRenderJob } from '@subtitle-burner/database';
import { createStorage } from '@subtitle-burner/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const { id } = await params;
  const job = await getRenderJob(id, auth.dbUser.id);
  if (!job) return apiError(404, 'Render job not found');

  if (job.status !== 'COMPLETED' || !job.outputUrl) {
    return apiError(400, 'Render not yet completed');
  }

  const storage = await createStorage();
  const signedUrl = await storage.getSignedUrl(job.outputUrl, 600);

  return NextResponse.redirect(signedUrl);
}

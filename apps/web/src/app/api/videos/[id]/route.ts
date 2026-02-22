import { getAuthUser } from '@/lib/api/auth';
import { apiError, apiSuccess } from '@/lib/api/errors';
import { getVideoById, deleteVideo } from '@subtitle-burner/database';
import { createStorage } from '@subtitle-burner/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const { id } = await params;
  const video = await getVideoById(id, auth.dbUser.id);
  if (!video) return apiError(404, 'Video not found');

  const storage = await createStorage();
  const signedUrl = await storage.getSignedUrl(video.filePath);

  return apiSuccess({
    ...video,
    fileSize: video.fileSize.toString(),
    url: signedUrl,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const { id } = await params;
  const video = await getVideoById(id, auth.dbUser.id);
  if (!video) return apiError(404, 'Video not found');

  // Delete from storage
  try {
    const storage = await createStorage();
    await storage.delete(video.filePath);
  } catch {
    // Storage delete may fail if file already removed
  }

  await deleteVideo(id, auth.dbUser.id);
  return apiSuccess({ deleted: true });
}

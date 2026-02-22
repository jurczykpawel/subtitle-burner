import { getAuthUser } from '@/lib/api/auth';
import { apiError, apiSuccess } from '@/lib/api/errors';
import { rateLimit } from '@/lib/api/rate-limit';
import { validateMagicBytes, validateFileSize } from '@/lib/api/validation';
import { createVideo, getVideosByUser } from '@subtitle-burner/database';
import { createStorage } from '@subtitle-burner/storage';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const videos = await getVideosByUser(auth.dbUser.id);
  const serialized = videos.map((v) => ({ ...v, fileSize: v.fileSize.toString() }));
  return apiSuccess(serialized);
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const { success } = rateLimit(`upload:${auth.dbUser.id}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!success) return apiError(429, 'Too many uploads');

  const formData = await request.formData();
  const file = formData.get('video') as File | null;
  if (!file) return apiError(400, 'No video file provided');

  // Validate file size per tier
  if (!validateFileSize(file.size, auth.dbUser.tier)) {
    return apiError(413, 'File too large for your tier');
  }

  // Validate magic bytes
  const headerBytes = await file.slice(0, 32).arrayBuffer();
  if (!validateMagicBytes(headerBytes, file.type)) {
    return apiError(400, 'Invalid video file format');
  }

  // Extract metadata from form (client sends these)
  const duration = parseFloat(formData.get('duration') as string) || 0;
  const width = parseInt(formData.get('width') as string) || 0;
  const height = parseInt(formData.get('height') as string) || 0;

  // Upload to storage - randomize filename to prevent path traversal / info leak
  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
  const path = `${auth.dbUser.id}/${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = await createStorage();
  await storage.upload(buffer, path);

  // Create DB record
  const video = await createVideo({
    userId: auth.dbUser.id,
    filename: file.name,
    filePath: path,
    fileSize: BigInt(file.size),
    duration,
    width,
    height,
    mimeType: file.type,
  });

  return apiSuccess(
    { ...video, fileSize: video.fileSize.toString() },
    201
  );
}

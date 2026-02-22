import { getAuthUser } from '@/lib/api/auth';
import { apiError, apiSuccess } from '@/lib/api/errors';
import { sanitizeSubtitleText } from '@/lib/api/validation';
import { saveSubtitlesSchema } from '@/lib/api/schemas';
import {
  getVideoById,
  getSubtitlesByVideo,
  upsertSubtitle,
} from '@subtitle-burner/database';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const { id } = await params;
  const video = await getVideoById(id, auth.dbUser.id);
  if (!video) return apiError(404, 'Video not found');

  const subtitle = await getSubtitlesByVideo(id, auth.dbUser.id);
  return apiSuccess(subtitle || { content: [], style: null });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const { id } = await params;
  const video = await getVideoById(id, auth.dbUser.id);
  if (!video) return apiError(404, 'Video not found');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Invalid JSON');
  }
  const parsed = saveSubtitlesSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Invalid request body');
  }
  const { cues, style } = parsed.data;

  // Sanitize subtitle text
  const sanitizedCues = cues.map((cue) => ({
    ...cue,
    text: sanitizeSubtitleText(cue.text),
  }));

  const subtitle = await upsertSubtitle(id, sanitizedCues, style);
  return apiSuccess(subtitle);
}

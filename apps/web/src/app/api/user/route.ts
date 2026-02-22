import { getAuthUser } from '@/lib/api/auth';
import { apiError, apiSuccess } from '@/lib/api/errors';
import { countUserRendersToday } from '@subtitle-burner/database';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return apiError(401, 'Unauthorized');

  const rendersToday = await countUserRendersToday(auth.dbUser.id);

  return apiSuccess({
    id: auth.dbUser.id,
    email: auth.dbUser.email,
    tier: auth.dbUser.tier,
    rendersToday,
    createdAt: auth.dbUser.createdAt,
  });
}

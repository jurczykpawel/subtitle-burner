import { NextRequest } from 'next/server';
import { API_SCOPES } from '@subtitle-burner/types';
import {
  getProjectsByUser,
  createProject as dbCreateProject,
} from '@subtitle-burner/database';
import { withAuth, successResponse, paginatedResponse, errorResponse } from '@/lib/api/v1/middleware';
import { createProjectSchema, paginationSchema } from '@/lib/api/v1/schemas';
import type { AuthContext } from '@/lib/api/v1/types';

/** GET /api/v1/projects - List user's projects */
export const GET = withAuth(
  { scope: API_SCOPES.PROJECTS_READ },
  async (req: NextRequest, ctx: AuthContext) => {
    const url = new URL(req.url);
    const params = paginationSchema.safeParse({
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });

    const limit = params.success ? (params.data.limit ?? 20) : 20;
    const cursor = params.success ? params.data.cursor : undefined;

    const projects = await getProjectsByUser(ctx.user.id, cursor, limit);

    return paginatedResponse(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        videoId: p.videoId,
        videoFilename: p.video?.filename ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      limit,
      (p) => p.id
    );
  }
);

/** POST /api/v1/projects - Create a new project */
export const POST = withAuth(
  { scope: API_SCOPES.PROJECTS_WRITE },
  async (req: NextRequest, ctx: AuthContext) => {
    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }

    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join(', '),
        400
      );
    }

    const project = await dbCreateProject({
      userId: ctx.user.id,
      name: parsed.data.name,
      videoId: parsed.data.videoId,
    });

    return successResponse(
      {
        id: project.id,
        name: project.name,
        videoId: project.videoId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      201
    );
  }
);

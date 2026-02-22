import { NextRequest } from 'next/server';
import { API_SCOPES } from '@subtitle-burner/types';
import { getProjectById, updateProject } from '@subtitle-burner/database';
import { ProjectSerializer } from '@subtitle-burner/core';
import { withAuth, successResponse, errorResponse } from '@/lib/api/v1/middleware';
import type { AuthContext } from '@/lib/api/v1/types';

const MAX_SBP_SIZE = 1_048_576; // 1MB

/** POST /api/v1/projects/:id/import - Import .sbp file into project */
export const POST = withAuth(
  { scope: API_SCOPES.PROJECTS_WRITE },
  async (req: NextRequest, ctx: AuthContext) => {
    const id = new URL(req.url).pathname.split('/').at(-2)!;

    const project = await getProjectById(id, ctx.user.id);
    if (!project) {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }

    // Read body as text
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > MAX_SBP_SIZE) {
      return errorResponse('VALIDATION_ERROR', 'File too large (max 1MB)', 400);
    }

    const text = await req.text().catch(() => null);
    if (!text) {
      return errorResponse('VALIDATION_ERROR', 'Could not read request body', 400);
    }

    if (text.length > MAX_SBP_SIZE) {
      return errorResponse('VALIDATION_ERROR', 'File too large (max 1MB)', 400);
    }

    // Parse and validate .sbp
    const serializer = new ProjectSerializer();
    let sbp;
    try {
      sbp = serializer.deserialize(text);
    } catch (e) {
      return errorResponse(
        'VALIDATION_ERROR',
        e instanceof Error ? e.message : 'Invalid .sbp file',
        400
      );
    }

    // Store sbp data as project settings
    await updateProject(id, ctx.user.id, {
      name: sbp.metadata.name || project.name,
      settings: {
        cues: sbp.cues,
        style: sbp.style,
        template: sbp.template,
        renderSettings: sbp.renderSettings,
        importedAt: new Date().toISOString(),
      },
    });

    return successResponse({
      imported: true,
      cueCount: sbp.cues.length,
      projectName: sbp.metadata.name,
    });
  }
);

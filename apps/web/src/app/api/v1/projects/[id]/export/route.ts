import { NextRequest, NextResponse } from 'next/server';
import { API_SCOPES } from '@subtitle-burner/types';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';
import { getProjectById, getSubtitlesByVideo } from '@subtitle-burner/database';
import { ProjectSerializer } from '@subtitle-burner/core';
import { withAuth, errorResponse } from '@/lib/api/v1/middleware';
import type { AuthContext } from '@/lib/api/v1/types';

/** GET /api/v1/projects/:id/export - Export project as .sbp file */
export const GET = withAuth(
  { scope: API_SCOPES.PROJECTS_READ },
  async (req: NextRequest, ctx: AuthContext) => {
    const id = new URL(req.url).pathname.split('/').at(-2)!;

    const project = await getProjectById(id, ctx.user.id);
    if (!project) {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }

    const settings = (project.settings ?? {}) as Record<string, unknown>;
    const cues = (settings.cues ?? []) as Array<{ id: string; startTime: number; endTime: number; text: string }>;
    const style = (settings.style ?? DEFAULT_SUBTITLE_STYLE) as Record<string, unknown>;

    // If project has a linked video, use its metadata
    const video = project.video;
    if (!video) {
      return errorResponse('VALIDATION_ERROR', 'Project has no linked video', 400);
    }

    // If no cues in project settings, try to load from video subtitles
    let finalCues = cues;
    if (finalCues.length === 0 && video) {
      const subs = await getSubtitlesByVideo(video.id, ctx.user.id);
      if (subs?.content) {
        finalCues = subs.content as typeof cues;
      }
    }

    const serializer = new ProjectSerializer();
    const sbpProject = serializer.createProject({
      name: project.name,
      video: {
        id: video.id,
        filename: video.filename,
        duration: video.duration,
        width: video.width,
        height: video.height,
        mimeType: video.mimeType,
        fileSize: Number(video.fileSize),
      },
      cues: finalCues,
      style: style as never,
      generatedBy: 'api',
      templateId: (settings.template as { id?: string })?.id,
      templateName: (settings.template as { name?: string })?.name,
      renderPreset: (settings.renderSettings as { preset?: 'fast' | 'balanced' | 'quality' })?.preset,
    });

    const json = serializer.serialize(sbpProject);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.sbp"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  }
);

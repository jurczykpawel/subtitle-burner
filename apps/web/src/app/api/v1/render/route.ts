import { NextRequest } from 'next/server';
import { API_SCOPES } from '@subtitle-burner/types';
import {
  getVideoById,
  getTemplateById,
  createRenderJobV2,
  tryConsumeRenderCredit,
  incrementTemplateUsage,
  getSubtitlesByVideo,
} from '@subtitle-burner/database';
import { sanitizeStyle } from '@subtitle-burner/core';
import { getTierLimits } from '@/lib/api/validation';
import { createQueue } from '@subtitle-burner/queue';
import { withAuth, successResponse, errorResponse } from '@/lib/api/v1/middleware';
import { createRenderSchema } from '@/lib/api/v1/schemas';
import type { AuthContext } from '@/lib/api/v1/types';

/** POST /api/v1/render - Submit a render job */
export const POST = withAuth(
  { scope: API_SCOPES.RENDER_WRITE, rateLimit: { maxRequests: 20, windowMs: 60_000 } },
  async (req: NextRequest, ctx: AuthContext) => {
    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }

    const parsed = createRenderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join(', '),
        400
      );
    }

    const { videoId, templateId, style, preset, cues, generateProject } = parsed.data;

    // Validate video ownership
    const video = await getVideoById(videoId, ctx.user.id);
    if (!video) {
      return errorResponse('NOT_FOUND', 'Video not found', 404);
    }

    // Check render credits (atomic - prevents TOCTOU)
    const limits = getTierLimits(ctx.user.tier);
    const canRender = await tryConsumeRenderCredit(ctx.user.id, limits.rendersPerDay);
    if (!canRender) {
      return errorResponse(
        'QUOTA_EXCEEDED',
        'Daily render limit reached. Upgrade for more renders.',
        429
      );
    }

    // Resolve style from template + overrides
    let resolvedStyle: object = {};
    if (templateId) {
      const template = await getTemplateById(templateId, ctx.user.id);
      if (!template) {
        return errorResponse('NOT_FOUND', 'Template not found', 404);
      }
      resolvedStyle = template.style as object;
      incrementTemplateUsage(templateId).catch(() => {});
    }

    if (style) {
      resolvedStyle = sanitizeStyle({ ...(resolvedStyle as Record<string, unknown>), ...style });
    }

    // Resolve cues - from request body or from existing subtitles
    let resolvedCues = cues;
    if (!resolvedCues) {
      const existing = await getSubtitlesByVideo(videoId, ctx.user.id);
      if (existing?.content) {
        resolvedCues = existing.content as typeof cues;
      }
    }

    if (!resolvedCues || resolvedCues.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'No subtitle cues provided', 400);
    }

    // Create render job
    const job = await createRenderJobV2({
      userId: ctx.user.id,
      videoId,
      style: resolvedStyle,
      templateId: templateId ?? undefined,
      apiKeyId: ctx.apiKeyId ?? undefined,
    });

    // Enqueue render
    try {
      const queue = await createQueue();
      await Promise.race([
        queue.enqueue(job.id, {
          jobId: job.id,
          videoId,
          cues: resolvedCues,
          style: resolvedStyle,
          preset: preset ?? 'balanced',
          generateProject: generateProject ?? true,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Queue timeout')), 5000)
        ),
      ]);
    } catch {
      return errorResponse('SERVICE_UNAVAILABLE', 'Render queue unavailable', 503);
    }

    return successResponse(
      {
        jobId: job.id,
        status: 'queued',
        pollUrl: `/api/v1/render/${job.id}`,
      },
      201
    );
  }
);

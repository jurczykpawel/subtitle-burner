import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock authenticate used by withAuth
const mockAuthenticate = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/api/v1/middleware', () => {
  function withAuth(
    _options: unknown,
    handler: (req: NextRequest, ctx: unknown) => Promise<NextResponse>
  ) {
    return async (req: NextRequest) => {
      const ctx = await mockAuthenticate(req);
      if (!ctx) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication' } },
          { status: 401 }
        );
      }
      try {
        return await handler(req, ctx);
      } catch (err) {
        console.error(err);
        return NextResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
          { status: 500 }
        );
      }
    };
  }
  function successResponse(data: unknown, status = 200) {
    return NextResponse.json({ data }, { status });
  }
  function errorResponse(code: string, message: string, status: number) {
    return NextResponse.json({ error: { code, message } }, { status });
  }
  return { withAuth, successResponse, errorResponse, authenticate: mockAuthenticate };
});

vi.mock('@/lib/api/validation', () => ({
  getTierLimits: () => ({ maxFileSize: 100 * 1024 * 1024, maxDuration: 300, rendersPerDay: 10 }),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: () => ({ success: true, remaining: 19 }),
}));

const mockGetVideoById = vi.fn();
const mockCreateRenderJobV2 = vi.fn();
const mockTryConsumeRenderCredit = vi.fn();
const mockGetTemplateById = vi.fn();
const mockIncrementTemplateUsage = vi.fn();
const mockGetSubtitlesByVideo = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  getVideoById: (...args: unknown[]) => mockGetVideoById(...args),
  createRenderJobV2: (...args: unknown[]) => mockCreateRenderJobV2(...args),
  tryConsumeRenderCredit: (...args: unknown[]) => mockTryConsumeRenderCredit(...args),
  getTemplateById: (...args: unknown[]) => mockGetTemplateById(...args),
  incrementTemplateUsage: (...args: unknown[]) => mockIncrementTemplateUsage(...args),
  getSubtitlesByVideo: (...args: unknown[]) => mockGetSubtitlesByVideo(...args),
}));

vi.mock('@subtitle-burner/core', () => ({
  sanitizeStyle: (s: unknown) => s,
}));

const mockEnqueue = vi.fn();
vi.mock('@subtitle-burner/queue', () => ({
  createQueue: () => Promise.resolve({ enqueue: mockEnqueue }),
}));

const { POST } = await import('../../v1/render/route');

const validVideoId = '550e8400-e29b-41d4-a716-446655440000';
const validTemplateId = '660e8400-e29b-41d4-a716-446655440000';
const mockUser = { id: 'user-1', email: 'test@test.com', tier: 'FREE' };
const mockAuthCtx = { user: mockUser, apiKeyId: 'key-1', scopes: ['*'] };

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/v1/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validCues = [
  { id: 'c1', startTime: 0, endTime: 2, text: 'Hello' },
];

describe('POST /api/v1/render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthenticate.mockResolvedValue(null);
    const response = await POST(makeRequest({ videoId: validVideoId, cues: validCues }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    const req = new Request('http://localhost/api/v1/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid videoId', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    const response = await POST(makeRequest({ videoId: 'not-uuid', cues: validCues }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when video not found', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetVideoById.mockResolvedValue(null);
    const response = await POST(makeRequest({ videoId: validVideoId, cues: validCues }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 429 when render credits exhausted', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetVideoById.mockResolvedValue({ id: validVideoId });
    mockTryConsumeRenderCredit.mockResolvedValue(false);
    const response = await POST(makeRequest({ videoId: validVideoId, cues: validCues }));
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe('QUOTA_EXCEEDED');
  });

  it('creates render job and returns 201', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetVideoById.mockResolvedValue({ id: validVideoId });
    mockTryConsumeRenderCredit.mockResolvedValue(true);
    mockCreateRenderJobV2.mockResolvedValue({ id: 'job-1', videoId: validVideoId });
    mockEnqueue.mockResolvedValue(undefined);

    const response = await POST(makeRequest({ videoId: validVideoId, cues: validCues }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.jobId).toBe('job-1');
    expect(body.data.status).toBe('queued');
    expect(body.data.pollUrl).toBe('/api/v1/render/job-1');
  });

  it('returns 400 when no cues provided and none exist', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetVideoById.mockResolvedValue({ id: validVideoId });
    mockTryConsumeRenderCredit.mockResolvedValue(true);
    mockGetSubtitlesByVideo.mockResolvedValue(null);

    const response = await POST(makeRequest({ videoId: validVideoId }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('resolves cues from existing subtitles when not in body', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetVideoById.mockResolvedValue({ id: validVideoId });
    mockTryConsumeRenderCredit.mockResolvedValue(true);
    mockGetSubtitlesByVideo.mockResolvedValue({ content: validCues });
    mockCreateRenderJobV2.mockResolvedValue({ id: 'job-2', videoId: validVideoId });
    mockEnqueue.mockResolvedValue(undefined);

    const response = await POST(makeRequest({ videoId: validVideoId }));
    expect(response.status).toBe(201);
  });

  it('returns 404 when templateId provided but not found', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetVideoById.mockResolvedValue({ id: validVideoId });
    mockTryConsumeRenderCredit.mockResolvedValue(true);
    mockGetTemplateById.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ videoId: validVideoId, templateId: validTemplateId, cues: validCues })
    );
    expect(response.status).toBe(404);
  });

  it('returns 503 when queue is unavailable', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetVideoById.mockResolvedValue({ id: validVideoId });
    mockTryConsumeRenderCredit.mockResolvedValue(true);
    mockCreateRenderJobV2.mockResolvedValue({ id: 'job-3', videoId: validVideoId });
    mockEnqueue.mockRejectedValue(new Error('queue down'));

    const response = await POST(makeRequest({ videoId: validVideoId, cues: validCues }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});

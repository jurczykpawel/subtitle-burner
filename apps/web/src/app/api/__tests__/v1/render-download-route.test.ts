import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
      return handler(req, ctx);
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

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: () => ({ success: true, remaining: 19 }),
}));

const mockGetRenderJob = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  getRenderJob: (...args: unknown[]) => mockGetRenderJob(...args),
}));

const mockGetSignedUrl = vi.fn();
vi.mock('@subtitle-burner/storage', () => ({
  createStorage: () => Promise.resolve({
    getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
  }),
}));

const { GET } = await import('../../v1/render/[id]/download/route');

const mockUser = { id: 'user-1', email: 'test@test.com', tier: 'FREE' };
const mockAuthCtx = { user: mockUser, apiKeyId: 'key-1', scopes: ['*'] };

describe('GET /api/v1/render/[id]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthenticate.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/v1/render/job-1/download'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when job not found', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetRenderJob.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/v1/render/job-1/download'));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 when render not completed', async () => {
    const job = {
      id: 'job-1',
      userId: 'user-1',
      status: 'PROCESSING',
      outputUrl: null,
    };
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetRenderJob.mockResolvedValue(job);

    const response = await GET(new Request('http://localhost/api/v1/render/job-1/download'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('redirects to signed URL when render is completed', async () => {
    const job = {
      id: 'job-1',
      userId: 'user-1',
      status: 'COMPLETED',
      outputUrl: '/outputs/job-1/video.mp4',
    };
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetRenderJob.mockResolvedValue(job);
    mockGetSignedUrl.mockResolvedValue('https://storage.example.com/signed-url');

    const response = await GET(new Request('http://localhost/api/v1/render/job-1/download'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://storage.example.com/signed-url');
    expect(mockGetSignedUrl).toHaveBeenCalledWith('/outputs/job-1/video.mp4', 600);
  });
});

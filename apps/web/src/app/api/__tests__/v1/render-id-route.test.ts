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

const { GET } = await import('../../v1/render/[id]/route');

const mockUser = { id: 'user-1', email: 'test@test.com', tier: 'FREE' };
const mockAuthCtx = { user: mockUser, apiKeyId: 'key-1', scopes: ['*'] };

describe('GET /api/v1/render/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthenticate.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/v1/render/job-1'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when job not found', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetRenderJob.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/v1/render/job-1'));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns job data when found', async () => {
    const job = {
      id: 'job-1',
      userId: 'user-1',
      status: 'COMPLETED',
      progress: 100,
      outputUrl: '/output.mp4',
      projectFile: '/project.sbp',
      error: null,
      createdAt: new Date('2024-01-01'),
      startedAt: new Date('2024-01-01'),
      completedAt: new Date('2024-01-01'),
    };
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetRenderJob.mockResolvedValue(job);

    const response = await GET(new Request('http://localhost/api/v1/render/job-1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.id).toBe('job-1');
    expect(body.data.status).toBe('completed');
    expect(body.data.progress).toBe(100);
    expect(body.data.outputUrl).toBe('/api/v1/render/job-1/download');
    expect(body.data.projectUrl).toBe('/api/v1/render/job-1/project');
  });

  it('returns null outputUrl for non-completed jobs', async () => {
    const job = {
      id: 'job-2',
      userId: 'user-1',
      status: 'PROCESSING',
      progress: 50,
      outputUrl: null,
      projectFile: null,
      error: null,
      createdAt: new Date('2024-01-01'),
      startedAt: new Date('2024-01-01'),
      completedAt: null,
    };
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetRenderJob.mockResolvedValue(job);

    const response = await GET(new Request('http://localhost/api/v1/render/job-2'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.outputUrl).toBeNull();
    expect(body.data.projectUrl).toBeNull();
    expect(body.data.error).toBeNull();
  });

  it('returns error for failed jobs', async () => {
    const job = {
      id: 'job-3',
      userId: 'user-1',
      status: 'FAILED',
      progress: 0,
      outputUrl: null,
      projectFile: null,
      error: 'Render failed',
      createdAt: new Date('2024-01-01'),
      startedAt: new Date('2024-01-01'),
      completedAt: null,
    };
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetRenderJob.mockResolvedValue(job);

    const response = await GET(new Request('http://localhost/api/v1/render/job-3'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe('failed');
    expect(body.data.error).toBe('Render failed');
  });

  it('passes userId to getRenderJob for RLS', async () => {
    mockAuthenticate.mockResolvedValue(mockAuthCtx);
    mockGetRenderJob.mockResolvedValue(null);
    await GET(new Request('http://localhost/api/v1/render/job-1'));
    expect(mockGetRenderJob).toHaveBeenCalledWith('job-1', 'user-1');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthUser = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockGetRenderJob = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  getRenderJob: (...args: unknown[]) => mockGetRenderJob(...args),
}));

const { GET } = await import('../render/[id]/route');

const dbUser = { id: 'user-1', email: 'test@test.com', tier: 'FREE' };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/render/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost'), makeParams('job-1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when job not found', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetRenderJob.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost'), makeParams('job-1'));
    expect(response.status).toBe(404);
  });

  it('returns job data when found', async () => {
    const job = {
      id: 'job-1',
      userId: 'user-1',
      status: 'COMPLETED',
      progress: 100,
      outputUrl: '/output.mp4',
      error: null,
      createdAt: new Date('2024-01-01'),
      startedAt: new Date('2024-01-01'),
      completedAt: new Date('2024-01-01'),
    };
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetRenderJob.mockResolvedValue(job);

    const response = await GET(new Request('http://localhost'), makeParams('job-1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('job-1');
    expect(body.status).toBe('COMPLETED');
    expect(body.progress).toBe(100);
  });

  it('passes userId to getRenderJob for RLS', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetRenderJob.mockResolvedValue(null);
    await GET(new Request('http://localhost'), makeParams('job-1'));
    expect(mockGetRenderJob).toHaveBeenCalledWith('job-1', 'user-1');
  });
});

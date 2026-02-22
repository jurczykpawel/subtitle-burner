import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthUser = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

vi.mock('@/lib/api/validation', () => ({
  getTierLimits: () => ({ maxFileSize: 100 * 1024 * 1024, maxDuration: 300, rendersPerDay: 10 }),
}));

const mockGetVideoById = vi.fn();
const mockCreateRenderJob = vi.fn();
const mockTryConsumeRenderCredit = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  getVideoById: (...args: unknown[]) => mockGetVideoById(...args),
  createRenderJob: (...args: unknown[]) => mockCreateRenderJob(...args),
  tryConsumeRenderCredit: (...args: unknown[]) => mockTryConsumeRenderCredit(...args),
}));

const mockEnqueue = vi.fn();
vi.mock('@subtitle-burner/queue', () => ({
  createQueue: () => ({ enqueue: mockEnqueue }),
}));

const { POST } = await import('../render/route');

const dbUser = { id: 'user-1', email: 'test@test.com', tier: 'FREE' as const };
const validVideoId = '550e8400-e29b-41d4-a716-446655440000';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const response = await POST(makeRequest({ videoId: validVideoId }));
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    const response = await POST(makeRequest({ videoId: 'not-uuid' }));
    expect(response.status).toBe(400);
  });

  it('returns 404 when video not found', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue(null);
    const response = await POST(makeRequest({ videoId: validVideoId }));
    expect(response.status).toBe(404);
  });

  it('returns 429 when daily render limit reached', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue({ id: validVideoId });
    mockTryConsumeRenderCredit.mockResolvedValue(false);

    const response = await POST(makeRequest({ videoId: validVideoId }));
    expect(response.status).toBe(429);
  });

  it('creates render job and enqueues', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue({ id: validVideoId });
    mockTryConsumeRenderCredit.mockResolvedValue(true);
    mockCreateRenderJob.mockResolvedValue({ id: 'job-1', videoId: validVideoId });

    const response = await POST(makeRequest({ videoId: validVideoId }));
    expect(response.status).toBe(201);

    expect(mockCreateRenderJob).toHaveBeenCalledWith({
      userId: 'user-1',
      videoId: validVideoId,
      style: {},
    });
    expect(mockEnqueue).toHaveBeenCalledWith('job-1', { jobId: 'job-1', videoId: validVideoId });
  });
});

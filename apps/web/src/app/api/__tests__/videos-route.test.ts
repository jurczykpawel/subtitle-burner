import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthUser = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: () => ({ success: true, remaining: 19 }),
}));

vi.mock('@/lib/api/validation', () => ({
  validateMagicBytes: () => true,
  validateFileSize: () => true,
}));

const mockGetVideosByUser = vi.fn();
const mockCreateVideo = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  getVideosByUser: (...args: unknown[]) => mockGetVideosByUser(...args),
  createVideo: (...args: unknown[]) => mockCreateVideo(...args),
}));

vi.mock('@subtitle-burner/storage', () => ({
  createStorage: () => ({
    upload: vi.fn(),
  }),
}));

const { GET } = await import('../videos/route');

const dbUser = { id: 'user-1', email: 'test@test.com', tier: 'FREE' as const };

describe('GET /api/videos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns user videos', async () => {
    const videos = [
      { id: 'v1', filename: 'test.mp4', fileSize: BigInt(1024), _count: { subtitles: 1, renderJobs: 0 } },
    ];
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideosByUser.mockResolvedValue(videos);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].filename).toBe('test.mp4');
  });

  it('passes userId to getVideosByUser', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideosByUser.mockResolvedValue([]);

    await GET();
    expect(mockGetVideosByUser).toHaveBeenCalledWith('user-1');
  });
});

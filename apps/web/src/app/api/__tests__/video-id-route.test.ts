import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthUser = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockGetVideoById = vi.fn();
const mockDeleteVideo = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  getVideoById: (...args: unknown[]) => mockGetVideoById(...args),
  deleteVideo: (...args: unknown[]) => mockDeleteVideo(...args),
}));

const mockStorageDelete = vi.fn();
vi.mock('@subtitle-burner/storage', () => ({
  createStorage: () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://signed.url/video.mp4'),
    delete: (...args: unknown[]) => mockStorageDelete(...args),
  }),
}));

const { GET, DELETE } = await import('../videos/[id]/route');

const dbUser = { id: 'user-1', email: 'test@test.com', tier: 'FREE' };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/videos/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost'), makeParams('v1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when video not found', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost'), makeParams('v1'));
    expect(response.status).toBe(404);
  });

  it('returns video with signed URL', async () => {
    const video = {
      id: 'v1',
      filename: 'test.mp4',
      filePath: 'user-1/v1/test.mp4',
      fileSize: BigInt(1000),
      duration: 60,
    };
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue(video);

    const response = await GET(new Request('http://localhost'), makeParams('v1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe('https://signed.url/video.mp4');
    expect(body.fileSize).toBe('1000');
  });

  it('passes userId to getVideoById for RLS', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue(null);
    await GET(new Request('http://localhost'), makeParams('v1'));
    expect(mockGetVideoById).toHaveBeenCalledWith('v1', 'user-1');
  });
});

describe('DELETE /api/videos/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const response = await DELETE(new Request('http://localhost'), makeParams('v1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when video not found', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue(null);
    const response = await DELETE(new Request('http://localhost'), makeParams('v1'));
    expect(response.status).toBe(404);
  });

  it('deletes video from storage and DB', async () => {
    const video = { id: 'v1', filePath: 'user-1/v1/test.mp4' };
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue(video);
    mockDeleteVideo.mockResolvedValue({ count: 1 });

    const response = await DELETE(new Request('http://localhost'), makeParams('v1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
    expect(mockStorageDelete).toHaveBeenCalledWith('user-1/v1/test.mp4');
    expect(mockDeleteVideo).toHaveBeenCalledWith('v1', 'user-1');
  });

  it('still deletes DB record if storage delete fails', async () => {
    const video = { id: 'v1', filePath: 'user-1/v1/test.mp4' };
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue(video);
    mockStorageDelete.mockRejectedValue(new Error('storage error'));
    mockDeleteVideo.mockResolvedValue({ count: 1 });

    const response = await DELETE(new Request('http://localhost'), makeParams('v1'));
    expect(response.status).toBe(200);
    expect(mockDeleteVideo).toHaveBeenCalled();
  });
});

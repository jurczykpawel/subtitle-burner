import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PrismaClient
const mockUserFindUnique = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpsert = vi.fn();
const mockVideoCreate = vi.fn();
const mockVideoFindMany = vi.fn();
const mockVideoFindFirst = vi.fn();
const mockVideoDeleteMany = vi.fn();
const mockSubtitleFindFirst = vi.fn();
const mockSubtitleCreate = vi.fn();
const mockSubtitleUpdate = vi.fn();
const mockRenderJobCreate = vi.fn();
const mockRenderJobFindUnique = vi.fn();
const mockRenderJobFindFirst = vi.fn();
const mockRenderJobUpdate = vi.fn();
const mockRenderJobCount = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
      create: mockUserCreate,
      upsert: mockUserUpsert,
    },
    video: {
      create: mockVideoCreate,
      findMany: mockVideoFindMany,
      findFirst: mockVideoFindFirst,
      deleteMany: mockVideoDeleteMany,
    },
    subtitle: {
      findFirst: mockSubtitleFindFirst,
      create: mockSubtitleCreate,
      update: mockSubtitleUpdate,
    },
    renderJob: {
      create: mockRenderJobCreate,
      findUnique: mockRenderJobFindUnique,
      findFirst: mockRenderJobFindFirst,
      update: mockRenderJobUpdate,
      count: mockRenderJobCount,
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Pass the same mock prisma client as the transaction client
      return fn({
        renderJob: {
          count: mockRenderJobCount,
        },
      });
    }),
  })),
}));

const {
  getUserByEmail,
  getUserById,
  upsertUser,
  createUserWithPassword,
  getVideoById,
  getVideosByUser,
  deleteVideo,
  getSubtitlesByVideo,
  getRenderJob,
  getRenderJobInternal,
  updateRenderJobStatus,
  countUserRendersToday,
} = await import('../index');

describe('User helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getUserByEmail queries by email', async () => {
    mockUserFindUnique.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const user = await getUserByEmail('a@b.com');
    expect(user).toEqual({ id: '1', email: 'a@b.com' });
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
  });

  it('getUserById queries by id', async () => {
    mockUserFindUnique.mockResolvedValue({ id: '1' });
    await getUserById('1');
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('upsertUser creates or updates', async () => {
    mockUserUpsert.mockResolvedValue({ id: '1', email: 'a@b.com' });
    await upsertUser('1', 'a@b.com');
    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { id: '1' },
      update: { email: 'a@b.com' },
      create: { id: '1', email: 'a@b.com' },
    });
  });

  it('createUserWithPassword hashes password', async () => {
    mockUserCreate.mockResolvedValue({ id: '1' });
    await createUserWithPassword('a@b.com', 'hashed');
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: { email: 'a@b.com', password: 'hashed' },
    });
  });
});

describe('Video helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getVideoById filters by id and userId', async () => {
    mockVideoFindFirst.mockResolvedValue({ id: 'v1' });
    await getVideoById('v1', 'u1');
    expect(mockVideoFindFirst).toHaveBeenCalledWith({ where: { id: 'v1', userId: 'u1' } });
  });

  it('getVideosByUser returns ordered videos with counts', async () => {
    mockVideoFindMany.mockResolvedValue([]);
    await getVideosByUser('u1');
    expect(mockVideoFindMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { subtitles: true, renderJobs: true } } },
    });
  });

  it('deleteVideo filters by id and userId', async () => {
    mockVideoDeleteMany.mockResolvedValue({ count: 1 });
    await deleteVideo('v1', 'u1');
    expect(mockVideoDeleteMany).toHaveBeenCalledWith({ where: { id: 'v1', userId: 'u1' } });
  });
});

describe('Subtitle helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getSubtitlesByVideo always scopes by userId', async () => {
    mockSubtitleFindFirst.mockResolvedValue(null);
    await getSubtitlesByVideo('v1', 'u1');
    expect(mockSubtitleFindFirst).toHaveBeenCalledWith({
      where: { videoId: 'v1', video: { userId: 'u1' } },
      orderBy: { updatedAt: 'desc' },
    });
  });
});

describe('RenderJob helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getRenderJob always scopes by userId', async () => {
    mockRenderJobFindFirst.mockResolvedValue({ id: 'j1' });
    await getRenderJob('j1', 'u1');
    expect(mockRenderJobFindFirst).toHaveBeenCalledWith({ where: { id: 'j1', userId: 'u1' } });
  });

  it('getRenderJobInternal reads without userId (worker use)', async () => {
    mockRenderJobFindUnique.mockResolvedValue({ id: 'j1' });
    await getRenderJobInternal('j1');
    expect(mockRenderJobFindUnique).toHaveBeenCalledWith({ where: { id: 'j1' } });
  });

  it('updateRenderJobStatus updates fields', async () => {
    mockRenderJobUpdate.mockResolvedValue({ id: 'j1', status: 'COMPLETED' });
    await updateRenderJobStatus('j1', { status: 'COMPLETED', progress: 100 });
    expect(mockRenderJobUpdate).toHaveBeenCalledWith({
      where: { id: 'j1' },
      data: { status: 'COMPLETED', progress: 100 },
    });
  });

  it('countUserRendersToday filters by userId and today', async () => {
    mockRenderJobCount.mockResolvedValue(5);
    const count = await countUserRendersToday('u1');
    expect(count).toBe(5);
    const callArgs = mockRenderJobCount.mock.calls[0][0];
    expect(callArgs.where.userId).toBe('u1');
    expect(callArgs.where.createdAt.gte).toBeInstanceOf(Date);
  });
});

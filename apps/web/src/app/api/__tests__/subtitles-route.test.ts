import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthUser = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

vi.mock('@/lib/api/validation', () => ({
  sanitizeSubtitleText: (text: string) => text.replace(/<[^>]*>/g, '').slice(0, 500),
}));

const mockGetVideoById = vi.fn();
const mockGetSubtitlesByVideo = vi.fn();
const mockUpsertSubtitle = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  getVideoById: (...args: unknown[]) => mockGetVideoById(...args),
  getSubtitlesByVideo: (...args: unknown[]) => mockGetSubtitlesByVideo(...args),
  upsertSubtitle: (...args: unknown[]) => mockUpsertSubtitle(...args),
}));

const { GET, POST } = await import('../videos/[id]/subtitles/route');

const dbUser = { id: 'user-1', email: 'test@test.com', tier: 'FREE' };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/videos/[id]/subtitles', () => {
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

  it('returns subtitles when found', async () => {
    const subtitle = { id: 's1', content: [{ id: 'c1', text: 'Hi' }], style: null };
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue({ id: 'v1' });
    mockGetSubtitlesByVideo.mockResolvedValue(subtitle);

    const response = await GET(new Request('http://localhost'), makeParams('v1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('s1');
  });

  it('returns empty content when no subtitles', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue({ id: 'v1' });
    mockGetSubtitlesByVideo.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost'), makeParams('v1'));
    const body = await response.json();
    expect(body).toEqual({ content: [], style: null });
  });

  it('passes userId for RLS', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue({ id: 'v1' });
    mockGetSubtitlesByVideo.mockResolvedValue(null);

    await GET(new Request('http://localhost'), makeParams('v1'));
    expect(mockGetSubtitlesByVideo).toHaveBeenCalledWith('v1', 'user-1');
  });
});

describe('POST /api/videos/[id]/subtitles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const response = await POST(makePostRequest({}), makeParams('v1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when video not found', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue(null);
    const response = await POST(
      makePostRequest({ cues: [{ id: 'c1', startTime: 0, endTime: 2, text: 'Hi' }] }),
      makeParams('v1'),
    );
    expect(response.status).toBe(404);
  });

  it('returns 400 for invalid body', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue({ id: 'v1' });
    const response = await POST(makePostRequest({ invalid: true }), makeParams('v1'));
    expect(response.status).toBe(400);
  });

  it('saves subtitles with sanitized text', async () => {
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockGetVideoById.mockResolvedValue({ id: 'v1' });
    mockUpsertSubtitle.mockResolvedValue({ id: 's1' });

    const cues = [{ id: 'c1', startTime: 0, endTime: 2, text: '<b>Hello</b>' }];
    const response = await POST(makePostRequest({ cues }), makeParams('v1'));
    expect(response.status).toBe(200);
    expect(mockUpsertSubtitle).toHaveBeenCalledWith(
      'v1',
      [{ id: 'c1', startTime: 0, endTime: 2, text: 'Hello' }],
      undefined,
    );
  });
});

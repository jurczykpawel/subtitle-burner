import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthUser = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockCountUserRendersToday = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  countUserRendersToday: (...args: unknown[]) => mockCountUserRendersToday(...args),
}));

const { GET } = await import('../user/route');

describe('GET /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns user data when authenticated', async () => {
    const dbUser = {
      id: 'user-1',
      email: 'test@test.com',
      tier: 'FREE',
      createdAt: new Date('2024-01-01'),
    };
    mockGetAuthUser.mockResolvedValue({ dbUser });
    mockCountUserRendersToday.mockResolvedValue(3);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('user-1');
    expect(body.email).toBe('test@test.com');
    expect(body.tier).toBe('FREE');
    expect(body.rendersToday).toBe(3);
  });
});

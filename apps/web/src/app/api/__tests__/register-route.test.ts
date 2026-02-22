import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
vi.mock('@subtitle-burner/database', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
  },
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: () => ({ success: true, remaining: 5 }),
}));

const { POST } = await import('../auth/register/route');

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid email', async () => {
    const response = await POST(makeRequest({ email: 'not-email', password: '123456' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const response = await POST(makeRequest({ email: 'test@test.com', password: '123' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for missing fields', async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it('returns 201 for duplicate email (anti-enumeration)', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' });
    const response = await POST(makeRequest({ email: 'test@test.com', password: '123456' }));
    // Returns 201 to prevent email enumeration - same as success
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    // Should NOT create a new user
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates user and returns 201', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'new-user', email: 'test@test.com' });

    const response = await POST(makeRequest({ email: 'test@test.com', password: 'secure123' }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);

    expect(mockCreate).toHaveBeenCalledWith({
      data: { email: 'test@test.com', password: 'hashed_password' },
    });
  });
});

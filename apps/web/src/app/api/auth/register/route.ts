import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@subtitle-burner/database';
import { z } from 'zod';
import { rateLimit } from '@/lib/api/rate-limit';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  // Rate limit: 3 attempts per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`auth:register:${ip}`, { maxRequests: 3, windowMs: 60_000 });
  if (!rl.success) {
    console.warn(`[auth] Registration rate limited: ip=${ip}`);
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password (min 6 chars)' }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.warn(`[auth] Registration failed (duplicate): email=${email}, ip=${ip}`);
    // Return 201 to prevent email enumeration - log the real reason server-side
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@subtitle-burner/database';
import bcrypt from 'bcryptjs';
import { rateLimit } from './api/rate-limit';

const providers: Provider[] = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials, request) {
      const email = credentials?.email as string | undefined;
      if (!email || !credentials?.password) return null;

      // Rate limit: 5 login attempts per minute per email
      const rl = rateLimit(`auth:login:${email}`, { maxRequests: 5, windowMs: 60_000 });
      if (!rl.success) {
        const ip = request?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
        console.warn(`[auth] Login rate limited: email=${email}, ip=${ip}`);
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.password) {
        console.warn(`[auth] Login failed (user not found): email=${email}`);
        return null;
      }

      const valid = await bcrypt.compare(
        credentials.password as string,
        user.password,
      );

      if (!valid) {
        console.warn(`[auth] Login failed (invalid password): email=${email}`);
        return null;
      }

      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

// Add email/magic link provider only if SMTP is configured.
// Uses dynamic import to avoid pulling in nodemailer (Node.js stream module)
// into edge runtime bundles at compile time.
if (process.env.SMTP_HOST) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Nodemailer = require('next-auth/providers/nodemailer').default;
  providers.push(
    Nodemailer({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@subtitleburner.com',
    }),
  );
}

const useSecureCookies = process.env.NODE_ENV === 'production';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as never),
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 /* 7 days */ },
  providers,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: useSecureCookies ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id! },
          select: { tier: true },
        });
        token.tier = dbUser?.tier ?? 'FREE';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).tier = token.tier;
      }
      return session;
    },
  },
});

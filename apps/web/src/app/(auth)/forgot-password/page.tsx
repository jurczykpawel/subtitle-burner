'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Use email provider to send magic link
    const result = await signIn('nodemailer', {
      email,
      redirect: false,
      callbackUrl: '/dashboard',
    });

    if (result?.error) {
      setError('Magic links require SMTP to be configured. Contact your administrator.');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <h2 className="text-lg font-medium">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a sign-in link to <strong>{email}</strong>
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <p className="text-sm text-muted-foreground">
          We&apos;ll send you a magic link to sign in
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:underline">Back to sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

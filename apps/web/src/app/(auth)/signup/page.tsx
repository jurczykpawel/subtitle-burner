'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Register
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Registration failed');
      setLoading(false);
      return;
    }

    // Auto sign in after registration
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Account created but sign-in failed. Try logging in.');
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="hover:underline">Sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

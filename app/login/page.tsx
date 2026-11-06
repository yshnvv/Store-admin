'use client';

import { useState } from 'react';
import { Button, Input, Card } from '../../components/ui';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        window.location.href = '/';
      } else {
        setError('Invalid username or password');
      }
    } catch {
      setError('Login request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Sign in</h1>
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUsername(e.target.value)
                }
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" loading={loading} variant="primary" className="w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-xs text-gray-500 text-center">
            Protected admin dashboard. Contact your administrator for credentials.
          </p>
        </div>
      </Card>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../components/ui';

export default function AuthBar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/login');
  };

  return <Button onClick={handleLogout} variant="ghost" size="sm">Log out</Button>;
}

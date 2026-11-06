import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const decoded = Buffer.from(session, 'base64').toString('utf-8');
    const [user, pass, role = 'manager'] = decoded.split(':');
    const ADMIN_USER = process.env.ADMIN_USER ?? 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS ?? 'admin';
    const MANAGER_USER = process.env.MANAGER_USER ?? 'manager';
    const MANAGER_PASS = process.env.MANAGER_PASS ?? 'manager';

    let validRole: 'admin' | 'manager' | null = null;
    if (user === ADMIN_USER && pass === ADMIN_PASS) validRole = 'admin';
    else if (user === MANAGER_USER && pass === MANAGER_PASS) validRole = 'manager';

    if (!validRole) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json({ user, role: validRole });
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

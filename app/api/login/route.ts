import { NextResponse } from 'next/server';

const ADMIN_USER = process.env.ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'admin';
const MANAGER_USER = process.env.MANAGER_USER ?? 'manager';
const MANAGER_PASS = process.env.MANAGER_PASS ?? 'manager';

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let role: 'admin' | 'manager' | null = null;
  if (body.username === ADMIN_USER && body.password === ADMIN_PASS) {
    role = 'admin';
  } else if (body.username === MANAGER_USER && body.password === MANAGER_PASS) {
    role = 'manager';
  }

  if (!role) {
    return new NextResponse(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(
    'admin_session',
    Buffer.from(`${body.username}:${body.password}:${role}`).toString('base64'),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }
  );
  return res;
}

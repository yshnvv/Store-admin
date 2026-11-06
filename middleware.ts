import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_USER = process.env.ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'admin';
const MANAGER_USER = process.env.MANAGER_USER ?? 'manager';
const MANAGER_PASS = process.env.MANAGER_PASS ?? 'manager';

/** Routes that require the admin role. */
const ADMIN_ONLY_PREFIXES = ['/stock', '/key-buy', '/fulfillment'];

/**
 * Parse session cookie or Basic auth header into { user, pass, role }.
 * Session cookie format: base64(`${user}:${pass}:${role}`)
 */
function getAuth(req: NextRequest): { user: string; pass: string; role: string } | null {
  const session = req.cookies.get('admin_session')?.value;
  if (session) {
    try {
      const decoded = Buffer.from(session, 'base64').toString('utf-8');
      const [user, pass, role = 'manager'] = decoded.split(':');
      if (user && pass) return { user, pass, role };
    } catch {
      // fall through to Basic auth
    }
  }

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
      const [user, pass, role = 'manager'] = decoded.split(':');
      if (user && pass) return { user, pass, role };
    } catch {
      return null;
    }
  }
  return null;
}

function validate(auth: { user: string; pass: string; role: string }): 'admin' | 'manager' | null {
  if (
    auth.user === ADMIN_USER &&
    auth.pass === ADMIN_PASS
  ) {
    return 'admin';
  }
  if (
    auth.user === MANAGER_USER &&
    auth.pass === MANAGER_PASS
  ) {
    return 'manager';
  }
  return null;
}

function setSessionCookie(
  response: NextResponse,
  user: string,
  pass: string,
  role: string,
): NextResponse {
  response.cookies.set('admin_session', Buffer.from(`${user}:${pass}:${role}`).toString('base64'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public: login page and auth API endpoints.
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const rawAuth = getAuth(request);
  if (!rawAuth) {
    const accept = request.headers.get('accept') ?? '';
    if (pathname.startsWith('/api/') || accept.includes('application/json')) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Basic realm="Admin"',
        },
      });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = validate(rawAuth);
  if (!role) {
    const accept = request.headers.get('accept') ?? '';
    if (pathname.startsWith('/api/') || accept.includes('application/json')) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('denied', '1');
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes: managers are blocked here.
  if (role !== 'admin' && ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    const accept = request.headers.get('accept') ?? '';
    if (pathname.startsWith('/api/') || accept.includes('application/json')) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return NextResponse.redirect(new URL('/?denied=admin_only', request.url));
  }

  // Authorized: refresh the session cookie so it doesn't expire mid-session.
  const response = NextResponse.next();
  if (!request.cookies.get('admin_session')) {
    setSessionCookie(response, rawAuth.user, rawAuth.pass, role);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

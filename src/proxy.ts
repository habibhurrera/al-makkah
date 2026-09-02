import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildContentSecurityPolicy, createNonce } from '@/lib/security/csp';

/**
 * Proxy (this file was `middleware.ts` until Next 16 renamed the convention).
 *
 * It does three things:
 *
 * 1. Issues a per-request CSP nonce and sets the Content-Security-Policy.
 * 2. Refreshes the Supabase auth cookie so sessions do not expire mid-visit.
 * 3. Redirects anonymous visitors away from /admin.
 *
 * Step 3 is a convenience, NOT the security boundary. Every admin query and
 * mutation independently calls requireAdmin() server-side - see src/server/auth.ts.
 * This file alone must never be the only thing standing between a request and
 * privileged data.
 */
export async function proxy(request: NextRequest) {
  // Layouts cannot read the current path directly; expose it as a header so
  // the admin layout can leave the login page reachable while signed out.
  request.headers.set('x-pathname', request.nextUrl.pathname);

  // The nonce goes on the REQUEST as well as the response: Next parses the
  // incoming Content-Security-Policy header during rendering and stamps the
  // nonce onto every script it emits. x-nonce is what our own inline blocks
  // read - see the JSON-LD on the property page.
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV === 'development',
  });
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', csp);

  let response = NextResponse.next({ request });
  response.headers.set('Content-Security-Policy', csp);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase is not configured yet; nothing to refresh and no admin area to
  // protect. Public pages continue to work.
  if (!url || !anonKey) return response;

  /** Cookie writes replace the response object, so headers are re-applied. */
  const withSecurityHeaders = (next: NextResponse) => {
    next.headers.set('Content-Security-Policy', csp);
    return next;
  };

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = withSecurityHeaders(NextResponse.next({ request }));
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin/login';

  if (isAdminArea && !isLoginPage && !user) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};

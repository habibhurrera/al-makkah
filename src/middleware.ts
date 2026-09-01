import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware does two things:
 *
 * 1. Refreshes the Supabase auth cookie so sessions do not expire mid-visit.
 * 2. Redirects anonymous visitors away from /admin.
 *
 * Step 2 is a convenience, NOT the security boundary. Every admin query and
 * mutation independently calls requireAdmin() server-side - see src/server/auth.ts.
 * Middleware alone must never be the only thing standing between a request and
 * privileged data.
 */
export async function middleware(request: NextRequest) {
  // Layouts cannot read the current path directly; expose it as a header so
  // the admin layout can leave the login page reachable while signed out.
  request.headers.set('x-pathname', request.nextUrl.pathname);

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase is not configured yet; nothing to refresh and no admin area to
  // protect. Public pages continue to work.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
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
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};

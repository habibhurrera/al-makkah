import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdmin } from '@/server/auth';
import { signOut } from '@/server/actions/auth';
import { Container } from '@/components/ui/layout';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// Admin pages must never be cached or statically rendered - every request
// re-checks who is asking.
export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/submissions', label: 'Submissions' },
  { href: '/admin/properties', label: 'Properties' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/settings', label: 'Settings' },
] as const;

export default async function AdminLayout({
  children,
}: LayoutProps<'/admin'>) {
  // The login page lives under /admin but must stay reachable when signed out.
  const pathname = (await headers()).get('x-pathname') ?? '';
  const isLoginPage = pathname.endsWith('/admin/login');

  const admin = await getAdmin();

  // The real gate. Middleware only redirects anonymous visitors; this checks
  // that the signed-in user is an active admin, on every single page load.
  if (!admin && !isLoginPage) redirect('/admin/login');

  if (!admin) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-surface-sunken">
      <header className="bg-surface border-b border-border">
        <Container>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
            <Link href="/admin" className="font-display text-lg">
              {BRAND.name}{' '}
              <span className="text-text-muted text-sm">admin</span>
            </Link>

            <nav aria-label="Admin" className="flex flex-wrap gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm rounded-md text-text-muted hover:text-text hover:bg-surface-sunken"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm text-text-muted hidden sm:inline">
                {admin.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm text-text-muted hover:text-text underline underline-offset-4"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </Container>
      </header>

      <main className="flex-1 py-8">
        <Container>{children}</Container>
      </main>
    </div>
  );
}

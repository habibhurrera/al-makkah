import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/layout';
import { Card, CardBody } from '@/components/ui/card';
import { LoginForm } from '@/components/admin/login-form';
import { getAdmin } from '@/server/auth';
import { BRAND } from '@/lib/brand';

// Never indexed. robots.txt also disallows /admin.
export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLoginPage() {
  // Already signed in as a real admin? Skip the form.
  const admin = await getAdmin();
  if (admin) redirect('/admin');

  return (
    <Container className="py-20 max-w-md">
      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-display text-2xl">{BRAND.name}</span>
            <span className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Staff sign in
            </span>
          </div>
          <LoginForm />
        </CardBody>
      </Card>
      <p className="text-sm text-text-subtle mt-6">
        Accounts are created by an administrator. There is no public registration.
      </p>
    </Container>
  );
}

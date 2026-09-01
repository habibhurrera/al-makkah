import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { getDashboardStats } from '@/server/queries/admin';

export const metadata = { title: 'Dashboard' };

function Stat({
  label,
  value,
  href,
  emphasis,
}: {
  label: string;
  value: number;
  href?: string;
  emphasis?: boolean;
}) {
  const body = (
    <Card interactive={!!href} className="h-full">
      <CardBody className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
          {label}
        </span>
        <span
          className={`font-display text-3xl ${
            emphasis && value > 0 ? 'text-accent' : ''
          }`}
        >
          {value}
        </span>
      </CardBody>
    </Card>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboard() {
  // Every figure below is a live database count - nothing is estimated.
  const stats = await getDashboardStats();

  const needsAttention =
    stats.newSubmissions + stats.newLeads + stats.pendingVerification;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-text-muted">
          {needsAttention === 0
            ? 'Nothing waiting on you.'
            : `${needsAttention} ${needsAttention === 1 ? 'item needs' : 'items need'} your attention.`}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.14em] text-text-muted">
          Needs attention
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="New submissions"
            value={stats.newSubmissions}
            href="/admin/submissions"
            emphasis
          />
          <Stat label="New leads" value={stats.newLeads} href="/admin/leads" emphasis />
          <Stat
            label="Awaiting verification"
            value={stats.pendingVerification}
            href="/admin/properties"
            emphasis
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.14em] text-text-muted">
          Listings
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Total" value={stats.totalProperties} href="/admin/properties" />
          <Stat label="For sale" value={stats.forSale} />
          <Stat label="For rent" value={stats.forRent} />
          <Stat label="Sold" value={stats.sold} />
          <Stat label="Rented" value={stats.rented} />
        </div>
      </section>

      {stats.totalProperties === 0 && (
        <Card>
          <CardBody className="flex flex-col gap-2">
            <h2 className="font-display text-xl">No listings yet</h2>
            <p className="text-text-muted text-sm max-w-[60ch]">
              Properties reach the site in one of two ways: someone submits one
              through the Sell page and you approve it, or you create one
              directly. Approving a submission creates a draft — it is not
              published until you publish it.
            </p>
            <div className="flex gap-3 pt-2">
              <Link
                href="/admin/submissions"
                className="text-sm font-medium text-accent underline underline-offset-4"
              >
                Review submissions
              </Link>
              <Link
                href="/admin/settings"
                className="text-sm font-medium text-accent underline underline-offset-4"
              >
                Add contact details
              </Link>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

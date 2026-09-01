import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { LeadActions } from '@/components/admin/lead-actions';
import { listLeads } from '@/server/queries/admin';

export const metadata = { title: 'Leads' };

const FILTERS = [
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ALL', label: 'All' },
] as const;

export default async function LeadsPage({
  searchParams,
}: PageProps<'/admin/leads'>) {
  const { status } = await searchParams;
  const active = typeof status === 'string' ? status : 'NEW';
  const leads = await listLeads(active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Leads</h1>
        <p className="text-text-muted">
          Every enquiry from the website — buyers, renters, sellers and contact
          messages.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/leads?status=${filter.value}`}
            aria-current={active === filter.value ? 'page' : undefined}
            className={
              active === filter.value
                ? 'px-3 py-2 text-sm rounded-md bg-accent text-accent-text'
                : 'px-3 py-2 text-sm rounded-md border border-border bg-surface hover:bg-surface-sunken'
            }
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <EmptyState
          title="No leads"
          description="Enquiries sent from property pages and the contact form appear here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={lead.status === 'NEW' ? 'warning' : 'neutral'}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
                      <Badge tone="neutral">{lead.kind}</Badge>
                    </div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-text-muted">
                      {lead.phone}
                      {lead.email ? ` · ${lead.email}` : ''}
                    </p>
                    <p className="text-xs text-text-subtle">
                      {lead.createdAt.toLocaleString('en-GB')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm text-accent underline underline-offset-4"
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/\D/g, '').replace(/^0/, '92')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent underline underline-offset-4"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>

                {lead.property && (
                  <p className="text-sm">
                    About:{' '}
                    <Link
                      href={`/property/${lead.property.slug}`}
                      target="_blank"
                      className="text-accent underline underline-offset-4"
                    >
                      {lead.property.title} ({lead.property.refNo})
                    </Link>
                  </p>
                )}

                {lead.message && (
                  <p className="text-sm text-text-muted whitespace-pre-line border-l-2 border-border pl-4">
                    {lead.message}
                  </p>
                )}

                <LeadActions inquiryId={lead.id} currentStatus={lead.status} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

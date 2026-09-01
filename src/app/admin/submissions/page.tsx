import Link from 'next/link';
import { EmptyState } from '@/components/ui/states';
import { SubmissionReview } from '@/components/admin/submission-review';
import { getAreaOptions, listSubmissions } from '@/server/queries/admin';

export const metadata = { title: 'Submissions' };

const FILTERS = [
  { value: 'SUBMITTED', label: 'New' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
] as const;

export default async function SubmissionsPage({
  searchParams,
}: PageProps<'/admin/submissions'>) {
  const { status } = await searchParams;
  const active = typeof status === 'string' ? status : 'SUBMITTED';

  const [submissions, areas] = await Promise.all([
    listSubmissions(active),
    getAreaOptions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Submissions</h1>
        <p className="text-text-muted">
          Properties sent in through the Sell page. Nothing here is public.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/submissions?status=${filter.value}`}
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

      {submissions.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description="Property submissions from the public Sell page will appear here for review."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {submissions.map((submission) => (
            <SubmissionReview
              key={submission.id}
              areas={areas}
              submission={{
                ...submission,
                expectedPrice: submission.expectedPrice
                  ? Number(submission.expectedPrice)
                  : null,
                areaValue: submission.areaValue ? Number(submission.areaValue) : null,
                createdAt: submission.createdAt.toISOString(),
                mediaCount: submission.mediaPaths.length,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

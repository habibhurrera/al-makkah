'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import {
  approveSubmission,
  rejectSubmission,
  type ActionResult,
} from '@/server/actions/admin';
import { formatArea, formatPkr } from '@/lib/units';
import { PROPERTY_TYPE_LABEL } from '@/types/property';
import type { AreaUnit, PropertyType, Purpose } from '@/generated/prisma';

export type SubmissionView = {
  id: string;
  status: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string | null;
  preferredContact: string | null;
  type: PropertyType;
  purpose: Purpose;
  addressLine: string | null;
  expectedPrice: number | null;
  areaValue: number | null;
  areaUnit: AreaUnit | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  mediaCount: number;
  rejectionReason: string | null;
  convertedPropertyId: string | null;
  createdAt: string;
  areaId: string | null;
};

const STATUS_TONE = {
  SUBMITTED: 'warning',
  UNDER_REVIEW: 'warning',
  VERIFICATION: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
} as const;

export function SubmissionReview({
  submission,
  areas,
}: {
  submission: SubmissionView;
  areas: { id: string; name: string }[];
}) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [approveState, approveAction, approving] = useActionState<
    ActionResult | null,
    FormData
  >(approveSubmission, null);
  const [rejectState, rejectAction, rejecting] = useActionState<
    ActionResult | null,
    FormData
  >(rejectSubmission, null);

  const result = approveState ?? rejectState;
  const isClosed =
    submission.status === 'APPROVED' || submission.status === 'REJECTED';

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  STATUS_TONE[submission.status as keyof typeof STATUS_TONE] ??
                  'neutral'
                }
              >
                {submission.status.replace('_', ' ')}
              </Badge>
              <Badge tone="neutral">{PROPERTY_TYPE_LABEL[submission.type]}</Badge>
              <Badge tone="neutral">
                {submission.purpose === 'RENT' ? 'To rent out' : 'To sell'}
              </Badge>
            </div>
            <p className="font-display text-xl">
              {submission.sellerName} · {submission.sellerPhone}
            </p>
            <p className="text-sm text-text-muted">
              Submitted {new Date(submission.createdAt).toLocaleString('en-GB')}
              {submission.preferredContact
                ? ` · prefers ${submission.preferredContact.toLowerCase()}`
                : ''}
            </p>
          </div>
          <a
            href={`tel:${submission.sellerPhone}`}
            className="text-sm text-accent underline underline-offset-4"
          >
            Call seller
          </a>
        </div>

        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-text-muted">Size</dt>
            <dd className="font-medium">
              {submission.areaValue && submission.areaUnit
                ? formatArea(submission.areaValue, submission.areaUnit)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Expected price</dt>
            <dd className="font-medium">
              {submission.expectedPrice ? formatPkr(submission.expectedPrice) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Rooms</dt>
            <dd className="font-medium">
              {[
                submission.bedrooms !== null && `${submission.bedrooms} bed`,
                submission.bathrooms !== null && `${submission.bathrooms} bath`,
                submission.floors !== null && `${submission.floors} floor`,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Address given</dt>
            <dd className="font-medium">{submission.addressLine ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Location pin</dt>
            <dd className="font-medium">
              {submission.latitude && submission.longitude ? (
                <a
                  className="text-accent underline underline-offset-4"
                  href={`https://www.google.com/maps?q=${submission.latitude},${submission.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Maps
                </a>
              ) : (
                'Not shared'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Files uploaded</dt>
            <dd className="font-medium">{submission.mediaCount}</dd>
          </div>
        </dl>

        {submission.description && (
          <div className="text-sm text-text-muted whitespace-pre-line border-l-2 border-border pl-4">
            {submission.description}
          </div>
        )}

        {submission.rejectionReason && (
          <p className="text-sm text-danger-500">
            Rejected: {submission.rejectionReason}
          </p>
        )}

        {result && (
          <p
            role="status"
            className={`text-sm ${result.ok ? 'text-success-500' : 'text-danger-500'}`}
          >
            {result.message}
          </p>
        )}

        {!isClosed && mode === 'idle' && (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setMode('approve')}>Approve and create listing</Button>
            <Button variant="secondary" onClick={() => setMode('reject')}>
              Reject
            </Button>
          </div>
        )}

        {mode === 'approve' && (
          <form action={approveAction} className="flex flex-col gap-4 border-t border-border pt-5">
            <input type="hidden" name="submissionId" value={submission.id} />
            <p className="text-sm text-text-muted">
              This creates a <strong>draft</strong> listing. It is not published
              until you publish it from Properties.
            </p>

            <Field id={`t-${submission.id}`} label="Listing title" required>
              {(p) => (
                <Input
                  {...p}
                  name="title"
                  defaultValue={`${submission.bedrooms ? `${submission.bedrooms} Bedroom ` : ''}${PROPERTY_TYPE_LABEL[submission.type]}`}
                />
              )}
            </Field>

            <Field id={`d-${submission.id}`} label="Description" required>
              {(p) => (
                <Textarea {...p} name="description" rows={4} defaultValue={submission.description ?? ''} />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`p-${submission.id}`} label="Price (PKR)" required>
                {(p) => (
                  <Input
                    {...p}
                    name="price"
                    type="number"
                    min={0}
                    defaultValue={submission.expectedPrice ?? ''}
                  />
                )}
              </Field>
              <Field id={`a-${submission.id}`} label="Area" required>
                {(p) => (
                  <Select {...p} name="areaId" defaultValue={submission.areaId ?? ''}>
                    <option value="">Choose an area</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="flex gap-3">
              <Button type="submit" aria-busy={approving} disabled={approving}>
                {approving ? 'Creating…' : 'Create draft listing'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode('idle')}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {mode === 'reject' && (
          <form action={rejectAction} className="flex flex-col gap-4 border-t border-border pt-5">
            <input type="hidden" name="submissionId" value={submission.id} />
            <Field
              id={`r-${submission.id}`}
              label="Reason for rejection"
              hint="Recorded against the submission for your own reference."
              required
            >
              {(p) => <Textarea {...p} name="reason" rows={3} />}
            </Field>
            <div className="flex gap-3">
              <Button type="submit" aria-busy={rejecting} disabled={rejecting}>
                {rejecting ? 'Saving…' : 'Confirm rejection'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode('idle')}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Textarea } from '@/components/ui/field';
import {
  saveVerification,
  setPropertyStatus,
  toggleFeatured,
  type ActionResult,
} from '@/server/actions/admin';
import { formatArea, formatPkr, formatRent } from '@/lib/units';
import { PROPERTY_TYPE_LABEL } from '@/types/property';
import type { AreaUnit, PropertyType, Purpose } from '@/generated/prisma';

export type AdminPropertyView = {
  id: string;
  refNo: string;
  slug: string;
  title: string;
  purpose: Purpose;
  type: PropertyType;
  price: number;
  areaValue: number;
  areaUnit: AreaUnit;
  status: string;
  verificationStatus: string;
  isFeatured: boolean;
  areaName: string;
  mediaCount: number;
  inquiryCount: number;
};

const CHECKS = [
  ['ownershipChecked', 'Ownership documents seen', true],
  ['locationChecked', 'Location confirmed', true],
  ['priceConfirmed', 'Price confirmed with owner', true],
  ['documentsChecked', 'Supporting documents checked', false],
  ['mediaChecked', 'Photos and video checked', false],
  ['siteVisited', 'Site visited', false],
] as const;

export function PropertyRow({ property }: { property: AdminPropertyView }) {
  const [panel, setPanel] = useState<'none' | 'verify'>('none');
  const [statusState, statusAction, statusPending] = useActionState<
    ActionResult | null,
    FormData
  >(setPropertyStatus, null);
  const [featureState, featureAction] = useActionState<ActionResult | null, FormData>(
    toggleFeatured,
    null,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState<
    ActionResult | null,
    FormData
  >(saveVerification, null);

  const result = statusState ?? featureState ?? verifyState;
  const isPublished = property.status === 'PUBLISHED';
  const isVerified = property.verificationStatus === 'VERIFIED';

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isPublished ? 'success' : 'neutral'}>
                {property.status.replace('_', ' ')}
              </Badge>
              <Badge tone={isVerified ? 'success' : 'warning'}>
                {isVerified ? 'Verified' : 'Not verified'}
              </Badge>
              {property.isFeatured && <Badge tone="accent">Featured</Badge>}
              <span className="text-xs text-text-subtle">{property.refNo}</span>
            </div>
            <p className="font-display text-xl">{property.title}</p>
            <p className="text-sm text-text-muted">
              {property.areaName} ·{' '}
              {property.purpose === 'RENT'
                ? formatRent(property.price)
                : formatPkr(property.price)}{' '}
              · {formatArea(property.areaValue, property.areaUnit)} ·{' '}
              {PROPERTY_TYPE_LABEL[property.type]}
            </p>
            <p className="text-xs text-text-subtle">
              {property.mediaCount} media · {property.inquiryCount} enquiries
            </p>
          </div>

          {isPublished && (
            <Link
              href={`/property/${property.slug}`}
              target="_blank"
              className="text-sm text-accent underline underline-offset-4"
            >
              View live
            </Link>
          )}
        </div>

        {property.mediaCount === 0 && isPublished && (
          <p className="text-sm text-warning-500">
            This listing is live with no photos. Buyers skip listings without images.
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

        <div className="flex flex-wrap gap-2">
          <form action={statusAction}>
            <input type="hidden" name="propertyId" value={property.id} />
            <input
              type="hidden"
              name="status"
              value={isPublished ? 'ARCHIVED' : 'PUBLISHED'}
            />
            <Button
              type="submit"
              size="sm"
              variant={isPublished ? 'secondary' : 'primary'}
              aria-busy={statusPending}
            >
              {isPublished ? 'Unpublish' : 'Publish'}
            </Button>
          </form>

          <form action={featureAction}>
            <input type="hidden" name="propertyId" value={property.id} />
            <Button type="submit" size="sm" variant="secondary">
              {property.isFeatured ? 'Unfeature' : 'Feature'}
            </Button>
          </form>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPanel(panel === 'verify' ? 'none' : 'verify')}
          >
            {isVerified ? 'Edit verification' : 'Verify'}
          </Button>

          {isPublished && (
            <form action={statusAction}>
              <input type="hidden" name="propertyId" value={property.id} />
              <input
                type="hidden"
                name="status"
                value={property.purpose === 'RENT' ? 'RENTED' : 'SOLD'}
              />
              <Button type="submit" size="sm" variant="ghost">
                Mark {property.purpose === 'RENT' ? 'rented' : 'sold'}
              </Button>
            </form>
          )}
        </div>

        {panel === 'verify' && (
          <form action={verifyAction} className="flex flex-col gap-4 border-t border-border pt-4">
            <input type="hidden" name="propertyId" value={property.id} />
            <p className="text-sm text-text-muted max-w-[60ch]">
              The verified badge appears only when ownership, location and price
              are all confirmed. The other checks are recorded and shown on the
              listing, but do not by themselves grant the badge.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHECKS.map(([name, label, required]) => (
                <label key={name} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={name} value="true" className="size-4" />
                  {label}
                  {required && (
                    <span className="text-xs text-text-subtle">(required)</span>
                  )}
                </label>
              ))}
            </div>
            <Field id={`n-${property.id}`} label="Internal notes">
              {(p) => <Textarea {...p} name="notes" rows={2} />}
            </Field>
            <div className="flex gap-3">
              <Button type="submit" size="sm" aria-busy={verifyPending}>
                {verifyPending ? 'Saving…' : 'Save verification'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPanel('none')}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

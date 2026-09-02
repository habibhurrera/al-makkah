import { Card, CardBody } from '@/components/ui/card';
import { whatsappNumber, type SiteSettings } from '@/server/queries/settings';
import { InquiryForm } from '@/components/forms/inquiry-form';
import { siteUrl } from '@/lib/env';
import type { Purpose } from '@/generated/prisma';

/**
 * Contact panel on a property page.
 *
 * Every channel routes to the agency itself - there are no agent accounts, so
 * the numbers come from SiteSetting. Any channel with no number configured is
 * hidden rather than rendered as a dead link.
 */
export function PropertyContact({
  propertyId,
  refNo,
  title,
  purpose,
  settings,
}: {
  propertyId: string;
  refNo: string;
  title: string;
  purpose: Purpose;
  settings: SiteSettings;
}) {
  const whatsapp = whatsappNumber(settings.whatsapp ?? settings.phone);

  // Pre-filled so the agency knows which listing the message is about.
  const whatsappText = encodeURIComponent(
    `Assalam o Alaikum, I am interested in ${title} (Ref ${refNo}).\n${siteUrl}/property/${refNo ? '' : ''}`.trim(),
  );

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl">Contact us</h2>
          <p className="text-sm text-text-muted">
            Ask about this property or arrange a viewing.
          </p>
        </div>

        {(settings.phone || whatsapp) && (
          <div className="flex flex-col gap-2">
            {settings.phone && (
              <a
                href={`tel:${settings.phone.replace(/\s/g, '')}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-text hover:bg-accent-hover"
              >
                Call {settings.phone}
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border-strong px-5 text-sm font-medium hover:bg-surface-sunken"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.7 15l-1.3 5 5.1-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5-.3.3c-.1.1-.2.3 0 .5.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.8-.9c.2-.2.3-.2.5-.1l2 1c.2.1.4.2.4.3.1.1.1.6-.1 1.3z" />
                </svg>
                WhatsApp
              </a>
            )}
          </div>
        )}

        {!settings.phone && !whatsapp && (
          <p className="text-sm text-text-subtle border-l-2 border-border pl-3">
            Contact numbers have not been added yet. Use the form below and
            We will get back to you.
          </p>
        )}

        <div className="border-t border-border pt-5">
          <InquiryForm
            propertyId={propertyId}
            kind={purpose === 'RENT' ? 'RENT' : 'BUY'}
            compact
          />
        </div>
      </CardBody>
    </Card>
  );
}

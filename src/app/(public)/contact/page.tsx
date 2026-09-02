import type { Metadata } from 'next';
import { Container, Section, SectionHeading } from '@/components/ui/layout';
import { Card, CardBody } from '@/components/ui/card';
import { InquiryForm } from '@/components/forms/inquiry-form';
import { getSiteSettings, whatsappNumber } from '@/server/queries/settings';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Talk to us about buying, selling or renting property in ${BRAND.city}.`,
};

/**
 * Contact page.
 *
 * Every channel is optional. Until an admin fills in Settings there is no
 * phone number, WhatsApp or address to show - so the page leads with the form,
 * which always works, and reveals the direct channels as they are configured.
 * A dead "call us" link is worse than no link at all.
 */
function Detail({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-border last:border-0">
      <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
        {label}
      </span>
      {href ? (
        <a href={href} className="font-medium underline underline-offset-4">
          {value}
        </a>
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </div>
  );
}

export default async function Page() {
  const settings = await getSiteSettings();
  const whatsapp = whatsappNumber(settings.whatsapp);

  const hasDirectChannel = Boolean(
    settings.phone || whatsapp || settings.email || settings.officeAddress,
  );

  return (
    <Section>
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="Contact"
          title="Talk to us"
          description={`Ask about a property, arrange a viewing, or tell us what you are looking for in ${BRAND.city}.`}
        />

        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <Card>
            <CardBody className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-2xl">Send a message</h2>
                <p className="text-sm text-text-muted">
                  Tell us what you need and we will get back to you.
                </p>
              </div>
              <InquiryForm kind="CONTACT" showKindSelect />
            </CardBody>
          </Card>

          <aside className="flex flex-col gap-4">
            <h2 className="font-display text-2xl">Direct</h2>

            {hasDirectChannel ? (
              <div className="flex flex-col">
                <Detail
                  label="Phone"
                  value={settings.phone}
                  href={settings.phone ? `tel:${settings.phone.replace(/\s/g, '')}` : undefined}
                />
                <Detail
                  label="WhatsApp"
                  value={settings.whatsapp}
                  href={whatsapp ? `https://wa.me/${whatsapp}` : undefined}
                />
                <Detail
                  label="Email"
                  value={settings.email}
                  href={settings.email ? `mailto:${settings.email}` : undefined}
                />
                <Detail label="Office" value={settings.officeAddress} />
              </div>
            ) : (
              <p className="text-sm text-text-muted border-l-2 border-border pl-4">
                Direct contact details have not been added yet. Use the form and
                we will reply to the phone number or email you leave.
              </p>
            )}
          </aside>
        </div>
      </Container>
    </Section>
  );
}

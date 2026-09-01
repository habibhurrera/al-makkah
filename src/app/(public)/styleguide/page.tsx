import type { Metadata } from 'next';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import {
  EmptyState,
  ErrorState,
  PropertyCardSkeleton,
} from '@/components/ui/states';
import { Container, Section, SectionHeading } from '@/components/ui/layout';
import { AREA_UNIT_LABEL, AREA_UNIT_ORDER, formatArea, formatPkr, formatRent } from '@/lib/units';

// Internal review page. Never indexed, never linked from the public site.
export const metadata: Metadata = {
  title: 'Design system',
  robots: { index: false, follow: false },
};

// Written out in full rather than generated: Tailwind scans source text, so
// a template literal like `bg-brand-${step}` produces no CSS at all.
const brandScale = [
  ['brand-50', 'bg-brand-50'],
  ['brand-100', 'bg-brand-100'],
  ['brand-200', 'bg-brand-200'],
  ['brand-300', 'bg-brand-300'],
  ['brand-400', 'bg-brand-400'],
  ['brand-500', 'bg-brand-500'],
  ['brand-600', 'bg-brand-600'],
  ['brand-700', 'bg-brand-700'],
  ['brand-800', 'bg-brand-800'],
  ['brand-900', 'bg-brand-900'],
] as const;

const inkScale = [
  ['ink-50', 'bg-ink-50'],
  ['ink-100', 'bg-ink-100'],
  ['ink-200', 'bg-ink-200'],
  ['ink-300', 'bg-ink-300'],
  ['ink-400', 'bg-ink-400'],
  ['ink-500', 'bg-ink-500'],
  ['ink-600', 'bg-ink-600'],
  ['ink-700', 'bg-ink-700'],
  ['ink-800', 'bg-ink-800'],
  ['ink-900', 'bg-ink-900'],
  ['ink-950', 'bg-ink-950'],
] as const;

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 rounded-md border border-border ${className}`} />
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 py-8 border-b border-border last:border-0">
      <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main>
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Internal"
            title="AL-MAKKAH design system"
            description="Every colour and typeface below is a placeholder until the real branding is supplied. Components read semantic tokens, so a rebrand changes one file."
          />
        </Container>
      </Section>

      <Container className="pb-24">
        <Row title="Brand scale — placeholder">
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {brandScale.map(([label, className]) => (
              <Swatch key={label} label={label} className={className} />
            ))}
          </div>
        </Row>

        <Row title="Neutral scale">
          <div className="grid grid-cols-6 md:grid-cols-11 gap-3">
            {inkScale.map(([label, className]) => (
              <Swatch key={label} label={label} className={className} />
            ))}
          </div>
        </Row>

        <Row title="Semantic tokens">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Swatch label="surface" className="bg-surface" />
            <Swatch label="surface-sunken" className="bg-surface-sunken" />
            <Swatch label="surface-inverse" className="bg-surface-inverse" />
            <Swatch label="accent" className="bg-accent" />
            <Swatch label="accent-subtle" className="bg-accent-subtle" />
            <Swatch label="border" className="bg-border" />
          </div>
        </Row>

        <Row title="Typography">
          <div className="flex flex-col gap-4">
            <p className="font-display text-5xl text-balance">
              Building Dreams. Finding Homes.
            </p>
            <p className="font-display text-4xl">Display 4xl — section titles</p>
            <p className="font-display text-3xl">Display 3xl</p>
            <p className="text-xl">Sans xl — lead paragraph</p>
            <p className="text-base max-w-[68ch]">
              Sans base — the reading size for property descriptions. Line height
              is set to 1.65 so a long description stays comfortable to read on a
              phone as well as on a desktop listing page.
            </p>
            <p className="text-sm text-text-muted">Sans sm — metadata, captions</p>
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
              Sans xs — eyebrows and labels
            </p>
          </div>
        </Row>

        <Row title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Find a Property</Button>
            <Button variant="secondary">Talk to AL-MAKKAH</Button>
            <Button variant="ghost">Clear filters</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="primary" aria-busy="true">
              Submitting…
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <ButtonLink href="/styleguide" variant="secondary">
              Link styled as button
            </ButtonLink>
          </div>
          <div className="bg-surface-inverse p-5 rounded-lg flex flex-wrap gap-3">
            <Button variant="inverse">Explore Properties</Button>
            <span className="text-text-inverse text-sm self-center">
              inverse — for use over the 3D hero
            </span>
          </div>
        </Row>

        <Row title="Badges">
          <div className="flex flex-wrap items-center gap-3">
            <VerifiedBadge isVerified />
            <Badge tone="accent">Featured</Badge>
            <Badge tone="neutral">Plot</Badge>
            <Badge tone="warning">Pending verification</Badge>
            <Badge tone="danger">Rejected</Badge>
          </div>
          <p className="text-sm text-text-muted max-w-[68ch]">
            VerifiedBadge renders nothing when passed false — there is no way to
            display it without a backing verification record.
          </p>
        </Row>

        <Row title="Cards">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Card interactive>
              <div className="aspect-[4/3] bg-surface-sunken flex items-center justify-center text-text-subtle text-sm">
                property image
              </div>
              <CardBody>
                <div className="flex flex-col gap-2">
                  <VerifiedBadge isVerified />
                  <p className="font-display text-xl">5 Bedroom House</p>
                  <p className="text-sm text-text-muted">Latifabad, Hyderabad</p>
                  <p className="text-lg font-medium">{formatPkr(45_000_000)}</p>
                  <p className="text-sm text-text-muted">
                    5 Beds · 5 Baths · {formatArea(500, 'SQ_YD')}
                  </p>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-text-muted">Monthly rent</p>
                <p className="text-lg font-medium">{formatRent(85_000)}</p>
              </CardBody>
            </Card>
            <PropertyCardSkeleton />
          </div>
        </Row>

        <Row title="Form controls">
          <div className="grid gap-5 md:grid-cols-2 max-w-3xl">
            <Field id="sg-name" label="Full name" required>
              {(p) => <Input {...p} placeholder="Enter your name" />}
            </Field>
            <Field id="sg-phone" label="Phone" hint="We reply on WhatsApp too.">
              {(p) => <Input {...p} type="tel" placeholder="03xx xxxxxxx" />}
            </Field>
            <Field id="sg-unit" label="Area unit">
              {(p) => (
                <Select {...p} defaultValue="SQ_YD">
                  {AREA_UNIT_ORDER.map((unit) => (
                    <option key={unit} value={unit}>
                      {AREA_UNIT_LABEL[unit]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field id="sg-price" label="Expected price" error="Enter a valid amount.">
              {(p) => <Input {...p} invalid defaultValue="abc" />}
            </Field>
            <Field id="sg-msg" label="Message" className="md:col-span-2">
              {(p) => <Textarea {...p} placeholder="Tell us about the property" />}
            </Field>
          </div>
        </Row>

        <Row title="Empty and error states">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="border border-border rounded-lg">
              <EmptyState
                title="No properties match these filters"
                description="Try widening the price range or clearing the area filter."
                action={<Button variant="secondary">Clear filters</Button>}
              />
            </div>
            <div className="border border-border rounded-lg">
              <ErrorState
                description="We couldn't load listings just now. Please try again."
                action={<Button variant="secondary">Retry</Button>}
              />
            </div>
          </div>
        </Row>
      </Container>
    </main>
  );
}

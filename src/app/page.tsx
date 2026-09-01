import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Container, Section, SectionHeading } from '@/components/ui/layout';
import { PropertyCard } from '@/components/property/property-card';
import { HYDERABAD_AREA_GROUPS } from '@/lib/hyderabad-areas';
import {
  BUYER_STEPS,
  PLACEHOLDER_ABOUT,
  SAMPLE_PROPERTIES,
  SELLER_STEPS,
  TESTIMONIALS,
  WHY_AL_MAKKAH,
} from '@/lib/placeholder-content';

/**
 * Homepage.
 *
 * The hero is a static placeholder for the scroll-driven 3D construction
 * sequence built in a later phase. All copy comes from lib/placeholder-content
 * and is marked as placeholder on the page itself.
 */

const CATEGORIES = [
  {
    label: 'Buy',
    href: '/buy',
    description: 'Houses and plots for sale across Hyderabad.',
    detail: 'Houses · Plots',
  },
  {
    label: 'Sell',
    href: '/sell',
    description: 'List your property with AL-MAKKAH and reach real buyers.',
    detail: 'Houses · Plots',
  },
  {
    label: 'Rent',
    href: '/rent',
    description: 'Homes to rent, from flats and portions to full bungalows.',
    detail: 'Houses · Bungalows · Flats · Portions',
  },
] as const;

function PlaceholderNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-text-subtle border-l-2 border-border pl-4">
      {children}
    </p>
  );
}

function Steps({
  items,
}: {
  items: readonly { step: string; body: string }[];
}) {
  return (
    <ol className="flex flex-col gap-5">
      {items.map((item, index) => (
        <li key={item.step} className="flex gap-4">
          <span
            aria-hidden="true"
            className="shrink-0 size-8 grid place-items-center rounded-sm border border-border text-sm text-text-muted"
          >
            {index + 1}
          </span>
          <span className="flex flex-col gap-0.5 pt-1">
            <span className="font-medium">{item.step}</span>
            <span className="text-sm text-text-muted">{item.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function HomePage() {
  return (
    <main>
      {/* Placeholder for the 3D hero built in a later phase. */}
      <section className="bg-surface-inverse text-text-inverse">
        <Container>
          <div className="min-h-[70vh] flex flex-col justify-center gap-8 py-20">
            <div className="flex flex-col gap-5 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.22em] text-ink-400">
                Hyderabad, Sindh
              </p>
              <h1 className="font-display text-4xl md:text-5xl text-balance">
                Building Dreams. Finding Homes.
              </h1>
              <p className="text-lg text-ink-300 max-w-[46ch] text-pretty">
                Buy, sell and rent property across Hyderabad with a company that
                verifies what it lists.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/buy" variant="inverse" size="lg">
                Explore Properties
              </ButtonLink>
              <ButtonLink
                href="/sell"
                size="lg"
                className="border border-ink-700 text-text-inverse hover:bg-ink-800 bg-transparent"
              >
                Sell Your Property
              </ButtonLink>
            </div>
            <p className="text-xs text-ink-500 pt-4">
              Placeholder hero — the scroll-driven 3D construction sequence is
              built in a later phase.
            </p>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- about */}
      <Section>
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-5">
            <SectionHeading
              eyebrow={PLACEHOLDER_ABOUT.eyebrow}
              title={PLACEHOLDER_ABOUT.title}
            />
            {PLACEHOLDER_ABOUT.body.map((paragraph) => (
              <p key={paragraph} className="text-text-muted max-w-[var(--measure)]">
                {paragraph}
              </p>
            ))}
            <PlaceholderNote>
              Placeholder copy — replaced by AL-MAKKAH’s own company description.
            </PlaceholderNote>
          </div>
          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1 lg:content-start">
            {PLACEHOLDER_ABOUT.pillars.map((pillar) => (
              <Card key={pillar.title}>
                <CardBody className="flex flex-col gap-2">
                  <h3 className="font-display text-xl">{pillar.title}</h3>
                  <p className="text-sm text-text-muted">{pillar.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ----------------------------------------------------------- categories */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="What are you looking for"
            title="One property engine, three ways in"
            description="Whether you are buying, selling or renting, it is the same verified listing database behind it."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {CATEGORIES.map((category) => (
              <Link key={category.href} href={category.href} className="group">
                <Card interactive className="h-full">
                  <CardBody className="flex flex-col gap-3 h-full">
                    <span className="text-xs uppercase tracking-[0.16em] text-text-muted">
                      {category.detail}
                    </span>
                    <span className="font-display text-3xl">{category.label}</span>
                    <span className="text-text-muted">{category.description}</span>
                    <span className="mt-auto pt-4 text-sm font-medium text-accent">
                      Continue →
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------- featured listings */}
      <Section>
        <Container className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHeading
              eyebrow="Featured"
              title="Properties from AL-MAKKAH"
              description="Verified listings, hand-picked."
            />
            <ButtonLink href="/buy" variant="secondary">
              View all properties
            </ButtonLink>
          </div>
          <PlaceholderNote>
            The three cards below are <strong>sample listings, not real
            properties</strong>. They exist so the card design can be reviewed
            before the database is connected, and are removed as soon as real
            listings are published.
          </PlaceholderNote>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_PROPERTIES.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------ why al-makkah */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Why AL-MAKKAH"
            title="What you get from working with us"
          />
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_AL_MAKKAH.map((reason) => (
              <div key={reason.title} className="flex flex-col gap-2">
                <h3 className="font-display text-xl">{reason.title}</h3>
                <p className="text-text-muted text-sm">{reason.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------- how it works */}
      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeading eyebrow="How it works" title="From first search to final signature" />
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div className="flex flex-col gap-6">
              <h3 className="text-xs uppercase tracking-[0.16em] text-text-muted">
                If you are buying or renting
              </h3>
              <Steps items={BUYER_STEPS} />
            </div>
            <div className="flex flex-col gap-6">
              <h3 className="text-xs uppercase tracking-[0.16em] text-text-muted">
                If you are selling
              </h3>
              <Steps items={SELLER_STEPS} />
            </div>
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ coverage */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Coverage"
            title="Across the whole of Hyderabad"
            description="AL-MAKKAH works throughout the city and the surrounding areas."
          />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HYDERABAD_AREA_GROUPS.map((group) => (
              <div key={group.name} className="flex flex-col gap-3">
                <h3 className="font-display text-xl">{group.name}</h3>
                <ul className="flex flex-col gap-1">
                  {group.areas.map((area) => (
                    <li key={area} className="text-sm text-text-muted">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <PlaceholderNote>
            Listing an area does not imply a property is currently available
            there. An interactive map replaces this list in a later phase.
          </PlaceholderNote>
        </Container>
      </Section>

      {/* -------------------------------------------------------- testimonials
          Hidden entirely until real customer statements are supplied.
          Inventing testimonials would be a false claim about the business. */}
      {TESTIMONIALS.length > 0 && (
        <Section>
          <Container className="flex flex-col gap-10">
            <SectionHeading eyebrow="Testimonials" title="What our customers say" />
            <div className="grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((testimonial) => (
                <Card key={testimonial.author}>
                  <CardBody className="flex flex-col gap-4">
                    <p className="text-pretty">“{testimonial.quote}”</p>
                    <p className="text-sm text-text-muted">
                      {testimonial.author}
                      {testimonial.role ? ` · ${testimonial.role}` : ''}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* ----------------------------------------------------------- final cta */}
      <Section tone="inverse">
        <Container className="flex flex-col items-start gap-6">
          <h2 className="font-display text-3xl md:text-4xl max-w-[20ch] text-balance">
            Looking for your next property?
          </h2>
          <p className="text-ink-300 max-w-[52ch]">
            Tell us what you need and AL-MAKKAH will find it, or list the
            property you already have.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/buy" variant="inverse" size="lg">
              Find a Property
            </ButtonLink>
            <ButtonLink
              href="/contact"
              size="lg"
              className="border border-ink-700 text-text-inverse hover:bg-ink-800 bg-transparent"
            >
              Talk to AL-MAKKAH
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </main>
  );
}

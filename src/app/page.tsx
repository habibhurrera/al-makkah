import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Container, Section, SectionHeading } from '@/components/ui/layout';

/**
 * Homepage shell. The hero below is a static placeholder for the scroll-driven
 * 3D construction sequence built in Phase 5; the remaining homepage sections
 * (featured properties, why AL-MAKKAH, process, testimonials) come in Phase 4.
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

export default function HomePage() {
  return (
    <main>
      {/* Placeholder for the Phase 5 3D hero. */}
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

      <Section>
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
    </main>
  );
}

import type { Metadata } from 'next';
import { Container, Section, SectionHeading } from '@/components/ui/layout';
import { SellerForm } from '@/components/forms/seller-form';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Sell Your Property',
  description:
    'List your house, plot, flat or bungalow with AL-MAKKAH Real Estate in Hyderabad. Every property is verified before it is published.',
};

export const revalidate = 3600;

async function getAreas() {
  try {
    return await prisma.area.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });
  } catch {
    // The form still works without the dropdown; the seller can describe the
    // address instead and an admin sets the area during review.
    return [];
  }
}

const STEPS = [
  'You submit the property with photos and your contact number',
  'AL-MAKKAH reviews what you sent',
  'Ownership, location and price are verified',
  'Your listing is published on the site',
  'Buyer enquiries are passed on to you',
];

export default async function SellPage() {
  const areas = await getAreas();

  return (
    <>
      <Section className="pb-0">
        <Container className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <SectionHeading
            eyebrow="Sell"
            title="Sell or rent out your property"
            description="Add your property yourself. AL-MAKKAH verifies it, publishes it, and passes on serious buyers."
          />
          <ol className="flex flex-col gap-3 lg:pt-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="shrink-0 size-6 grid place-items-center rounded-sm border border-border text-xs text-text-muted"
                >
                  {index + 1}
                </span>
                <span className="text-text-muted pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section>
        <Container>
          <SellerForm areas={areas} />
        </Container>
      </Section>
    </>
  );
}

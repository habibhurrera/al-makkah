import { Container, Section, SectionHeading } from '@/components/ui/layout';

/**
 * Temporary page body for routes whose feature phase has not been built yet.
 * Exists so navigation is complete and testable end to end. Every one of these
 * is replaced by the real page in its phase - none of them ship to production
 * with this content.
 */
export function PhaseStub({
  eyebrow,
  title,
  description,
  phase,
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <Section>
      <Container className="flex flex-col gap-8">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        <p className="text-sm text-text-subtle border-l-2 border-border pl-4">
          Placeholder page — the {phase} feature has not been built yet.
        </p>
      </Container>
    </Section>
  );
}

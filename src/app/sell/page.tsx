import type { Metadata } from 'next';
import { PhaseStub } from '@/components/layout/phase-stub';

export const metadata: Metadata = {
  title: 'Sell Your Property',
};

export default function Page() {
  return (
    <PhaseStub
      eyebrow="Sell"
      title="Sell Your Property"
      description="Submit your house or plot. Every listing is reviewed before it is published."
      phase="seller submission"
    />
  );
}

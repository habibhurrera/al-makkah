import type { Metadata } from 'next';
import { PhaseStub } from '@/components/layout/phase-stub';

export const metadata: Metadata = {
  title: 'Buy Property in Hyderabad',
};

export default function Page() {
  return (
    <PhaseStub
      eyebrow="Buy"
      title="Buy Property"
      description="Houses and plots for sale across Hyderabad."
      phase="buy marketplace"
    />
  );
}

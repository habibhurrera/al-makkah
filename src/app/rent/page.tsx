import type { Metadata } from 'next';
import { PhaseStub } from '@/components/layout/phase-stub';

export const metadata: Metadata = {
  title: 'Property for Rent in Hyderabad',
};

export default function Page() {
  return (
    <PhaseStub
      eyebrow="Rent"
      title="Property for Rent"
      description="Houses, bungalows, flats and portions available to rent across Hyderabad."
      phase="rental marketplace"
    />
  );
}

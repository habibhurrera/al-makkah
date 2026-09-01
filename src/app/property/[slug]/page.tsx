import type { Metadata } from 'next';
import { PhaseStub } from '@/components/layout/phase-stub';

export const metadata: Metadata = {
  title: 'Property',
};

export default function PropertyDetailPage() {
  return (
    <PhaseStub
      eyebrow="Property"
      title="Property details"
      description="The full listing page — gallery, specifications, amenities, location, verification and enquiry."
      phase="property detail"
    />
  );
}

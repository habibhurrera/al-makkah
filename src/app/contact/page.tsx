import type { Metadata } from 'next';
import { PhaseStub } from '@/components/layout/phase-stub';

export const metadata: Metadata = {
  title: 'Contact',
};

export default function Page() {
  return (
    <PhaseStub
      eyebrow="Contact"
      title="Contact AL-MAKKAH"
      description="Talk to us about buying, selling or renting property in Hyderabad."
      phase="contact and enquiry"
    />
  );
}

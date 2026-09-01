import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/navigation';
import { Container } from '@/components/ui/layout';

/**
 * Contact details are PLACEHOLDERS until AL-MAKKAH supplies them. They will
 * come from the SiteSetting table (single row, admin-editable) rather than
 * being hardcoded here - see prisma/schema.prisma.
 */
const PLACEHOLDER_CONTACT = {
  address: 'Office address — to be supplied',
  phone: 'Phone — to be supplied',
  email: 'Email — to be supplied',
  hours: 'Business hours — to be supplied',
};

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface-inverse text-text-inverse">
      <Container>
        <div className="py-14 grid gap-10 md:grid-cols-4">
          <div className="flex flex-col gap-3">
            <span className="font-display text-2xl">AL-MAKKAH</span>
            <span className="text-xs uppercase tracking-[0.22em] text-ink-400">
              Real Estate
            </span>
            <p className="text-sm text-ink-300 max-w-[32ch]">
              Property across Hyderabad, Sindh.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2">
            <h2 className="text-xs uppercase tracking-[0.16em] text-ink-400 mb-1">
              Explore
            </h2>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-ink-200 hover:text-text-inverse w-fit"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2">
            <h2 className="text-xs uppercase tracking-[0.16em] text-ink-400 mb-1">
              Office
            </h2>
            <p className="text-sm text-ink-300">{PLACEHOLDER_CONTACT.address}</p>
            <p className="text-sm text-ink-300">{PLACEHOLDER_CONTACT.hours}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xs uppercase tracking-[0.16em] text-ink-400 mb-1">
              Contact
            </h2>
            <p className="text-sm text-ink-300">{PLACEHOLDER_CONTACT.phone}</p>
            <p className="text-sm text-ink-300">{PLACEHOLDER_CONTACT.email}</p>
          </div>
        </div>

        <div className="py-6 border-t border-ink-800 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} AL-MAKKAH Real Estate. All rights reserved.
          </p>
          <p className="text-xs text-ink-500">Hyderabad, Sindh, Pakistan</p>
        </div>
      </Container>
    </footer>
  );
}

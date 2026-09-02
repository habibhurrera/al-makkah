import 'server-only';
import { prisma } from '@/lib/db';

/**
 * The agency's own contact details, from the single-row SiteSetting table.
 *
 * There are no agent accounts, so every property is contacted through the
 * company. Nothing here is hardcoded in a component - an admin edits it once
 * and the whole site follows.
 */
export type SiteSettings = {
  officeAddress: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = await prisma.siteSetting.findUnique({
      where: { id: 'singleton' },
      select: {
        officeAddress: true,
        phone: true,
        whatsapp: true,
        email: true,
      },
    });

    return (
      settings ?? { officeAddress: null, phone: null, whatsapp: null, email: null }
    );
  } catch {
    // Contact details missing must never take a property page down.
    return { officeAddress: null, phone: null, whatsapp: null, email: null };
  }
}

/**
 * Digits only, with Pakistan's country code, as wa.me requires.
 * Returns null when no number is configured, so callers hide the button
 * rather than rendering a dead link.
 */
export function whatsappNumber(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return digits;
}

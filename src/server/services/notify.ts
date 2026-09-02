import 'server-only';

/**
 * Outbound notification when something arrives that a human should look at.
 *
 * Optional by design. With no provider configured this is a no-op, because a
 * fresh deployment has no mailbox to send to and a hard dependency on one
 * would make the enquiry form fail for a client who has not set it up yet.
 * Leads are always written to the database first; email is a convenience on
 * top, never the system of record.
 *
 * Reached over Resend's REST API with plain fetch - no SDK, so there is no
 * dependency to keep current and it runs unchanged in every runtime here.
 * Swapping providers means changing one function.
 */

export type NotifyResult = 'sent' | 'skipped' | 'failed';

type LeadNotification = {
  kind: string;
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  /** Public reference of the property the lead is about, when there is one. */
  propertyRef?: string | null;
};

function isConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.LEAD_NOTIFY_TO);
}

/** Which state notifications are in, for the health endpoint to report. */
export function notificationChannel(): 'email' | 'none' {
  return isConfigured() ? 'email' : 'none';
}

/**
 * Escapes text before it goes into the HTML body.
 *
 * Lead content is attacker-controlled: a name field containing markup would
 * otherwise be rendered by the recipient's mail client.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return '';
  return `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(
    label,
  )}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
}

/**
 * Sends the notification, and never throws.
 *
 * The caller has already stored the lead. If the mail provider is down, the
 * correct outcome is a logged failure and a successful response to the person
 * who filled in the form - not an error page for something that already worked.
 */
export async function notifyNewLead(
  lead: LeadNotification,
): Promise<NotifyResult> {
  if (!isConfigured()) return 'skipped';

  const apiKey = process.env.RESEND_API_KEY as string;
  const to = (process.env.LEAD_NOTIFY_TO as string)
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  const from = process.env.LEAD_NOTIFY_FROM?.trim() || 'onboarding@resend.dev';

  const subject = lead.propertyRef
    ? `New ${lead.kind} enquiry - ${lead.propertyRef}`
    : `New ${lead.kind} enquiry`;

  const html = [
    '<div style="font-family:system-ui,sans-serif;font-size:14px">',
    `<p style="margin:0 0 12px">${escapeHtml(subject)}</p>`,
    '<table style="border-collapse:collapse">',
    row('Name', lead.name),
    row('Phone', lead.phone),
    row('Email', lead.email),
    row('Property', lead.propertyRef),
    row('Message', lead.message),
    '</table>',
    '<p style="margin:16px 0 0;color:#666">Open the admin panel to reply.</p>',
    '</div>',
  ].join('');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
      // A slow mail provider must not hold a form submission open.
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[notify] provider rejected the request', response.status);
      return 'failed';
    }

    return 'sent';
  } catch (error) {
    console.error('[notify] could not send lead notification', error);
    return 'failed';
  }
}

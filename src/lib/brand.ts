/**
 * Who this deployment belongs to.
 *
 * The single place the company's identity is written down. Everything visible
 * - the wordmark, the footer, page titles, the admin panel - reads from here,
 * so standing up a new client is editing this file rather than hunting strings
 * across forty components.
 *
 * Deliberately the ONLY place a company name appears. Body copy throughout the
 * site is written in the first person ("we verify", "our team") instead of
 * naming the company, because first-person copy reads naturally for every
 * licensee and never has to be rewritten. Reserve the name for places where a
 * company must actually identify itself.
 *
 * PLACEHOLDER. "Your Company" is not a real firm and is meant to look
 * obviously unset - a plausible invented name would be worse, because someone
 * would eventually ship it believing it was intentional.
 */
export const BRAND = {
  /** Shown in the wordmark, the footer and page titles. */
  name: 'Your Company',
  /** Sits under the wordmark. The category, not a slogan. */
  descriptor: 'Real Estate',
  /** Used in <title> templates and the default meta description. */
  tagline: 'Buy, sell and rent verified property in Hyderabad, Pakistan.',
  /** The market this deployment covers. */
  city: 'Hyderabad',
  region: 'Sindh',
} as const;

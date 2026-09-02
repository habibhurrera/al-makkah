/**
 * ============================================================================
 * PLACEHOLDER CONTENT — NOT REAL BUSINESS INFORMATION
 * ============================================================================
 *
 * Every string in this file is a stand-in written to make the layout
 * reviewable. None of it is a claim about any real company: no history, no
 * statistics, no testimonials, no listings.
 *
 * Written in the first person throughout, deliberately. Copy that says "we"
 * rather than naming a company reads correctly for every licensee and never
 * has to be rewritten when the name changes — only src/lib/brand.ts does.
 *
 * This is the only file that needs editing when the real copy arrives. When
 * the database is live, SAMPLE_PROPERTIES is replaced by a query and this file
 * shrinks to marketing copy alone.
 */

export const WHY_US = [
  {
    title: 'Verified listings',
    body: 'A property only carries the verified badge once it has passed our own checks, recorded against the listing.',
  },
  {
    title: 'Transparent pricing',
    body: 'The price you see on a listing is the price we confirmed with the owner.',
  },
  {
    title: 'Whole of Hyderabad',
    body: 'Latifabad, Qasimabad, the city, the cantonment and the surrounding areas.',
  },
  {
    title: 'Documented properties',
    body: 'Ownership and location are checked before a listing is published.',
  },
  {
    title: 'One point of contact',
    body: 'You deal with us directly, not a queue of intermediaries.',
  },
  {
    title: 'Support through the deal',
    body: 'From the first viewing to the final paperwork.',
  },
];

export const BUYER_STEPS = [
  { step: 'Find a property', body: 'Search by area, price, size and type.' },
  { step: 'View the details', body: 'Photos, video, location and full specifications.' },
  { step: 'Contact us', body: 'Call, WhatsApp or send an enquiry.' },
  { step: 'Visit the property', body: 'We arrange the viewing.' },
  { step: 'Complete the purchase', body: 'Documentation and transfer.' },
];

export const SELLER_STEPS = [
  { step: 'Submit your property', body: 'Details, photos and documents.' },
  { step: 'We review it', body: 'We check what you have sent.' },
  { step: 'Verification', body: 'Ownership, location and pricing are confirmed.' },
  { step: 'Listing published', body: 'Your property goes live on the site.' },
  { step: 'Buyer enquiries', body: 'We pass on serious buyers.' },
];

/**
 * Empty on purpose. Testimonials are real customer statements; inventing them
 * would be a false claim about the business. The homepage section hides itself
 * entirely while this array is empty.
 */
export const TESTIMONIALS: { quote: string; author: string; role?: string }[] =
  [];

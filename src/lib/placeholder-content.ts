/**
 * ============================================================================
 * PLACEHOLDER CONTENT — NOT AL-MAKKAH BUSINESS INFORMATION
 * ============================================================================
 *
 * Every string in this file is a stand-in written to make the layout
 * reviewable. None of it is a claim about AL-MAKKAH: no real history, no real
 * statistics, no real testimonials, no real listings.
 *
 * This is the only file that needs editing when the real copy arrives. When
 * the database is live, SAMPLE_PROPERTIES is replaced by a query and this file
 * shrinks to marketing copy alone.
 */

export const PLACEHOLDER_ABOUT = {
  eyebrow: 'About AL-MAKKAH',
  title: 'A property company built on what it can verify',
  body: [
    'Placeholder introduction. This paragraph will carry AL-MAKKAH’s own description of the company — when it was founded, the areas of Hyderabad it works in, and the kind of property it handles.',
    'Placeholder paragraph. This is where the company’s approach to buyers and sellers is set out, in AL-MAKKAH’s own words.',
  ],
  /** Deliberately no numbers. Statistics are business claims and must be supplied. */
  pillars: [
    {
      title: 'Mission',
      body: 'Placeholder — AL-MAKKAH’s mission statement, to be supplied.',
    },
    {
      title: 'Vision',
      body: 'Placeholder — AL-MAKKAH’s vision, to be supplied.',
    },
    {
      title: 'Values',
      body: 'Placeholder — the values the company works by, to be supplied.',
    },
  ],
};

export const WHY_AL_MAKKAH = [
  {
    title: 'Verified listings',
    body: 'A property only carries the verified badge once it has passed AL-MAKKAH’s own checks, recorded against the listing.',
  },
  {
    title: 'Transparent pricing',
    body: 'The price you see on a listing is the price AL-MAKKAH confirmed with the owner.',
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
    body: 'You deal with AL-MAKKAH directly, not a queue of intermediaries.',
  },
  {
    title: 'Support through the deal',
    body: 'From the first viewing to the final paperwork.',
  },
];

export const BUYER_STEPS = [
  { step: 'Find a property', body: 'Search by area, price, size and type.' },
  { step: 'View the details', body: 'Photos, video, location and full specifications.' },
  { step: 'Contact AL-MAKKAH', body: 'Call, WhatsApp or send an enquiry.' },
  { step: 'Visit the property', body: 'We arrange the viewing.' },
  { step: 'Complete the purchase', body: 'Documentation and transfer.' },
];

export const SELLER_STEPS = [
  { step: 'Submit your property', body: 'Details, photos and documents.' },
  { step: 'We review it', body: 'AL-MAKKAH checks what you have sent.' },
  { step: 'Verification', body: 'Ownership, location and pricing are confirmed.' },
  { step: 'Listing published', body: 'Your property goes live on the site.' },
  { step: 'Buyer enquiries', body: 'We pass on serious buyers.' },
];

/**
 * Empty on purpose. Testimonials are real customer statements; inventing them
 * would be a false claim about AL-MAKKAH. The homepage section hides itself
 * entirely while this array is empty.
 */
export const TESTIMONIALS: { quote: string; author: string; role?: string }[] =
  [];

/**
 * Localities across Hyderabad, Sindh. Geographic reference data, not business
 * content. Seeded into the Area table (prisma/seed.ts) and used for the
 * coverage section on the homepage.
 *
 * A starting point, not a fixed set - admins extend the Area table as listings
 * arrive from places not listed here.
 */
export const HYDERABAD_AREA_GROUPS = [
  {
    name: 'Latifabad',
    areas: [
      'Latifabad Unit 1',
      'Latifabad Unit 2',
      'Latifabad Unit 3',
      'Latifabad Unit 4',
      'Latifabad Unit 5',
      'Latifabad Unit 6',
      'Latifabad Unit 7',
      'Latifabad Unit 8',
      'Latifabad Unit 9',
      'Latifabad Unit 10',
      'Latifabad Unit 11',
      'Latifabad Unit 12',
    ],
  },
  {
    name: 'Qasimabad',
    areas: [
      'Qasimabad',
      'Naseem Nagar',
      'Wadhu Wah Road',
      'Gulshan-e-Fatima',
      'Revenue Housing Society',
      'Kohsar Housing Society',
      'Phase 1 Qasimabad',
      'Phase 2 Qasimabad',
    ],
  },
  {
    name: 'City & Cantonment',
    areas: [
      'Hirabad',
      'Saddar',
      'Hyderabad Cantonment',
      'Auto Bhan Road',
      'Citizen Colony',
      'Thandi Sarak',
      'Gari Khata',
      'Market Area',
      'Tilak Incline',
      'Risala Road',
      'Preetabad',
      'Hussainabad',
      'Gulistan-e-Sarmast',
      'Defence Housing Authority Hyderabad',
    ],
  },
  {
    name: 'Periphery',
    areas: [
      'Hala Naka',
      'Bypass',
      'Phuleli',
      'Tando Yousuf',
      'Tando Jam',
      'Site Area',
      'Jamshoro Road',
      'Bhittai Nagar',
    ],
  },
] as const;

/** Flat list, in group order — this is the Area table's seed order. */
export const HYDERABAD_AREAS: string[] = HYDERABAD_AREA_GROUPS.flatMap(
  (group) => [...group.areas],
);

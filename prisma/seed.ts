import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

/**
 * Reference data only. No properties, no testimonials, no fake business content.
 *
 * Coverage is the whole of Hyderabad, Sindh. The list below is the city's
 * recognised localities and is a starting point, not a fixed set - admins add
 * to the Area table as listings come in from places not listed here.
 */
const HYDERABAD_AREAS = [
  // Latifabad taluka
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
  // Qasimabad taluka
  'Qasimabad',
  'Naseem Nagar',
  'Wadhu Wah Road',
  'Gulshan-e-Fatima',
  'Revenue Housing Society',
  'Kohsar Housing Society',
  'Phase 1 Qasimabad',
  'Phase 2 Qasimabad',
  // City / Cantonment
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
  // Rural / periphery
  'Hala Naka',
  'Bypass',
  'Phuleli',
  'Tando Yousuf',
  'Tando Jam',
  'Site Area',
  'Jamshoro Road',
  'Bhittai Nagar',
];

/** Common amenities. Admin can extend from the dashboard. */
const AMENITIES = [
  'Boundary Wall',
  'Backup Generator',
  'Solar Panels',
  'Borewell',
  'Water Tank',
  'Servant Quarter',
  'Garage',
  'Lawn / Garden',
  'Terrace',
  'Basement',
  'Lift',
  'Security Guard',
  'CCTV',
  'Gated Community',
  'Mosque Nearby',
  'School Nearby',
  'Hospital Nearby',
  'Main Road Access',
  'Corner Plot',
  'Park Facing',
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  for (const [index, name] of HYDERABAD_AREAS.entries()) {
    const slug = slugify(name);
    await prisma.area.upsert({
      where: { slug },
      update: { name, sortOrder: index },
      create: { name, slug, sortOrder: index },
    });
  }

  for (const name of AMENITIES) {
    const slug = slugify(name);
    await prisma.amenity.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });

  console.log(
    `Seeded ${HYDERABAD_AREAS.length} areas, ${AMENITIES.length} amenities, site settings row.`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

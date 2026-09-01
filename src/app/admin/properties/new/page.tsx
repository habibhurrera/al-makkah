import Link from 'next/link';
import { PropertyEditForm } from '@/components/admin/property-edit-form';
import { getAmenityOptions, getAreaOptions } from '@/server/queries/admin';

export const metadata = { title: 'Add a property' };

/**
 * For a property AL-MAKKAH takes on directly - an owner walks into the office
 * with no submission through the website.
 */
export default async function NewPropertyPage() {
  const [areas, amenities] = await Promise.all([
    getAreaOptions(),
    getAmenityOptions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/properties"
          className="text-sm text-text-muted hover:text-text w-fit"
        >
          ← Back to properties
        </Link>
        <h1 className="font-display text-3xl">Add a property</h1>
        <p className="text-text-muted max-w-[70ch]">
          For a property brought to AL-MAKKAH directly. Enter the details, then
          add photos and video on the next screen.
        </p>
      </div>

      <PropertyEditForm
        mode="create"
        areas={areas}
        amenities={amenities}
        property={{
          id: '',
          refNo: '',
          slug: '',
          title: '',
          description: '',
          purpose: 'SALE',
          type: 'HOUSE',
          price: 0,
          areaValue: 0,
          areaUnit: 'SQ_YD',
          areaId: areas[0]?.id ?? '',
          addressLine: null,
          latitude: null,
          longitude: null,
          bedrooms: null,
          bathrooms: null,
          floors: null,
          parking: null,
          yearBuilt: null,
          furnishing: null,
          facing: null,
          hasElectricity: false,
          hasGas: false,
          hasWater: false,
          hasSecurity: false,
          amenityIds: [],
        }}
      />
    </div>
  );
}

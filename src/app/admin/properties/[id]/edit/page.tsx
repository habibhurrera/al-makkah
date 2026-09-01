import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PropertyEditForm } from '@/components/admin/property-edit-form';
import {
  getAmenityOptions,
  getAreaOptions,
  getPropertyForEdit,
} from '@/server/queries/admin';

export const metadata = { title: 'Edit listing' };

export default async function EditPropertyPage({
  params,
}: PageProps<'/admin/properties/[id]/edit'>) {
  const { id } = await params;

  const [property, areas, amenities] = await Promise.all([
    getPropertyForEdit(id),
    getAreaOptions(),
    getAmenityOptions(),
  ]);

  if (!property) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/properties"
          className="text-sm text-text-muted hover:text-text w-fit"
        >
          ← Back to properties
        </Link>
        <h1 className="font-display text-3xl">Edit listing</h1>
        <p className="text-text-muted">
          {property.refNo} · {property.status.toLowerCase().replace('_', ' ')}
        </p>
      </div>

      <PropertyEditForm
        property={{
          ...property,
          furnishing: property.furnishing ?? null,
        }}
        areas={areas}
        amenities={amenities}
      />
    </div>
  );
}

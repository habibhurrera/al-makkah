import type { AreaUnit, Purpose, PropertyType } from '@/generated/prisma';

/**
 * The shape a property card needs — deliberately a narrow subset of the
 * Property model, so listing queries can select only these columns rather than
 * pulling whole rows into a grid.
 *
 * `isVerified` is derived server-side from Property.verificationStatus. The
 * card never receives the raw status, so there is no client-side path to
 * rendering a verified badge that the database did not authorise.
 */
export type PropertyCardData = {
  id: string;
  slug: string;
  refNo: string;
  title: string;
  purpose: Purpose;
  type: PropertyType;
  /** PKR. Monthly rent when purpose is RENT. */
  price: number;
  areaValue: number;
  areaUnit: AreaUnit;
  areaName: string;
  bedrooms: number | null;
  bathrooms: number | null;
  isVerified: boolean;
  isFeatured: boolean;
  hasVideo: boolean;
  /** Public storage URL, or null while no image has been uploaded. */
  imageUrl: string | null;
};

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  HOUSE: 'House',
  PLOT: 'Plot',
  BUNGALOW: 'Bungalow',
  FLAT: 'Flat',
  APARTMENT: 'Apartment',
  PORTION: 'Portion',
  COMMERCIAL: 'Commercial',
};

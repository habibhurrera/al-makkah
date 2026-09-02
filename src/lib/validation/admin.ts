import { z } from 'zod';

/**
 * Admin-side validation.
 *
 * Kept in a separate file from the public schemas on purpose. These accept
 * fields the public schemas deliberately omit, so the two must never be
 * confused at a route boundary - a public handler importing from here would be
 * an obvious mistake in review.
 *
 * Even here, `status`, `verificationStatus` and `isFeatured` are absent: those
 * are changed through their own dedicated actions, each with its own audit
 * entry, so an ordinary edit cannot quietly publish or verify a listing.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const optionalInt = (min: number, max: number) =>
  z
    .union([z.literal(''), z.coerce.number().int().min(min).max(max)])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value));

/** Fields shared by creating and editing a listing. */
const propertyFields = {
  title: z.string().trim().min(5, 'Give the listing a title').max(140),
  description: z.string().trim().min(20, 'Write a description').max(6000),

  purpose: z.enum(['SALE', 'RENT']),
  type: z.enum([
    'HOUSE',
    'PLOT',
    'BUNGALOW',
    'FLAT',
    'APARTMENT',
    'PORTION',
    'COMMERCIAL',
  ]),

  price: z.coerce.number().positive('Enter a price').max(1_000_000_000_000),

  areaValue: z.coerce.number().positive('Enter the size').max(1_000_000),
  areaUnit: z.enum(['SQ_YD', 'SQ_FT', 'SQ_M', 'MARLA', 'KANAL', 'ACRE']),

  areaId: z.cuid('Choose an area'),
  addressLine: optionalText(200),

  // Bounded to Sindh so a mistyped coordinate cannot drop a Hyderabad listing
  // on another continent.
  latitude: z
    .union([z.literal(''), z.coerce.number().min(23).max(29)])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  longitude: z
    .union([z.literal(''), z.coerce.number().min(66).max(72)])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),

  bedrooms: optionalInt(0, 50),
  bathrooms: optionalInt(0, 50),
  floors: optionalInt(0, 20),
  parking: optionalInt(0, 50),
  yearBuilt: optionalInt(1900, new Date().getFullYear() + 2),

  furnishing: z
    .union([z.literal(''), z.enum(['UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED'])])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  facing: optionalText(60),

  hasElectricity: z.coerce.boolean().optional(),
  hasGas: z.coerce.boolean().optional(),
  hasWater: z.coerce.boolean().optional(),
  hasSecurity: z.coerce.boolean().optional(),

  amenityIds: z.array(z.cuid()).optional(),
};

export const propertyEditSchema = z.object({
  propertyId: z.cuid(),
  ...propertyFields,
});

/**
 * Creating a listing directly - for a property the agency takes on in the
 * office, with no public submission behind it. Same fields, no id yet.
 *
 * Note what is still absent: status and verificationStatus. A listing created
 * here starts as an unpublished, unverified draft exactly like one converted
 * from a submission, so the same publish and verify decisions apply.
 */
export const propertyCreateSchema = z.object(propertyFields);

export type PropertyEditInput = z.infer<typeof propertyEditSchema>;
export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;

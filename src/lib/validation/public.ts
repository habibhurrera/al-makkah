import { z } from 'zod';

/**
 * Validation schemas for input that arrives from the public internet.
 *
 * The security property here is structural: these schemas contain NO field for
 * status, verificationStatus, isFeatured, publishedAt, adminNotes or refNo.
 * Because the parsed output is the only thing handed to Prisma, a hostile
 * client cannot set those columns even if it sends them - they are stripped
 * before the data reaches the database layer, not merely ignored by convention.
 *
 * Admin schemas live in a separate file and are never reachable from a public
 * route handler.
 */

/** Pakistani mobile numbers: 03xxxxxxxxx, +923xxxxxxxxx, 00923xxxxxxxxx. */
const phone = z
  .string()
  .trim()
  .min(10, 'Enter a valid phone number')
  .max(20, 'Enter a valid phone number')
  .regex(/^(\+92|0092|0)?3\d{9}$/, 'Enter a valid Pakistani mobile number');

const name = z
  .string()
  .trim()
  .min(2, 'Enter your name')
  .max(80, 'Name is too long');

const email = z.email('Enter a valid email address').max(120).optional();

const message = z.string().trim().max(2000, 'Message is too long').optional();

/** Bots fill hidden fields; humans do not. Must be empty. */
const honeypot = z
  .string()
  .max(0, 'Rejected')
  .optional()
  .transform(() => undefined);

export const contactInquirySchema = z.object({
  name,
  phone,
  email,
  message,
  kind: z.enum(['BUY', 'RENT', 'SELL', 'CONTACT']),
  propertyId: z.cuid().optional(),
  website: honeypot,
});

export const viewingRequestSchema = z.object({
  name,
  phone,
  email,
  message,
  propertyId: z.cuid('A property is required'),
  preferredVisitAt: z.coerce
    .date()
    .min(new Date(), 'Choose a future date')
    .optional(),
  website: honeypot,
});

export const sellerSubmissionSchema = z.object({
  sellerName: name,
  sellerPhone: phone,
  sellerEmail: email,
  preferredContact: z.enum(['PHONE', 'WHATSAPP', 'EMAIL']).optional(),

  type: z.enum([
    'HOUSE',
    'PLOT',
    'BUNGALOW',
    'FLAT',
    'APARTMENT',
    'PORTION',
    'COMMERCIAL',
  ]),
  purpose: z.enum(['SALE', 'RENT']).default('SALE'),
  areaId: z.cuid('Choose an area').optional(),
  addressLine: z.string().trim().max(200).optional(),

  expectedPrice: z.coerce
    .number()
    .positive('Enter a price')
    .max(1_000_000_000_000, 'Enter a realistic price')
    .optional(),

  areaValue: z.coerce.number().positive('Enter the size').max(1_000_000),
  areaUnit: z.enum(['SQ_YD', 'SQ_FT', 'SQ_M', 'MARLA', 'KANAL', 'ACRE']),

  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  description: z.string().trim().max(4000).optional(),

  website: honeypot,
});

/** Marketplace filters. Bounded so a crafted query cannot force a table scan. */
export const propertySearchSchema = z.object({
  purpose: z.enum(['SALE', 'RENT']),
  type: z
    .enum(['HOUSE', 'PLOT', 'BUNGALOW', 'FLAT', 'APARTMENT', 'PORTION', 'COMMERCIAL'])
    .optional(),
  areaId: z.cuid().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minAreaSqFt: z.coerce.number().nonnegative().optional(),
  maxAreaSqFt: z.coerce.number().nonnegative().optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  withVideo: z.coerce.boolean().optional(),
  sort: z
    .enum(['newest', 'price_asc', 'price_desc', 'area_asc', 'area_desc'])
    .default('newest'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(12),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;
export type ViewingRequestInput = z.infer<typeof viewingRequestSchema>;
export type SellerSubmissionInput = z.infer<typeof sellerSubmissionSchema>;
export type PropertySearchInput = z.infer<typeof propertySearchSchema>;

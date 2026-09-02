import { describe, expect, it } from 'vitest';
import {
  contactInquirySchema,
  propertySearchSchema,
  sellerSubmissionSchema,
} from '@/lib/validation/public';

/**
 * The public input boundary.
 *
 * The security model claims that privileged fields are STRUCTURALLY absent
 * from public schemas, so a hostile client can send them and they never reach
 * the database. That is only true for as long as nobody adds them, which is
 * exactly the kind of regression a test catches and a code review does not.
 */

const validSubmission = {
  sellerName: 'Test Seller',
  sellerPhone: '03001234567',
  type: 'HOUSE',
  purpose: 'SALE',
  areaValue: 240,
  areaUnit: 'SQ_YD',
  website: '',
};

describe('seller submission schema', () => {
  it('strips every privileged field a hostile client might send', () => {
    const parsed = sellerSubmissionSchema.parse({
      ...validSubmission,
      status: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      isFeatured: true,
      adminNotes: 'trust me',
      refNo: 'AMK-0001',
      slug: 'attacker-chosen-slug',
      publishedAt: new Date().toISOString(),
    });

    for (const forbidden of [
      'status',
      'verificationStatus',
      'isFeatured',
      'adminNotes',
      'refNo',
      'slug',
      'publishedAt',
    ]) {
      expect(parsed, `${forbidden} must not survive parsing`).not.toHaveProperty(
        forbidden,
      );
    }
  });

  it('rejects a tripped honeypot', () => {
    const result = sellerSubmissionSchema.safeParse({
      ...validSubmission,
      website: 'http://spam.example',
    });
    expect(result.success).toBe(false);
  });

  it('rejects coordinates outside the covered region', () => {
    // London, not Sindh.
    const result = sellerSubmissionSchema.safeParse({
      ...validSubmission,
      latitude: 51.5,
      longitude: -0.12,
    });
    expect(result.success).toBe(false);
  });

  it('accepts coordinates inside the covered region', () => {
    const result = sellerSubmissionSchema.safeParse({
      ...validSubmission,
      latitude: 25.396,
      longitude: 68.3578,
    });
    expect(result.success).toBe(true);
  });
});

describe('contact inquiry schema', () => {
  it('strips fields only an admin may set', () => {
    const parsed = contactInquirySchema.parse({
      name: 'Test',
      phone: '03001234567',
      message: 'Hello',
      kind: 'CONTACT',
      website: '',
      status: 'CLOSED',
      handledById: 'someone',
    });
    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('handledById');
  });
});

describe('property search schema', () => {
  it('caps page size so a crafted query cannot force a huge scan', () => {
    const result = propertySearchSchema.safeParse({
      purpose: 'SALE',
      perPage: 5000,
    });
    expect(result.success).toBe(false);
  });

  it('caps how deep a crawler can page', () => {
    const result = propertySearchSchema.safeParse({
      purpose: 'SALE',
      page: 100000,
    });
    expect(result.success).toBe(false);
  });

  it('applies safe defaults when nothing is supplied', () => {
    const parsed = propertySearchSchema.parse({ purpose: 'SALE' });
    expect(parsed.page).toBe(1);
    expect(parsed.perPage).toBe(12);
    expect(parsed.sort).toBe('newest');
  });
});

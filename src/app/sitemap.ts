import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import { getPublishedSlugs } from '@/server/queries/properties';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/buy`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/rent`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/sell`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    // Published listings only - the query cannot return anything else.
    const properties = await getPublishedSlugs();
    return [
      ...staticPages,
      ...properties.map((property) => ({
        url: `${siteUrl}/property/${property.slug}`,
        lastModified: property.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticPages;
  }
}

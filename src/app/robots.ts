import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The admin area and API are not content. Excluding them keeps them out
      // of search results - it is not a security measure, since the real
      // protection is server-side authorization.
      disallow: ['/admin', '/admin/', '/api/', '/styleguide'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

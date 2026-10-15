import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/drop',
          '/board',
          '/duel',
          '/tools',
          '/tools/*',
          '/privacy',
          '/terms',
          '/help',
          '/design-system',
        ],
        disallow: [
          '/admin',
          '/admin/*',
          '/d/*',
          '/api/*',
          '/board/*',
          '/duel/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

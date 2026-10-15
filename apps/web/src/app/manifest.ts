import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'N1 — Privacy-First Platform',
    short_name: 'N1',
    description:
      'Anonymous, zero-cost digital platform for ephemeral sharing, real-time whiteboards, and client-side developer utilities.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090F',
    theme_color: '#09090F',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['utilities', 'productivity', 'education'],
  };
}

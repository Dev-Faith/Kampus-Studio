import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kampus Studio — Interactive NestJS, Prisma, Mongoose & Testing IDE',
    short_name: 'Kampus Studio',
    description:
      'Master NestJS, Prisma ORM, Mongoose ODM, and Unit/E2E testing in an interactive in-browser TypeScript IDE built around the Kampus PropTech platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0B0D',
    theme_color: '#E8503A',
    categories: ['education', 'developer tools', 'productivity'],
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}

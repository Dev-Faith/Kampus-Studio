import React from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3001');

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0D' },
    { media: '(prefers-color-scheme: light)', color: '#F3F2EE' },
  ],
  colorScheme: 'dark light',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Kampus Studio — Interactive NestJS, Prisma, Mongoose & Testing IDE',
    template: '%s · Kampus Studio',
  },
  description:
    'Master production backend architecture in your browser. Build the Kampus PropTech platform across 14 modules and 32 multi-file lessons with a live TypeScript IDE, HTTP pipeline tracer, Prisma & Mongoose mastery, Unit/E2E testing, and a context-aware Gemini AI mentor.',
  applicationName: 'Kampus Studio',
  keywords: [
    'NestJS',
    'TypeScript IDE',
    'Backend Architecture',
    'Prisma ORM',
    'Mongoose ODM',
    'NestJS Testing',
    'Supertest E2E',
    'Dependency Injection',
    'Interactive Coding Trainer',
    'Kampus Studio',
  ],
  authors: [{ name: 'Kampus Studio Engineering' }],
  creator: 'Kampus Studio',
  publisher: 'Kampus Studio',
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Kampus Studio',
    title: 'Kampus Studio — Interactive NestJS, Prisma, Mongoose & Testing IDE',
    description:
      'Build a real PropTech backend in your browser across 14 modules, 32 multi-file TypeScript exercises, live HTTP lifecycle tracing, Prisma & Mongoose mastery, and an AI architecture mentor.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kampus Studio — Interactive NestJS & Backend Architecture IDE',
    description:
      '14 modules · 32 live TypeScript exercises · Request lifecycle visualizer · Prisma & Mongoose mastery · Unit & E2E Testing · Gemini AI mentor.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kampus Studio',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kampus Studio',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web Browser',
  description:
    'Interactive in-browser NestJS, Prisma ORM, Mongoose ODM, and Unit/E2E Testing engineering trainer with a multi-file Monaco TypeScript IDE, live HTTP request lifecycle tracer, and context-aware AI tutor.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  educationalUse: 'Interactive Backend Software Engineering Lab',
  programmingLanguage: ['TypeScript', 'JavaScript', 'SQL', 'Prisma'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/ide.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        {children}
        <Script src="/vendor/ts/typescript.js" strategy="beforeInteractive" />
        <Script src="/js/engine.js" strategy="beforeInteractive" />
        <Script src="/js/curriculum-part1.js" strategy="beforeInteractive" />
        <Script src="/js/curriculum-part2.js" strategy="beforeInteractive" />
        <Script src="/js/architectural-rationale.js" strategy="beforeInteractive" />
        <Script src="/js/syntax-bridge.js" strategy="beforeInteractive" />
        <Script src="/js/prisma-mastery.js" strategy="beforeInteractive" />
        <Script src="/js/mongoose-mastery.js" strategy="beforeInteractive" />
        <Script src="/js/testing-mastery.js" strategy="beforeInteractive" />
        <Script src="/js/kampus-tutor.js" strategy="beforeInteractive" />
        <Script src="/js/monaco-types.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}

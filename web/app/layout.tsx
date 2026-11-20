import React from 'react';
import Script from 'next/script';

export const metadata = {
  title: 'NestJS Studio · Kampus PropTech — Interactive Backend Trainer & Next.js IDE',
  description:
    'Learn NestJS & backend engineering through the Kampus PropTech platform with a live TypeScript IDE, request lifecycle visualizer, and Vanilla JS Syntax Rosetta Stone.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/ide.css" />
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

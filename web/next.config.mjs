import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads GEMINI_API_KEY from the workspace root `.env` (or `web/.env`) so that
 * `npm run dev:web` automatically connects the Kampus AI Tutor to Gemini without
 * requiring the user to duplicate `.env` or paste the key manually in the browser.
 */
function loadGeminiKeyFromDotEnv() {
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim();
  }
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }

  const candidatePaths = [
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
  ];

  for (const envPath of candidatePaths) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const match = line.match(/^(?:export\s+)?(GEMINI_API_KEY|NEXT_PUBLIC_GEMINI_API_KEY)\s*=\s*(.+)$/);
        if (match) {
          let val = match[2].trim();
          // Strip inline comment if unquoted
          if (!val.startsWith('"') && !val.startsWith("'")) {
            val = val.split(/\s+#/)[0].trim();
          }
          val = val.replace(/^['"]|['"]$/g, '').trim();
          if (val) return val;
        }
      }
    } catch {
      // Ignore read errors and continue checking fallback paths
    }
  }
  return '';
}

const resolvedGeminiKey = loadGeminiKeyFromDotEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  env: {
    NEXT_PUBLIC_GEMINI_API_KEY: resolvedGeminiKey,
  },
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

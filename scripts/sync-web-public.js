/**
 * Copies the shared Kampus curriculum, sandbox runtime engine, Monaco types,
 * TypeScript compiler bundle, and IDE stylesheet into `web/public/` so the
 * Next.js App Router frontend can be built and deployed independently (e.g. on Vercel)
 * or exported back into `public/`.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcPublic = path.join(rootDir, 'public');
const destWebPublic = path.join(rootDir, 'web', 'public');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(path.join(srcPublic, 'css'), path.join(destWebPublic, 'css'));
copyRecursive(path.join(srcPublic, 'js'), path.join(destWebPublic, 'js'));
copyRecursive(path.join(srcPublic, 'vendor'), path.join(destWebPublic, 'vendor'));

console.log('✓ Synced shared engine, curriculum, CSS, and TypeScript compiler into web/public/');

// Generates all SEO / PWA image assets from the existing logo
// Run: node scripts/generate-assets.js
import sharp from 'sharp';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const assetsDir = join(root, 'public', 'assets');
const logoPath = join(assetsDir, 'logo.webp');

if (!existsSync(logoPath)) {
  console.error('❌  public/assets/logo.webp not found');
  process.exit(1);
}

// ── OG Image SVG (1200 × 630) ─────────────────────────────────────────────
const ogSvg = Buffer.from(`<svg width="1200" height="630" viewBox="0 0 1200 630"
  xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFF6B0"/>
      <stop offset="100%" stop-color="#FFD600"/>
    </linearGradient>
    <clipPath id="card-clip">
      <rect x="60" y="40" width="1080" height="550" rx="48"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative circles -->
  <circle cx="60"   cy="60"  r="90"  fill="#F5A800" opacity="0.22"/>
  <circle cx="1140" cy="570" r="110" fill="#F5A800" opacity="0.22"/>
  <circle cx="1120" cy="80"  r="55"  fill="#C17F00" opacity="0.16"/>
  <circle cx="80"   cy="540" r="65"  fill="#C17F00" opacity="0.16"/>

  <!-- Lightning bolts -->
  <polygon points="190,30 162,128 200,128 172,238 262,102 222,102 250,30"
           fill="#F5A800" opacity="0.38" transform="rotate(-6,212,134)"/>
  <polygon points="1020,30 992,128 1030,128 1002,238 1092,102 1052,102 1080,30"
           fill="#F5A800" opacity="0.38" transform="rotate(6,1042,134)"/>

  <!-- Card -->
  <rect x="60" y="40" width="1080" height="550" rx="48"
        fill="rgba(255,255,255,0.91)" stroke="#FFD600" stroke-width="5"/>

  <!-- Title -->
  <text x="600" y="210"
        font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif"
        font-size="90" font-weight="900" text-anchor="middle"
        fill="#3E2000" letter-spacing="2">CAO TIA CHOP</text>

  <!-- Underline accent -->
  <rect x="320" y="228" width="560" height="7" rx="4" fill="#FFD600"/>

  <!-- Tagline -->
  <text x="600" y="300"
        font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif"
        font-size="34" font-weight="700" text-anchor="middle"
        fill="#C17F00">Game hoc toan vui cho hoc sinh tieu hoc</text>

  <!-- Feature badges -->
  <rect x="130" y="345" width="215" height="54" rx="27" fill="#FFD600" stroke="#F5A800" stroke-width="3"/>
  <text x="238" y="379" font-family="Arial,sans-serif" font-size="22" font-weight="800"
        text-anchor="middle" fill="#3E2000">Toan Toc Do</text>

  <rect x="375" y="345" width="215" height="54" rx="27" fill="#FFD600" stroke="#F5A800" stroke-width="3"/>
  <text x="483" y="379" font-family="Arial,sans-serif" font-size="22" font-weight="800"
        text-anchor="middle" fill="#3E2000">Kien Thuc</text>

  <rect x="620" y="345" width="215" height="54" rx="27" fill="#FFD600" stroke="#F5A800" stroke-width="3"/>
  <text x="728" y="379" font-family="Arial,sans-serif" font-size="22" font-weight="800"
        text-anchor="middle" fill="#3E2000">Thoi Trang</text>

  <rect x="865" y="345" width="215" height="54" rx="27" fill="#FFD600" stroke="#F5A800" stroke-width="3"/>
  <text x="973" y="379" font-family="Arial,sans-serif" font-size="22" font-weight="800"
        text-anchor="middle" fill="#3E2000">Thanh Tich</text>

  <!-- Sub text -->
  <text x="600" y="460"
        font-family="Arial,sans-serif" font-size="27" text-anchor="middle"
        fill="#7D5A2C">Kham pha the gioi toan hoc cung chiec cao</text>

  <!-- Domain -->
  <text x="600" y="520"
        font-family="Arial,sans-serif" font-size="22" font-weight="700"
        text-anchor="middle" fill="#B8860B">caotiachop.github.io</text>
</svg>`);

// ── Tasks ─────────────────────────────────────────────────────────────────
const tasks = [
  {
    name: 'og-image.png (1200×630)',
    run: () =>
      sharp(ogSvg, { density: 150 })
        .resize(1200, 630)
        .png({ quality: 90 })
        .toFile(join(assetsDir, 'og-image.png')),
  },
  {
    name: 'icon-512.png',
    run: () =>
      sharp(logoPath)
        .resize(512, 512, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(assetsDir, 'icon-512.png')),
  },
  {
    name: 'icon-192.png',
    run: () =>
      sharp(logoPath)
        .resize(192, 192, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(assetsDir, 'icon-192.png')),
  },
  {
    name: 'apple-touch-icon.png (180×180)',
    run: () =>
      sharp(logoPath)
        .resize(180, 180, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(assetsDir, 'apple-touch-icon.png')),
  },
  {
    name: 'favicon-32x32.png',
    run: () =>
      sharp(logoPath)
        .resize(32, 32, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(assetsDir, 'favicon-32x32.png')),
  },
  {
    name: 'favicon-16x16.png',
    run: () =>
      sharp(logoPath)
        .resize(16, 16, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(assetsDir, 'favicon-16x16.png')),
  },
];

console.log('🖼️  Generating image assets...\n');
for (const task of tasks) {
  process.stdout.write(`  • ${task.name} ... `);
  try {
    await task.run();
    console.log('✅');
  } catch (e) {
    console.log('❌', e.message);
  }
}
console.log('\nDone! Assets written to public/assets/');

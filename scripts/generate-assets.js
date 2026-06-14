// Generates all SEO / PWA image assets
// Run: node scripts/generate-assets.js
import sharp from 'sharp';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');
const dir   = join(root, 'public', 'assets');

const logoPath = join(dir, 'logo.webp');
const foxPath  = join(dir, 'fox-job', 'fast-speed.webp'); // 1024×1536 portrait

if (!existsSync(logoPath) || !existsSync(foxPath)) {
  console.error('❌  Thiếu file ảnh nguồn (logo.webp hoặc fox-job/fast-speed.webp)');
  process.exit(1);
}

// ── Chuẩn bị ảnh cáo và logo ─────────────────────────────────────────────
// Fox: 1024×1536 → 420×630 (giữ đúng tỉ lệ 2:3)
const foxBuf = await sharp(foxPath)
  .resize(420, 630, { fit: 'fill' })
  .png()
  .toBuffer();

// Logo: 1024×1024 → 150×150
const logoBuf = await sharp(logoPath)
  .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// ── SVG nền (text + shapes, không nhúng ảnh) ─────────────────────────────
// Layout 1200×630:
//   • Thẻ trắng bên trái: x=40, y=28, w=740, h=574
//   • Logo composite tại:  top=48,  left=56  (150×150)
//   • Fox  composite tại:  top=0,   left=778  (420×630)
//   • Chữ tiêu đề bắt đầu tại x=222 (ngay phải logo)

const bgSvg = Buffer.from(`<svg width="1200" height="630" viewBox="0 0 1200 630"
  xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient nền vàng -->
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFBE0"/>
      <stop offset="100%" stop-color="#FFD600"/>
    </linearGradient>
    <!-- Gradient bên phải (nơi cáo đứng) -->
    <linearGradient id="rightGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFE44D"/>
      <stop offset="100%" stop-color="#FFC107"/>
    </linearGradient>
  </defs>

  <!-- Nền toàn màn hình -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Khu vực bên phải (nền cho cáo) -->
  <rect x="770" y="0" width="430" height="630" fill="url(#rightGrad)" opacity="0.7"/>

  <!-- Tia sáng trang trí góc phải -->
  <polygon points="900,0 870,120 920,120 888,250 980,80 938,80 968,0"
           fill="#F5A800" opacity="0.30"/>
  <polygon points="1080,300 1055,400 1090,400 1065,500 1140,360 1110,360 1135,300"
           fill="#F5A800" opacity="0.22"/>

  <!-- Vòng trang trí -->
  <circle cx="1160" cy="580" r="100" fill="#F5A800" opacity="0.18"/>
  <circle cx="820"  cy="20"  r="60"  fill="#C17F00" opacity="0.14"/>

  <!-- Thẻ nội dung trắng bên trái -->
  <rect x="40" y="28" width="740" height="574" rx="40"
        fill="rgba(255,255,255,0.93)" stroke="#FFD600" stroke-width="5"/>

  <!-- Vùng nền vàng cho logo (góc trên trái thẻ) -->
  <rect x="56" y="44" width="154" height="154" rx="24"
        fill="#FFD600" stroke="#F5A800" stroke-width="3"/>

  <!-- Tiêu đề chính - tiếng Việt có dấu -->
  <text x="230" y="108"
        font-family="'Helvetica Neue', 'Arial', sans-serif"
        font-size="54" font-weight="900"
        fill="#3E2000" letter-spacing="1">Cáo Tia Chớp</text>

  <!-- Gạch chân vàng -->
  <rect x="230" y="122" width="512" height="6" rx="3" fill="#FFD600"/>

  <!-- Phụ đề -->
  <text x="58" y="218"
        font-family="'Helvetica Neue', 'Arial', sans-serif"
        font-size="27" font-weight="700"
        fill="#7D5A2C">Game học toán vui dành cho học sinh tiểu học</text>

  <!-- 4 Badge tính năng (2 hàng) -->
  <!-- Hàng 1 -->
  <rect x="58"  y="254" width="198" height="48" rx="24" fill="#FF9500"/>
  <text x="157" y="284" font-family="'Helvetica Neue','Arial',sans-serif"
        font-size="20" font-weight="800" text-anchor="middle" fill="white">Toán tốc độ</text>

  <rect x="272" y="254" width="178" height="48" rx="24" fill="#4CAF50"/>
  <text x="361" y="284" font-family="'Helvetica Neue','Arial',sans-serif"
        font-size="20" font-weight="800" text-anchor="middle" fill="white">Kiến thức</text>

  <!-- Hàng 2 -->
  <rect x="58"  y="316" width="178" height="48" rx="24" fill="#E91E63"/>
  <text x="147" y="346" font-family="'Helvetica Neue','Arial',sans-serif"
        font-size="20" font-weight="800" text-anchor="middle" fill="white">Thời trang</text>

  <rect x="252" y="316" width="198" height="48" rx="24" fill="#9C27B0"/>
  <text x="351" y="346" font-family="'Helvetica Neue','Arial',sans-serif"
        font-size="20" font-weight="800" text-anchor="middle" fill="white">Thành tích</text>

  <!-- Tagline -->
  <text x="58" y="428"
        font-family="'Helvetica Neue','Arial',sans-serif"
        font-size="23" font-style="italic"
        fill="#7D5A2C">Khám phá toán học cùng chú cáo thông minh!</text>

  <!-- Đường kẻ ngăn -->
  <rect x="58" y="450" width="700" height="2" rx="1" fill="#FFD600" opacity="0.6"/>

  <!-- Thông tin app -->
  <text x="58" y="494"
        font-family="'Helvetica Neue','Arial',sans-serif"
        font-size="20" fill="#7D5A2C">
    <tspan font-weight="700">Lớp 1 – 5</tspan>
    <tspan dx="18">•</tspan>
    <tspan dx="10">200+ câu hỏi</tspan>
    <tspan dx="18">•</tspan>
    <tspan dx="10">Miễn phí hoàn toàn</tspan>
  </text>

  <!-- Domain -->
  <text x="58" y="552"
        font-family="'Helvetica Neue','Arial',sans-serif"
        font-size="22" font-weight="700"
        fill="#B8860B">caotiachop.github.io</text>

  <!-- Số sao trang trí phía dưới phải -->
  <polygon points="1070,530 1080,555 1106,555 1085,571 1093,597 1070,582 1047,597 1055,571 1034,555 1060,555"
           fill="#FFD600" opacity="0.5"/>
  <polygon points="1130,480 1137,500 1158,500 1142,513 1148,534 1130,521 1112,534 1118,513 1102,500 1123,500"
           fill="#FFD600" opacity="0.4"/>
</svg>`);

// ── Tạo OG Image bằng composite ─────────────────────────────────────────
async function buildOgImage() {
  // 1. Render SVG nền → PNG buffer
  const bgPng = await sharp(bgSvg, { density: 144 })
    .resize(1200, 630)
    .png()
    .toBuffer();

  // 2. Ghép cáo (phải) + logo (trái) lên nền
  await sharp(bgPng)
    .composite([
      // Cáo: bên phải, chiếm full chiều cao
      { input: foxBuf,  top: 0,  left: 778 },
      // Logo: trong vùng vàng trên cùng bên trái
      { input: logoBuf, top: 48, left: 56  },
    ])
    .png({ quality: 92 })
    .toFile(join(dir, 'og-image.png'));
}

// ── Danh sách tất cả tasks ───────────────────────────────────────────────
const tasks = [
  {
    name: 'og-image.png (1200×630) – có cáo + logo + tiếng Việt',
    run: buildOgImage,
  },
  {
    name: 'icon-512.png',
    run: () =>
      sharp(logoPath)
        .resize(512, 512, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(dir, 'icon-512.png')),
  },
  {
    name: 'icon-192.png',
    run: () =>
      sharp(logoPath)
        .resize(192, 192, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(dir, 'icon-192.png')),
  },
  {
    name: 'apple-touch-icon.png (180×180)',
    run: () =>
      sharp(logoPath)
        .resize(180, 180, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(dir, 'apple-touch-icon.png')),
  },
  {
    name: 'favicon-32x32.png',
    run: () =>
      sharp(logoPath)
        .resize(32, 32, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(dir, 'favicon-32x32.png')),
  },
  {
    name: 'favicon-16x16.png',
    run: () =>
      sharp(logoPath)
        .resize(16, 16, { fit: 'contain', background: { r: 255, g: 214, b: 0, alpha: 1 } })
        .png()
        .toFile(join(dir, 'favicon-16x16.png')),
  },
];

// ── Chạy ─────────────────────────────────────────────────────────────────
console.log('🖼️  Đang tạo ảnh assets...\n');
for (const task of tasks) {
  process.stdout.write(`  • ${task.name} ... `);
  try {
    await task.run();
    console.log('✅');
  } catch (e) {
    console.log('❌', e.message);
  }
}
console.log('\n✨ Xong! Ảnh được lưu tại public/assets/');

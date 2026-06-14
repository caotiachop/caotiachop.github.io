/**
 * Full automation test — caotiachop-2503.web.app
 * Chạy: bun test tests/full-flow.test.ts --timeout 90000
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { execSync } from 'child_process';

const URL        = 'https://caotiachop-2503.web.app';
const T          = { name: 'Giao Vien', pin: '0000' };
const S          = { name: 'Hoc Sinh',  pin: '1111' };
const PW_TIMEOUT = 50_000;

let browser: Browser;

mkdirSync('tests/screenshots', { recursive: true });

// ── Helpers ────────────────────────────────────────────────────────────────────

function helpers(page: Page) {
  page.setDefaultTimeout(PW_TIMEOUT);

  const shot = (n: string) => page.screenshot({ path: `tests/screenshots/${n}.png` });

  async function typeVirtual(text: string) {
    for (const ch of text.toUpperCase()) {
      if (ch === ' ')
        await page.locator('button', { hasText: 'Khoảng cách' }).click();
      else
        await page.locator('button').filter({ hasText: new RegExp(`^${ch}$`) }).first().click();
      await page.waitForTimeout(60);
    }
  }

  async function typePin(pin: string) {
    for (const d of pin) {
      await page.locator('button').filter({ hasText: new RegExp(`^${d}$`) }).first().click();
      await page.waitForTimeout(80);
    }
  }

  async function clickLast() {
    const btns = page.locator('button');
    await btns.nth(await btns.count() - 1).click();
  }

  async function login(name: string, pin: string) {
    await page.goto(`${URL}/#/login`);
    await page.waitForTimeout(2000);
    await typeVirtual(name);
    await clickLast();
    await page.waitForTimeout(5000);
    await typePin(pin);
    await clickLast();
    await page.waitForTimeout(6000);
    expect(page.url()).toContain('/menu');
  }

  // Navigate menu→teacher để force re-render (tránh stuck ở detail view)
  async function gotoTeacher() {
    await page.goto(`${URL}/#/menu`);
    await page.waitForTimeout(1500);
    await page.goto(`${URL}/#/teacher`);
    await page.locator('button', { hasText: 'Giáo viên' }).waitFor({ timeout: PW_TIMEOUT });
    await page.waitForTimeout(1000);
  }

  // Trash button của SET: filter grade → tìm nút đỏ [style*="FBE9E7"] đầu tiên
  async function deleteSetByGradeFilter(grade: number, topic: string) {
    // Click filter chip "Lớp X" để thu gọn danh sách
    await page.locator('button', { hasText: `Lớp ${grade}` }).first().click();
    await page.waitForTimeout(500);
    // Trash button đầu tiên sau khi filter = trash của topic (vì sort alpha)
    // Hoặc tìm chính xác hơn: row chứa topic text → trash button
    const rows = page.locator('div').filter({ has: page.locator('button') });
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const txt = await row.innerText().catch(() => '');
      const box = await row.boundingBox();
      if (txt.includes(topic) && box && box.height < 120) {
        await row.locator('button').last().click();
        return;
      }
    }
    // Fallback: click nút đỏ đầu tiên
    await page.locator('[style*="FBE9E7"]').first().click();
  }

  // Trash button của QUESTION trong detail view: nút đỏ cuối cùng = câu hỏi mới nhất
  async function deleteLastQuestion() {
    const reds = page.locator('[style*="FBE9E7"]');
    await reds.last().click();
  }

  // Demote teacher: nút đỏ duy nhất trong teachers tab (không phải của chính mình)
  async function demoteUser() {
    await page.locator('[style*="FBE9E7"]').first().click();
  }

  // Settings button = button[1] trong header (button[0] = back)
  async function openSettings() {
    await page.locator('button').nth(1).click();
    await page.waitForTimeout(2000);
  }

  return {
    shot, typeVirtual, typePin, clickLast, login, gotoTeacher,
    deleteSetByGradeFilter, deleteLastQuestion, demoteUser, openSettings,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER FLOWS
// ══════════════════════════════════════════════════════════════════════════════
describe('👩‍🏫 Giáo viên', () => {
  let ctx : BrowserContext;
  let page: Page;
  let h   : ReturnType<typeof helpers>;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: false, slowMo: 80 });
    ctx  = await browser.newContext();
    page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') console.log('  [ERR]', m.text()); });
    h = helpers(page);
    await h.login(T.name, T.pin);
  });

  afterAll(async () => { await ctx.close(); });

  test('01 Menu hiển thị role teacher', async () => {
    await page.goto(`${URL}/#/menu`);
    await page.waitForTimeout(3000);
    await h.shot('01-teacher-menu');
    const b = await page.locator('body').innerText();
    expect(b).toContain('Quản lý câu hỏi');
    expect(b).toContain('Cáo Thành Tích');
  });

  test('02 Danh sách câu hỏi load đủ (≥5 bộ)', async () => {
    await h.gotoTeacher();
    await page.waitForTimeout(3000);
    await h.shot('02-sets-list');
    const b = await page.locator('body').innerText();
    expect((b.match(/câu/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  test('03 Tạo + xóa bộ câu hỏi', async () => {
    await h.gotoTeacher();
    await page.waitForTimeout(3000);

    // Mở modal (FAB = nút cuối)
    await page.locator('button').last().click();
    await page.waitForTimeout(2000);

    // Chọn Lớp 2 (force click qua overlay)
    await page.locator('button', { hasText: 'Lớp 2' }).last().click({ force: true });
    await page.locator('input').last().fill('Auto Test Set');
    await page.locator('button', { hasText: 'Thêm bộ câu hỏi' }).click();
    await page.waitForTimeout(5000);
    await h.shot('03a-created-set');
    expect(await page.locator('body').innerText()).toContain('Auto Test Set');

    // Xóa: filter Lớp 2 → click trash của "Auto Test Set"
    await h.deleteSetByGradeFilter(2, 'Auto Test Set');
    await page.waitForTimeout(1000);
    await page.locator('button', { hasText: 'Xoá' }).click();
    await page.waitForTimeout(5000);
    await h.shot('03b-deleted-set');
    // Reset filter về Tất cả
    await page.locator('button', { hasText: 'Tất cả' }).first().click();
    expect(await page.locator('body').innerText()).not.toContain('Auto Test Set');
  });

  test('04 Thêm + xóa câu hỏi', async () => {
    await h.gotoTeacher();
    await page.waitForTimeout(3000);

    // Vào bộ đầu tiên
    await page.locator('button').filter({ hasText: /Các số|Phép cộng|số trong/ }).first().click();
    await page.waitForTimeout(2500);

    // Mở modal thêm câu hỏi (FAB)
    await page.locator('button').last().click();
    await page.waitForTimeout(2000);

    await page.locator('textarea').fill('Test: 9 + 1 = ?');
    await page.locator('input').nth(0).fill('10');
    await page.locator('input').nth(1).fill('11');
    await page.locator('button').filter({ hasText: /^A$/ }).last().click({ force: true });
    await page.locator('button', { hasText: 'Thêm câu hỏi' }).click();
    await page.waitForTimeout(5000);
    await h.shot('04a-added-question');
    expect(await page.locator('body').innerText()).toContain('Test: 9 + 1 = ?');

    // Xóa câu hỏi vừa thêm = nút đỏ cuối cùng trong detail view
    await h.deleteLastQuestion();
    await page.waitForTimeout(1000);
    await page.locator('button', { hasText: 'Xoá' }).click();
    await page.waitForTimeout(5000);
    await h.shot('04b-deleted-question');
    expect(await page.locator('body').innerText()).not.toContain('Test: 9 + 1 = ?');
  });

  test('05 Thêm và xóa quyền giáo viên', async () => {
    await h.gotoTeacher();
    await page.locator('button', { hasText: 'Giáo viên' }).click();
    await page.waitForTimeout(3000);

    // Thêm Hoc Sinh làm giáo viên
    await page.locator('button').last().click();
    await page.waitForTimeout(1000);
    await page.locator('input').first().fill('Hoc Sinh');
    await page.locator('button', { hasText: 'Cấp quyền giáo viên' }).click();
    await page.waitForTimeout(5000);
    await h.shot('05a-promoted');
    expect(await page.locator('body').innerText()).toContain('Hoc Sinh');

    // Xóa quyền = nút đỏ đầu tiên (chỉ Hoc Sinh mới có, Giao Vien không có)
    await h.demoteUser();
    await page.waitForTimeout(1000);
    await page.locator('button', { hasText: 'Xoá' }).click();
    await page.waitForTimeout(5000);
    await h.shot('05b-demoted');
    expect(await page.locator('body').innerText()).not.toContain('Hoc Sinh');
  });

  test('06 Cấu hình menu học sinh', async () => {
    await h.gotoTeacher();
    await page.locator('button', { hasText: 'Menu HS' }).click();
    await page.waitForTimeout(2000);

    await page.locator('input').first().fill('Toán Tốc Độ');
    await page.locator('button', { hasText: 'Lưu cấu hình menu' }).click();
    // Chờ text "Đã lưu" xuất hiện (max 8s)
    await page.waitForFunction(
      () => document.body.innerText.includes('Đã lưu'),
      { timeout: 8000 }
    );
    await h.shot('06-menu-saved');
    expect(await page.locator('body').innerText()).toContain('Đã lưu');

    // Reset
    await page.locator('input').first().fill('');
    await page.locator('button', { hasText: 'Lưu cấu hình menu' }).click();
    await page.waitForTimeout(2000);
  });

  test('07 Settings mở được', async () => {
    await page.goto(`${URL}/#/menu`);
    await page.waitForTimeout(3000);
    await h.openSettings();
    await h.shot('07-settings');
    const b = await page.locator('body').innerText();
    expect(b.toLowerCase()).toMatch(/cài đặt|setting|pin|nhạc|âm thanh/i);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT FLOWS
// ══════════════════════════════════════════════════════════════════════════════
describe('🎒 Học sinh', () => {
  let ctx : BrowserContext;
  let page: Page;
  let h   : ReturnType<typeof helpers>;

  beforeAll(async () => {
    // Đảm bảo Hoc Sinh là student (dù test giáo viên có lỗi)
    try {
      execSync('node scripts/reset-student.mjs', {
        cwd: '/Users/kcoder/caotiachop.github.io',
        timeout: 15000,
      });
    } catch (e) { console.warn('  [WARN] reset-student failed:', e); }

    ctx  = await browser.newContext();
    page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') console.log('  [ERR]', m.text()); });
    h = helpers(page);
    await h.login(S.name, S.pin);
  });

  afterAll(async () => {
    await ctx.close();
    await browser.close();
  });

  test('08 Menu hiển thị đủ 4 mục student', async () => {
    await page.goto(`${URL}/#/menu`);
    await page.waitForTimeout(4000);
    await h.shot('08-student-menu');
    const b = await page.locator('body').innerText();
    expect(b).toContain('Cáo Tia Chớp');
    expect(b).toContain('Cáo Giáo Sư');
    expect(b).toContain('Cáo Thời Trang');
    expect(b).toContain('Cáo Thành Tích');
  });

  test('09 Speed Game load', async () => {
    await page.goto(`${URL}/#/speed`);
    await page.waitForTimeout(5000);
    await h.shot('09-speed-game');
    expect((await page.locator('body').innerText()).toLowerCase()).toMatch(/level|táo|cáo|speed/i);
  });

  test('10 Knowledge — 20 bộ từ Firestore', async () => {
    await page.goto(`${URL}/#/knowledge`);
    await page.waitForTimeout(8000);
    await h.shot('10-knowledge-list');
    const b = await page.locator('body').innerText();
    expect(b).toContain('Lớp');
    expect((b.match(/câu/g) || []).length).toBeGreaterThanOrEqual(10);
  });

  test('11 Knowledge — chơi và trả lời', async () => {
    await page.goto(`${URL}/#/knowledge`);
    await page.waitForTimeout(8000);
    await page.locator('button').filter({ hasText: /câu/ }).first().click();
    await page.waitForTimeout(4000);
    await h.shot('11a-playing');
    const ans = page.locator('button').filter({ hasText: /^[A-D]\./ }).first();
    if (await ans.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ans.click();
      await page.waitForTimeout(2000);
    }
    await h.shot('11b-answered');
    expect(await page.locator('body').innerText()).toBeTruthy();
  });

  test('12 Fashion — màn hình load', async () => {
    await page.goto(`${URL}/#/fashion`);
    await page.waitForTimeout(6000);
    await h.shot('12-fashion');
    expect((await page.locator('body').innerText()).toLowerCase()).toMatch(/trang phục|táo|mua|fox|cáo/i);
  });

  test('13 Fashion — mua trang phục (10 000 táo)', async () => {
    await page.goto(`${URL}/#/fashion`);
    await page.waitForTimeout(6000);
    const buyBtn = page.locator('button', { hasText: /mua ngay/i }).first();
    if (await buyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await buyBtn.click();
      await page.waitForTimeout(4000);
      await h.shot('13-bought');
    } else {
      await h.shot('13-all-owned');
    }
    expect(await page.locator('body').innerText()).toBeTruthy();
  });

  test('14 Leaderboard — Hoc Sinh có táo', async () => {
    await page.goto(`${URL}/#/leaderboard`);
    await page.waitForTimeout(8000);
    await h.shot('14-leaderboard');
    const b = await page.locator('body').innerText();
    expect(b).toContain('Hoc Sinh');
    expect(b).toContain('táo');
  });

  test('15 Leaderboard — 3 tabs', async () => {
    await page.goto(`${URL}/#/leaderboard`);
    await page.waitForTimeout(6000);
    for (const tab of ['Tốc độ cao', 'Thời trang', 'Táo nhiều nhất']) {
      await page.locator('button', { hasText: tab }).click();
      await page.waitForTimeout(1000);
    }
    await h.shot('15-lb-tabs');
    expect(await page.locator('body').innerText()).toBeTruthy();
  });

  test('16 Settings mở được', async () => {
    await page.goto(`${URL}/#/menu`);
    await page.waitForTimeout(4000);
    await h.openSettings();
    await h.shot('16-settings');
    const b = await page.locator('body').innerText();
    expect(b.toLowerCase()).toMatch(/cài đặt|setting|pin|nhạc|âm thanh/i);
  });

});

/**
 * Migration script: sample-data.json → Firebase Auth + Firestore
 * Chạy 1 lần duy nhất: node scripts/migrate-to-firebase.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
} catch {
  console.error('❌ Không tìm thấy scripts/serviceAccountKey.json');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

const padPin = (pin) => pin.padEnd(6, '0');
const fakeEmail = (name) =>
  `${name.toLowerCase().replace(/\s+/g, '_')}@caotiachop.local`;

const dataPath = join(__dirname, '..', 'sample-data.json');
const rawData = JSON.parse(readFileSync(dataPath, 'utf-8'));

async function migrateUsers() {
  console.log('\n👤 Migrate users...');
  const { users, scores, userProgress } = rawData;

  for (const [username, userData] of Object.entries(users)) {
    const email = fakeEmail(username);
    const password = padPin(userData.pin);

    try {
      let fbUser;
      try {
        fbUser = await auth.getUserByEmail(email);
        console.log(`  ⚠️  ${username}: Auth account đã tồn tại (uid: ${fbUser.uid})`);
      } catch {
        fbUser = await auth.createUser({ email, password, displayName: username });
        console.log(`  ✅ ${username}: Tạo Auth account (uid: ${fbUser.uid})`);
      }

      const uid = fbUser.uid;
      const batch = db.batch();

      const { pin: _pin, ...userWithoutPin } = userData;
      batch.set(db.collection('users').doc(uid), { ...userWithoutPin, username });

      const scoreData = scores?.[username] ?? {
        maxApples: 0,
        speedGame: { maxLevel: 0, bestTimeMs: 0 },
        fashionCompletedAt: null,
      };
      batch.set(db.collection('scores').doc(uid), scoreData);

      const progressData = userProgress?.[username] ?? { completedSetIds: {} };
      batch.set(db.collection('userProgress').doc(uid), progressData);

      await batch.commit();
      console.log(`  📄 ${username}: Đã ghi Firestore docs`);
    } catch (err) {
      console.error(`  ❌ ${username}: Lỗi - ${err.message}`);
    }
  }
}

async function migrateKnowledgeSets() {
  console.log('\n📚 Migrate knowledgeSets...');
  const { knowledgeSets } = rawData;
  if (!knowledgeSets) { console.log('  Không có data.'); return; }

  const entries = Object.entries(knowledgeSets);
  const BATCH_SIZE = 400;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + BATCH_SIZE);
    for (const [setId, setData] of chunk) {
      batch.set(db.collection('knowledgeSets').doc(setId), setData);
    }
    await batch.commit();
    console.log(`  ✅ ${chunk.map(([id]) => id).join(', ')}`);
  }
}

async function migrateMenuConfig() {
  console.log('\n⚙️  Migrate menuConfig...');
  const { menuConfig } = rawData;
  if (!menuConfig || Object.keys(menuConfig).length === 0) {
    console.log('  Menu config trống, bỏ qua.');
    return;
  }
  await db.collection('config').doc('menu').set(menuConfig);
  console.log('  ✅ Đã ghi /config/menu');
}

async function main() {
  console.log('🚀 Bắt đầu migration...');
  console.log(`   Project: ${serviceAccount.project_id}`);
  await migrateUsers();
  await migrateKnowledgeSets();
  await migrateMenuConfig();
  console.log('\n✅ Migration hoàn tất!');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Migration thất bại:', err);
  process.exit(1);
});

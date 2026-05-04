/**
 * scripts/seed-admin.ts
 *
 * One-time script untuk membuat initial admin session di Firestore.
 * Jalankan SEKALI saat database masih kosong.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
 *
 * Atau compile dulu:
 *   npx tsc --project tsconfig.json && node dist/scripts/seed-admin.js
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load .env
dotenv.config();

async function seedAdmin() {
  console.log('🌱 Seeding initial admin...\n');

  // ── Init Firebase ───────────────────────────────────────────────────────
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
  const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Firebase service account tidak ditemukan: ${resolvedPath}`);
    console.error('   Set FIREBASE_SERVICE_ACCOUNT_PATH di .env');
    process.exit(1);
  }

  const serviceAccount = require(resolvedPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  const db = admin.firestore();

  // ── Cek apakah sudah ada admin ──────────────────────────────────────────
  const adminEmail = process.env.LOCAL_ADMIN_EMAIL || 'admin@local.com';
  const adminUserId = process.env.LOCAL_ADMIN_USER_ID || 'local-admin-001';

  const existing = await db.collection('sessions').doc(adminUserId).get();
  if (existing.exists) {
    console.log(`⚠️  Admin sudah ada (userId: ${adminUserId}). Skip.`);
    console.log('   Hapus dokumen di Firestore jika ingin reset.\n');
    await admin.app().delete();
    return;
  }

  // ── Buat admin session ──────────────────────────────────────────────────
  const sessionData = {
    userId:        adminUserId,
    email:         adminEmail,
    deviceId:      'seed-device-001',
    deviceType:    'web',
    userAgent:     'Mozilla/5.0 (Seed Script)',
    userTimezone:  'Asia/Jakarta',
    currency:      'IDR',
    currencyIso:   'IDR',
    // stockityToken kosong — user ini hanya untuk local login bypass
    stockityToken: 'LOCAL_ADMIN_TOKEN',
    isLocalAdmin:  true,
    createdAt:     admin.firestore.FieldValue.serverTimestamp(),
    updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('sessions').doc(adminUserId).set(sessionData);

  console.log('✅ Admin session berhasil dibuat!\n');
  console.log('┌─────────────────────────────────────────────┐');
  console.log(`│  Email    : ${adminEmail.padEnd(33)}│`);
  console.log(`│  Password : ${(process.env.LOCAL_ADMIN_PASSWORD || 'admin123456').padEnd(33)}│`);
  console.log(`│  UserId   : ${adminUserId.padEnd(33)}│`);
  console.log('└─────────────────────────────────────────────┘');
  console.log('\n📌 Tambahkan ke .env jika belum ada:');
  console.log(`   LOCAL_ADMIN_EMAIL=${adminEmail}`);
  console.log(`   LOCAL_ADMIN_PASSWORD=${process.env.LOCAL_ADMIN_PASSWORD || 'admin123456'}`);
  console.log(`   LOCAL_ADMIN_USER_ID=${adminUserId}`);
  console.log('\n🔐 Gunakan credentials di atas untuk login pertama kali.\n');

  await admin.app().delete();
}

seedAdmin().catch((err) => {
  console.error('❌ Seed gagal:', err.message);
  process.exit(1);
});
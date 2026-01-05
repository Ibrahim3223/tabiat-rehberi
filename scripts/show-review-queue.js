#!/usr/bin/env node

/**
 * Review Queue Görüntüleyici
 *
 * Kalite kontrol sorunları olan alanları listeler
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REVIEW_QUEUE_FILE = path.join(__dirname, '../data/review-queue/pending-review.json');

function showReviewQueue() {
  if (!fs.existsSync(REVIEW_QUEUE_FILE)) {
    console.log('✅ Review queue boş - tüm alanlar temiz!\n');
    return;
  }

  const queue = JSON.parse(fs.readFileSync(REVIEW_QUEUE_FILE, 'utf-8'));

  if (queue.length === 0) {
    console.log('✅ Review queue boş - tüm alanlar temiz!\n');
    return;
  }

  console.log('\n⚠️  REVIEW QUEUE - Manuel Doğrulama Gerekli\n');
  console.log('='.repeat(70));
  console.log(`Toplam ${queue.length} alan manuel kontrole ihtiyaç duyuyor\n`);

  // İl bazlı grupla
  const byProvince = {};
  queue.forEach(item => {
    if (!byProvince[item.il]) byProvince[item.il] = [];
    byProvince[item.il].push(item);
  });

  Object.entries(byProvince).forEach(([il, items]) => {
    console.log(`\n📍 ${il} (${items.length} alan):`);
    items.forEach(item => {
      console.log(`\n  - ${item.ad} (${item.id})`);
      console.log(`    Sorunlar:`);
      item.issues.forEach(issue => {
        console.log(`      ❌ ${issue}`);
      });
      console.log(`    Eklenme: ${new Date(item.added_at).toLocaleDateString('tr-TR')}`);
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Yapılacaklar:');
  console.log('  1. Her alan için resmi kaynakları manuel kontrol et');
  console.log('  2. Eksik bilgileri doldur (özellikle giriş ücreti/saatleri)');
  console.log('  3. Koordinatları doğrula');
  console.log('  4. En az 2 güvenilir kaynak ekle');
  console.log('  5. İçeriği güncelle ve queue\'dan çıkar\n');
}

showReviewQueue();

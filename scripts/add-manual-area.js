#!/usr/bin/env node

/**
 * Manuel Alan Ekleme Scripti
 *
 * Wikipedia'da olmayan veya eksik kalan alanları
 * manuel olarak master listelere eklemek için kullanılır.
 *
 * Kullanım:
 *   node add-manual-area.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_LISTS_DIR = path.join(__dirname, '../data/master-lists');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

function slugify(text) {
  const trMap = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'I': 'i',
    'İ': 'i', 'i': 'i',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };

  return text
    .split('')
    .map(char => trMap[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  console.log('\n🌲 Manuel Alan Ekleme Aracı\n');
  console.log('='.repeat(60));

  // Tür seçimi
  const turler = [
    { kod: 'milli-park', dosya: 'milli-parklar.json', ad: 'Milli Park' },
    { kod: 'tabiat-parki', dosya: 'tabiat-parklari.json', ad: 'Tabiat Parkı' },
    { kod: 'tabiat-aniti', dosya: 'tabiat-anıtları.json', ad: 'Tabiat Anıtı' },
    { kod: 'kanyon', dosya: 'kanyonlar.json', ad: 'Kanyon' },
    { kod: 'selalesi', dosya: 'selaleler.json', ad: 'Şelale' },
    { kod: 'magara', dosya: 'magaralar.json', ad: 'Mağara' },
    { kod: 'gol', dosya: 'goller.json', ad: 'Göl' },
    { kod: 'plaj', dosya: 'plajlar.json', ad: 'Plaj' },
    { kod: 'yayla', dosya: 'yaylalar.json', ad: 'Yayla' },
    { kod: 'sulak-alan', dosya: 'sulak-alanlar.json', ad: 'Sulak Alan' },
    { kod: 'ormanlik-alan', dosya: 'ormanlik-alanlar.json', ad: 'Ormanlık Alan' },
    { kod: 'kamp-alani', dosya: 'kamp-alanlari.json', ad: 'Kamp Alanı' }
  ];

  console.log('\n📋 Alan Türleri:\n');
  turler.forEach((tur, index) => {
    console.log(`  ${index + 1}. ${tur.ad}`);
  });

  const turSecim = await question('\nTür numarasını seçin (1-12): ');
  const secilenTur = turler[parseInt(turSecim) - 1];

  if (!secilenTur) {
    console.log('❌ Geçersiz seçim!');
    rl.close();
    return;
  }

  console.log(`\n✅ Seçilen tür: ${secilenTur.ad}\n`);

  // Alan bilgilerini al
  const ad = await question('Alan adı: ');
  const il = await question('İl: ');
  const ilce = await question('İlçe (opsiyonel): ');
  const lat = await question('Enlem (latitude): ');
  const lon = await question('Boylam (longitude): ');
  const kaynak1 = await question('Kaynak 1 URL: ');
  const kaynak2 = await question('Kaynak 2 URL (opsiyonel): ');
  const notlar = await question('Notlar (opsiyonel): ');

  // Alan objesi oluştur
  const alan = {
    id: slugify(ad),
    ad: ad,
    tur: secilenTur.kod,
    il: il,
    ilce: ilce || '',
    bolge: '',
    koordinat: {
      lat: parseFloat(lat) || null,
      lon: parseFloat(lon) || null
    },
    olasi_kaynaklar: [kaynak1],
    notlar: notlar || 'Manuel eklendi'
  };

  if (kaynak2) {
    alan.olasi_kaynaklar.push(kaynak2);
  }

  // Dosyayı oku veya oluştur
  const filePath = path.join(MASTER_LISTS_DIR, secilenTur.dosya);
  let data = {
    meta: {
      kaynak: 'Manuel ekleme',
      guncelleme_tarihi: new Date().toISOString().split('T')[0],
      toplam_sayi: 0
    },
    alanlar: []
  };

  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  // Alan ekle
  data.alanlar.push(alan);
  data.meta.toplam_sayi = data.alanlar.length;
  data.meta.guncelleme_tarihi = new Date().toISOString().split('T')[0];

  // Kaydet
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

  console.log('\n✅ Alan başarıyla eklendi!');
  console.log(`📁 Dosya: ${filePath}`);
  console.log(`📊 Toplam ${secilenTur.ad} sayısı: ${data.alanlar.length}\n`);

  rl.close();
}

main().catch(error => {
  console.error('❌ Hata:', error);
  rl.close();
  process.exit(1);
});
